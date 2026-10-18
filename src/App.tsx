import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Wind,
  Disc,
  Sliders,
  X,
  Radio,
  Circle,
  Sparkles,
  BookmarkPlus,
  Edit2,
  Trash2,
  Settings,
  Orbit,
  Hexagon,
  Infinity,
  Magnet,
  Atom,
  Compass,
  Box,
  Minus,
  Square,
  Copy,
  Plus
} from 'lucide-react';
import { ThemeProvider, useTheme } from './ui/theme';
import { StatusCapsule } from './ui/components/capsule';
import { HardwareDeck } from './ui/components/deck';
import { BottomSheetDrawer, DrawerItem } from './ui/components/drawer';
import { SettingsModal, CustomRhythmModal } from './ui/components/settings';
import {
  loadCueSettings,
  saveCueSettings,
  type BreathCueSettings,
  type BreathTransitionNode
} from './audio/cue/breathCueConfig';
import { playCueSound, preloadAllCueSounds } from './audio/cue/breathCuePlayer';
import { AudioEngine, DEFAULT_CHANNEL_STRIP, DEFAULT_EFFECTS_CHAIN } from './audio/engine';
import {
  SOUND_PRESETS,
  getSoundPresetById,
  getAllFactoryPresets,
  DEFAULT_SOUND_PRESET_ID,
  type SoundPreset
} from './audio/presets/soundPresets';
import {
  getUserPresets,
  saveUserPreset,
  deleteUserPreset,
  updateUserPreset,
  renameUserPreset
} from './audio/storage/userPresets';
import { BreathEngine } from './breath/engine';
import {
  FACTORY_RHYTHMS,
  getUserRhythms,
  deleteUserRhythm,
  type UserRhythmConfig
} from './breath/storage';
import { CanvasRenderer, setupCanvasDPI, createCanvasPointerHandlers, isWithinGeometry } from './visuals';
import type {
  BreathClockSnapshot,
  VisualPresetId,
  ChannelStripParams,
  EffectsChainParams,
  DeepPartial,
  ParticleParams,
  ModulationRoute
} from './types';
import {
  DEFAULT_PARTICLE_PARAMS,
  DEFAULT_GRANULAR_PARAMS,
  DEFAULT_AMBIENT_PARAMS,
  DEFAULT_EQ_PARAMS,
  type GranularParams,
  type AmbientSoundscapeParams,
  type LaneId,
  type SoundSourceId,
  type SourceRouteMap,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  getEffectModuleType,
  getDefaultEffectParams
} from './types/audio';
import { DEFAULT_MODULATION_ROUTES } from './ui/components/deck/HardwareDeck';

const INITIAL_SNAPSHOT: BreathClockSnapshot = {
  isPlaying: false,
  currentStage: 'inhale',
  stageProgress: 0,
  stageRemainingSeconds: 4.0,
  cycleProgress: 0,
  breathMacro: 0,
  cycleCount: 0
};

function SynhaleApp(): React.JSX.Element {
  const { isDark, toggleTheme } = useTheme();

  // Engine references
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const breathEngineRef = useRef<BreathEngine | null>(null);
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronous state refs for requestAnimationFrame loops
  const isUnlockedRef = useRef<boolean>(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const visualPresetRef = useRef<VisualPresetId>('spacetimeWarp');
  const clockSnapshotRef = useRef<BreathClockSnapshot>(INITIAL_SNAPSHOT);
  const isDarkRef = useRef<boolean>(isDark);

  // Reactive UI state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [clockSnapshot, setClockSnapshot] = useState<BreathClockSnapshot>(INITIAL_SNAPSHOT);
  const [visualPreset, setVisualPreset] = useState<VisualPresetId>('spacetimeWarp');
  const [isSoundDrawerOpen, setIsSoundDrawerOpen] = useState<boolean>(false);
  const [activeSoundPresetKey, setActiveSoundPresetKey] = useState<string>(DEFAULT_SOUND_PRESET_ID);
  const [customPresets, setCustomPresets] = useState<SoundPreset[]>(() => getUserPresets());
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string } | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');
  const [deletingPreset, setDeletingPreset] = useState<{ id: string; name: string } | null>(null);
  const [channelStrip, setChannelStrip] = useState<ChannelStripParams>(
    SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID]?.channelStrip || DEFAULT_CHANNEL_STRIP
  );
  const [effects, setEffects] = useState<EffectsChainParams>(
    SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID]?.effects || DEFAULT_EFFECTS_CHAIN
  );
  const [modulationRoutes, setModulationRoutes] = useState<Record<string, ModulationRoute>>(DEFAULT_MODULATION_ROUTES);
  const [sourceRoutes, setSourceRoutes] = useState<SourceRouteMap>(DEFAULT_SOURCE_ROUTES);
  const [laneAOrder, setLaneAOrder] = useState<string[]>(DEFAULT_LANE_A_ORDER);
  const [laneBOrder, setLaneBOrder] = useState<string[]>(DEFAULT_LANE_B_ORDER);
  const sourceRoutesRef = useRef<SourceRouteMap>(sourceRoutes);
  sourceRoutesRef.current = sourceRoutes;
  const laneAOrderRef = useRef<string[]>(laneAOrder);
  laneAOrderRef.current = laneAOrder;
  const laneBOrderRef = useRef<string[]>(laneBOrder);
  laneBOrderRef.current = laneBOrder;
  const [isDeckOpen, setIsDeckOpen] = useState<boolean>(false);
  const [isRhythmDrawerOpen, setIsRhythmDrawerOpen] = useState<boolean>(false);
  const [activeRhythmKey, setActiveRhythmKey] = useState<string>('box');
  const [userRhythms, setUserRhythms] = useState<UserRhythmConfig[]>(() => getUserRhythms());
  const [isCustomRhythmModalOpen, setIsCustomRhythmModalOpen] = useState<boolean>(false);
  const [editingRhythm, setEditingRhythm] = useState<UserRhythmConfig | null>(null);
  const [deletingRhythm, setDeletingRhythm] = useState<{ id: string; name: string } | null>(null);

  // Settings & Breath Cue State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [cueSettings, setCueSettings] = useState<BreathCueSettings>(() => loadCueSettings());
  const cueSettingsRef = useRef<BreathCueSettings>(cueSettings);
  cueSettingsRef.current = cueSettings;

  const handleCueSettingsChange = useCallback((newSettings: BreathCueSettings) => {
    setCueSettings(newSettings);
    cueSettingsRef.current = newSettings;
    saveCueSettings(newSettings);
  }, []);

  // Desktop Native Frameless Window State
  const [isElectronApp, setIsElectronApp] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!(window as any).electronAPI;
  });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api) {
      setIsElectronApp(true);
      api.isMaximized().then((max: boolean) => setIsMaximized(max));
      const unsub = api.onMaximizeChange((max: boolean) => {
        setIsMaximized(max);
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) setupCanvasDPI(canvasRef.current, ctx);
          }
        });
      });
      return () => unsub?.();
    }
  }, []);

  // Block browser default right-click context menu everywhere in the app
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Keep refs in sync
  isDarkRef.current = isDark;
  visualPresetRef.current = visualPreset;
  isPlayingRef.current = isPlaying;

  // 1. Initialize Breath Engine & Master Clock Subscriber
  useEffect(() => {
    // Preload natural sound cues in background for zero-latency initial audition
    preloadAllCueSounds();

    const breathEngine = new BreathEngine({
      rhythm: FACTORY_RHYTHMS.box,
      autoStart: false
    });
    breathEngineRef.current = breathEngine;
    const initialSnap = breathEngine.getSnapshot();
    clockSnapshotRef.current = initialSnap;
    setClockSnapshot(initialSnap);

    const canvasRenderer = new CanvasRenderer();
    canvasRendererRef.current = canvasRenderer;

    const unsubscribe = breathEngine.onTick((snapshot) => {
      clockSnapshotRef.current = snapshot;
      setClockSnapshot(snapshot);

      // Broadcast breath macro to running audio engine
      if (audioEngineRef.current && isPlayingRef.current) {
        audioEngineRef.current.updateBreathModulation(
          snapshot.breathMacro,
          snapshot.currentStage,
          snapshot.stageProgress
        );
      }
    });

    const unsubStage = breathEngine.onStageChange((newStage, oldStage) => {
      if (!isPlayingRef.current) return;
      const currentCue = cueSettingsRef.current;
      if (!currentCue.enabled) return;

      let triggeredNode: BreathTransitionNode | null = null;
      if ((oldStage === 'exhale' || oldStage === 'holdOut') && newStage === 'inhale') {
        triggeredNode = 'exhale_to_inhale';
      } else if (oldStage === 'inhale' && newStage === 'holdIn') {
        triggeredNode = 'inhale_to_holdIn';
      } else if (oldStage === 'holdIn' && newStage === 'exhale') {
        triggeredNode = 'holdIn_to_exhale';
      } else if (oldStage === 'exhale' && newStage === 'holdOut') {
        triggeredNode = 'exhale_to_holdOut';
      }

      if (triggeredNode && currentCue.nodes[triggeredNode]) {
        playCueSound(currentCue.preset, currentCue.volume, audioEngineRef.current?.getContext());
      }
    });

    return () => {
      unsubscribe();
      unsubStage();
      breathEngine.dispose();
      canvasRenderer.stop();
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // 2. Initialize Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = canvasRendererRef.current;
    if (!canvas || !renderer) return;

    let cachedWidth = 0;
    let cachedHeight = 0;
    let cachedDpr = 1;

    const updateDPI = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const metrics = setupCanvasDPI(canvas, ctx);
        cachedWidth = metrics.width;
        cachedHeight = metrics.height;
        cachedDpr = metrics.dpr;
      } else {
        const parent = canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
        cachedWidth = rect.width;
        cachedHeight = rect.height;
        cachedDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      }
    };

    updateDPI();

    // 1. ResizeObserver for precise container size tracking (desktop drag-resize, maximize, snapping)
    const parentContainer = canvas.parentElement || canvas;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateDPI();
      });
      resizeObserver.observe(parentContainer);
    }

    // 2. Window resize event fallback
    window.addEventListener('resize', updateDPI);

    // 3. Screen display resolution / DPR change listener
    let dprMediaQuery: MediaQueryList | null = null;
    const handleDprChange = () => updateDPI();
    if (typeof window !== 'undefined' && window.matchMedia) {
      dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      if (typeof dprMediaQuery.addEventListener === 'function') {
        dprMediaQuery.addEventListener('change', handleDprChange);
      }
    }

    renderer.start(canvas, () => {
      const snapshot = clockSnapshotRef.current;

      return {
        width: cachedWidth,
        height: cachedHeight,
        dpr: cachedDpr,
        breathMacro: snapshot.breathMacro,
        stage: snapshot.currentStage,
        stageProgress: snapshot.stageProgress,
        isDarkTheme: isDarkRef.current,
        preset: visualPresetRef.current,
        oscAActivity: isPlayingRef.current ? 0.8 : 0.0,
        oscBActivity: isPlayingRef.current ? 0.6 : 0.0,
        showMaxBoundary: true,
        hideBoundaryGuide: true
      };
    });

    return () => {
      window.removeEventListener('resize', updateDPI);
      if (dprMediaQuery && typeof dprMediaQuery.removeEventListener === 'function') {
        dprMediaQuery.removeEventListener('change', handleDprChange);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      renderer.stop();
    };
  }, []);

  // 3. Audio Initialization with concurrency mutex lock
  const ensureAudioInitialized = useCallback(async () => {
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }
    const initTask = (async () => {
      try {
        if (!audioEngineRef.current) {
          const engine = new AudioEngine();
          audioEngineRef.current = engine;
          await engine.init();
          // Mute master output and set initial hard cut state to load preset in silence without DAC click
          engine.executeZeroResidueHardCut();
          engine.setModulationRoutes(DEFAULT_MODULATION_ROUTES);
          engine.loadSoundPreset(activeSoundPresetKey);
          if (sourceRoutesRef.current) {
            for (const [srcId, lane] of Object.entries(sourceRoutesRef.current)) {
              engine.setSourceRoute(srcId as SoundSourceId, lane as LaneId);
            }
          }
          if (laneAOrderRef.current) engine.reorderLaneEffects('laneA', laneAOrderRef.current);
          if (laneBOrderRef.current) engine.reorderLaneEffects('laneB', laneBOrderRef.current);
        }
        if (!isUnlockedRef.current) {
          await audioEngineRef.current.resume();
          isUnlockedRef.current = true;
        }
      } finally {
        initPromiseRef.current = null;
      }
    })();
    initPromiseRef.current = initTask;
    return initTask;
  }, [activeSoundPresetKey]);

  const handleModulationRouteAssign = useCallback((knobId: string, route: ModulationRoute | null) => {
    setModulationRoutes(prev => {
      const next = { ...prev };
      if (route) {
        next[knobId] = route;
      } else {
        delete next[knobId];
      }
      return next;
    });
    if (audioEngineRef.current) {
      audioEngineRef.current.setModulationRoute(knobId, route);
    }
  }, []);

  // 4. Play / Pause Toggle with 0ms Hard Cut
  const togglePlayPause = useCallback(async () => {
    await ensureAudioInitialized();

    const breathEngine = breathEngineRef.current;
    const audioEngine = audioEngineRef.current;
    if (!breathEngine) return;

    if (isPlayingRef.current) {
      // 0ms Hard Cut
      if (audioEngine) {
        audioEngine.executeZeroResidueHardCut();
      }
      breathEngine.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      // Seamless Resume
      if (audioEngine) {
        await audioEngine.resume();
      }
      breathEngine.resume();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [ensureAudioInitialized]);

  // 5. Canvas Tap Handlers (Constrained to central breathing geometry area)
  const pointerHandlers = useMemo(() => {
    return createCanvasPointerHandlers(
      () => {
        togglePlayPause();
      },
      async () => {
        await ensureAudioInitialized();
      },
      (e) => {
        if (!canvasRef.current) return true;
        const parent = canvasRef.current.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : canvasRef.current.getBoundingClientRect();
        return isWithinGeometry(e.clientX, e.clientY, rect, 0.44);
      }
    );
  }, [togglePlayPause, ensureAudioInitialized]);

  // 6. Parameter Change Callbacks
  const handleChannelStripChange = useCallback((params: DeepPartial<ChannelStripParams>) => {
    setChannelStrip(prev => {
      const next: ChannelStripParams = {
        oscA: {
          ...prev.oscA,
          ...params.oscA,
          particles: params.oscA?.particles
            ? ({
                ...(prev.oscA.particles ?? DEFAULT_PARTICLE_PARAMS),
                ...params.oscA.particles
              } as ParticleParams)
            : prev.oscA.particles
        },
        oscB: { ...prev.oscB, ...params.oscB },
        drone: { ...prev.drone, ...params.drone },
        granular: params.granular
          ? ({
              ...(prev.granular ?? DEFAULT_GRANULAR_PARAMS),
              ...params.granular,
              grainEnvelope: params.granular.grainEnvelope
                ? {
                    ...((prev.granular ?? DEFAULT_GRANULAR_PARAMS).grainEnvelope ?? DEFAULT_GRANULAR_PARAMS.grainEnvelope),
                    ...params.granular.grainEnvelope
                  }
                : (prev.granular ?? DEFAULT_GRANULAR_PARAMS).grainEnvelope
            } as GranularParams)
          : prev.granular,
        ambient: params.ambient
          ? ({
              ...(prev.ambient ?? DEFAULT_AMBIENT_PARAMS),
              ...params.ambient
            } as AmbientSoundscapeParams)
          : prev.ambient
      };
      if (audioEngineRef.current) {
        audioEngineRef.current.updateChannelStrip(next);
      }
      return next;
    });
  }, []);

  const handleEffectsChange = useCallback((params: DeepPartial<EffectsChainParams>) => {
    setEffects(prev => {
      let nextLfo1 = prev.lfo1;
      if (params.lfo1) {
        const base1 = prev.lfo1 ?? { rate: 0.15, depth: 0.25, shape: 'sine' as const, bypass: false };
        nextLfo1 = {
          rate: params.lfo1.rate ?? base1.rate,
          depth: params.lfo1.depth ?? base1.depth,
          shape: params.lfo1.shape ?? base1.shape,
          bypass: params.lfo1.bypass ?? base1.bypass
        };
      }

      let nextLfo2 = prev.lfo2;
      if (params.lfo2) {
        const base2 = prev.lfo2 ?? { rate: 0.08, depth: 0.25, filterMod: 0.35, panMod: 0.3, tremoloMod: 0.1, shape: 'sine' as const, bypass: false };
        nextLfo2 = {
          rate: params.lfo2.rate ?? base2.rate,
          depth: params.lfo2.depth ?? base2.depth,
          filterMod: params.lfo2.filterMod ?? base2.filterMod,
          panMod: params.lfo2.panMod ?? base2.panMod,
          tremoloMod: params.lfo2.tremoloMod ?? base2.tremoloMod,
          shape: params.lfo2.shape ?? base2.shape,
          bypass: params.lfo2.bypass ?? base2.bypass
        };
      }

      let nextAdsr = prev.adsr;
      if (params.adsr) {
        const baseAdsr = prev.adsr ?? { attack: 0.8, decay: 1.5, sustain: 0.75, release: 2.5, bypass: false };
        nextAdsr = {
          attack: params.adsr.attack ?? baseAdsr.attack,
          decay: params.adsr.decay ?? baseAdsr.decay,
          sustain: params.adsr.sustain ?? baseAdsr.sustain,
          release: params.adsr.release ?? baseAdsr.release,
          bypass: params.adsr.bypass ?? baseAdsr.bypass
        };
      }

      let nextGain = prev.gain;
      if (params.gain) {
        const baseGain = prev.gain ?? { value: 0.0, bypass: false, softClip: true };
        nextGain = {
          value: params.gain.value !== undefined ? params.gain.value : baseGain.value,
          bypass: params.gain.bypass !== undefined ? params.gain.bypass : baseGain.bypass,
          softClip: params.gain.softClip !== undefined ? params.gain.softClip : baseGain.softClip
        };
      }

      let nextEq = prev.eq;
      if (params.eq) {
        const baseEq = prev.eq ?? DEFAULT_EQ_PARAMS;
        nextEq = {
          low: {
            ...baseEq.low,
            ...(params.eq.low || {})
          },
          midLow: {
            ...baseEq.midLow,
            ...(params.eq.midLow || {})
          },
          midHigh: {
            ...baseEq.midHigh,
            ...(params.eq.midHigh || {})
          },
          high: {
            ...baseEq.high,
            ...(params.eq.high || {})
          },
          bypass: params.eq.bypass !== undefined ? params.eq.bypass : baseEq.bypass
        };
      }

      // Merge instance snapshots
      const updatedInstances: Record<string, any> = {
        ...(prev.instances || {})
      };
      if (params.instances) {
        for (const [k, v] of Object.entries(params.instances)) {
          if (v) updatedInstances[k] = { ...(updatedInstances[k] || {}), ...v };
        }
      }
      for (const [key, value] of Object.entries(params)) {
        if (key.includes('_') && value) {
          updatedInstances[key] = { ...(updatedInstances[key] || {}), ...value };
        }
      }

      const nextSourceRoutes: SourceRouteMap = params.sourceRoutes
        ? {
            oscA: params.sourceRoutes.oscA ?? sourceRoutesRef.current?.oscA ?? prev.sourceRoutes?.oscA ?? 'laneA',
            granular: params.sourceRoutes.granular ?? sourceRoutesRef.current?.granular ?? prev.sourceRoutes?.granular ?? 'laneA',
            oscB: params.sourceRoutes.oscB ?? sourceRoutesRef.current?.oscB ?? prev.sourceRoutes?.oscB ?? 'laneA',
            drone: params.sourceRoutes.drone ?? sourceRoutesRef.current?.drone ?? prev.sourceRoutes?.drone ?? 'laneA',
            ambient: params.sourceRoutes.ambient ?? sourceRoutesRef.current?.ambient ?? prev.sourceRoutes?.ambient ?? 'laneA',
          }
        : (sourceRoutesRef.current ?? prev.sourceRoutes ?? DEFAULT_SOURCE_ROUTES);

      if (params.sourceRoutes) {
        sourceRoutesRef.current = nextSourceRoutes;
        setSourceRoutes(nextSourceRoutes);
      }

      const nextLaneAOrder = params.laneAOrder
        ? params.laneAOrder.filter((x): x is string => typeof x === 'string')
        : (laneAOrderRef.current ?? prev.laneAOrder ?? DEFAULT_LANE_A_ORDER);
      const nextLaneBOrder = params.laneBOrder
        ? params.laneBOrder.filter((x): x is string => typeof x === 'string')
        : (laneBOrderRef.current ?? prev.laneBOrder ?? DEFAULT_LANE_B_ORDER);

      if (params.laneAOrder) {
        laneAOrderRef.current = nextLaneAOrder;
        setLaneAOrder(nextLaneAOrder);
      }
      if (params.laneBOrder) {
        laneBOrderRef.current = nextLaneBOrder;
        setLaneBOrder(nextLaneBOrder);
      }

      const next: EffectsChainParams = {
        ...prev,
        ...params,
        sourceRoutes: nextSourceRoutes,
        laneAOrder: nextLaneAOrder,
        laneBOrder: nextLaneBOrder,
        gain: nextGain,
        eq: nextEq,
        filter: { ...prev.filter, ...params.filter },
        drive: { ...prev.drive, ...params.drive },
        delay: { ...prev.delay, ...params.delay },
        reverb: { ...prev.reverb, ...params.reverb },
        lfo1: nextLfo1,
        lfo2: nextLfo2,
        adsr: nextAdsr,
        masterGain: params.masterGain !== undefined ? params.masterGain : prev.masterGain,
        masterPan: params.masterPan !== undefined ? params.masterPan : prev.masterPan,
        busMix: params.busMix !== undefined ? params.busMix : (prev.busMix ?? 0.5),
        busLevelA: params.busLevelA !== undefined ? params.busLevelA : (prev.busLevelA ?? 1.0),
        busLevelB: params.busLevelB !== undefined ? params.busLevelB : (prev.busLevelB ?? 1.0),
        instances: updatedInstances
      };
      if (audioEngineRef.current) {
        audioEngineRef.current.updateEffects(next);
      }
      return next;
    });
  }, []);

  const handleReorderEffects = useCallback((newOrder: string[]) => {
    setLaneAOrder(newOrder);
    laneAOrderRef.current = newOrder;
    setEffects(prev => ({ ...prev, laneAOrder: newOrder }));
    if (audioEngineRef.current) {
      audioEngineRef.current.reorderEffects(newOrder);
    }
  }, []);

  const handleSourceRouteChange = useCallback((sourceId: SoundSourceId, lane: LaneId) => {
    setSourceRoutes(prev => {
      const next = { ...prev, [sourceId]: lane };
      sourceRoutesRef.current = next;
      return next;
    });
    setEffects(prev => ({
      ...prev,
      sourceRoutes: {
        ...(prev.sourceRoutes ?? sourceRoutesRef.current ?? DEFAULT_SOURCE_ROUTES),
        [sourceId]: lane
      }
    }));
    if (audioEngineRef.current?.setSourceRoute) {
      audioEngineRef.current.setSourceRoute(sourceId, lane);
    }
  }, []);

  const handleLaneReorder = useCallback((lane: 'laneA' | 'laneB', newOrder: string[]) => {
    if (lane === 'laneA') {
      setLaneAOrder(newOrder);
      laneAOrderRef.current = newOrder;
      setEffects(prev => ({ ...prev, laneAOrder: newOrder }));
      if (audioEngineRef.current?.reorderLaneEffects) {
        audioEngineRef.current.reorderLaneEffects('laneA', newOrder);
      }
    } else {
      setLaneBOrder(newOrder);
      laneBOrderRef.current = newOrder;
      setEffects(prev => ({ ...prev, laneBOrder: newOrder }));
      if (audioEngineRef.current?.reorderLaneEffects) {
        audioEngineRef.current.reorderLaneEffects('laneB', newOrder);
      }
    }
  }, []);

  const handleMoveEffectBetweenLanes = useCallback((effectId: string, fromOrTarget: string, maybeTarget?: string) => {
    const targetLane: 'laneA' | 'laneB' = (maybeTarget || fromOrTarget) as 'laneA' | 'laneB';
    let nextA: string[] = [];
    let nextB: string[] = [];
    if (targetLane === 'laneA') {
      setLaneBOrder(prev => {
        nextB = prev.filter(id => id !== effectId);
        laneBOrderRef.current = nextB;
        return nextB;
      });
      setLaneAOrder(prev => {
        nextA = prev.includes(effectId) ? prev : [...prev, effectId];
        laneAOrderRef.current = nextA;
        return nextA;
      });
    } else {
      setLaneAOrder(prev => {
        nextA = prev.filter(id => id !== effectId);
        laneAOrderRef.current = nextA;
        return nextA;
      });
      setLaneBOrder(prev => {
        nextB = prev.includes(effectId) ? prev : [...prev, effectId];
        laneBOrderRef.current = nextB;
        return nextB;
      });
    }
    setEffects(prev => ({
      ...prev,
      laneAOrder: nextA,
      laneBOrder: nextB
    }));
    if (audioEngineRef.current?.moveEffectBetweenLanes) {
      audioEngineRef.current.moveEffectBetweenLanes(effectId, targetLane);
    }
  }, []);

  const handleAddEffectToLane = useCallback((lane: 'laneA' | 'laneB', effectId: string) => {
    let nextA: string[] | null = null;
    let nextB: string[] | null = null;
    if (lane === 'laneA') {
      setLaneAOrder(prev => {
        nextA = prev.includes(effectId) ? prev : [...prev, effectId];
        laneAOrderRef.current = nextA;
        return nextA;
      });
      setLaneBOrder(prev => {
        nextB = prev.filter(id => id !== effectId);
        laneBOrderRef.current = nextB;
        return nextB;
      });
    } else {
      setLaneBOrder(prev => {
        nextB = prev.includes(effectId) ? prev : [...prev, effectId];
        laneBOrderRef.current = nextB;
        return nextB;
      });
      setLaneAOrder(prev => {
        nextA = prev.filter(id => id !== effectId);
        laneAOrderRef.current = nextA;
        return nextA;
      });
    }
    const baseType = getEffectModuleType(effectId);
    const initialParams = getDefaultEffectParams(baseType);

    setEffects(prev => ({
      ...prev,
      ...(nextA ? { laneAOrder: nextA } : {}),
      ...(nextB ? { laneBOrder: nextB } : {}),
      instances: {
        ...(prev.instances || {}),
        [effectId]: (prev.instances && prev.instances[effectId]) ? prev.instances[effectId] : initialParams
      }
    }));
    if (audioEngineRef.current?.addEffectToLane) {
      audioEngineRef.current.addEffectToLane(lane, effectId);
    }
  }, []);

  const handleRemoveEffectFromLane = useCallback((lane: 'laneA' | 'laneB', effectId: string) => {
    if (lane === 'laneA') {
      let next: string[] = [];
      setLaneAOrder(prev => {
        next = prev.filter(id => id !== effectId);
        laneAOrderRef.current = next;
        return next;
      });
      setEffects(e => ({ ...e, laneAOrder: next }));
    } else {
      let next: string[] = [];
      setLaneBOrder(prev => {
        next = prev.filter(id => id !== effectId);
        laneBOrderRef.current = next;
        return next;
      });
      setEffects(e => ({ ...e, laneBOrder: next }));
    }
    if (audioEngineRef.current?.removeEffectFromLane) {
      audioEngineRef.current.removeEffectFromLane(lane, effectId);
    }
  }, []);

  // 7. Rhythm Presets Drawer (5 Canonical Factory + User Custom Rhythms)
  const rhythmDrawerItems: DrawerItem[] = useMemo(() => {
    const factoryItems: DrawerItem[] = [
      { id: 'box', label: 'Box 4-4-4-4', description: '四方平衡呼吸 · 战术清醒与心理减压 (4-4-4-4)', badge: '16s' },
      { id: 'sleep', label: 'Relax 4-7-8', description: '助眠放松呼吸 · 延长呼气与神经松弛 (4-7-8)', badge: '19s' },
      { id: 'coherent', label: 'Coherent 5.5s', description: '心率共振呼吸 · 0.1Hz 自律神经调和 (5.5s)', badge: '11s' },
      { id: 'prana', label: 'Prana Energize', description: '能量唤醒呼吸 · 快速充氧与提神活血 (4-4-2-0)', badge: '10s' },
      { id: 'calm', label: 'Deep Calm', description: '深层宁静呼吸 · 颂钵声疗与冥想入定 (4-2-6-2)', badge: '14s' }
    ];

    const userItems: DrawerItem[] = userRhythms.map(r => {
      const total = Number((r.inhale + r.holdIn + r.exhale + r.holdOut).toFixed(1));
      return {
        id: r.id,
        label: r.name,
        description: r.description || `自定节律 · ${r.inhale}-${r.holdIn}-${r.exhale}-${r.holdOut}`,
        badge: `${total}s`,
        onEdit: (id: string, e: React.MouseEvent) => {
          e.stopPropagation();
          const target = userRhythms.find(item => item.id === id);
          if (target) {
            setEditingRhythm(target);
            setIsCustomRhythmModalOpen(true);
          }
        },
        onDelete: (id: string, e: React.MouseEvent) => {
          e.stopPropagation();
          const target = userRhythms.find(item => item.id === id);
          if (target) {
            setDeletingRhythm({ id: target.id, name: target.name });
          }
        }
      };
    });

    return [...factoryItems, ...userItems];
  }, [userRhythms]);

  const handleRhythmSelect = useCallback((rhythmId: string) => {
    setActiveRhythmKey(rhythmId);
    const hasFactory = typeof rhythmId === 'string' && Object.prototype.hasOwnProperty.call(FACTORY_RHYTHMS, rhythmId);
    const rhythmConfig = (hasFactory ? FACTORY_RHYTHMS[rhythmId] : undefined) || userRhythms.find(r => r.id === rhythmId);
    if (rhythmConfig && breathEngineRef.current) {
      breathEngineRef.current.setRhythm(rhythmConfig);
    }
  }, [userRhythms]);

  const handleSaveCustomRhythm = useCallback((saved: UserRhythmConfig) => {
    setUserRhythms(getUserRhythms());
    setActiveRhythmKey(saved.id);
    if (breathEngineRef.current) {
      breathEngineRef.current.setRhythm(saved);
    }
  }, []);

  const handleConfirmDeleteRhythm = useCallback(() => {
    if (!deletingRhythm) return;
    deleteUserRhythm(deletingRhythm.id);
    const updated = getUserRhythms();
    setUserRhythms(updated);
    if (activeRhythmKey === deletingRhythm.id) {
      setActiveRhythmKey('box');
      if (breathEngineRef.current) {
        breathEngineRef.current.setRhythm(FACTORY_RHYTHMS.box);
      }
    }
    setDeletingRhythm(null);
  }, [deletingRhythm, activeRhythmKey]);

  const activeRhythmLabel = rhythmDrawerItems.find(r => r.id === activeRhythmKey)?.label || 'Box 4-4-4-4';

  // 7b. Sound Therapy Presets Drawer (5 Core Factory + User Custom)
  const isCurrentUserPreset = useMemo(() => {
    return customPresets.some(p => p.id === activeSoundPresetKey);
  }, [customPresets, activeSoundPresetKey]);

  const soundDrawerItems: DrawerItem[] = useMemo(() => {
    const factory = getAllFactoryPresets().map(p => ({
      id: p.id,
      label: p.name,
      description: `${p.description} (${p.nameEn})`,
      badge: p.badge
    }));
    const user = customPresets.map(p => ({
      id: p.id,
      label: p.name,
      description: `${p.description} (${p.nameEn})`,
      badge: '用户预设',
      onEdit: (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = customPresets.find(item => item.id === id);
        if (target) {
          setEditingPreset({ id: target.id, name: target.name });
          setEditingPresetName(target.name);
        }
      },
      onDelete: (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = customPresets.find(item => item.id === id);
        if (target) {
          setDeletingPreset({ id: target.id, name: target.name });
        }
      }
    }));
    return [...factory, ...user];
  }, [customPresets]);

  const handleSoundPresetSelect = useCallback((presetId: string) => {
    setActiveSoundPresetKey(presetId);
    const preset =
      getAllFactoryPresets().find(p => p.id === presetId) ||
      customPresets.find(p => p.id === presetId) ||
      getSoundPresetById(presetId);
    if (preset) {
      const mergedChannelStrip: ChannelStripParams = {
        oscA: {
          ...DEFAULT_CHANNEL_STRIP.oscA,
          ...preset.channelStrip.oscA,
          voiceMode: preset.channelStrip.oscA.voiceMode === 'particles' ? 'drone' : (preset.channelStrip.oscA.voiceMode ?? 'drone')
        },
        oscB: {
          ...DEFAULT_CHANNEL_STRIP.oscB,
          ...preset.channelStrip.oscB,
        },
        drone: {
          ...DEFAULT_CHANNEL_STRIP.drone,
          ...preset.channelStrip.drone,
        },
        granular: {
          ...DEFAULT_CHANNEL_STRIP.granular!,
          ...(preset.channelStrip.granular || {}),
          bypass: preset.channelStrip.granular?.bypass ?? true
        },
        ambient: {
          ...DEFAULT_AMBIENT_PARAMS,
          ...(preset.channelStrip.ambient || {}),
          bypass: preset.channelStrip.ambient?.bypass ?? false
        }
      };
      setChannelStrip(mergedChannelStrip);
      const mergedEffects: EffectsChainParams = {
        ...DEFAULT_EFFECTS_CHAIN,
        ...preset.effects,
        gain: {
          ...DEFAULT_EFFECTS_CHAIN.gain!,
          ...(preset.effects?.gain || {})
        },
        eq: {
          ...DEFAULT_EFFECTS_CHAIN.eq!,
          ...(preset.effects?.eq || {}),
          low: { ...DEFAULT_EFFECTS_CHAIN.eq!.low, ...(preset.effects?.eq?.low || {}) },
          midLow: { ...DEFAULT_EFFECTS_CHAIN.eq!.midLow, ...(preset.effects?.eq?.midLow || {}) },
          midHigh: { ...DEFAULT_EFFECTS_CHAIN.eq!.midHigh, ...(preset.effects?.eq?.midHigh || {}) },
          high: { ...DEFAULT_EFFECTS_CHAIN.eq!.high, ...(preset.effects?.eq?.high || {}) },
          bypass: preset.effects?.eq?.bypass ?? false
        }
      };
      setEffects(mergedEffects);
      const nextRoutes = preset.modulationRoutes ? { ...preset.modulationRoutes } : { ...DEFAULT_MODULATION_ROUTES };
      setModulationRoutes(nextRoutes);
      if (preset.effects?.sourceRoutes) {
        setSourceRoutes(preset.effects.sourceRoutes);
        sourceRoutesRef.current = preset.effects.sourceRoutes;
      }
      if (preset.effects?.laneAOrder) {
        setLaneAOrder(preset.effects.laneAOrder);
        laneAOrderRef.current = preset.effects.laneAOrder;
      }
      if (preset.effects?.laneBOrder) {
        setLaneBOrder(preset.effects.laneBOrder);
        laneBOrderRef.current = preset.effects.laneBOrder;
      }

      if (audioEngineRef.current) {
        audioEngineRef.current.loadSoundPreset({
          ...preset,
          channelStrip: mergedChannelStrip,
          effects: mergedEffects,
          modulationRoutes: nextRoutes
        });
      }
    }
  }, [customPresets]);

  const activeSoundPresetLabel = useMemo(() => {
    const p =
      getAllFactoryPresets().find(x => x.id === activeSoundPresetKey) ||
      customPresets.find(x => x.id === activeSoundPresetKey) ||
      SOUND_PRESETS[activeSoundPresetKey];
    return p?.name || '神圣钟磬';
  }, [activeSoundPresetKey, customPresets]);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveMode === 'overwrite' && isCurrentUserPreset) {
      updateUserPreset(activeSoundPresetKey, {
        channelStrip,
        effects,
        modulationRoutes
      });
      setCustomPresets(getUserPresets());
      setIsSavePresetModalOpen(false);
      return;
    }

    if (!newPresetName.trim()) return;
    const saved = saveUserPreset({
      name: newPresetName.trim(),
      channelStrip,
      effects,
      modulationRoutes
    });
    setCustomPresets(getUserPresets());
    setActiveSoundPresetKey(saved.id);
    setNewPresetName('');
    setIsSavePresetModalOpen(false);
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPresetName.trim()) return;
    renameUserPreset(editingPreset.id, editingPresetName.trim());
    setCustomPresets(getUserPresets());
    setEditingPreset(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingPreset) return;
    const idToDelete = deletingPreset.id;
    deleteUserPreset(idToDelete);
    const updated = getUserPresets();
    setCustomPresets(updated);
    if (activeSoundPresetKey === idToDelete) {
      handleSoundPresetSelect(DEFAULT_SOUND_PRESET_ID);
    }
    setDeletingPreset(null);
  };

  const visualPresetGroups: {
    groupId: 'classic' | 'optical' | 'cosmic';
    groupCode: string;
    groupLabelZh: string;
    items: {
      id: VisualPresetId;
      label: string;
      labelZh: string;
      icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    }[];
  }[] = useMemo(() => [
    {
      groupId: 'classic',
      groupCode: 'I',
      groupLabelZh: '经典组',
      items: [
        { id: 'minimalRing', label: 'Ring', labelZh: '极简圆环', icon: Circle },
        { id: 'sacredGeometry', label: 'Sacred', labelZh: '神圣几何', icon: Activity },
        { id: 'zenWaves', label: 'Waves', labelZh: '禅道波纹', icon: Radio },
        { id: 'calmFocus', label: 'Focus', labelZh: '平实专注', icon: Disc }
      ]
    },
    {
      groupId: 'optical',
      groupCode: 'II',
      groupLabelZh: '光学组',
      items: [
        { id: 'coronaOrbit', label: 'Corona', labelZh: '日冕星轨', icon: Orbit },
        { id: 'hyperMetatron', label: 'Hyper', labelZh: '超维星云', icon: Hexagon },
        { id: 'lissajousKnot', label: 'Knot', labelZh: '调和光结', icon: Infinity },
        { id: 'magneticFlux', label: 'Flux', labelZh: '磁通力线', icon: Magnet }
      ]
    },
    {
      groupId: 'cosmic',
      groupCode: 'III',
      groupLabelZh: '星际组',
      items: [
        { id: 'spacetimeWarp', label: 'Warp', labelZh: '时空曲率', icon: Compass },
        { id: 'keplerRosette', label: 'Rosette', labelZh: '开普勒玫瑰', icon: Sparkles },
        { id: 'tesseract4D', label: 'Tesseract', labelZh: '超维立方', icon: Box },
        { id: 'hopfFibration', label: 'Hopf', labelZh: '霍普夫环面', icon: Atom }
      ]
    }
  ], []);

  const [visualGroupIndex, setVisualGroupIndex] = useState<0 | 1 | 2>(2);
  const [capsuleDragX, setCapsuleDragX] = useState<number>(0);
  const capsuleSwipeRef = useRef<{
    active: boolean;
    startX: number;
    currentX: number;
    moved: boolean;
    pointerId: number | null;
    lastWheelTime: number;
  }>({
    active: false,
    startX: 0,
    currentX: 0,
    moved: false,
    pointerId: null,
    lastWheelTime: 0
  });

  const switchVisualGroup = useCallback((nextGroupIdx: 0 | 1 | 2) => {
    setVisualGroupIndex(prevGroupIdx => {
      if (prevGroupIdx === nextGroupIdx) return prevGroupIdx;
      const currentGroup = visualPresetGroups[prevGroupIdx];
      const targetGroup = visualPresetGroups[nextGroupIdx];
      const slotIdx = Math.max(
        0,
        currentGroup.items.findIndex(item => item.id === visualPresetRef.current)
      );
      const nextPreset = targetGroup.items[slotIdx]?.id ?? targetGroup.items[0].id;
      setVisualPreset(nextPreset);
      return nextGroupIdx;
    });
  }, [visualPresetGroups]);

  // Synchronize default preset on mount to Cosmic Group III ('spacetimeWarp')
  useEffect(() => {
    setVisualPreset('spacetimeWarp');
  }, []);

  const handleCapsulePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    capsuleSwipeRef.current.active = true;
    capsuleSwipeRef.current.startX = e.clientX;
    capsuleSwipeRef.current.currentX = e.clientX;
    capsuleSwipeRef.current.moved = false;
    capsuleSwipeRef.current.pointerId = e.pointerId;
  }, []);

  const handleCapsulePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!capsuleSwipeRef.current.active) return;
    const dx = e.clientX - capsuleSwipeRef.current.startX;
    capsuleSwipeRef.current.currentX = e.clientX;
    if (Math.abs(dx) > 6) {
      capsuleSwipeRef.current.moved = true;
      setCapsuleDragX(Math.max(-72, Math.min(72, dx * 0.55)));
    }
  }, []);

  const handleCapsulePointerEnd = useCallback(() => {
    if (!capsuleSwipeRef.current.active) return;
    const dx = capsuleSwipeRef.current.currentX - capsuleSwipeRef.current.startX;
    capsuleSwipeRef.current.active = false;
    setCapsuleDragX(0);

    // Swipe threshold: 22px left or right switches between Groups (I, II, III)
    if (dx <= -22) {
      const next = Math.min(2, visualGroupIndex + 1) as 0 | 1 | 2;
      switchVisualGroup(next);
    } else if (dx >= 22) {
      const next = Math.max(0, visualGroupIndex - 1) as 0 | 1 | 2;
      switchVisualGroup(next);
    }
  }, [switchVisualGroup, visualGroupIndex]);

  const handleCapsuleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - capsuleSwipeRef.current.lastWheelTime < 280) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 10) return;
    capsuleSwipeRef.current.lastWheelTime = now;
    if (delta > 0) {
      const next = Math.min(2, visualGroupIndex + 1) as 0 | 1 | 2;
      switchVisualGroup(next);
    } else {
      const next = Math.max(0, visualGroupIndex - 1) as 0 | 1 | 2;
      switchVisualGroup(next);
    }
  }, [switchVisualGroup, visualGroupIndex]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none antialiased ${
      isDark ? 'bg-[#09090b] text-slate-100' : 'bg-[#fcfbf9] text-neutral-800'
    } ${isElectronApp && !isMaximized ? 'border border-neutral-800/80 rounded-xl shadow-2xl' : ''}`}>
      {/* 1. Header Navigation Bar (Frameless Desktop Draggable Titlebar) */}
      <header className={`h-12 border-b px-5 flex items-center justify-between z-10 backdrop-blur-md transition-colors titlebar-drag ${
        isDark
          ? 'border-neutral-800/80 bg-[#121418]/70 text-slate-200'
          : 'border-neutral-200/80 bg-white/75 text-neutral-800 shadow-sm'
      }`}>
        {/* Brand & 432Hz Indicator (titlebar-no-drag) */}
        <div className="flex items-center gap-3 titlebar-no-drag">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isPlaying
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] scale-110'
                : 'bg-neutral-500 opacity-60'
            }`}
          />
          <span className="font-semibold tracking-widest text-xs uppercase font-sans">
            Synhale
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isDark
              ? 'border-neutral-800 bg-neutral-900/60 text-sky-400'
              : 'border-neutral-300 bg-neutral-100 text-sky-600'
          }`}>
            432Hz CORE
          </span>
        </div>

        {/* Action Controls & Integrated Native Window Controls (titlebar-no-drag) */}
        <div className="flex items-center gap-2 titlebar-no-drag">
          {/* Rhythm Selector Button */}
          <button
            onClick={() => setIsRhythmDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/60 text-slate-300 hover:bg-neutral-800'
                : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm'
            }`}
            title="Change Breath Rhythm"
          >
            <Wind size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">{activeRhythmLabel}</span>
          </button>

          {/* Sound Presets Selector Button */}
          <button
            onClick={() => setIsSoundDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/60 text-slate-300 hover:bg-neutral-800'
                : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm'
            }`}
            title="Change Sound Preset"
          >
            <Sparkles size={13} className="text-sky-400" />
            <span className="hidden sm:inline">{activeSoundPresetLabel}</span>
          </button>

          {/* Save Custom Preset Button */}
          <button
            onClick={() => setIsSavePresetModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/60 text-slate-300 hover:border-sky-500/80 hover:text-sky-300'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-sky-500/80 hover:text-sky-600 shadow-sm'
            }`}
            title="保存当前声音为新预设"
            aria-label="Save Custom Preset"
          >
            <BookmarkPlus size={13} className="text-sky-400" />
            <span className="hidden md:inline">保存预设</span>
          </button>

          {/* Hardware Console Toggle Button */}
          <button
            onClick={() => setIsDeckOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors ${
              isDeckOpen
                ? isDark
                  ? 'border-sky-500 bg-sky-950/40 text-sky-400 font-medium'
                  : 'border-sky-400 bg-sky-50 text-sky-600 font-semibold shadow-xs'
                : isDark
                  ? 'border-neutral-800 bg-neutral-900/60 text-slate-300 hover:bg-neutral-800'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm'
            }`}
            title="Toggle Hardware Modulation Deck"
          >
            <Sliders size={13} className={isDeckOpen ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-slate-400' : 'text-slate-600')} />
            <span className="hidden sm:inline">Deck</span>
          </button>

          {/* Settings & Preferences Button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/60 text-slate-300 hover:bg-neutral-800 hover:text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm'
            }`}
            title="偏好设置 · Settings"
            aria-label="Open Settings"
          >
            <Settings size={13} />
            <span className="hidden sm:inline">设置</span>
          </button>

          {/* Integrated Desktop Native Window Controls (Frameless Minimize / Maximize / Close) */}
          {isElectronApp && (
            <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-neutral-700/60 dark:border-neutral-800/80">
              <button
                type="button"
                onClick={() => (window as any).electronAPI?.minimize()}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
                title="最小化 · Minimize"
                aria-label="Minimize Window"
              >
                <Minus size={13} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => (window as any).electronAPI?.toggleMaximize()}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
                title={isMaximized ? "还原 · Restore" : "最大化 · Maximize"}
                aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
              >
                {isMaximized ? <Copy size={11} strokeWidth={2} className="rotate-90" /> : <Square size={11} strokeWidth={2} />}
              </button>
              <button
                type="button"
                onClick={() => (window as any).electronAPI?.close()}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-red-500/80'
                    : 'text-neutral-600 hover:text-white hover:bg-red-500'
                }`}
                title="关闭 · Close"
                aria-label="Close Window"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Fullscreen Sacred Geometry Canvas */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-pointer z-0"
          onPointerDown={pointerHandlers.onPointerDown}
          onPointerUp={pointerHandlers.onPointerUp}
          onPointerCancel={pointerHandlers.onPointerCancel}
        />

        {/* Minimal Subtle Tap Hint when Idle */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-500">
            <div className={`px-4 py-2 rounded-full border text-xs tracking-widest font-mono uppercase backdrop-blur-sm ${
              isDark
                ? 'border-neutral-800/80 bg-neutral-950/60 text-neutral-400'
                : 'border-neutral-300/80 bg-white/70 text-neutral-600 shadow-sm'
            }`}>
              轻触中心图形开始呼吸 · Tap Central Geometry to Breathe
            </div>
          </div>
        )}

        {/* 3. Floating Bottom Controls: Swipeable Dual-Group Visual Style Capsule + Breathing Status Capsule */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-3 pointer-events-none">
          {/* Swipeable Visual Style Capsule (Interactive Group I & Group II) */}
          <div
            role="toolbar"
            aria-label="Visual Geometry Presets"
            onPointerDown={handleCapsulePointerDown}
            onPointerMove={handleCapsulePointerMove}
            onPointerUp={handleCapsulePointerEnd}
            onPointerCancel={handleCapsulePointerEnd}
            onPointerLeave={handleCapsulePointerEnd}
            onWheel={handleCapsuleWheel}
            style={{ touchAction: 'pan-y' }}
            title="左右滑动切换动效组 · Swipe Left/Right to Switch Group"
            className={`pointer-events-auto flex items-center gap-1.5 p-1 rounded-full border backdrop-blur-md transition-all shadow-lg select-none cursor-grab active:cursor-grabbing ${
              isDark
                ? 'border-neutral-800 bg-neutral-950/85 text-neutral-300'
                : 'border-neutral-300 bg-white/85 text-neutral-700 shadow-sm'
            }`}
          >
            {/* Group Switcher & Pagination Pill (I / II / III) */}
            <button
              type="button"
              onClick={() => {
                if (capsuleSwipeRef.current.moved) return;
                switchVisualGroup(((visualGroupIndex + 1) % 3) as 0 | 1 | 2);
              }}
              aria-label={`Switch Visual Preset Group (${visualPresetGroups[visualGroupIndex].groupLabelZh})`}
              title={`当前：${visualPresetGroups[visualGroupIndex].groupLabelZh}（点击或左右滑动切换）`}
              className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-[10px] font-mono tracking-wider border transition-all ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-neutral-600 hover:text-white'
                  : 'border-neutral-200 bg-neutral-100/90 text-neutral-700 hover:border-neutral-400 hover:text-neutral-950'
              }`}
            >
              <span className="inline-block w-[3ch] text-center font-semibold">{visualPresetGroups[visualGroupIndex].groupCode}</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      visualGroupIndex === idx
                        ? isDark
                          ? 'bg-zinc-100 scale-110'
                          : 'bg-zinc-900 scale-110'
                        : isDark
                          ? 'bg-neutral-700'
                          : 'bg-neutral-300'
                    }`}
                  />
                ))}
              </span>
            </button>

            {/* Sliding Tri-Group Viewport (Grid 1x1 Overlay keeps intrinsic 4-button width) */}
            <div className="grid grid-cols-1 grid-rows-1 overflow-hidden rounded-full">
              {visualPresetGroups.map((group, gIdx) => {
                const isActiveGroup = visualGroupIndex === gIdx;
                const offsetPercent = (gIdx - visualGroupIndex) * 100;
                return (
                  <div
                    key={group.groupId}
                    aria-hidden={!isActiveGroup}
                    style={{
                      transform: `translate3d(calc(${offsetPercent}% + ${capsuleDragX}px), 0, 0)`,
                      transition: capsuleDragX !== 0
                        ? 'none'
                        : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
                      opacity: isActiveGroup ? 1 : 0,
                      pointerEvents: isActiveGroup ? 'auto' : 'none'
                    }}
                    className="col-start-1 row-start-1 flex items-center gap-1"
                  >
                    {group.items.map((p) => {
                      const Icon = p.icon;
                      const isSelected = visualPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (capsuleSwipeRef.current.moved) return;
                            setVisualGroupIndex(gIdx as 0 | 1 | 2);
                            setVisualPreset(p.id);
                          }}
                          aria-pressed={isSelected}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                            isSelected
                              ? isDark
                                ? 'bg-zinc-100/15 text-zinc-100 font-semibold border border-zinc-300/40 shadow-[0_0_10px_rgba(244,244,245,0.18)]'
                                : 'bg-zinc-900/10 text-zinc-900 font-semibold border border-zinc-400 shadow-sm'
                              : isDark
                                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                                : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 border border-transparent'
                          }`}
                          title={`${p.labelZh} (${p.label}) · 左右滑动切换组`}
                        >
                          <Icon size={12} strokeWidth={1.75} />
                          <span className="hidden sm:inline text-[11px]">{p.labelZh}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Capsule (Interactive) */}
          <div className="pointer-events-auto">
            <StatusCapsule
              stage={clockSnapshot.currentStage}
              stageProgress={clockSnapshot.stageProgress}
              remainingSeconds={clockSnapshot.stageRemainingSeconds}
              isPlaying={isPlaying}
              isDarkTheme={isDark}
              onTogglePlay={togglePlayPause}
              className="!static !bottom-auto !left-auto !translate-x-0"
            />
          </div>
        </div>
      </main>

      {/* 4. Slide-Up Hardware Deck Console Drawer */}
      {isDeckOpen && (
        <div
          role="dialog"
          aria-label="Acoustic Control Console"
          className={`fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto z-30 p-4 border-t shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            isDark
              ? 'bg-[#09090b]/95 border-neutral-800 text-slate-100'
              : 'bg-[#fcfbf9]/95 border-neutral-300 text-neutral-800'
          }`}
        >
          <div className="max-w-6xl mx-auto space-y-4">
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-neutral-800/80' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-sky-400" />
                <span className="text-xs font-mono font-medium tracking-wider uppercase">
                  Acoustic Control Console &amp; Modulation · 物理声学控制台
                </span>
              </div>
              <button
                onClick={() => setIsDeckOpen(false)}
                className={`p-1 rounded transition-colors ${
                  isDark
                    ? 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800'
                }`}
                aria-label="Close Console"
              >
                <X size={16} />
              </button>
            </div>

            <HardwareDeck
              channelStrip={channelStrip}
              effects={effects}
              modulationRoutes={modulationRoutes}
              onModulationRoutesChange={setModulationRoutes}
              breathMacro={clockSnapshot.breathMacro}
              breathStage={clockSnapshot.currentStage}
              stageProgress={clockSnapshot.stageProgress}
              isPlaying={isPlaying}
              clockSnapshot={clockSnapshot}
              onChannelStripChange={handleChannelStripChange}
              onEffectsChange={handleEffectsChange}
              onModulationRouteAssign={handleModulationRouteAssign}
              getVisualGrains={() => audioEngineRef.current?.getVisualGrains() ?? []}
              getAudioCurrentTime={() => audioEngineRef.current?.getAudioCurrentTime() ?? 0}
              onReorderEffects={handleReorderEffects}
              sourceRoutes={sourceRoutes}
              onSourceRouteChange={handleSourceRouteChange}
              laneAOrder={laneAOrder}
              laneBOrder={laneBOrder}
              onLaneReorder={handleLaneReorder}
              onMoveEffectBetweenLanes={handleMoveEffectBetweenLanes}
              onAddEffectToLane={handleAddEffectToLane}
              onRemoveEffectFromLane={handleRemoveEffectFromLane}
            />
          </div>
        </div>
      )}

      {/* 5. Bottom Sheet Drawer for Breath Rhythms */}
      <BottomSheetDrawer
        isOpen={isRhythmDrawerOpen}
        isDark={isDark}
        onClose={() => setIsRhythmDrawerOpen(false)}
        title="Select Breath Rhythm"
        subTitle="选择呼吸节律"
        items={rhythmDrawerItems}
        selectedId={activeRhythmKey}
        onSelect={handleRhythmSelect}
        headerAction={
          <button
            type="button"
            onClick={() => {
              setEditingRhythm(null);
              setIsCustomRhythmModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50 transition-colors"
            title="新增自定义呼吸模式"
          >
            <Plus size={12} strokeWidth={2.2} />
            <span>自定义节律</span>
          </button>
        }
      />

      {/* 6. Bottom Sheet Drawer for Sound Therapy Presets (Dual-column grid without long descriptions) */}
      <BottomSheetDrawer
        isOpen={isSoundDrawerOpen}
        isDark={isDark}
        onClose={() => setIsSoundDrawerOpen(false)}
        title="选择声疗音色预设"
        subTitle="Sound Therapy Presets"
        items={soundDrawerItems}
        selectedId={activeSoundPresetKey}
        onSelect={handleSoundPresetSelect}
        columns={2}
        hideDescription={true}
      />

      {/* 7. Save Custom Sound Preset Modal Dialog */}
      {isSavePresetModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setIsSavePresetModalOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Save Sound Preset"
            className={`relative w-full max-w-sm rounded-xl border p-5 shadow-2xl transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-950 text-slate-100'
                : 'border-neutral-200 bg-white text-neutral-900 shadow-xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <BookmarkPlus size={16} className="text-sky-400" />
                <h2 className={`text-xs font-semibold tracking-wider uppercase ${
                  isDark ? 'text-slate-100' : 'text-neutral-900'
                }`}>
                  保存自定义声疗预设 · Save Preset
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            {/* Mode Selector for Current User Preset */}
            {isCurrentUserPreset && (
              <div className={`flex items-center gap-1.5 p-1 rounded-lg border mb-4 ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setSaveMode('overwrite')}
                  className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                    saveMode === 'overwrite'
                      ? isDark
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40'
                        : 'bg-white text-sky-600 font-semibold border border-sky-300 shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  覆盖当前预设
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode('new')}
                  className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                    saveMode === 'new'
                      ? isDark
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40'
                        : 'bg-white text-sky-600 font-semibold border border-sky-300 shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  存为新预设
                </button>
              </div>
            )}

            <form onSubmit={handleSavePreset} className="space-y-4">
              {saveMode === 'overwrite' && isCurrentUserPreset ? (
                <div className={`p-3 rounded-lg border text-xs leading-relaxed font-mono ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                    : 'border-sky-200 bg-sky-50 text-sky-800'
                }`}>
                  将用当前面板全部旋钮、波表、推子与呼吸调制路由直接覆盖已存在的预设「{activeSoundPresetLabel}」。
                </div>
              ) : (
                <div>
                  <label className={`text-[10px] uppercase font-medium block mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-neutral-600'
                  }`}>
                    预设名称 · Preset Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="例如：深海脑波微风、夏夜颂钵"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-sky-500 font-sans transition-colors ${
                      isDark
                        ? 'border-neutral-800 bg-neutral-900 text-slate-100 placeholder:text-slate-500'
                        : 'border-neutral-300 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400'
                    }`}
                  />
                </div>
              )}

              <div className={`text-[10px] p-2.5 rounded-lg border leading-relaxed font-mono ${
                isDark
                  ? 'text-slate-400 bg-neutral-900/60 border-neutral-800/60'
                  : 'text-neutral-600 bg-neutral-50 border-neutral-200'
              }`}>
                将当前 OSC A 波表及参数、OSC B 气流噪声、Drone 432Hz、模拟滤波器、双 LFO 与空间效果器完整保存至本地存储。
              </div>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                isDark ? 'border-neutral-800' : 'border-neutral-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsSavePresetModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isDark
                      ? 'border-neutral-800 text-slate-400 hover:text-slate-200'
                      : 'border-neutral-300 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-neutral-950 shadow-sm transition-colors"
                >
                  {saveMode === 'overwrite' && isCurrentUserPreset ? '确认覆盖' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 8. Rename Custom Preset Modal Dialog */}
      {editingPreset && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setEditingPreset(null)}
        >
          <div
            role="dialog"
            aria-label="Rename Sound Preset"
            className={`relative w-full max-w-sm rounded-xl border p-5 shadow-2xl transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-950 text-slate-100'
                : 'border-neutral-200 bg-white text-neutral-900 shadow-xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <Edit2 size={15} className="text-sky-400" />
                <h2 className={`text-xs font-semibold tracking-wider uppercase ${
                  isDark ? 'text-slate-100' : 'text-neutral-900'
                }`}>
                  重命名预设 · Rename Preset
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingPreset(null)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} className="space-y-4">
              <div>
                <label className={`text-[10px] uppercase font-medium block mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-neutral-600'
                }`}>
                  输入新名称 · New Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={editingPresetName}
                  onChange={e => setEditingPresetName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-sky-500 font-sans transition-colors ${
                    isDark
                      ? 'border-neutral-800 bg-neutral-900 text-slate-100 placeholder:text-slate-500'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                isDark ? 'border-neutral-800' : 'border-neutral-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isDark
                      ? 'border-neutral-800 text-slate-400 hover:text-slate-200'
                      : 'border-neutral-300 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-neutral-950 shadow-sm transition-colors"
                >
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 9. Delete Custom Preset Confirmation Dialog */}
      {deletingPreset && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setDeletingPreset(null)}
        >
          <div
            role="alertdialog"
            aria-label="Delete Sound Preset Confirmation"
            className={`relative w-full max-w-sm rounded-xl border p-5 shadow-2xl transition-colors ${
              isDark
                ? 'border-rose-500/30 bg-neutral-950 text-slate-100'
                : 'border-rose-300 bg-white text-neutral-900 shadow-xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-rose-400" />
                <h2 className="text-xs font-semibold tracking-wider uppercase text-rose-400">
                  删除预设确认 · Delete Preset
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeletingPreset(null)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <p className={`text-xs leading-relaxed font-sans ${
                isDark ? 'text-slate-300' : 'text-neutral-700'
              }`}>
                确定要删除自定义预设「<span className="font-semibold text-rose-400">{deletingPreset.name}</span>」吗？
              </p>
              <p className={`text-[10px] font-mono p-2 rounded border ${
                isDark
                  ? 'text-slate-400 bg-rose-500/10 border-rose-500/20'
                  : 'text-rose-800 bg-rose-50 border-rose-200'
              }`}>
                此操作将从本地存储彻底移除该预设，无法撤销。
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <button
                type="button"
                onClick={() => setDeletingPreset(null)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  isDark
                    ? 'border-neutral-800 text-slate-400 hover:text-slate-200'
                    : 'border-neutral-300 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 9b. Delete Custom Rhythm Confirmation Dialog */}
      {deletingRhythm && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setDeletingRhythm(null)}
        >
          <div
            role="alertdialog"
            aria-label="Delete Breath Rhythm Confirmation"
            className={`relative w-full max-w-sm rounded-xl border p-5 shadow-2xl transition-colors ${
              isDark
                ? 'border-rose-500/30 bg-neutral-950 text-slate-100'
                : 'border-rose-300 bg-white text-neutral-900 shadow-xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-rose-400" />
                <h2 className="text-xs font-semibold tracking-wider uppercase text-rose-400">
                  删除节律确认 · Delete Rhythm
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeletingRhythm(null)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <p className={`text-xs leading-relaxed font-sans ${
                isDark ? 'text-slate-300' : 'text-neutral-700'
              }`}>
                确定要删除自定义呼吸节律「<span className="font-semibold text-rose-400">{deletingRhythm.name}</span>」吗？
              </p>
              <p className={`text-[10px] font-mono p-2 rounded border ${
                isDark
                  ? 'text-slate-400 bg-rose-500/10 border-rose-500/20'
                  : 'text-rose-800 bg-rose-50 border-rose-200'
              }`}>
                此操作将从本地存储彻底移除该自定义呼吸模式，无法撤销。
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <button
                type="button"
                onClick={() => setDeletingRhythm(null)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  isDark
                    ? 'border-neutral-800 text-slate-400 hover:text-slate-200'
                    : 'border-neutral-300 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRhythm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 9c. Custom Breath Rhythm Modal */}
      <CustomRhythmModal
        isOpen={isCustomRhythmModalOpen}
        onClose={() => {
          setIsCustomRhythmModalOpen(false);
          setEditingRhythm(null);
        }}
        onSave={handleSaveCustomRhythm}
        initialRhythm={editingRhythm}
        isDark={isDark}
      />

      {/* 10. Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        cueSettings={cueSettings}
        onCueSettingsChange={handleCueSettingsChange}
        audioContext={audioEngineRef.current?.getContext()}
      />
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <SynhaleApp />
    </ThemeProvider>
  );
}
