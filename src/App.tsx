import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
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
  Plus,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import { ThemeProvider, useTheme } from './ui/theme';
import { CenterBreathIndicator } from './ui/components/indicator';
import { BreathBeadStrand } from './ui/components/tracker/BreathBeadStrand';
import {
  loadIndicatorOpacity,
  saveIndicatorOpacity,
  loadIndicatorPrecision,
  saveIndicatorPrecision,
  type IndicatorPrecision
} from './visuals/indicatorConfig';
import {
  loadCycleTrackerSettings,
  saveCycleTrackerSettings,
  type CycleTrackerSettings
} from './visuals/cycleTrackerConfig';
import { HardwareDeck } from './ui/components/deck';
import { BottomSheetDrawer, DrawerItem } from './ui/components/drawer';
import { SettingsModal, CustomRhythmModal } from './ui/components/settings';
import {
  loadCueSettings,
  saveCueSettings,
  type BreathCueSettings,
  type BreathTransitionNode
} from './audio/cue/breathCueConfig';
import { playCueSound, preloadAllCueSounds, stopCueSounds } from './audio/cue/breathCuePlayer';
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
  DEFAULT_OSC_A_PARAMS,
  DEFAULT_GRANULAR_PARAMS,
  DEFAULT_AMBIENT_PARAMS,
  DEFAULT_EQ_PARAMS,
  type GranularParams,
  type AmbientSoundscapeParams,
  type LaneId,
  type SoundSourceId,
  type SoundSourceType,
  type SourceRouteMap,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  getEffectModuleType,
  getDefaultEffectParams,
  getSoundSourceType,
  generateNextSourceInstanceId,
  EFFECT_MODULE_RULES
} from './types/audio';
import { DEFAULT_MODULATION_ROUTES } from './ui/components/deck/HardwareDeck';
import { useModalDialog } from './ui/hooks/useModalDialog';

const INITIAL_SNAPSHOT: BreathClockSnapshot = {
  isPlaying: false,
  currentStage: 'inhale',
  stageProgress: 0,
  stageRemainingSeconds: 4.0,
  cycleProgress: 0,
  breathMacro: 0,
  cycleCount: 0
};

export type DraggingModule =
  | { kind: 'effect'; effectId: string; lane: 'laneA' | 'laneB' | 'staged'; effectName: string }
  | { kind: 'source'; sourceId: string; sourceType: SoundSourceType; sourceName: string }
  | null;

function SynhaleApp(): React.JSX.Element {
  const { isDark, toggleTheme, palette, setThemeId } = useTheme();
  const themeBgRef = useRef<string>(palette.bg);

  // Engine references
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const breathEngineRef = useRef<BreathEngine | null>(null);
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronous state refs for requestAnimationFrame loops
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const playbackPendingRef = useRef(false);
  const isPlayingRef = useRef<boolean>(false);
  const visualPresetRef = useRef<VisualPresetId>('spacetimeWarp');
  const clockSnapshotRef = useRef<BreathClockSnapshot>(INITIAL_SNAPSHOT);
  const isDarkRef = useRef<boolean>(isDark);

  // Reactive UI state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [operationError, setOperationError] = useState<string | null>(null);
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
  const [channelStrip, setChannelStrip] = useState<ChannelStripParams>(() => {
    const initial = SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID]?.channelStrip || DEFAULT_CHANNEL_STRIP;
    const res: ChannelStripParams = {
      ...DEFAULT_CHANNEL_STRIP,
      ...initial,
      oscA: { ...DEFAULT_CHANNEL_STRIP.oscA, ...(initial.oscA || {}) },
      granular: { ...DEFAULT_GRANULAR_PARAMS, ...(DEFAULT_CHANNEL_STRIP.granular || {}), ...(initial.granular || {}) },
      oscB: { ...DEFAULT_CHANNEL_STRIP.oscB, ...(initial.oscB || {}) },
      drone: { ...DEFAULT_CHANNEL_STRIP.drone, ...(initial.drone || {}) },
      ambient: { ...DEFAULT_AMBIENT_PARAMS, ...(DEFAULT_CHANNEL_STRIP.ambient || {}), ...(initial.ambient || {}) },
      instances: {}
    };
    return res;
  });
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
  const soundStateRef = useRef({ channelStrip, effects, modulationRoutes });
  soundStateRef.current = { channelStrip, effects, modulationRoutes };

  const [isDeckOpen, setIsDeckOpen] = useState<boolean>(false);
  const [draggingModule, setDraggingModule] = useState<DraggingModule>(null);
  const [stagedEffectIds, setStagedEffectIds] = useState<string[]>([]);
  const [activeSources, setActiveSources] = useState<string[]>([
    'oscA', 'granular', 'oscB', 'drone', 'ambient'
  ]);
  const [hoveredHudBay, setHoveredHudBay] = useState<string | null>(null);
  const [isRhythmDrawerOpen, setIsRhythmDrawerOpen] = useState<boolean>(false);
  const [activeRhythmKey, setActiveRhythmKey] = useState<string>('box');
  const [userRhythms, setUserRhythms] = useState<UserRhythmConfig[]>(() => getUserRhythms());
  const [isCustomRhythmModalOpen, setIsCustomRhythmModalOpen] = useState<boolean>(false);
  const [editingRhythm, setEditingRhythm] = useState<UserRhythmConfig | null>(null);
  const [deletingRhythm, setDeletingRhythm] = useState<{ id: string; name: string } | null>(null);
  const saveDialogRef = useModalDialog(isSavePresetModalOpen, () => setIsSavePresetModalOpen(false));
  const renameDialogRef = useModalDialog(!!editingPreset, () => setEditingPreset(null));
  const deletePresetDialogRef = useModalDialog(!!deletingPreset, () => setDeletingPreset(null));
  const deleteRhythmDialogRef = useModalDialog(!!deletingRhythm, () => setDeletingRhythm(null));

  useEffect(() => {
    setOperationError(null);
  }, [isSavePresetModalOpen, editingPreset, deletingPreset, deletingRhythm]);

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

  // Central Breath Indicator Opacity (0..100, default 20% softest)
  const [indicatorOpacity, setIndicatorOpacity] = useState<number>(() => loadIndicatorOpacity());
  const handleIndicatorOpacityChange = useCallback((newOpacity: number) => {
    setIndicatorOpacity(newOpacity);
    saveIndicatorOpacity(newOpacity);
  }, []);

  // Central Breath Indicator Precision ('decimal' | 'integer')
  const [indicatorPrecision, setIndicatorPrecision] = useState<IndicatorPrecision>(() => loadIndicatorPrecision());
  const handleIndicatorPrecisionChange = useCallback((newPrecision: IndicatorPrecision) => {
    setIndicatorPrecision(newPrecision);
    saveIndicatorPrecision(newPrecision);
  }, []);

  // Breath Cycle Bead Strand (ambient number-free cycle progress, left edge of the stage)
  const [cycleTrackerSettings, setCycleTrackerSettings] = useState<CycleTrackerSettings>(() => loadCycleTrackerSettings());
  const cycleTrackerRef = useRef<CycleTrackerSettings>(cycleTrackerSettings);
  cycleTrackerRef.current = cycleTrackerSettings;

  const handleCycleTrackerSettingsChange = useCallback((newSettings: CycleTrackerSettings) => {
    setCycleTrackerSettings(newSettings);
    cycleTrackerRef.current = newSettings;
    saveCycleTrackerSettings(newSettings);
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
      api.isMaximized().then((max: boolean) => {
        if (mountedRef.current) setIsMaximized(max);
      }).catch(() => {});
      const unsub = api.onMaximizeChange((max: boolean) => {
        if (!mountedRef.current) return;
        setIsMaximized(max);
        requestAnimationFrame(() => {
          if (mountedRef.current && canvasRef.current) {
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

  // Defensive global safety net: ensure dragging state is cleared on dragend or drop
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggingModule(null);
      setHoveredHudBay(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  // Keep refs in sync
  isDarkRef.current = isDark;
  themeBgRef.current = palette.bg;
  visualPresetRef.current = visualPreset;
  isPlayingRef.current = isPlaying;

  // 0ms Hard Cut pause shared by the manual toggle & the bead-strand session conclusion
  const pausePlaybackNow = useCallback(() => {
    stopCueSounds(audioEngineRef.current?.getContext());
    audioEngineRef.current?.executeZeroResidueHardCut();
    breathEngineRef.current?.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  // 1. Initialize Breath Engine & Master Clock Subscriber
  useEffect(() => {
    mountedRef.current = true;
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

    // Auto-conclude the session when the bead strand fills: soft pause
    const unsubCycle = breathEngine.onCycleComplete((count) => {
      if (count >= cycleTrackerRef.current.capacity) {
        pausePlaybackNow();
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      unsubStage();
      unsubCycle();
      breathEngine.dispose();
      canvasRenderer.stop();
      if (audioEngineRef.current) {
        stopCueSounds(audioEngineRef.current.getContext());
        audioEngineRef.current.dispose();
        audioEngineRef.current = null;
      }
      breathEngineRef.current = null;
    };
  }, [pausePlaybackNow]);

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
    const handleDprChange = () => {
      updateDPI();
      watchDpr();
    };
    const watchDpr = () => {
      dprMediaQuery?.removeEventListener?.('change', handleDprChange);
      if (!window.matchMedia) return;
      dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      if (typeof dprMediaQuery.addEventListener === 'function') {
        dprMediaQuery.addEventListener('change', handleDprChange);
      }
    };
    watchDpr();

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
        background: themeBgRef.current,
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
          await engine.init({ muted: true });
          if (!mountedRef.current || audioEngineRef.current !== engine) {
            engine.dispose();
            return;
          }
          // Mute master output and set initial hard cut state to load preset in silence without DAC click
          engine.executeZeroResidueHardCut();
          const current = soundStateRef.current;
          engine.loadSoundPreset({
            ...getSoundPresetById(DEFAULT_SOUND_PRESET_ID),
            channelStrip: current.channelStrip,
            effects: current.effects,
            modulationRoutes: current.modulationRoutes
          });
          if (sourceRoutesRef.current) {
            for (const [srcId, lane] of Object.entries(sourceRoutesRef.current)) {
              engine.setSourceRoute(srcId as SoundSourceId, lane as LaneId);
            }
          }
          if (laneAOrderRef.current) engine.reorderLaneEffects('laneA', laneAOrderRef.current);
          if (laneBOrderRef.current) engine.reorderLaneEffects('laneB', laneBOrderRef.current);
          preloadAllCueSounds(engine.getContext());
        }
      } catch (error) {
        audioEngineRef.current?.dispose();
        audioEngineRef.current = null;
        throw error;
      }
    })();
    initPromiseRef.current = initTask;
    try {
      await initTask;
    } finally {
      if (initPromiseRef.current === initTask) initPromiseRef.current = null;
    }
  }, []);

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
    if (isPlayingRef.current) {
      pausePlaybackNow();
      return;
    }
    if (playbackPendingRef.current) return;
    playbackPendingRef.current = true;
    setOperationError(null);
    try {
      await ensureAudioInitialized();
      const audioEngine = audioEngineRef.current;
      const breathEngine = breathEngineRef.current;
      if (!mountedRef.current || !audioEngine || !breathEngine) return;
      await audioEngine.resume();
      if (!mountedRef.current || audioEngineRef.current !== audioEngine) return;
      // Bead strand full: begin a fresh session (beads cleared, back to inhale start)
      if (breathEngine.getSnapshot().cycleCount >= cycleTrackerRef.current.capacity) {
        breathEngine.stop();
      }
      breathEngine.resume();
      isPlayingRef.current = true;
      setIsPlaying(true);
    } catch {
      audioEngineRef.current?.executeZeroResidueHardCut();
      if (mountedRef.current) setOperationError('音频启动失败，请检查设备');
    } finally {
      playbackPendingRef.current = false;
    }
  }, [ensureAudioInitialized, pausePlaybackNow]);

  // 5. Canvas Tap Handlers (Constrained to central breathing geometry area)
  const pointerHandlers = useMemo(() => {
    return createCanvasPointerHandlers(
      () => {
        togglePlayPause();
      },
      undefined,
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
          : prev.ambient,
        instances: params.instances
          ? {
              ...(prev.instances || {}),
              ...Object.fromEntries(
                Object.entries(params.instances).map(([key, val]) => [
                  key,
                  { ...(prev.instances?.[key] || {}), ...val }
                ])
              )
            }
          : prev.instances
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
    // Compute nextA/nextB synchronously from ref state to avoid stale
    // closure reads. Previous implementation captured nextA/nextB through
    // setState updaters and then read them in setEffects(...) — that relied
    // on updater call ordering and broke under React 18 batching / Strict
    // Mode double-invoke semantics.
    const currentA = laneAOrderRef.current;
    const currentB = laneBOrderRef.current;
    let nextA: string[];
    let nextB: string[];
    if (targetLane === 'laneA') {
      nextB = currentB.filter(id => id !== effectId);
      nextA = currentA.includes(effectId) ? currentA : [...currentA, effectId];
    } else {
      nextA = currentA.filter(id => id !== effectId);
      nextB = currentB.includes(effectId) ? currentB : [...currentB, effectId];
    }
    laneAOrderRef.current = nextA;
    laneBOrderRef.current = nextB;
    setLaneAOrder(nextA);
    setLaneBOrder(nextB);
    setEffects(prev => ({
      ...prev,
      laneAOrder: nextA,
      laneBOrder: nextB
    }));
    if (audioEngineRef.current?.moveEffectBetweenLanes) {
      audioEngineRef.current.moveEffectBetweenLanes(effectId, targetLane);
    }
  }, []);

  const handleAddEffectToLane = useCallback((lane: 'laneA' | 'laneB', effectId: string, index?: number) => {
    const currentA = laneAOrderRef.current;
    const currentB = laneBOrderRef.current;
    let nextA: string[];
    let nextB: string[];

    if (lane === 'laneA') {
      const filteredA = currentA.filter(id => id !== effectId);
      if (index === undefined || index >= filteredA.length) {
        nextA = [...filteredA, effectId];
      } else {
        nextA = [...filteredA];
        nextA.splice(Math.max(0, index), 0, effectId);
      }
      nextB = currentB.filter(id => id !== effectId);
    } else {
      const filteredB = currentB.filter(id => id !== effectId);
      if (index === undefined || index >= filteredB.length) {
        nextB = [...filteredB, effectId];
      } else {
        nextB = [...filteredB];
        nextB.splice(Math.max(0, index), 0, effectId);
      }
      nextA = currentA.filter(id => id !== effectId);
    }

    laneAOrderRef.current = nextA;
    laneBOrderRef.current = nextB;
    setLaneAOrder(nextA);
    setLaneBOrder(nextB);

    const baseType = getEffectModuleType(effectId);
    const initialParams = getDefaultEffectParams(baseType);

    setEffects(prev => ({
      ...prev,
      laneAOrder: nextA,
      laneBOrder: nextB,
      instances: {
        ...(prev.instances || {}),
        [effectId]: (prev.instances && prev.instances[effectId]) ? prev.instances[effectId] : initialParams
      }
    }));
    if (audioEngineRef.current?.addEffectToLane) {
      audioEngineRef.current.addEffectToLane(lane, effectId, index);
    }
  }, []);

  const handleStageEffect = useCallback((effectId: string, fromLane: 'laneA' | 'laneB' | 'staged') => {
    if (fromLane === 'laneA') {
      const nextA = laneAOrderRef.current.filter(id => id !== effectId);
      laneAOrderRef.current = nextA;
      setLaneAOrder(nextA);
      setEffects(e => ({ ...e, laneAOrder: nextA }));
      audioEngineRef.current?.removeEffectFromLane?.('laneA', effectId);
    } else if (fromLane === 'laneB') {
      const nextB = laneBOrderRef.current.filter(id => id !== effectId);
      laneBOrderRef.current = nextB;
      setLaneBOrder(nextB);
      setEffects(e => ({ ...e, laneBOrder: nextB }));
      audioEngineRef.current?.removeEffectFromLane?.('laneB', effectId);
    }
    setStagedEffectIds(prev => (prev.includes(effectId) ? prev : [...prev, effectId]));
    setDraggingModule(null);
  }, []);

  const handleUnstageEffect = useCallback((effectId: string, targetLane: 'laneA' | 'laneB', targetIndex?: number) => {
    setStagedEffectIds(prev => prev.filter(id => id !== effectId));
    handleAddEffectToLane(targetLane, effectId, targetIndex);
    setDraggingModule(null);
  }, [handleAddEffectToLane]);

  const handleDuplicateSource = useCallback((sourceId: string) => {
    const sourceType = getSoundSourceType(sourceId);
    const newId = generateNextSourceInstanceId(sourceType, activeSources);

    // Assemble complete fallback defaults for the source type to guarantee full parameter integrity
    let baseDefaults: any = {};
    switch (sourceType) {
      case 'oscA':
        baseDefaults = { ...DEFAULT_OSC_A_PARAMS, ...DEFAULT_CHANNEL_STRIP.oscA };
        break;
      case 'granular':
        baseDefaults = { ...DEFAULT_GRANULAR_PARAMS, ...DEFAULT_CHANNEL_STRIP.granular };
        break;
      case 'oscB':
        baseDefaults = { ...DEFAULT_CHANNEL_STRIP.oscB };
        break;
      case 'drone':
        baseDefaults = { ...DEFAULT_CHANNEL_STRIP.drone };
        break;
      case 'ambient':
        baseDefaults = { ...DEFAULT_AMBIENT_PARAMS, ...DEFAULT_CHANNEL_STRIP.ambient };
        break;
    }

    const existingParams = channelStrip.instances?.[sourceId] || (channelStrip as any)[sourceType] || {};
    const fullSourceParams = {
      ...baseDefaults,
      ...existingParams
    };

    let clonedParams: any;
    try {
      clonedParams = structuredClone(fullSourceParams);
    } catch (err) {
      console.warn('App.handleDuplicateSource: structuredClone failed, falling back to spread clone', err);
      clonedParams = { ...fullSourceParams };
    }
    const currentRoute = sourceRoutes[sourceId] || 'laneA';

    if (audioEngineRef.current?.addSoundSource) {
      audioEngineRef.current.addSoundSource(newId, sourceType, clonedParams, currentRoute);
    }

    setActiveSources(prev => {
      const idx = prev.indexOf(sourceId);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx + 1, 0, newId);
        return next;
      }
      return [...prev, newId];
    });
    setSourceRoutes(prev => {
      const next = { ...prev, [newId]: currentRoute };
      sourceRoutesRef.current = next;
      return next;
    });
    setChannelStrip(prev => ({
      ...prev,
      instances: {
        ...(prev.instances || {}),
        [newId]: clonedParams
      }
    }));
    setDraggingModule(null);
  }, [activeSources, channelStrip, sourceRoutes]);

  const handleDeleteSource = useCallback((sourceId: string) => {
    if (activeSources.length <= 1) {
      setOperationError('至少保留一个发生器');
      setDraggingModule(null);
      return;
    }

    if (audioEngineRef.current?.removeSoundSource) {
      audioEngineRef.current.removeSoundSource(sourceId);
    }

    setActiveSources(prev => prev.filter(id => id !== sourceId));
    setSourceRoutes(prev => {
      const next = { ...prev };
      delete next[sourceId as SoundSourceId];
      sourceRoutesRef.current = next;
      return next;
    });
    setChannelStrip(prev => {
      const nextInstances = { ...(prev.instances || {}) };
      delete nextInstances[sourceId];
      return {
        ...prev,
        instances: nextInstances
      };
    });
    setDraggingModule(null);
  }, [activeSources]);

  const handleRemoveEffectFromLane = useCallback((lane: 'laneA' | 'laneB', effectId: string) => {
    if (lane === 'laneA') {
      const next = laneAOrderRef.current.filter(id => id !== effectId);
      laneAOrderRef.current = next;
      setLaneAOrder(next);
      setEffects(e => ({ ...e, laneAOrder: next }));
    } else {
      const next = laneBOrderRef.current.filter(id => id !== effectId);
      laneBOrderRef.current = next;
      setLaneBOrder(next);
      setEffects(e => ({ ...e, laneBOrder: next }));
    }
    if (audioEngineRef.current?.removeEffectFromLane) {
      audioEngineRef.current.removeEffectFromLane(lane, effectId);
    }
  }, []);

  // 7. Rhythm Presets Drawer (5 Canonical Factory + User Custom Rhythms)
  const rhythmDrawerItems: DrawerItem[] = useMemo(() => {
    const factoryItems: DrawerItem[] = [
      { id: 'box', label: 'Box 4-4-4-4', description: '战术清醒 · 心理减压', badge: '16s' },
      { id: 'sleep', label: 'Relax 4-7-8', description: '延长呼气 · 助眠松弛', badge: '19s' },
      { id: 'coherent', label: 'Coherent 5.5s', description: '0.1Hz 心率共振', badge: '11s' },
      { id: 'prana', label: 'Prana Energize', description: '快速充氧 · 提神唤醒', badge: '10s' },
      { id: 'calm', label: 'Deep Calm', description: '颂钵声疗 · 冥想入定', badge: '14s' }
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
    if (!deleteUserRhythm(deletingRhythm.id)) {
      setOperationError('删除失败，存储不可用');
      return;
    }
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
      description: p.description,
      badge: p.badge
    }));
    const user = customPresets.map(p => ({
      id: p.id,
      label: p.name,
      description: p.description,
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
      const nextSourceRoutes = preset.effects?.sourceRoutes ?? { ...DEFAULT_SOURCE_ROUTES };
      const nextLaneAOrder = preset.effects?.laneAOrder ?? [...DEFAULT_LANE_A_ORDER];
      const nextLaneBOrder = preset.effects?.laneBOrder ?? [...DEFAULT_LANE_B_ORDER];
      setSourceRoutes(nextSourceRoutes);
      sourceRoutesRef.current = nextSourceRoutes;
      setLaneAOrder(nextLaneAOrder);
      laneAOrderRef.current = nextLaneAOrder;
      setLaneBOrder(nextLaneBOrder);
      laneBOrderRef.current = nextLaneBOrder;

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
    setOperationError(null);
    try {
      if (saveMode === 'overwrite' && isCurrentUserPreset) {
        const updated = updateUserPreset(activeSoundPresetKey, {
          channelStrip,
          effects,
          modulationRoutes
        });
        if (!updated) throw new Error('保存失败，存储不可用');
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
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    }
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPresetName.trim()) return;
    if (!renameUserPreset(editingPreset.id, editingPresetName.trim())) {
      setOperationError('重命名失败，存储不可用');
      return;
    }
    setCustomPresets(getUserPresets());
    setEditingPreset(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingPreset) return;
    const idToDelete = deletingPreset.id;
    if (!deleteUserPreset(idToDelete)) {
      setOperationError('删除失败，存储不可用');
      return;
    }
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

  // Floating Micro-HUD Tooltip for tactile visual preset dock
  const [activeVisualHint, setActiveVisualHint] = useState<{ labelZh: string; label: string } | null>(null);
  const visualHintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerVisualHint = useCallback((labelZh: string, label: string) => {
    if (visualHintTimerRef.current) clearTimeout(visualHintTimerRef.current);
    setActiveVisualHint({ labelZh, label });
    visualHintTimerRef.current = setTimeout(() => {
      setActiveVisualHint(null);
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (visualHintTimerRef.current) clearTimeout(visualHintTimerRef.current);
    };
  }, []);

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

  const handleNextVisualPreset = useCallback(() => {
    const allPresets = visualPresetGroups.flatMap(g => g.items);
    const currentIndex = allPresets.findIndex(p => p.id === visualPresetRef.current);
    const nextIndex = (currentIndex + 1) % allPresets.length;
    const nextPreset = allPresets[nextIndex];
    const targetGroupIdx = Math.floor(nextIndex / 4) as 0 | 1 | 2;

    setVisualGroupIndex(targetGroupIdx);
    setVisualPreset(nextPreset.id);
    triggerVisualHint(nextPreset.labelZh, nextPreset.label);
  }, [visualPresetGroups, triggerVisualHint]);

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

  // Mobile deck fit-to-width: the 900px hardware rail is zoomed down to the
  // viewport so the whole console is visible at a glance; native pinch-zoom
  // remains available for detail work. Floor of 0.36 keeps text above the
  // legibility cliff — narrower devices pan the remainder instead.
  useEffect(() => {
    if (!isDeckOpen) return;
    const applyFitZoom = () => {
      // Measure the drawer's clientWidth (excludes the vertical scrollbar) so
      // the zoomed rail fills the true usable width on every device.
      const drawer = document.querySelector('.synhale-deck-scope');
      const available = (drawer ? drawer.clientWidth : window.innerWidth) - 32; // p-4 both sides
      const fit = Math.min(1, Math.max(0.36, available / 900));
      document.documentElement.style.setProperty('--deck-fit-zoom', String(fit));
    };
    applyFitZoom();
    window.addEventListener('resize', applyFitZoom);
    return () => window.removeEventListener('resize', applyFitZoom);
  }, [isDeckOpen]);

  return (
    <div
      style={{ backgroundColor: 'var(--synhale-bg)' }}
      className={`relative w-screen h-screen max-md:h-dvh overflow-hidden flex flex-col font-sans select-none antialiased ${
        isDark ? 'text-slate-100' : 'text-neutral-800'
      } ${isElectronApp && !isMaximized ? 'ring-1 ring-inset ring-neutral-300 dark:ring-neutral-800/80' : ''}`}>
      {/* 1. Header Navigation Bar (Finalized Three-Anchor Header with Layout 1 Independent Modules) */}
      <header
        style={{ backgroundColor: 'var(--synhale-header-bg)' }}
        className={`shrink-0 border-b px-3 sm:px-5 py-2 flex items-center justify-between z-10 backdrop-blur-xl transition-colors titlebar-drag relative ${
          isDark
            ? 'border-neutral-800/80 text-slate-200'
            : 'border-neutral-200/80 text-neutral-800 shadow-sm'
        }`}>
        {/* Left Anchor: Brand & Audio Master Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 titlebar-no-drag">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isPlaying
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] scale-110'
                : 'bg-neutral-500 opacity-60'
            }`}
          />
          <span className="font-semibold tracking-[0.24em] text-xs uppercase font-sans max-md:hidden">
            Synhale
          </span>
        </div>

        {/* Center Anchor: Layout 1 - Two completely independent tactile modules.
            Absolutely centered against the full header width so wide right-side
            controls cannot push the pair off-center; falls back to flow layout
            on narrow viewports where true centering would collide. */}
        <div className="flex items-center gap-3 titlebar-no-drag absolute left-1/2 -translate-x-1/2 max-md:static max-md:left-auto max-md:translate-x-0">
          <button
            type="button"
            onClick={() => setIsRhythmDrawerOpen(true)}
            className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 transition-all shadow-2xs ${
              isDark
                ? 'border-neutral-700/80 bg-neutral-900/90 text-slate-200 hover:bg-neutral-800'
                : 'border-neutral-300 bg-neutral-100/90 text-neutral-800 hover:bg-white'
            }`}
            title="切换呼吸节律"
            aria-label="切换呼吸节律"
          >
            <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 max-md:hidden">RHYTHM</span>
            <span className="text-[11px] font-sans font-semibold tracking-tight tabular-nums">{activeRhythmLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSoundDrawerOpen(true)}
            className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 transition-all shadow-2xs ${
              isDark
                ? 'border-neutral-700/80 bg-neutral-900/90 text-slate-200 hover:bg-neutral-800'
                : 'border-neutral-300 bg-neutral-100/90 text-neutral-800 hover:bg-white'
            }`}
            title="切换音色"
            aria-label="切换音色"
          >
            <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 max-md:hidden">TIMBRE</span>
            <span className="text-[11px] font-sans font-semibold tracking-tight">{activeSoundPresetLabel}</span>
          </button>
        </div>

        {/* Right Anchor: Deck Console, Settings & Native Window Controls */}
        <div className="flex items-center gap-1.5 titlebar-no-drag">
          <button
            type="button"
            onClick={() => setIsDeckOpen(prev => !prev)}
            className={`h-7 px-2.5 rounded-md border font-sans text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-2xs ${
              isDeckOpen
                ? isDark
                  ? 'border-sky-500 bg-neutral-900 text-sky-300'
                  : 'border-sky-500 bg-white text-sky-700'
                : isDark
                  ? 'border-neutral-700/80 bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
                  : 'border-neutral-300 bg-neutral-100/90 text-neutral-700 hover:bg-white'
            }`}
            title="开关调制台"
            aria-label="开关调制台"
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${
              isDeckOpen
                ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]'
                : 'bg-neutral-400 dark:bg-neutral-600'
            }`} />
            <span className="tracking-wider">DECK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSettingsModalOpen(true);
              // Ensure the audio engine exists before the user previews a cue
              // sound in settings; otherwise the first preview click plays the
              // synthetic fallback because samples are not loaded yet.
              void ensureAudioInitialized();
            }}
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors shadow-2xs ${
              isDark
                ? 'border-neutral-700/80 bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                : 'border-neutral-300 bg-neutral-100/90 text-neutral-700 hover:bg-white hover:text-neutral-950'
            }`}
            title="设置"
            aria-label="打开设置"
          >
            <Settings size={13} />
          </button>

          {/* Integrated Desktop Native Window Controls (Frameless Minimize / Maximize / Close) */}
          {isElectronApp && (
            <div className="flex items-center gap-0.5 ml-1.5 pl-2 border-l border-neutral-700/60 dark:border-neutral-800/80 titlebar-no-drag z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (window as any).electronAPI?.minimize();
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors titlebar-no-drag ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
                title="最小化"
                aria-label="Minimize Window"
              >
                <Minus size={13} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (window as any).electronAPI?.toggleMaximize();
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors titlebar-no-drag ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
                title={isMaximized ? "还原" : "最大化"}
                aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
              >
                {isMaximized ? <Copy size={11} strokeWidth={2} className="rotate-90" /> : <Square size={11} strokeWidth={2} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (window as any).electronAPI?.close();
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors titlebar-no-drag ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-rose-500/80 active:bg-rose-600'
                    : 'text-neutral-600 hover:text-white hover:bg-rose-500 active:bg-rose-600'
                }`}
                title="关闭"
                aria-label="Close Window"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </header>

      {operationError && (
        <div role="alert" className={`fixed top-16 left-1/2 z-[150] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          isDark ? 'border-rose-900 bg-neutral-950 text-rose-200' : 'border-rose-200 bg-white text-rose-800'
        }`}>
          {operationError}
        </div>
      )}

      {/* 2. Fullscreen Sacred Geometry Canvas */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-pointer z-0"
          onPointerDown={pointerHandlers.onPointerDown}
          onPointerUp={pointerHandlers.onPointerUp}
          onPointerCancel={pointerHandlers.onPointerCancel}
        />

        {/* Center Semi-Transparent Arabic Numeral Breath Indicator */}
        <CenterBreathIndicator
          stage={clockSnapshot.currentStage}
          stageProgress={clockSnapshot.stageProgress}
          remainingSeconds={clockSnapshot.stageRemainingSeconds}
          breathMacro={clockSnapshot.breathMacro}
          isPlaying={isPlaying}
          opacityPercent={indicatorOpacity}
          precision={indicatorPrecision}
          isDarkTheme={isDark}
          onTogglePlay={togglePlayPause}
        />

        {/* Left-Edge Breath Cycle Bead Strand (ambient number-free cycle progress) */}
        {cycleTrackerSettings.visible && (
          <BreathBeadStrand
            capacity={cycleTrackerSettings.capacity}
            cycleCount={clockSnapshot.cycleCount}
            cycleProgress={clockSnapshot.cycleProgress}
            isPlaying={isPlaying}
            isDarkTheme={isDark}
          />
        )}

        {/* 3. Floating Bottom Controls: Fluid Morphing Pill Capsule + Sequential Next Preset Button */}
        <div className="fixed bottom-6 max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-2.5 pointer-events-none select-none max-w-full px-2">
          {/* Screen Reader Status Announcement (Visible Floating Tooltip Removed per User Request) */}
          {activeVisualHint && (
            <div role="status" className="sr-only">
              {activeVisualHint.labelZh} ({activeVisualHint.label})
            </div>
          )}

          {/* Primary Visual Style Capsule (Fluid Morphing Accordion) */}
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
            title="左右滑动切换动效组"
            className={`pointer-events-auto relative flex items-center gap-2 px-2 py-1.5 rounded-full border backdrop-blur-xl transition-all select-none cursor-grab active:cursor-grabbing ${
              isDark
                ? 'border-neutral-800/80 bg-neutral-950/75 text-neutral-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04]'
                : 'border-neutral-200/80 bg-white/75 text-neutral-800 shadow-[0_8px_30px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]'
            }`}
          >
            {/* 3 Interactive Group Switcher Dots */}
            <div
              role="group"
              aria-label={`Switch Visual Preset Group (${visualPresetGroups[visualGroupIndex].groupLabelZh})`}
              title={`当前：${visualPresetGroups[visualGroupIndex].groupLabelZh}`}
              onClick={() => {
                if (capsuleSwipeRef.current.moved) return;
                const nextGroup = ((visualGroupIndex + 1) % 3) as 0 | 1 | 2;
                switchVisualGroup(nextGroup);
                triggerVisualHint(visualPresetGroups[nextGroup].groupLabelZh, visualPresetGroups[nextGroup].groupCode);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-full cursor-pointer transition-colors ${
                isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-neutral-900/[0.04]'
              }`}
            >
              {visualPresetGroups.map((grp, idx) => {
                const isCurrentGroup = visualGroupIndex === idx;
                return (
                  <button
                    key={grp.groupId}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (capsuleSwipeRef.current.moved) return;
                      switchVisualGroup(idx as 0 | 1 | 2);
                      triggerVisualHint(grp.groupLabelZh, grp.groupCode);
                    }}
                    onMouseEnter={() => triggerVisualHint(grp.groupLabelZh, grp.groupCode)}
                    aria-label={`${grp.groupLabelZh} (${grp.groupCode})`}
                    aria-pressed={isCurrentGroup}
                    title={`${grp.groupLabelZh} (${grp.groupCode})`}
                    className="p-1 flex items-center justify-center rounded-full transition-transform hover:scale-125 focus:outline-none"
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${
                        isCurrentGroup
                          ? isDark
                            ? 'w-3.5 h-1.5 bg-neutral-100 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                            : 'w-3.5 h-1.5 bg-neutral-900 shadow-xs'
                          : isDark
                            ? 'w-1.5 h-1.5 bg-neutral-600 hover:bg-neutral-400'
                            : 'w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* 1px Fine Precision Hairline Divider */}
            <div
              className={`h-3.5 w-[1px] ${
                isDark ? 'bg-neutral-800' : 'bg-neutral-200'
              }`}
              aria-hidden="true"
            />

            {/* Sliding Tri-Group Viewport (Grid 1x1 Overlay) */}
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
                            triggerVisualHint(p.labelZh, p.label);
                          }}
                          onMouseEnter={() => triggerVisualHint(p.labelZh, p.label)}
                          aria-pressed={isSelected}
                          aria-label={`${p.labelZh} (${p.label})`}
                          className={`h-7 flex items-center justify-center rounded-full transition-all duration-300 font-semibold ${
                            isSelected
                              ? isDark
                                ? 'px-2.5 gap-1.5 bg-white/[0.12] text-white ring-1 ring-white/15 shadow-[0_0_12px_rgba(255,255,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                                : 'px-2.5 gap-1.5 bg-neutral-900/[0.08] text-neutral-950 ring-1 ring-neutral-900/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04)]'
                              : isDark
                                ? 'w-7 text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                                : 'w-7 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-900/[0.04]'
                          }`}
                          title={`${p.labelZh} (${p.label})`}
                        >
                          <Icon size={14} strokeWidth={isSelected ? 2.2 : 1.7} />
                          {isSelected && (
                            <span className="text-[11px] font-sans font-semibold tracking-tight whitespace-nowrap animate-in fade-in duration-200">
                              {p.labelZh}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sequential Next Preset Circular Companion Button */}
          <button
            type="button"
            onClick={handleNextVisualPreset}
            aria-label="Next Visual Preset"
            title="下一个动效"
            className={`pointer-events-auto w-9 h-9 flex items-center justify-center rounded-full border backdrop-blur-xl transition-all shadow-sm hover:scale-105 active:scale-95 ${
              isDark
                ? 'border-neutral-800/80 bg-neutral-950/75 text-neutral-400 hover:text-white hover:bg-neutral-900/90 shadow-[0_4px_16px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.04]'
                : 'border-neutral-200/80 bg-white/75 text-neutral-500 hover:text-neutral-950 hover:bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]'
            }`}
          >
            <ChevronRight size={15} strokeWidth={2.2} />
          </button>
        </div>
      </main>

      {/* 4. Slide-Up Hardware Deck Console Drawer & Top Viewport Corridor */}
      {isDeckOpen && (
        <>
          {/* Top Viewport Corridor (Above Deck Drawer) */}
          <div
            className="fixed inset-x-0 top-11 bottom-[85vh] z-30 flex items-center justify-center px-4 pointer-events-auto select-none"
          >
            {draggingModule && (draggingModule.kind === 'source' || draggingModule.lane !== 'staged') ? (
              /* Dragging State: Ethereal HUD Drop Bay (from Deck or Sound Sources) */
              <div
                className="w-full max-w-4xl h-full flex items-center justify-center gap-3 py-1.5 animate-in fade-in zoom-in-95 duration-200"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              >
                {draggingModule.kind === 'source' ? (
                  <>
                    {/* Source Bay 1: Drop to Duplicate */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setHoveredHudBay('duplicate'); }}
                      onDragLeave={() => setHoveredHudBay(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredHudBay(null);
                        if (draggingModule && draggingModule.kind === 'source') {
                          handleDuplicateSource(draggingModule.sourceId);
                        }
                      }}
                      className={`flex-1 h-full min-h-[50px] max-h-[64px] rounded-lg border-2 flex items-center justify-center gap-2.5 px-3 transition-all duration-200 backdrop-blur-md cursor-pointer ${
                        hoveredHudBay === 'duplicate'
                          ? (isDark
                              ? 'border-sky-400 bg-sky-950/60 text-sky-100 shadow-[0_0_25px_rgba(56,189,248,0.4)] scale-[1.02] ring-2 ring-sky-400/50'
                              : 'border-sky-500 bg-sky-100/90 text-sky-800 shadow-[0_4px_20px_rgba(56,189,248,0.3)] scale-[1.02] ring-2 ring-sky-400/50')
                          : (isDark
                              ? 'border-dashed border-sky-500/40 bg-neutral-950/70 text-sky-300/80 hover:border-sky-500/70 shadow-lg'
                              : 'border-dashed border-sky-300 bg-white/80 text-sky-700/80 hover:border-sky-400 shadow-sm')
                      }`}
                    >
                      <Copy size={16} strokeWidth={2} className={hoveredHudBay === 'duplicate' ? 'animate-bounce text-sky-400' : 'text-sky-400/80'} />
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-xs font-semibold tracking-wide">
                          释放以复制
                        </span>
                        <span className="font-mono text-[9px] opacity-75 uppercase tracking-wider">
                          DUPLICATE · {draggingModule.sourceName}
                        </span>
                      </div>
                    </div>

                    {/* Source Bay 2: Drop to Delete */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredHudBay('delete'); }}
                      onDragLeave={() => setHoveredHudBay(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredHudBay(null);
                        if (draggingModule && draggingModule.kind === 'source') {
                          handleDeleteSource(draggingModule.sourceId);
                        }
                      }}
                      className={`flex-1 h-full min-h-[50px] max-h-[64px] rounded-lg border-2 flex items-center justify-center gap-2.5 px-3 transition-all duration-200 backdrop-blur-md cursor-pointer ${
                        hoveredHudBay === 'delete'
                          ? (isDark
                              ? 'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.4)] scale-[1.02] ring-2 ring-rose-500/50'
                              : 'border-rose-500 bg-rose-100/90 text-rose-800 shadow-[0_4px_20px_rgba(244,63,94,0.3)] scale-[1.02] ring-2 ring-rose-400/50')
                          : (isDark
                              ? 'border-dashed border-rose-500/40 bg-neutral-950/70 text-rose-300/80 hover:border-rose-500/70 shadow-lg'
                              : 'border-dashed border-rose-300 bg-white/80 text-rose-700/80 hover:border-rose-400 shadow-sm')
                      }`}
                    >
                      <Trash2 size={16} strokeWidth={2} className={hoveredHudBay === 'delete' ? 'animate-bounce text-rose-400' : 'text-rose-400/80'} />
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-xs font-semibold tracking-wide">
                          释放以删除
                        </span>
                        <span className="font-mono text-[9px] opacity-75 uppercase tracking-wider">
                          DELETE · {draggingModule.sourceName}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Effect Bay 1: Drop to Delete */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredHudBay('delete'); }}
                      onDragLeave={() => setHoveredHudBay(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredHudBay(null);
                        if (draggingModule && draggingModule.kind === 'effect') {
                          if (draggingModule.lane === 'staged') {
                            setStagedEffectIds(prev => prev.filter(id => id !== draggingModule.effectId));
                          } else {
                            handleRemoveEffectFromLane(draggingModule.lane, draggingModule.effectId);
                          }
                          setDraggingModule(null);
                        }
                      }}
                      className={`flex-1 h-full min-h-[50px] max-h-[64px] rounded-lg border-2 flex items-center justify-center gap-2.5 px-3 transition-all duration-200 backdrop-blur-md cursor-pointer ${
                        hoveredHudBay === 'delete'
                          ? (isDark
                              ? 'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.4)] scale-[1.02] ring-2 ring-rose-500/50'
                              : 'border-rose-500 bg-rose-100/90 text-rose-800 shadow-[0_4px_20px_rgba(244,63,94,0.3)] scale-[1.02] ring-2 ring-rose-400/50')
                          : (isDark
                              ? 'border-dashed border-rose-500/40 bg-neutral-950/70 text-rose-300/80 hover:border-rose-500/70 shadow-lg'
                              : 'border-dashed border-rose-300 bg-white/80 text-rose-700/80 hover:border-rose-400 shadow-sm')
                      }`}
                    >
                      <Trash2 size={16} strokeWidth={2} className={hoveredHudBay === 'delete' ? 'animate-bounce text-rose-400' : 'text-rose-400/80'} />
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-xs font-semibold tracking-wide">
                          释放以移除
                        </span>
                        <span className="font-mono text-[9px] opacity-75 uppercase tracking-wider">
                          REMOVE · {draggingModule.effectName}
                        </span>
                      </div>
                    </div>

                    {/* Effect Bay 2: Drop to Switch Bus */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredHudBay('switch'); }}
                      onDragLeave={() => setHoveredHudBay(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredHudBay(null);
                        if (draggingModule && draggingModule.kind === 'effect') {
                          if (draggingModule.lane === 'staged') {
                            setStagedEffectIds(prev => prev.filter(id => id !== draggingModule.effectId));
                            handleAddEffectToLane('laneA', draggingModule.effectId);
                          } else {
                            const targetLane = draggingModule.lane === 'laneA' ? 'laneB' : 'laneA';
                            handleMoveEffectBetweenLanes(draggingModule.effectId, draggingModule.lane, targetLane);
                          }
                          setDraggingModule(null);
                        }
                      }}
                      className={`flex-1 h-full min-h-[50px] max-h-[64px] rounded-lg border-2 flex items-center justify-center gap-2.5 px-3 transition-all duration-200 backdrop-blur-md cursor-pointer ${
                        hoveredHudBay === 'switch'
                          ? (isDark
                              ? 'border-sky-400 bg-sky-950/60 text-sky-100 shadow-[0_0_25px_rgba(56,189,248,0.4)] scale-[1.02] ring-2 ring-sky-400/50'
                              : 'border-sky-500 bg-sky-100/90 text-sky-800 shadow-[0_4px_20px_rgba(56,189,248,0.3)] scale-[1.02] ring-2 ring-sky-400/50')
                          : (isDark
                              ? 'border-dashed border-sky-500/40 bg-neutral-950/70 text-sky-300/80 hover:border-sky-500/70 shadow-lg'
                              : 'border-dashed border-sky-300 bg-white/80 text-sky-700/80 hover:border-sky-400 shadow-sm')
                      }`}
                    >
                      <ArrowLeftRight size={16} strokeWidth={2} className={hoveredHudBay === 'switch' ? 'animate-pulse text-sky-400' : 'text-sky-400/80'} />
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-xs font-semibold tracking-wide">
                          释放迁移至 {draggingModule.lane === 'laneA' ? 'BUS B' : 'BUS A'}
                        </span>
                        <span className="font-mono text-[9px] opacity-75 uppercase tracking-wider">
                          SWITCH BUS
                        </span>
                      </div>
                    </div>

                    {/* Effect Bay 3: Drop to Stage Module (存放模块) */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredHudBay('stage'); }}
                      onDragLeave={() => setHoveredHudBay(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredHudBay(null);
                        if (draggingModule && draggingModule.kind === 'effect') {
                          handleStageEffect(draggingModule.effectId, draggingModule.lane);
                        }
                      }}
                      className={`flex-1 h-full min-h-[50px] max-h-[64px] rounded-lg border-2 flex items-center justify-center gap-2.5 px-3 transition-all duration-200 backdrop-blur-md cursor-pointer ${
                        hoveredHudBay === 'stage'
                          ? (isDark
                              ? 'border-teal-400 bg-teal-950/60 text-teal-100 shadow-[0_0_25px_rgba(20,184,166,0.4)] scale-[1.02] ring-2 ring-teal-400/50'
                              : 'border-teal-500 bg-teal-100/90 text-teal-800 shadow-[0_4px_20px_rgba(20,184,166,0.3)] scale-[1.02] ring-2 ring-teal-400/50')
                          : (isDark
                              ? 'border-dashed border-teal-500/40 bg-neutral-950/70 text-teal-300/80 hover:border-teal-500/70 shadow-lg'
                              : 'border-dashed border-teal-300 bg-white/80 text-teal-700/80 hover:border-teal-400 shadow-sm')
                      }`}
                    >
                      <Box size={16} strokeWidth={2} className={hoveredHudBay === 'stage' ? 'animate-bounce text-teal-400' : 'text-teal-400/80'} />
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-xs font-semibold tracking-wide">
                          释放以存放
                        </span>
                        <span className="font-mono text-[9px] opacity-75 uppercase tracking-wider">
                          STAGE · {draggingModule.effectName}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (stagedEffectIds.length > 0 || (draggingModule && draggingModule.kind === 'effect' && draggingModule.lane === 'staged')) ? (
              /* Staging Bay Active State: Stays mounted continuously during staged drag to avoid unmounting drag target */
              <div
                className="w-full max-w-4xl h-full flex items-center justify-between gap-3 py-1 animate-in fade-in duration-150"
                onDragOver={(e) => {
                  if (draggingModule && draggingModule.kind === 'effect' && (draggingModule.lane === 'laneA' || draggingModule.lane === 'laneB')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(e) => {
                  if (draggingModule && draggingModule.kind === 'effect' && (draggingModule.lane === 'laneA' || draggingModule.lane === 'laneB')) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStageEffect(draggingModule.effectId, draggingModule.lane);
                  }
                }}
              >
                <div
                  className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all shadow-md overflow-x-auto ${
                    isDark
                      ? 'border-teal-500/40 bg-neutral-950/85 text-teal-200 shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/20'
                      : 'border-teal-300 bg-white/90 text-teal-800 shadow-sm ring-1 ring-teal-400/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-teal-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_6px_#2dd4bf]" />
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-teal-400">
                      STAGING BAY
                    </span>
                    <span className="text-[9px] font-mono text-teal-400/70">
                      ({stagedEffectIds.length})
                    </span>
                  </div>

                  {/* Draggable Staged Module Chips with Quick Action Controls */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {stagedEffectIds.map(effId => {
                      const modType = getEffectModuleType(effId);
                      const rule = EFFECT_MODULE_RULES[modType] || { code: 'FX', name: effId, cnName: effId };
                      const isThisDragging = draggingModule?.kind === 'effect' && draggingModule.effectId === effId;
                      return (
                        <div
                          key={effId}
                          draggable={true}
                          onDragStart={(e) => {
                            const payload: DraggingModule = { kind: 'effect', effectId: effId, lane: 'staged', effectName: rule.name };
                            try {
                              e.dataTransfer.setData('application/json', JSON.stringify(payload));
                              e.dataTransfer.setData('text/plain', JSON.stringify(payload));
                              e.dataTransfer.effectAllowed = 'move';
                            } catch {}
                            setDraggingModule(payload);
                          }}
                          onDragEnd={() => {
                            setDraggingModule(null);
                            setHoveredHudBay(null);
                          }}
                          title="拖回 BUS 或点击装载"
                          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono font-semibold cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
                            isThisDragging
                              ? 'opacity-35 scale-95 border-dashed border-teal-400 ring-2 ring-teal-400/50 shadow-inner'
                              : isDark
                              ? 'border-teal-400/50 bg-teal-950/70 text-teal-200 hover:border-teal-300 hover:shadow-[0_0_12px_rgba(45,212,191,0.5)]'
                              : 'border-teal-400 bg-teal-50 text-teal-900 hover:bg-teal-100 hover:shadow-xs'
                          }`}
                        >
                          <span className="px-1 py-0.5 rounded text-[8.5px] font-bold bg-teal-500/20 text-teal-300">
                            {rule.code}
                          </span>
                          <span className="text-[10px] truncate max-w-[90px]">{rule.name}</span>

                          {/* Quick Mount / Discard Controls */}
                          <div className="flex items-center gap-0.5 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" onMouseDown={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleUnstageEffect(effId, 'laneA')}
                              title="装载至 BUS A"
                              className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/40 transition-colors"
                            >
                              +A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnstageEffect(effId, 'laneB')}
                              title="装载至 BUS B"
                              className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-teal-500/20 text-teal-300 hover:bg-teal-500/40 transition-colors"
                            >
                              +B
                            </button>
                            <button
                              type="button"
                              onClick={() => setStagedEffectIds(prev => prev.filter(id => id !== effId))}
                              title="从寄存区彻底删除"
                              className="p-0.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                            >
                              <X size={10} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {draggingModule?.kind === 'effect' && draggingModule.lane === 'staged' ? (
                    <span className="text-[9px] font-mono text-teal-300 animate-pulse font-medium shrink-0 hidden sm:inline">
                      释放到下方 BUS A / BUS B 或右侧垃圾箱
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-teal-400/60 shrink-0 hidden sm:inline">
                      按住拖放或点击 +A/+B 装载
                    </span>
                  )}
                </div>

                {/* Staged Drag Trash Target Bay (Appears when dragging a staged module) */}
                {draggingModule?.kind === 'effect' && draggingModule.lane === 'staged' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredHudBay('delete'); }}
                    onDragLeave={() => setHoveredHudBay(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoveredHudBay(null);
                      if (draggingModule && draggingModule.kind === 'effect' && draggingModule.lane === 'staged') {
                        setStagedEffectIds(prev => prev.filter(id => id !== draggingModule.effectId));
                        setDraggingModule(null);
                      }
                    }}
                    className={`h-full min-h-[46px] max-h-[56px] px-3.5 rounded-lg border-2 flex items-center gap-2 transition-all backdrop-blur-md cursor-pointer animate-in fade-in zoom-in-95 duration-150 ${
                      hoveredHudBay === 'delete'
                        ? (isDark ? 'border-rose-400 bg-rose-950/70 text-rose-100 ring-2 ring-rose-400/50 scale-[1.02]' : 'border-rose-500 bg-rose-100 text-rose-800 scale-[1.02]')
                        : (isDark ? 'border-dashed border-rose-500/50 bg-neutral-950/80 text-rose-300 hover:border-rose-400' : 'border-dashed border-rose-300 bg-white/90 text-rose-700 hover:border-rose-400')
                    }`}
                  >
                    <Trash2 size={14} className={hoveredHudBay === 'delete' ? 'text-rose-400 animate-bounce' : 'text-rose-400/80'} />
                    <span className="text-[10px] font-mono font-semibold">释放删除</span>
                  </div>
                )}

                {/* Quick Play/Pause Companion Button (Rendered when not dragging) */}
                {!draggingModule && (
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    title="点击空白暂停或继续"
                    aria-label={isPlaying ? 'Pause' : 'Resume'}
                    className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-sans font-semibold tracking-wide transition-all backdrop-blur-md flex items-center gap-2 shadow-sm ${
                      isDark
                        ? 'border-neutral-800 bg-black/60 text-slate-200 hover:bg-neutral-900'
                        : 'border-neutral-200 bg-white/80 text-neutral-800 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPlaying
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                          : 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]'
                      }`}
                    />
                    <span className="font-mono text-[10px]">{isPlaying ? 'PAUSE' : 'RESUME'}</span>
                  </button>
                )}
              </div>
            ) : (
              /* Normal State: Quick Click-to-Play/Pause Trigger */
              <div
                role="button"
                tabIndex={0}
                onClick={togglePlayPause}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePlayPause();
                  }
                }}
                aria-label={isPlaying ? 'Pause Breathing Soundscape' : 'Resume Breathing Soundscape'}
                className="w-full h-full cursor-pointer"
                title="点击空白暂停或继续"
              />
            )}
          </div>

          {/* Slide-Up Hardware Deck Console Drawer */}
          <div
            role="dialog"
            aria-label="声学调制台 · Console"
            style={{ backgroundColor: 'var(--synhale-panel-bg)' }}
            className={`synhale-deck-scope fixed inset-x-0 bottom-0 h-[85vh] max-h-[85vh] overflow-y-auto max-md:h-[85dvh] max-md:max-h-[85dvh] z-30 p-4 border-t shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              isDark
                ? 'border-neutral-800 text-slate-100'
                : 'border-neutral-300 text-neutral-800'
            }`}
          >
            <div className="max-w-6xl mx-auto space-y-4 max-md:min-w-[900px] synhale-deck-fit">
              <div className={`flex items-center justify-between pb-2 border-b ${
                isDark ? 'border-neutral-800/80' : 'border-neutral-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-sky-400" />
                  <span className="text-xs font-mono font-medium tracking-wider uppercase">
                    声学调制台 · Console
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Save Custom Preset Button (Integrated into Deck Console Header) */}
                  <button
                    type="button"
                    onClick={() => setIsSavePresetModalOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans border transition-all ${
                      isDark
                        ? 'border-neutral-700/80 bg-neutral-900/90 text-slate-200 hover:border-sky-500/80 hover:text-sky-300 hover:bg-neutral-800/80 shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-sky-500/80 hover:text-sky-600 hover:bg-neutral-50 shadow-sm'
                    }`}
                    title="保存当前声音为新预设"
                    aria-label="Save Custom Preset"
                  >
                    <BookmarkPlus size={13} className="text-sky-400" />
                    <span className="font-medium text-[11px]">保存预设</span>
                  </button>

                  <button
                    type="button"
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
                activeSources={activeSources}
                draggingItem={draggingModule}
                onDragModuleChange={setDraggingModule}
                onDuplicateSource={handleDuplicateSource}
                onDeleteSource={handleDeleteSource}
                onUnstageEffect={handleUnstageEffect}
              />
            </div>
          </div>
        </>
      )}

      {/* 5. Bottom Sheet Drawer for Breath Rhythms */}
      <BottomSheetDrawer
        isOpen={isRhythmDrawerOpen}
        isDark={isDark}
        onClose={() => setIsRhythmDrawerOpen(false)}
        title="选择呼吸节律"
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
            title="新增节律"
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
        title="选择音色预设"
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
            ref={saveDialogRef}
            tabIndex={-1}
            aria-modal="true"
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
                  保存预设
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
                  将覆盖预设「{activeSoundPresetLabel}」。
                </div>
              ) : (
                <div>
                  <label className={`text-[10px] uppercase font-medium block mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-neutral-600'
                  }`}>
                    预设名称
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="例如：深海脑波微风、夏夜颂钵"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs max-md:text-base focus:outline-none focus:border-sky-500 font-sans transition-colors ${
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
                保存当前全部参数。
                {channelStrip.granular?.sampleId?.startsWith('custom_') && (
                  <p className="mt-1.5">导入的音频仅本次会话可用。</p>
                )}
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
            ref={renameDialogRef}
            tabIndex={-1}
            aria-modal="true"
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
                  重命名预设
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
                  新名称
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                    value={editingPresetName}
                    onChange={e => setEditingPresetName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs max-md:text-base focus:outline-none focus:border-sky-500 font-sans transition-colors ${
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
            ref={deletePresetDialogRef}
            tabIndex={-1}
            aria-modal="true"
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
                  删除预设
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
                删除后无法恢复。
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
            ref={deleteRhythmDialogRef}
            tabIndex={-1}
            aria-modal="true"
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
                  删除节律
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
                删除后无法恢复。
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
        themeId={palette.id}
        onThemeIdChange={setThemeId}
        cueSettings={cueSettings}
        onCueSettingsChange={handleCueSettingsChange}
        indicatorOpacity={indicatorOpacity}
        onIndicatorOpacityChange={handleIndicatorOpacityChange}
        indicatorPrecision={indicatorPrecision}
        onIndicatorPrecisionChange={handleIndicatorPrecisionChange}
        cycleTrackerSettings={cycleTrackerSettings}
        onCycleTrackerSettingsChange={handleCycleTrackerSettingsChange}
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
