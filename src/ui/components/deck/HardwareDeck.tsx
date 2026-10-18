import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Wind,
  Disc,
  Sliders,
  Power,
  Sun,
  Moon,
  Repeat,
  Maximize2,
  Flame,
  Radio,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Music,
  Volume2,
  Waves,
  ArrowUp,
  ArrowDown,
  Plus,
  X
} from 'lucide-react';
import {
  ChannelStripParams,
  EffectsChainParams,
  FilterType,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  NoiseType,
  FullBreathCurveData,
  DEFAULT_EQ_PARAMS,
  ChordType,
  WarpMode,
  DEFAULT_OSC_A_PARAMS,
  DEFAULT_AMBIENT_PARAMS,
  SourceRouteMap,
  SoundSourceId,
  LaneId,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  EffectModuleType,
  getEffectModuleType,
  validateAddEffectToLane,
  validateMoveEffectBetweenLanes,
  generateNextEffectInstanceId,
  getDefaultEffectParams
} from '../../../types';
import type { ParticleVisualGrain } from '../../../audio/nodes/GranularChannel';
import { AMBIENT_SOUNDSCAPES } from '../../../audio/nodes/AmbientSoundscapeLibrary';
import { SignalFlowGraph } from './SignalFlowGraph';
import {
  WAVETABLE_DEFINITIONS,
  MULTI_FRAME_WAVETABLES,
  generateMultiFramePreviewSvgPath
} from '../../../audio/dsp/wavetableData';
import { SCALE_LIST } from '../../../audio/dsp/scaleQuantizer';
import { useTheme } from '../../theme';
import { Knob, ModulationCard } from '../knob';
import { BipolarFader } from '../fader';
import { BreathMacroTimelineScope } from '../vu/BreathMacroTimelineScope';
import { BottomSheetDrawer, DrawerItem } from '../drawer';
import { WavetableVisualizer } from './WavetableVisualizer';
import { GrainSourceVisualizer } from './GrainSourceVisualizer';
import { GrainEnvelopeScope } from './GrainEnvelopeScope';
import { GRANULAR_SAMPLE_LIST, GRANULAR_SAMPLE_PRESETS, getSampleDuration } from '../../../audio/nodes/GranularSampleLibrary';
import { FilterVisualizer } from './FilterVisualizer';
import { EqVisualizer } from './EqVisualizer';
import { SerumLfoScope } from '../lfo/SerumLfoScope';
import { AdsrEnvelopeVisualizer } from '../adsr/AdsrEnvelopeVisualizer';
import { StageEnvelopeStudio } from '../mseg/StageEnvelopeStudio';
import {
  evaluateFullBreathCurve,
  extractStageMultipliersFromCurve,
  createCurveDataFromMultipliers
} from '../../../audio/dsp/curveMath';
import { computeLfoLiveValue } from '../../../audio/dsp/lfoMath';

export const CHORD_TYPE_OPTIONS: { type: ChordType; label: string; desc: string }[] = [
  { type: 'octave', label: 'OCT', desc: 'Octaves (0, 12, 24)' },
  { type: 'fifth', label: '5TH', desc: 'Power 5th (0, 7, 12)' },
  { type: 'major', label: 'MAJ', desc: 'Major Triad (0, 4, 7, 12)' },
  { type: 'minor', label: 'MIN', desc: 'Minor Triad (0, 3, 7, 12)' },
  { type: 'sus4', label: 'SUS4', desc: 'Suspended 4th (0, 5, 7, 12)' },
  { type: 'dom7', label: 'DOM7', desc: 'Dominant 7th (0, 4, 7, 10)' },
  { type: 'maj7', label: 'MAJ7', desc: 'Major 7th (0, 4, 7, 11)' },
  { type: 'min7', label: 'MIN7', desc: 'Minor 7th (0, 3, 7, 10)' },
  { type: 'sacred', label: 'SACRED', desc: 'Sacred 432Hz Overtones' }
];

export const WARP_MODE_OPTIONS: { mode: WarpMode; label: string }[] = [
  { mode: 'off', label: 'OFF' },
  { mode: 'pwm', label: 'PWM' },
  { mode: 'sync', label: 'SYNC' },
  { mode: 'bend', label: 'BEND' },
  { mode: 'mirror', label: 'MIRR' }
];

export const SOUNDSCAPE_THEMES = [
  { name: '江海潮涌', nameEn: 'OCEAN & WAVES', shortName: '江海', range: '01-10', desc: '潮汐、湖畔、海浪、礁石浪花与深海潜流' },
  { name: '雨境雨幕', nameEn: 'RAIN & STORMS', shortName: '雨境', range: '11-20', desc: '空山幽雨、暴雨、雷雨、檐下水滴与晨雾微霖' },
  { name: '林泉飞瀑', nameEn: 'STREAMS & CASCADES', shortName: '林泉', range: '21-30', desc: '山溪、瀑布、溶洞、碎石清溪与高山泉涌' },
  { name: '风啸寒原', nameEn: 'WIND & BLIZZARD', shortName: '风啸', range: '31-40', desc: '松风、秋风、暴雪、竹林、沙丘与峡谷风' },
  { name: '温暖地火', nameEn: 'FIRE & EMBERS', shortName: '地火', range: '41-50', desc: '壁炉、篝火、木炭余温、松果爆鸣与地热火息' },
  { name: '原野生态', nameEn: 'FOREST & BIOSPHERE', shortName: '原野', range: '51-60', desc: '夏夜蟋蟀、蝉鸣、晨鸟、池塘蛙鸣与湿地夜语' },
  { name: '精选混音 I', nameEn: 'CURATED MIXES I', shortName: '混一', range: '61-70', desc: '幽深森林、禅意庭园、壁炉、帐篷雨与深海水境' },
  { name: '精选混音 II', nameEn: 'CURATED MIXES II', shortName: '混二', range: '71-80', desc: '湖畔晨曦、夜晚花园、北欧冬日、雨中列车与林中小屋' },
  { name: '飞鸟游鲸', nameEn: 'WILDLIFE & MARINE', shortName: '飞鸟', range: '81-90', desc: '抹香鲸、海豚、林间鸟语、夜莺、猫头鹰与海鸥' },
  { name: '原野伴生', nameEn: 'ANIMALS & INSECTS', shortName: '生灵', range: '91-100', desc: '猫咪呼噜、草丛促织、青蛙、夏蝉、蜜蜂与荒原狼嚎' },
  { name: '冥想器乐', nameEn: 'MEDITATION & ACOUSTIC', shortName: '器乐', range: '101-110', desc: '颂钵回响、西藏铜钵、水晶钵、风铃、静心钟与竖琴' },
  { name: '城市生活', nameEn: 'URBAN & LIVING', shortName: '城市', range: '111-120', desc: '咖啡馆、绿皮列车、地铁、摇橹轻舟、风扇与白噪音' },
] as const;

const DEFAULT_CHANNEL_STRIP: ChannelStripParams = {
  oscA: {
    ...DEFAULT_OSC_A_PARAMS,
    particles: {
      rate: 1.5,
      density: 4,
      octaveRange: 2,
      scale: 'pentatonic',
      randomPan: 0.6,
      duration: 1.2,
      probability: 0.85
    }
  },
  granular: {
    rate: 1.5,
    density: 4,
    octaveRange: 2,
    scale: 'pentatonic',
    randomPan: 0.6,
    duration: 1.2,
    probability: 0.85,
    spray: 1,
    pitchJitter: 12,
    wavetableJitter: 2,
    grainShape: 'smooth',
    gain: 0.75,
    pan: 0.0,
    bypass: false,
    baseFreq: 216,
    wavetableIndex: 0,
    mode: 'ambient'
  },
  oscB: {
    color: 0.5,
    friction: 0.3,
    gain: 0.4,
    bypass: false,
    noiseType: 'pink',
    lowCut: 80,
    motion: 0.2,
    stereoWidth: 0.5
  },
  drone: {
    baseFreq: 54,
    pitchDrift: 0.2,
    gain: 0.18,
    bypass: false
  },
  ambient: {
    ...DEFAULT_AMBIENT_PARAMS
  }
};

const DEFAULT_EFFECTS: EffectsChainParams = {
  filter: {
    type: 'lowpass',
    cutoff: 1420,
    resonance: 2.0,
    bypass: false
  },
  gain: {
    value: 0.0,
    bypass: false,
    softClip: true
  },
  drive: {
    amount: 0.0,
    tone: 0.5,
    bypass: true
  },
  eq: {
    ...DEFAULT_EQ_PARAMS
  },
  delay: {
    time: 0.35,
    feedback: 0.4,
    damping: 4000,
    mix: 0.3,
    bypass: false
  },
  reverb: {
    decayTime: 3.5,
    damping: 0.5,
    mix: 0.35,
    bypass: false
  },
  masterGain: 0.8,
  masterPan: 0.0,
  lfo1: {
    rate: 0.15,
    depth: 0.25,
    shape: 'sine',
    polarity: 'bipolar',
    bypass: false
  },
  lfo2: {
    rate: 0.08,
    depth: 0.4,
    filterMod: 0.35,
    panMod: 0.3,
    tremoloMod: 0.1,
    shape: 'sine',
    polarity: 'bipolar',
    bypass: false
  },
  adsr: {
    attack: 0.8,
    decay: 1.5,
    sustain: 0.75,
    release: 2.5,
    bypass: false
  },
  busMix: 0.5,
  busLevelA: 1.0,
  busLevelB: 1.0
};

export const DEFAULT_MODULATION_ROUTES: Record<string, ModulationRoute> = {
  'filter-cutoff': {
    target: 'filter-cutoff',
    source: 'breathMacro',
    depth: 0.60,
    bipolar: false
  },
  'osca-morph': {
    target: 'osca-morph',
    source: 'breathMacro',
    depth: 0.70,
    bipolar: false
  },
  'oscb-color': {
    target: 'oscb-color',
    source: 'stageProgress',
    depth: 0.50,
    bipolar: false,
    stageMultipliers: { inhale: 0.95, holdIn: 0.85, exhale: 0.30, holdOut: 0.10, curve: 'smooth' }
  },
  'drone-drift': {
    target: 'drone-drift',
    source: 'lfo1',
    depth: 0.35,
    bipolar: true
  },
  'filter-resonance': {
    target: 'filter-resonance',
    source: 'lfo2',
    depth: 0.25,
    bipolar: false
  },
  'master-fader': {
    target: 'master-fader',
    source: 'stageProgress',
    depth: 1.0,
    bipolar: false,
    stageMultipliers: { inhale: 1.0, holdIn: 0.85, exhale: 0.25, holdOut: 0.0, curve: 'smooth' }
  }
};

export interface HardwareDeckProps {
  channelStrip?: DeepPartial<ChannelStripParams>;
  effects?: DeepPartial<EffectsChainParams>;
  modulationRoutes?: Record<string, ModulationRoute>;
  onModulationRoutesChange?: (routes: Record<string, ModulationRoute>) => void;
  breathMacro?: number;
  breathStage?: BreathStage;
  stageProgress?: number;
  isPlaying?: boolean;
  clockSnapshot?: any;
  modulationValue?: number;
  onChannelStripChange?: (params: DeepPartial<ChannelStripParams>) => void;
  onEffectsChange?: (params: DeepPartial<EffectsChainParams>) => void;
  onModulationRouteAssign?: (knobId: string, route: ModulationRoute) => void;
  className?: string;
  getVisualGrains?: () => ParticleVisualGrain[];
  getAudioCurrentTime?: () => number;
  effectOrder?: string[];
  onReorderEffects?: (newOrder: string[]) => void;
  sourceRoutes?: SourceRouteMap;
  onSourceRouteChange?: (source: SoundSourceId, lane: LaneId) => void;
  laneAOrder?: string[];
  laneBOrder?: string[];
  onLaneReorder?: (lane: 'laneA' | 'laneB', newOrder: string[]) => void;
  onMoveEffectBetweenLanes?: (effectId: string, fromLane: 'laneA' | 'laneB', toLane: 'laneA' | 'laneB') => void;
  onAddEffectToLane?: (lane: 'laneA' | 'laneB', effectId: string) => void;
  onRemoveEffectFromLane?: (lane: 'laneA' | 'laneB', effectId: string) => void;
}

export const AVAILABLE_EFFECT_MODULES: {
  id: EffectModuleType;
  code: string;
  name: string;
  cnName: string;
  desc: string;
}[] = [
  { id: 'filter', code: 'FLT', name: 'Analog Filter', cnName: '模拟滤波器', desc: '12/24dB 多模式状态变量滤波' },
  { id: 'drive', code: 'DRV', name: 'Tape Saturation', cnName: '饱和染色', desc: '温润双曲正切模拟染色失真' },
  { id: 'gain', code: 'PRE', name: 'Preamp Gain', cnName: '前级增益', desc: '纯净电平增益与软削波保护' },
  { id: 'eq', code: 'EQ3', name: 'Parametric EQ', cnName: '三段均衡', desc: '低频/中频/高频三段参量滤波' },
  { id: 'adsr', code: 'ENV', name: 'Breath Envelope', cnName: '呼吸包络', desc: '基于呼吸周期的动态振幅塑形' },
  { id: 'delay', code: 'DLY', name: 'Ping-Pong Delay', cnName: '灵性延迟', desc: '立体声乒乓交替反馈空间延迟' },
  { id: 'reverb', code: 'REV', name: 'Shimmer Reverb', cnName: '空间混响', desc: '卷积脉冲/算法漫反射空灵残响' },
  { id: 'lfo', code: 'LFO', name: 'Dual LFO Modulation', cnName: '双低频调制器', desc: '双通道自由波形调制源与空间颤音' }
];

const SourceRouteSelector: React.FC<{
  sourceId: SoundSourceId;
  sourceLabel: string;
  currentLane: LaneId;
  onChange?: (source: SoundSourceId, lane: LaneId) => void;
  isDark: boolean;
}> = ({ sourceId, sourceLabel, currentLane, onChange, isDark }) => {
  const options: { id: LaneId; label: string; activeColor: string }[] = [
    {
      id: 'laneA',
      label: 'BUS A',
      activeColor: isDark
        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
        : 'bg-sky-50 text-sky-700 border-sky-400 font-semibold'
    },
    {
      id: 'laneB',
      label: 'BUS B',
      activeColor: isDark
        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
        : 'bg-teal-50 text-teal-700 border-teal-400 font-semibold'
    },
    {
      id: 'thru',
      label: 'THRU',
      activeColor: isDark
        ? 'bg-slate-700/60 text-slate-200 border-slate-500'
        : 'bg-slate-200 text-slate-800 border-slate-400 font-semibold'
    }
  ];

  return (
    <div
      role="group"
      aria-label={`Route ${sourceLabel}`}
      className={`inline-flex items-center p-0.5 rounded-md border text-[9px] font-mono tracking-wider ${
        isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
      }`}
    >
      {options.map(opt => {
        const isActive = currentLane === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            data-testid={`route-toggle-${sourceId}-${opt.id}`}
            aria-label={`Route ${sourceLabel} to ${opt.label}`}
            aria-pressed={isActive}
            onClick={() => onChange?.(sourceId, opt.id)}
            className={`px-1.5 py-0.5 rounded transition-all select-none ${
              isActive
                ? `${opt.activeColor} border shadow-xs`
                : isDark
                ? 'text-slate-400 hover:text-slate-200 border-transparent'
                : 'text-neutral-500 hover:text-neutral-800 border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export const HardwareDeck: React.FC<HardwareDeckProps> = ({
  channelStrip: rawChannelStrip = DEFAULT_CHANNEL_STRIP,
  effects: rawEffects = DEFAULT_EFFECTS,
  modulationRoutes: propsModulationRoutes,
  onModulationRoutesChange,
  breathMacro = 0.5,
  breathStage,
  stageProgress,
  isPlaying = false,
  clockSnapshot,
  modulationValue,
  onChannelStripChange,
  onEffectsChange,
  onModulationRouteAssign,
  className = '',
  getVisualGrains,
  getAudioCurrentTime,
  effectOrder,
  onReorderEffects,
  sourceRoutes: propsSourceRoutes = DEFAULT_SOURCE_ROUTES,
  onSourceRouteChange,
  laneAOrder = DEFAULT_LANE_A_ORDER,
  laneBOrder = DEFAULT_LANE_B_ORDER,
  onLaneReorder,
  onMoveEffectBetweenLanes,
  onAddEffectToLane,
  onRemoveEffectFromLane
}) => {
  const channelStrip: ChannelStripParams = {
    ...DEFAULT_CHANNEL_STRIP,
    ...rawChannelStrip,
    oscA: { ...DEFAULT_CHANNEL_STRIP.oscA, ...(rawChannelStrip?.oscA || {}) },
    oscB: { ...DEFAULT_CHANNEL_STRIP.oscB, ...(rawChannelStrip?.oscB || {}) },
    drone: { ...DEFAULT_CHANNEL_STRIP.drone, ...(rawChannelStrip?.drone || {}) },
    granular: { ...DEFAULT_CHANNEL_STRIP.granular, ...(rawChannelStrip?.granular || {}) },
    ambient: { ...DEFAULT_AMBIENT_PARAMS, ...(rawChannelStrip?.ambient || {}) }
  } as ChannelStripParams;

  const effects: EffectsChainParams = {
    ...DEFAULT_EFFECTS,
    ...rawEffects,
    filter: { ...DEFAULT_EFFECTS.filter, ...(rawEffects?.filter || {}) },
    drive: { ...DEFAULT_EFFECTS.drive, ...(rawEffects?.drive || {}) },
    delay: { ...DEFAULT_EFFECTS.delay, ...(rawEffects?.delay || {}) },
    reverb: { ...DEFAULT_EFFECTS.reverb, ...(rawEffects?.reverb || {}) },
    eq: { ...DEFAULT_EFFECTS.eq, ...(rawEffects?.eq || {}) },
    gain: { ...DEFAULT_EFFECTS.gain, ...(rawEffects?.gain || {}) },
    lfo1: { ...DEFAULT_EFFECTS.lfo1, ...(rawEffects?.lfo1 || {}) },
    lfo2: { ...DEFAULT_EFFECTS.lfo2, ...(rawEffects?.lfo2 || {}) },
    adsr: { ...DEFAULT_EFFECTS.adsr, ...(rawEffects?.adsr || {}) },
    busMix: rawEffects?.busMix ?? DEFAULT_EFFECTS.busMix ?? 0.5,
    busLevelA: rawEffects?.busLevelA ?? DEFAULT_EFFECTS.busLevelA ?? 1.0,
    busLevelB: rawEffects?.busLevelB ?? DEFAULT_EFFECTS.busLevelB ?? 1.0
  } as EffectsChainParams;

  const { isDark, toggleTheme } = useTheme();

  // Active Modulation Card
  const [activeModTarget, setActiveModTarget] = useState<{ id: string; label: string } | null>(null);
  const [studioTarget, setStudioTarget] = useState<{ id: string; label: string }>({
    id: 'master-fader',
    label: 'Master Volume'
  });
  const [internalRoutes, setInternalRoutes] = useState<Record<string, ModulationRoute>>(
    propsModulationRoutes ?? DEFAULT_MODULATION_ROUTES
  );

  useEffect(() => {
    if (propsModulationRoutes) {
      setInternalRoutes(propsModulationRoutes);
    }
  }, [propsModulationRoutes]);

  const modulationRoutes = propsModulationRoutes ?? internalRoutes;
  const setModulationRoutes = (updater: React.SetStateAction<Record<string, ModulationRoute>>) => {
    const next = typeof updater === 'function' ? updater(modulationRoutes) : updater;
    setInternalRoutes(next);
    onModulationRoutesChange?.(next);
  };
  const [isStageStudioOpen, setIsStageStudioOpen] = useState(false);

  // Ambient Soundscape Carousel Pagination (12 Pages across 120 soundscapes: 10 per page)
  const [soundscapePage, setSoundscapePage] = useState<number>(() => {
    const currentId = channelStrip.ambient?.sampleId ?? 'oceanTide';
    const idx = AMBIENT_SOUNDSCAPES.findIndex(s => s.id === currentId);
    return idx !== -1 ? Math.min(SOUNDSCAPE_THEMES.length - 1, Math.floor(idx / 10)) : 0;
  });

  useEffect(() => {
    const currentId = channelStrip.ambient?.sampleId ?? 'oceanTide';
    const idx = AMBIENT_SOUNDSCAPES.findIndex(s => s.id === currentId);
    if (idx !== -1) {
      const targetPage = Math.min(SOUNDSCAPE_THEMES.length - 1, Math.floor(idx / 10));
      if (targetPage !== soundscapePage) {
        setSoundscapePage(targetPage);
      }
    }
  }, [channelStrip.ambient?.sampleId]);

  // Ambient Soundscape Mouse Drag & Swipe State
  const [isDraggingSoundscape, setIsDraggingSoundscape] = useState(false);
  const [soundscapeDragDeltaX, setSoundscapeDragDeltaX] = useState(0);
  const soundscapeDragStartXRef = useRef<number | null>(null);
  const hasDraggedSoundscapeRef = useRef<boolean>(false);

  const handleCarouselPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    soundscapeDragStartXRef.current = e.clientX;
    hasDraggedSoundscapeRef.current = false;
    setIsDraggingSoundscape(true);
    setSoundscapeDragDeltaX(0);
  };

  const handleCarouselPointerMove = (e: React.PointerEvent) => {
    if (soundscapeDragStartXRef.current === null) return;
    const delta = e.clientX - soundscapeDragStartXRef.current;
    if (Math.abs(delta) > 5) {
      hasDraggedSoundscapeRef.current = true;
    }
    setSoundscapeDragDeltaX(delta);
  };

  const finishCarouselDrag = (deltaX: number) => {
    const threshold = 35;
    const maxPage = SOUNDSCAPE_THEMES.length - 1;
    if (deltaX < -threshold) {
      setSoundscapePage(p => Math.min(maxPage, p + 1));
    } else if (deltaX > threshold) {
      setSoundscapePage(p => Math.max(0, p - 1));
    }
    soundscapeDragStartXRef.current = null;
    setIsDraggingSoundscape(false);
    setSoundscapeDragDeltaX(0);
    setTimeout(() => {
      hasDraggedSoundscapeRef.current = false;
    }, 50);
  };

  const handleCarouselPointerUp = (e: React.PointerEvent) => {
    if (soundscapeDragStartXRef.current !== null) {
      const delta = e.clientX - soundscapeDragStartXRef.current;
      finishCarouselDrag(delta);
    }
  };

  const handleCarouselPointerCancel = () => {
    soundscapeDragStartXRef.current = null;
    setIsDraggingSoundscape(false);
    setSoundscapeDragDeltaX(0);
    hasDraggedSoundscapeRef.current = false;
  };

  useEffect(() => {
    if (!isDraggingSoundscape) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      if (soundscapeDragStartXRef.current === null) return;
      const delta = e.clientX - soundscapeDragStartXRef.current;
      if (Math.abs(delta) > 5) {
        hasDraggedSoundscapeRef.current = true;
      }
      setSoundscapeDragDeltaX(delta);
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      if (soundscapeDragStartXRef.current !== null) {
        const delta = e.clientX - soundscapeDragStartXRef.current;
        finishCarouselDrag(delta);
      }
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', handleCarouselPointerCancel);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', handleCarouselPointerCancel);
    };
  }, [isDraggingSoundscape]);

  // Internal source routing state for instantaneous optimistic UI response
  const [internalSourceRoutes, setInternalSourceRoutes] = useState<SourceRouteMap>(
    propsSourceRoutes ?? DEFAULT_SOURCE_ROUTES
  );

  useEffect(() => {
    if (propsSourceRoutes) {
      setInternalSourceRoutes(propsSourceRoutes);
    }
  }, [propsSourceRoutes]);

  const activeSourceRoutes: SourceRouteMap = React.useMemo(() => ({
    ...DEFAULT_SOURCE_ROUTES,
    ...(propsSourceRoutes || {}),
    ...internalSourceRoutes
  }), [internalSourceRoutes, propsSourceRoutes]);

  const handleSourceRouteToggle = (source: SoundSourceId, lane: LaneId) => {
    setInternalSourceRoutes(prev => ({ ...prev, [source]: lane }));
    onSourceRouteChange?.(source, lane);
  };

  // Add Module Modal Popover state
  const [addModuleLane, setAddModuleLane] = useState<'laneA' | 'laneB' | null>(null);

  // Wavetable Drawer
  const [isWavetableDrawerOpen, setIsWavetableDrawerOpen] = useState(false);

  // 60fps internal clock ticker synchronized with isPlaying
  const [internalTime, setInternalTime] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    let frameId: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setInternalTime(prev => prev + dt);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  const lfo1Rate = effects.lfo1?.rate ?? 0.15;
  const lfo2Rate = effects.lfo2?.rate ?? 0.08;

  // Real-time Serum-style modulation offset calculation for each knob
  const computeLiveModOffset = (knobId: string): number => {
    const route = modulationRoutes[knobId];
    if (!route) return 0;

    switch (route.source) {
      case 'breathMacro': {
        if (modulationValue !== undefined) {
          return route.bipolar ? modulationValue : (modulationValue + 1) / 2;
        }
        const bm = breathMacro ?? 0.5;
        return route.bipolar ? (bm * 2 - 1) : bm;
      }
      case 'lfo1':
      case 'lfo2': {
        if (!isPlaying) return 0;
        const lfoCfg = route.source === 'lfo1' ? effects.lfo1 : effects.lfo2;
        const rate = route.source === 'lfo1' ? lfo1Rate : lfo2Rate;
        const shape = lfoCfg?.shape ?? 'sine';
        const depth = lfoCfg?.depth ?? 1.0;
        const bypass = lfoCfg?.bypass ?? false;
        const polarity = route.bipolar !== undefined
          ? (route.bipolar ? 'bipolar' : 'unipolar')
          : (lfoCfg?.polarity ?? 'bipolar');
        return computeLfoLiveValue(rate, depth, shape, bypass, internalTime, polarity);
      }
      case 'stageProgress': {
        const stage = breathStage ?? (clockSnapshot?.currentStage ?? 'inhale');
        const p = stageProgress ?? (clockSnapshot?.stageProgress ?? 0.5);
        if (route.curveData && stage) {
          const curveVal = evaluateFullBreathCurve(route.curveData, stage, p);
          return route.bipolar ? (curveVal * 2 - 1) : curveVal;
        }
        const mults = route.stageMultipliers;
        if (mults && stage) {
          // Continuous cyclic transitions across 4 breath stages:
          // Inhale: holdOut -> inhale
          // HoldIn: inhale -> holdIn
          // Exhale: holdIn -> exhale
          // HoldOut: exhale -> holdOut
          let fromVal = mults.holdOut;
          let toVal = mults.inhale;
          if (stage === 'holdIn') {
            fromVal = mults.inhale;
            toVal = mults.holdIn;
          } else if (stage === 'exhale') {
            fromVal = mults.holdIn;
            toVal = mults.exhale;
          } else if (stage === 'holdOut') {
            fromVal = mults.exhale;
            toVal = mults.holdOut;
          }

          let t = Math.max(0, Math.min(1, p));
          const curve = mults.curve ?? 'smooth';
          if (curve === 'smooth') {
            t = 0.5 * (1 - Math.cos(Math.PI * t));
          } else if (curve === 'step') {
            t = 1.0;
          }
          const val = fromVal + (toVal - fromVal) * t;
          return route.bipolar ? (val * 2 - 1) : val;
        }
        return route.bipolar ? (p * 2 - 1) : p;
      }
      case 'manual':
      default:
        return 0;
    }
  };

  const handleModAssign = (route: ModulationRoute) => {
    if (!activeModTarget) return;
    setModulationRoutes(prev => ({ ...prev, [activeModTarget.id]: route }));
    onModulationRouteAssign?.(activeModTarget.id, route);
  };

  const handleModUnassign = () => {
    if (!activeModTarget) return;
    setModulationRoutes(prev => {
      const next = { ...prev };
      delete next[activeModTarget.id];
      return next;
    });
    onModulationRouteAssign?.(activeModTarget.id, null as any);
  };

  const handleStudioSave = (newCurve: FullBreathCurveData) => {
    const targetId = studioTarget?.id || 'master-fader';
    const updatedMultipliers = extractStageMultipliersFromCurve(newCurve);

    const existingRoute = modulationRoutes[targetId] ?? (DEFAULT_MODULATION_ROUTES[targetId] ?? {
      target: targetId,
      source: 'stageProgress',
      depth: 1.0,
      bipolar: false
    });

    const updatedRoute: ModulationRoute = {
      ...existingRoute,
      target: targetId,
      source: 'stageProgress',
      curveData: newCurve,
      stageMultipliers: updatedMultipliers
    };

    setModulationRoutes(prev => ({
      ...prev,
      [targetId]: updatedRoute
    }));
    onModulationRouteAssign?.(targetId, updatedRoute);
  };

  const previewContextRef = useRef<AudioContext | null>(null);

  const playWavetableAudioPreview = (sliceIndex: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      // Close previous preview context if active to avoid voice buildup
      if (previewContextRef.current) {
        try {
          previewContextRef.current.close();
        } catch {}
        previewContextRef.current = null;
      }

      const ctx = new AudioContextClass();
      previewContextRef.current = ctx;

      const slice = WAVETABLE_DEFINITIONS[sliceIndex];
      if (!slice) return;

      const wave = ctx.createPeriodicWave(slice.real, slice.imag, { disableNormalization: false });
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.setPeriodicWave(wave);
      osc.frequency.setValueAtTime(320, ctx.currentTime);

      // 1.0s full preview duration with musical attack, sustain, and smooth release
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
      gain.gain.setValueAtTime(0.18, now + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);

      setTimeout(() => {
        try {
          if (previewContextRef.current === ctx) {
            ctx.close();
            previewContextRef.current = null;
          }
        } catch {}
      }, 1050);
    } catch {
      // Graceful fallback for test or headless environments
    }
  };

  const wavetableDrawerItems: DrawerItem[] = MULTI_FRAME_WAVETABLES.map(w => ({
    id: String(w.id),
    label: `${w.id.toString().padStart(2, '0')}: ${w.name}`,
    description: w.category,
    badge: `${w.sliceIndices.length} Frames`,
    previewSvgPath: generateMultiFramePreviewSvgPath(w.id, 64, 28),
    onPreviewAudio: () => {
      playWavetableAudioPreview(w.sliceIndices[0]);
    }
  }));

  const activeTableIndex = Math.max(0, Math.min(MULTI_FRAME_WAVETABLES.length - 1, Math.floor(channelStrip.oscA.wavetableIndex ?? 0)));
  const activeWavetable =
    MULTI_FRAME_WAVETABLES[activeTableIndex] ?? MULTI_FRAME_WAVETABLES[0];


  const cardContainerClass = isDark
    ? 'border-neutral-800 bg-neutral-900/50'
    : 'border-neutral-200 bg-white shadow-sm';
  const cardHeaderBorderClass = isDark ? 'border-neutral-800/80' : 'border-neutral-200';
  const cardTitleClass = isDark ? 'text-slate-200' : 'text-neutral-900';
  const cardSubTitleClass = isDark ? 'text-slate-400' : 'text-neutral-500';
  const sectionTitleClass = isDark ? 'text-slate-400 border-neutral-800' : 'text-neutral-500 border-neutral-200';
  const innerCardClass = isDark
    ? 'bg-neutral-950/60 border-neutral-800/80'
    : 'bg-neutral-50/80 border-neutral-200';
  const innerGridClass = isDark
    ? 'bg-neutral-900/40 border-neutral-800/50'
    : 'bg-white/80 border-neutral-200/80';
  const faderBayClass = isDark
    ? 'bg-neutral-900/60 border-neutral-800/80'
    : 'bg-neutral-50/90 border-neutral-200';

  const getPowerButtonClass = (isBypass: boolean, padding = 'p-1') => `rounded border transition-colors ${padding} ${
    isBypass
      ? isDark
        ? 'border-neutral-700 bg-neutral-800 text-slate-500 hover:bg-neutral-700'
        : 'border-neutral-200 bg-neutral-100 text-slate-400 hover:bg-neutral-200/60'
      : isDark
        ? 'border-neutral-800 bg-neutral-900 text-emerald-400 hover:bg-neutral-800'
        : 'border-neutral-300 bg-white text-emerald-600 hover:bg-neutral-50 shadow-2xs'
  }`;


  const activeLaneAOrder = React.useMemo(() => {
    if (laneAOrder !== undefined) return laneAOrder;
    if (effectOrder !== undefined) return effectOrder;
    return DEFAULT_LANE_A_ORDER;
  }, [laneAOrder, effectOrder]);

  const activeLaneBOrder = React.useMemo(() => {
    if (laneBOrder !== undefined) return laneBOrder;
    return DEFAULT_LANE_B_ORDER;
  }, [laneBOrder]);

  const handleMoveEffectInLane = (lane: 'laneA' | 'laneB', index: number, direction: 'up' | 'down') => {
    const currentOrder = lane === 'laneA' ? [...activeLaneAOrder] : [...activeLaneBOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;
    onLaneReorder?.(lane, currentOrder);
  };

  const handleTransferEffect = (effectId: string, fromLane: 'laneA' | 'laneB') => {
    const toLane = fromLane === 'laneA' ? 'laneB' : 'laneA';
    onMoveEffectBetweenLanes?.(effectId, fromLane, toLane);
  };

  const renderRackSlotControls = (
    lane: 'laneA' | 'laneB',
    slotIndex: number,
    totalInLane: number,
    effectId: string,
    effectName: string
  ) => {
    const targetLaneLabel = lane === 'laneA' ? 'BUS B' : 'BUS A';
    const targetLane = lane === 'laneA' ? 'laneB' : 'laneA';
    const moveValidation = validateMoveEffectBetweenLanes(
      effectId,
      lane,
      targetLane,
      activeLaneAOrder,
      activeLaneBOrder
    );

    return (
      <div className="flex items-center gap-1 font-mono text-[9px]">
        <span
          className={`px-1.5 py-0.5 rounded text-[8.5px] border ${
            lane === 'laneA'
              ? (isDark ? 'border-sky-500/40 bg-sky-950/40 text-sky-300' : 'border-sky-300 bg-sky-50 text-sky-700 font-semibold')
              : (isDark ? 'border-teal-500/40 bg-teal-950/40 text-teal-300' : 'border-teal-300 bg-teal-50 text-teal-700 font-semibold')
          }`}
        >
          {lane === 'laneA' ? 'A' : 'B'}-0{slotIndex + 1}
        </span>
        <button
          type="button"
          disabled={slotIndex === 0}
          onClick={() => handleMoveEffectInLane(lane, slotIndex, 'up')}
          aria-label={`Move ${effectName} Up`}
          className={`p-1 rounded border transition-colors ${
            slotIndex === 0
              ? 'opacity-25 cursor-not-allowed border-transparent'
              : isDark
              ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <ArrowUp size={10} strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={slotIndex === totalInLane - 1}
          onClick={() => handleMoveEffectInLane(lane, slotIndex, 'down')}
          aria-label={`Move ${effectName} Down`}
          className={`p-1 rounded border transition-colors ${
            slotIndex === totalInLane - 1
              ? 'opacity-25 cursor-not-allowed border-transparent'
              : isDark
              ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <ArrowDown size={10} strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={!moveValidation.allowed}
          onClick={() => handleTransferEffect(effectId, lane)}
          aria-label={`Move ${effectName} to ${targetLaneLabel}`}
          title={moveValidation.allowed ? `迁移至 ${targetLaneLabel}` : (moveValidation.reason || `无法迁至 ${targetLaneLabel}`)}
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            !moveValidation.allowed
              ? 'opacity-25 cursor-not-allowed border-transparent text-slate-500'
              : isDark
              ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:text-slate-100 hover:bg-neutral-800'
              : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          {lane === 'laneA' ? '→ BUS B' : '← BUS A'}
        </button>
        <button
          type="button"
          onClick={() => onRemoveEffectFromLane?.(lane, effectId)}
          aria-label={`Remove ${effectName} from ${lane === 'laneA' ? 'LANE A' : 'LANE B'}`}
          title={`从 ${lane === 'laneA' ? 'LANE A' : 'LANE B'} 移除模块`}
          className={`p-1 rounded border transition-colors ${
            isDark
              ? 'border-neutral-800 bg-neutral-900 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 hover:bg-neutral-800'
              : 'border-neutral-200 bg-white text-neutral-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50'
          }`}
        >
          <X size={10} strokeWidth={2} />
        </button>
      </div>
    );
  };

  const handleAddModule = (lane: 'laneA' | 'laneB', moduleType: EffectModuleType) => {
    const allExisting = [...activeLaneAOrder, ...activeLaneBOrder];
    const newInstanceId = generateNextEffectInstanceId(moduleType, allExisting);
    onAddEffectToLane?.(lane, newInstanceId);
    setAddModuleLane(null);
  };

  const renderAddModuleModal = (lane: 'laneA' | 'laneB') => {
    const laneHeaderClass = lane === 'laneA'
      ? (isDark ? 'border-sky-500/40 bg-neutral-950/95 text-sky-300' : 'border-sky-300 bg-white text-sky-700 shadow-md')
      : (isDark ? 'border-teal-500/40 bg-neutral-950/95 text-teal-300' : 'border-teal-300 bg-white text-teal-700 shadow-md');

    return (
      <div
        role="dialog"
        aria-label={`Add Effect Module to ${lane === 'laneA' ? 'LANE A' : 'LANE B'}`}
        className={`rounded-lg border p-3 my-2 transition-all ${laneHeaderClass}`}
      >
        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className={lane === 'laneA' ? 'text-sky-400' : 'text-teal-400'} />
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase">
              添加效果器模块 · {lane === 'laneA' ? 'LANE A BUS' : 'LANE B BUS'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddModuleLane(null)}
            className={`p-1 rounded transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-neutral-500 hover:text-neutral-800'
            }`}
            aria-label="Close module selector"
          >
            <X size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {AVAILABLE_EFFECT_MODULES.map(mod => {
            const validation = validateAddEffectToLane(
              mod.id,
              lane,
              activeLaneAOrder,
              activeLaneBOrder
            );
            const isAllowed = validation.allowed;
            return (
              <button
                key={mod.id}
                type="button"
                data-testid={`add-module-option-${mod.id}`}
                aria-label={`Add ${mod.name} to ${lane === 'laneA' ? 'BUS A' : 'BUS B'}${!isAllowed ? ` (${validation.reason})` : ''}`}
                disabled={!isAllowed}
                onClick={() => handleAddModule(lane, mod.id)}
                className={`flex items-start gap-2 p-2 rounded border text-left transition-colors ${
                  !isAllowed
                    ? (isDark ? 'border-neutral-850 bg-neutral-900/40 text-slate-500 cursor-not-allowed opacity-50' : 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60')
                    : isDark
                    ? (lane === 'laneA'
                      ? 'border-neutral-800 bg-neutral-900/80 hover:border-sky-500/60 hover:bg-sky-950/30 text-slate-200'
                      : 'border-neutral-800 bg-neutral-900/80 hover:border-teal-500/60 hover:bg-teal-950/30 text-slate-200')
                    : (lane === 'laneA'
                      ? 'border-neutral-200 bg-neutral-50 hover:border-sky-400 hover:bg-sky-50/60 text-neutral-800'
                      : 'border-neutral-200 bg-neutral-50 hover:border-teal-400 hover:bg-teal-50/60 text-neutral-800')
                }`}
              >
                <span className={`px-1 py-0.5 rounded text-[8.5px] font-mono font-bold tracking-wider ${
                  !isAllowed
                    ? 'bg-neutral-800 text-slate-500'
                    : lane === 'laneA'
                    ? (isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700')
                    : (isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-700')
                }`}>
                  {mod.code}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-medium truncate">{mod.name}</span>
                    {!isAllowed && (
                      <span className="text-[8px] font-mono text-slate-500">{validation.reason}</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">{mod.cnName} · {mod.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEffectCard = (effectId: string, lane: 'laneA' | 'laneB', slotIndex: number, totalInLane: number) => {
    const baseType = getEffectModuleType(effectId);
    const instanceSuffix = effectId.includes('_') ? ` #${effectId.split('_')[1]}` : '';

    const getCardModuleParams = (targetId: string, type: EffectModuleType): any => {
      if (targetId === type && (effects as any)[type]) {
        return (effects as any)[type];
      }
      if (effects.instances && effects.instances[targetId]) {
        return effects.instances[targetId];
      }
      if ((effects as any)[targetId]) {
        return (effects as any)[targetId];
      }
      return getDefaultEffectParams(type);
    };

    const dispatchCardChange = (targetId: string, type: EffectModuleType, current: any, partial: any) => {
      const updated = { ...current, ...partial };
      if (targetId === type) {
        onEffectsChange?.({ [type]: partial });
      } else {
        onEffectsChange?.({
          [targetId]: partial,
          instances: {
            ...(effects.instances || {}),
            [targetId]: updated
          }
        });
      }
    };

    switch (baseType) {
      case 'gain': {
        const gainParams = getCardModuleParams(effectId, 'gain');
        const updateGain = (p: any) => dispatchCardChange(effectId, 'gain', gainParams, p);
        const knobId = effectId === 'gain' ? 'preamp-gain' : `${effectId}-gain`;
        return (
        <div
          key={`${lane}-${effectId}`}
          className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
            gainParams?.bypass ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
            <div className="flex items-center gap-2">
              <Volume2 size={14} strokeWidth={1.5} className="text-cyan-400" />
              <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                Preamp Gain{instanceSuffix}
              </span>
              <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                前级增益与软削波
              </span>
              <div
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  gainParams?.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Preamp Gain')}

              {/* Soft-Clip Toggle Button */}
              <button
                type="button"
                onClick={() =>
                  updateGain({ softClip: !(gainParams?.softClip ?? true) })
                }
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  gainParams?.softClip !== false
                    ? (isDark ? 'border-cyan-500/70 bg-cyan-950/60 text-cyan-300 font-semibold' : 'border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold')
                    : (isDark ? 'border-neutral-800 bg-neutral-900 text-slate-500' : 'border-neutral-300 bg-neutral-100 text-neutral-400')
                }`}
                title="软削波保护（防止数字爆音硬失真）"
                aria-label="Toggle Soft-Clip Protection"
              >
                SOFT-CLIP
              </button>

              <button
                type="button"
                onClick={() =>
                  updateGain({ bypass: !gainParams?.bypass })
                }
                aria-label="Preamp Gain Bypass"
                className={getPowerButtonClass(gainParams?.bypass ?? false)}
              >
                <Power size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-around gap-2 py-1">
            <Knob
              id={knobId}
              label="Preamp Gain"
              value={gainParams?.value ?? 0.0}
              min={-12.0}
              max={24.0}
              step={0.5}
              unit="dB"
              formatValue={v => (v >= 0 ? `+${v.toFixed(1)} dB` : `${v.toFixed(1)} dB`)}
              breathStage={breathStage}
              assignedModulation={modulationRoutes[knobId]}
              liveModOffset={computeLiveModOffset(knobId)}
              onChange={val => updateGain({ value: val })}
              onLongPress={() =>
                setActiveModTarget({ id: knobId, label: `Preamp Gain${instanceSuffix}` })
              }
            />

            <div className="flex flex-col items-center justify-center text-center">
              <span className={`text-[10px] font-mono font-semibold ${
                (gainParams?.value ?? 0) > 6
                  ? 'text-cyan-400'
                  : (isDark ? 'text-slate-300' : 'text-neutral-700')
              }`}>
                {(gainParams?.value ?? 0) >= 0 ? `+${(gainParams?.value ?? 0).toFixed(1)} dB` : `${(gainParams?.value ?? 0).toFixed(1)} dB`}
              </span>
              <span className="text-[8.5px] font-mono text-slate-400 mt-0.5">
                {Math.pow(10, (gainParams?.value ?? 0) / 20).toFixed(2)}x 线性放大量
              </span>
              <span className="text-[8px] font-mono text-slate-500 mt-1">
                HEADROOM BOOST
              </span>
            </div>
          </div>
        </div>
        );
      }
      case 'drive': {
        const driveParams = getCardModuleParams(effectId, 'drive');
        const updateDrive = (p: any) => dispatchCardChange(effectId, 'drive', driveParams, p);
        const amountKnobId = effectId === 'drive' ? 'drive-amount' : `${effectId}-amount`;
        const toneKnobId = effectId === 'drive' ? 'drive-tone' : `${effectId}-tone`;
        return (
        <div
          key={`${lane}-${effectId}`}
          className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
            driveParams.bypass ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
            <div className="flex items-center gap-2">
              <Flame size={14} strokeWidth={1.5} className="text-rose-400" />
              <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                Tape Warmth Drive{instanceSuffix}
              </span>
              <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                模拟磁带过载
              </span>
              <div
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  driveParams.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Tape Warmth Drive')}

              <button
                type="button"
                onClick={() =>
                  updateDrive({ bypass: !driveParams.bypass })
                }
                aria-label="Drive Bypass"
                className={getPowerButtonClass(driveParams.bypass)}
              >
                <Power size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-around gap-2">
            <Knob
              id={amountKnobId}
              label="Drive"
              value={driveParams.amount}
              min={0}
              max={1}
              step={0.01}
              unit="%"
              formatValue={v => `${Math.round(v * 100)}%`}
              breathStage={breathStage}
              assignedModulation={modulationRoutes[amountKnobId]}
              liveModOffset={computeLiveModOffset(amountKnobId)}
              onChange={val => updateDrive({ amount: val })}
              onLongPress={() =>
                setActiveModTarget({ id: amountKnobId, label: `Drive Amount${instanceSuffix}` })
              }
            />

            <Knob
              id={toneKnobId}
              label="Tone"
              value={driveParams.tone}
              min={0}
              max={1}
              step={0.01}
              unit="%"
              formatValue={v => `${Math.round(v * 100)}%`}
              breathStage={breathStage}
              assignedModulation={modulationRoutes[toneKnobId]}
              liveModOffset={computeLiveModOffset(toneKnobId)}
              onChange={val => updateDrive({ tone: val })}
              onLongPress={() =>
                setActiveModTarget({ id: toneKnobId, label: `Drive Tone${instanceSuffix}` })
              }
            />
          </div>
        </div>
        );
      }
      case 'filter': {
        const filterParams = getCardModuleParams(effectId, 'filter');
        const updateFilter = (p: any) => dispatchCardChange(effectId, 'filter', filterParams, p);
        const cutoffKnobId = effectId === 'filter' ? 'filter-cutoff' : `${effectId}-cutoff`;
        const resKnobId = effectId === 'filter' ? 'filter-resonance' : `${effectId}-resonance`;
        const currentCutoffRoute = modulationRoutes[cutoffKnobId];
        const cardLiveCutoff = currentCutoffRoute && currentCutoffRoute.source !== 'manual'
          ? Math.max(20, Math.min(20000, filterParams.cutoff * Math.pow(2, computeLiveModOffset(cutoffKnobId) * currentCutoffRoute.depth * 2.5)))
          : undefined;

        const currentResRoute = modulationRoutes[resKnobId];
        const cardLiveResonance = currentResRoute && currentResRoute.source !== 'manual'
          ? Math.max(0.1, Math.min(18, filterParams.resonance * (1 + computeLiveModOffset(resKnobId) * currentResRoute.depth)))
          : undefined;

        return (
        <div
          key={`${lane}-${effectId}`}
          className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
            filterParams.bypass ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
            <div className="flex items-center gap-2">
              <Sliders size={14} strokeWidth={1.5} className="text-sky-400" />
              <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                Multimode Filter{instanceSuffix}
              </span>
              <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                多模滤波器
              </span>
              <div
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  filterParams.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                }`}
              />
            </div>

            {/* Mode Selectors & Bypass */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Multimode Filter')}

              {[
                { type: 'lowpass' as FilterType, label: 'LP' },
                { type: 'bandpass' as FilterType, label: 'BP' },
                { type: 'highpass' as FilterType, label: 'HP' },
                { type: 'notch' as FilterType, label: 'Notch' },
                { type: 'peak' as FilterType, label: 'Peak' },
                { type: 'ladder' as FilterType, label: 'Ladder' }
              ].map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => updateFilter({ type: m.type })}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-mono rounded border transition-colors ${
                    filterParams.type === m.type
                      ? 'border-sky-500 bg-sky-950/50 text-sky-300'
                      : isDark
                        ? 'border-neutral-800 bg-neutral-900 text-slate-500 hover:text-slate-300'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateFilter({ bypass: !filterParams.bypass })
                }
                aria-label="Filter Bypass"
                className={getPowerButtonClass(filterParams.bypass)}
              >
                <Power size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Knob
              id={cutoffKnobId}
              label="Cutoff"
              value={filterParams.cutoff}
              min={20}
              max={20000}
              step={1}
              unit=" Hz"
              formatValue={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k Hz` : `${Math.round(v)} Hz`)}
              breathStage={breathStage}
              assignedModulation={modulationRoutes[cutoffKnobId]}
              liveModOffset={computeLiveModOffset(cutoffKnobId)}
              onChange={val => updateFilter({ cutoff: val })}
              onLongPress={() =>
                setActiveModTarget({ id: cutoffKnobId, label: `Filter Cutoff${instanceSuffix}` })
              }
            />

            <div className="flex-1 min-w-[110px] max-w-[260px] px-1">
              <FilterVisualizer
                type={filterParams.type}
                cutoff={filterParams.cutoff}
                resonance={filterParams.resonance}
                liveModCutoff={cardLiveCutoff}
                liveModResonance={cardLiveResonance}
                isDark={isDark}
              />
            </div>

            <Knob
              id={resKnobId}
              label="Resonance"
              value={filterParams.resonance}
              min={0.1}
              max={18}
              step={0.1}
              unit=" Q"
              formatValue={v => v.toFixed(1)}
              breathStage={breathStage}
              assignedModulation={modulationRoutes[resKnobId]}
              liveModOffset={computeLiveModOffset(resKnobId)}
              onChange={val => updateFilter({ resonance: val })}
              onLongPress={() =>
                setActiveModTarget({ id: resKnobId, label: `Filter Resonance${instanceSuffix}` })
              }
            />
          </div>
        </div>
        );
      }
      case 'eq': {
        const eqParams = getCardModuleParams(effectId, 'eq') ?? DEFAULT_EQ_PARAMS;
        const updateEq = (partial: any) => {
          const merged = {
            ...eqParams,
            ...partial,
            low: partial.low ? { ...eqParams.low, ...partial.low } : eqParams.low,
            midLow: partial.midLow ? { ...eqParams.midLow, ...partial.midLow } : eqParams.midLow,
            midHigh: partial.midHigh ? { ...eqParams.midHigh, ...partial.midHigh } : eqParams.midHigh,
            high: partial.high ? { ...eqParams.high, ...partial.high } : eqParams.high,
          };
          dispatchCardChange(effectId, 'eq', eqParams, merged);
        };

        const lowFreqKnobId = effectId === 'eq' ? 'eq-low-freq' : `${effectId}-low-freq`;
        const lowGainKnobId = effectId === 'eq' ? 'eq-low-gain' : `${effectId}-low-gain`;
        const lowQKnobId = effectId === 'eq' ? 'eq-low-q' : `${effectId}-low-q`;

        const midLowFreqKnobId = effectId === 'eq' ? 'eq-midlow-freq' : `${effectId}-midlow-freq`;
        const midLowGainKnobId = effectId === 'eq' ? 'eq-midlow-gain' : `${effectId}-midlow-gain`;
        const midLowQKnobId = effectId === 'eq' ? 'eq-midlow-q' : `${effectId}-midlow-q`;

        const midHighFreqKnobId = effectId === 'eq' ? 'eq-midhigh-freq' : `${effectId}-midhigh-freq`;
        const midHighGainKnobId = effectId === 'eq' ? 'eq-midhigh-gain' : `${effectId}-midhigh-gain`;
        const midHighQKnobId = effectId === 'eq' ? 'eq-midhigh-q' : `${effectId}-midhigh-q`;

        const highFreqKnobId = effectId === 'eq' ? 'eq-high-freq' : `${effectId}-high-freq`;
        const highGainKnobId = effectId === 'eq' ? 'eq-high-gain' : `${effectId}-high-gain`;
        const highQKnobId = effectId === 'eq' ? 'eq-high-q' : `${effectId}-high-q`;

        return (
          <div
            key={`${lane}-${effectId}`}
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              eqParams.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Sliders size={14} strokeWidth={1.5} className="text-teal-400" />
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                    Parametric EQ{instanceSuffix}
                  </span>
                  <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                    4段参量均衡
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    eqParams.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Parametric EQ')}

                {/* EQ Bypass */}
                <button
                  type="button"
                  onClick={() =>
                    updateEq({ bypass: !eqParams.bypass })
                  }
                  aria-label="EQ Bypass"
                  className={getPowerButtonClass(eqParams.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* EQ Frequency Response Visualizer */}
            <div className="mb-2.5">
              <EqVisualizer
                params={eqParams}
                onChange={newEq => updateEq(newEq)}
                isDark={isDark}
                height={100}
              />
            </div>

            {/* 4-Band Control Matrix: 2x2 Balanced Studio Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-inherit">
              {/* Band 1: Low */}
              <div className={`p-2.5 rounded border flex flex-col justify-between gap-2.5 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-sky-400 font-semibold tracking-wider whitespace-nowrap">1. LOW BAND</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['lowshelf', 'highpass'] as const).map(lt => (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => updateEq({ low: { type: lt } })}
                        className={`px-1.5 py-0.5 text-[8.5px] uppercase font-mono rounded border transition-colors ${
                          eqParams.low.type === lt
                            ? 'border-sky-500 bg-sky-950/50 text-sky-300'
                            : isDark
                            ? 'border-neutral-800 bg-neutral-900 text-slate-500 hover:text-slate-300'
                            : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        {lt === 'lowshelf' ? 'SHELF' : 'HPF'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob
                    id={lowFreqKnobId}
                    label="Freq"
                    value={eqParams.low.frequency}
                    min={20}
                    max={500}
                    step={1}
                    unit=" Hz"
                    formatValue={v => `${Math.round(v)} Hz`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[lowFreqKnobId]}
                    liveModOffset={computeLiveModOffset(lowFreqKnobId)}
                    onChange={val => updateEq({ low: { frequency: val } })}
                    onLongPress={() => setActiveModTarget({ id: lowFreqKnobId, label: `EQ Low Freq${instanceSuffix}` })}
                  />
                  <Knob
                    id={lowGainKnobId}
                    label="Gain"
                    value={eqParams.low.gain}
                    min={-18}
                    max={18}
                    step={0.5}
                    unit=" dB"
                    formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[lowGainKnobId]}
                    liveModOffset={computeLiveModOffset(lowGainKnobId)}
                    onChange={val => updateEq({ low: { gain: val } })}
                    onLongPress={() => setActiveModTarget({ id: lowGainKnobId, label: `EQ Low Gain${instanceSuffix}` })}
                  />
                  <Knob
                    id={lowQKnobId}
                    label="Q"
                    value={eqParams.low.q}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit=""
                    formatValue={v => v.toFixed(1)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[lowQKnobId]}
                    liveModOffset={computeLiveModOffset(lowQKnobId)}
                    onChange={val => updateEq({ low: { q: val } })}
                    onLongPress={() => setActiveModTarget({ id: lowQKnobId, label: `EQ Low Q${instanceSuffix}` })}
                  />
                </div>
              </div>

              {/* Band 2: Mid-Low */}
              <div className={`p-2.5 rounded border flex flex-col justify-between gap-2.5 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span className="text-teal-400 font-semibold tracking-wider whitespace-nowrap">2. MID-LOW</span>
                  </div>
                  <span className="text-[8.5px] font-mono text-slate-500 uppercase">PEAK</span>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob
                    id={midLowFreqKnobId}
                    label="Freq"
                    value={eqParams.midLow.frequency}
                    min={100}
                    max={2500}
                    step={5}
                    unit=" Hz"
                    formatValue={v => `${Math.round(v)} Hz`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midLowFreqKnobId]}
                    liveModOffset={computeLiveModOffset(midLowFreqKnobId)}
                    onChange={val => updateEq({ midLow: { frequency: val } })}
                    onLongPress={() => setActiveModTarget({ id: midLowFreqKnobId, label: `EQ MidLow Freq${instanceSuffix}` })}
                  />
                  <Knob
                    id={midLowGainKnobId}
                    label="Gain"
                    value={eqParams.midLow.gain}
                    min={-18}
                    max={18}
                    step={0.5}
                    unit=" dB"
                    formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midLowGainKnobId]}
                    liveModOffset={computeLiveModOffset(midLowGainKnobId)}
                    onChange={val => updateEq({ midLow: { gain: val } })}
                    onLongPress={() => setActiveModTarget({ id: midLowGainKnobId, label: `EQ MidLow Gain${instanceSuffix}` })}
                  />
                  <Knob
                    id={midLowQKnobId}
                    label="Q"
                    value={eqParams.midLow.q}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit=""
                    formatValue={v => v.toFixed(1)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midLowQKnobId]}
                    liveModOffset={computeLiveModOffset(midLowQKnobId)}
                    onChange={val => updateEq({ midLow: { q: val } })}
                    onLongPress={() => setActiveModTarget({ id: midLowQKnobId, label: `EQ MidLow Q${instanceSuffix}` })}
                  />
                </div>
              </div>

              {/* Band 3: Mid-High */}
              <div className={`p-2.5 rounded border flex flex-col justify-between gap-2.5 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-indigo-400 font-semibold tracking-wider whitespace-nowrap">3. MID-HIGH</span>
                  </div>
                  <span className="text-[8.5px] font-mono text-slate-500 uppercase">PEAK</span>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob
                    id={midHighFreqKnobId}
                    label="Freq"
                    value={eqParams.midHigh.frequency}
                    min={500}
                    max={8000}
                    step={10}
                    unit=" Hz"
                    formatValue={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k Hz` : `${Math.round(v)} Hz`)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midHighFreqKnobId]}
                    liveModOffset={computeLiveModOffset(midHighFreqKnobId)}
                    onChange={val => updateEq({ midHigh: { frequency: val } })}
                    onLongPress={() => setActiveModTarget({ id: midHighFreqKnobId, label: `EQ MidHigh Freq${instanceSuffix}` })}
                  />
                  <Knob
                    id={midHighGainKnobId}
                    label="Gain"
                    value={eqParams.midHigh.gain}
                    min={-18}
                    max={18}
                    step={0.5}
                    unit=" dB"
                    formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midHighGainKnobId]}
                    liveModOffset={computeLiveModOffset(midHighGainKnobId)}
                    onChange={val => updateEq({ midHigh: { gain: val } })}
                    onLongPress={() => setActiveModTarget({ id: midHighGainKnobId, label: `EQ MidHigh Gain${instanceSuffix}` })}
                  />
                  <Knob
                    id={midHighQKnobId}
                    label="Q"
                    value={eqParams.midHigh.q}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit=""
                    formatValue={v => v.toFixed(1)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[midHighQKnobId]}
                    liveModOffset={computeLiveModOffset(midHighQKnobId)}
                    onChange={val => updateEq({ midHigh: { q: val } })}
                    onLongPress={() => setActiveModTarget({ id: midHighQKnobId, label: `EQ MidHigh Q${instanceSuffix}` })}
                  />
                </div>
              </div>

              {/* Band 4: High */}
              <div className={`p-2.5 rounded border flex flex-col justify-between gap-2.5 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span className="text-violet-400 font-semibold tracking-wider whitespace-nowrap">4. HIGH BAND</span>
                  </div>
                  <span className="text-[8.5px] font-mono text-slate-500 uppercase">SHELF</span>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob
                    id={highFreqKnobId}
                    label="Freq"
                    value={eqParams.high.frequency}
                    min={2000}
                    max={20000}
                    step={50}
                    unit=" Hz"
                    formatValue={v => `${(v / 1000).toFixed(1)}k Hz`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[highFreqKnobId]}
                    liveModOffset={computeLiveModOffset(highFreqKnobId)}
                    onChange={val => updateEq({ high: { frequency: val } })}
                    onLongPress={() => setActiveModTarget({ id: highFreqKnobId, label: `EQ High Freq${instanceSuffix}` })}
                  />
                  <Knob
                    id={highGainKnobId}
                    label="Gain"
                    value={eqParams.high.gain}
                    min={-18}
                    max={18}
                    step={0.5}
                    unit=" dB"
                    formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[highGainKnobId]}
                    liveModOffset={computeLiveModOffset(highGainKnobId)}
                    onChange={val => updateEq({ high: { gain: val } })}
                    onLongPress={() => setActiveModTarget({ id: highGainKnobId, label: `EQ High Gain${instanceSuffix}` })}
                  />
                  <Knob
                    id={highQKnobId}
                    label="Q"
                    value={eqParams.high.q}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit=""
                    formatValue={v => v.toFixed(1)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes[highQKnobId]}
                    liveModOffset={computeLiveModOffset(highQKnobId)}
                    onChange={val => updateEq({ high: { q: val } })}
                    onLongPress={() => setActiveModTarget({ id: highQKnobId, label: `EQ High Q${instanceSuffix}` })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'delay': {
        const delayParams = getCardModuleParams(effectId, 'delay');
        const updateDelay = (p: any) => dispatchCardChange(effectId, 'delay', delayParams, p);
        const timeKnobId = effectId === 'delay' ? 'delay-time' : `${effectId}-time`;
        const feedbackKnobId = effectId === 'delay' ? 'delay-feedback' : `${effectId}-feedback`;
        const mixKnobId = effectId === 'delay' ? 'delay-mix' : `${effectId}-mix`;
        return (
          <div
            key={`${lane}-${effectId}`}
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              delayParams.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Repeat size={14} strokeWidth={1.5} className="text-violet-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Ping-Pong Delay{instanceSuffix}
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  乒乓立体声延迟
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    delayParams.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Ping-Pong Delay')}

                <button
                  type="button"
                  onClick={() =>
                    updateDelay({ bypass: !delayParams.bypass })
                  }
                  aria-label="Delay Bypass"
                  className={getPowerButtonClass(delayParams.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              <Knob
                id={timeKnobId}
                label="Time"
                value={delayParams.time}
                min={0.01}
                max={3.0}
                step={0.01}
                unit="s"
                formatValue={v => `${v.toFixed(2)}s`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[timeKnobId]}
                liveModOffset={computeLiveModOffset(timeKnobId)}
                onChange={val => updateDelay({ time: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: timeKnobId, label: `Delay Time${instanceSuffix}` })
                }
              />

              <Knob
                id={feedbackKnobId}
                label="Feedback"
                value={delayParams.feedback}
                min={0}
                max={0.95}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[feedbackKnobId]}
                liveModOffset={computeLiveModOffset(feedbackKnobId)}
                onChange={val => updateDelay({ feedback: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: feedbackKnobId, label: `Delay Feedback${instanceSuffix}` })
                }
              />

              <Knob
                id={mixKnobId}
                label="Mix"
                value={delayParams.mix}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[mixKnobId]}
                liveModOffset={computeLiveModOffset(mixKnobId)}
                onChange={val => updateDelay({ mix: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: mixKnobId, label: `Delay Mix${instanceSuffix}` })
                }
              />
            </div>
          </div>
        );
      }
      case 'reverb': {
        const reverbParams = getCardModuleParams(effectId, 'reverb');
        const updateReverb = (p: any) => dispatchCardChange(effectId, 'reverb', reverbParams, p);
        const decayKnobId = effectId === 'reverb' ? 'reverb-decay' : `${effectId}-decay`;
        const dampingKnobId = effectId === 'reverb' ? 'reverb-damping' : `${effectId}-damping`;
        const mixKnobId = effectId === 'reverb' ? 'reverb-mix' : `${effectId}-mix`;
        return (
          <div
            key={`${lane}-${effectId}`}
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              reverbParams.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Maximize2 size={14} strokeWidth={1.5} className="text-emerald-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Synthetic Reverb{instanceSuffix}
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  空间混响
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    reverbParams.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Synthetic Reverb')}

                <button
                  type="button"
                  onClick={() =>
                    updateReverb({ bypass: !reverbParams.bypass })
                  }
                  aria-label="Reverb Bypass"
                  className={getPowerButtonClass(reverbParams.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-around gap-2">
              <Knob
                id={decayKnobId}
                label="Decay"
                value={reverbParams.decayTime}
                min={0.5}
                max={12.0}
                step={0.1}
                unit="s"
                formatValue={v => `${v.toFixed(1)}s`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[decayKnobId]}
                liveModOffset={computeLiveModOffset(decayKnobId)}
                onChange={val => updateReverb({ decayTime: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: decayKnobId, label: `Reverb Decay${instanceSuffix}` })
                }
              />

              <Knob
                id={dampingKnobId}
                label="Damping"
                value={reverbParams.damping}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[dampingKnobId]}
                liveModOffset={computeLiveModOffset(dampingKnobId)}
                onChange={val => updateReverb({ damping: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: dampingKnobId, label: `Reverb Damping${instanceSuffix}` })
                }
              />

              <Knob
                id={mixKnobId}
                label="Mix"
                value={reverbParams.mix}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes[mixKnobId]}
                liveModOffset={computeLiveModOffset(mixKnobId)}
                onChange={val => updateReverb({ mix: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: mixKnobId, label: `Reverb Mix${instanceSuffix}` })
                }
              />
            </div>
          </div>
        );
      }
      case 'adsr': {
        const adsrParams = getCardModuleParams(effectId, 'adsr');
        const updateAdsr = (p: any) => dispatchCardChange(effectId, 'adsr', adsrParams, p);
        const attackKnobId = effectId === 'adsr' ? 'adsr-attack' : `${effectId}-attack`;
        const decayKnobId = effectId === 'adsr' ? 'adsr-decay' : `${effectId}-decay`;
        const sustainKnobId = effectId === 'adsr' ? 'adsr-sustain' : `${effectId}-sustain`;
        const releaseKnobId = effectId === 'adsr' ? 'adsr-release' : `${effectId}-release`;
        return (
          <div
            key={`${lane}-${effectId}`}
            data-testid="effect-rack-slot-adsr"
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              adsrParams.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  ADSR Envelope{instanceSuffix}
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  Physical Shape
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'ADSR Envelope')}
                <button
                  type="button"
                  onClick={() =>
                    updateAdsr({ bypass: !adsrParams.bypass })
                  }
                  aria-label="ADSR Envelope Bypass"
                  className={getPowerButtonClass(adsrParams.bypass ?? false)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="my-2">
              <AdsrEnvelopeVisualizer
                attack={adsrParams.attack}
                decay={adsrParams.decay}
                sustain={adsrParams.sustain}
                release={adsrParams.release}
                isPlaying={isPlaying}
                isDark={isDark}
                onChange={params => updateAdsr(params)}
              />
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-neutral-800/60">
              <Knob
                id={attackKnobId}
                label="Attack"
                ariaLabel="ADSR Attack"
                value={adsrParams.attack}
                min={0.005}
                max={15.0}
                step={0.01}
                unit="s"
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={val => updateAdsr({ attack: val })}
              />
              <Knob
                id={decayKnobId}
                label="Decay"
                ariaLabel="ADSR Decay"
                value={adsrParams.decay}
                min={0.005}
                max={15.0}
                step={0.01}
                unit="s"
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={val => updateAdsr({ decay: val })}
              />
              <Knob
                id={sustainKnobId}
                label="Sustain"
                ariaLabel="ADSR Sustain"
                value={adsrParams.sustain}
                min={0.0}
                max={1.0}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                onChange={val => updateAdsr({ sustain: val })}
              />
              <Knob
                id={releaseKnobId}
                label="Release"
                ariaLabel="ADSR Release"
                value={adsrParams.release}
                min={0.005}
                max={15.0}
                step={0.01}
                unit="s"
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={val => updateAdsr({ release: val })}
              />
            </div>
          </div>
        );
      }
      case 'lfo': {
        const lfoModuleParams = getCardModuleParams(effectId, 'lfo');
        const lfo1Params = lfoModuleParams.lfo1 ?? effects.lfo1 ?? { shape: 'sine', rate: 0.15, depth: 0.25 };
        const lfo2Params = lfoModuleParams.lfo2 ?? effects.lfo2 ?? { shape: 'sine', rate: 0.08, depth: 0.4 };
        const lfoBypass = lfoModuleParams.bypass ?? false;

        const updateLfoModule = (partial: any) => {
          const updated = {
            ...lfoModuleParams,
            ...partial,
            lfo1: partial.lfo1 ? { ...lfo1Params, ...partial.lfo1 } : (lfoModuleParams.lfo1 ?? lfo1Params),
            lfo2: partial.lfo2 ? { ...lfo2Params, ...partial.lfo2 } : (lfoModuleParams.lfo2 ?? lfo2Params),
            bypass: partial.bypass !== undefined ? partial.bypass : lfoBypass
          };
          dispatchCardChange(effectId, 'lfo', lfoModuleParams, updated);
          if (effectId === 'lfo') {
            if (partial.lfo1) onEffectsChange?.({ lfo1: partial.lfo1 });
            if (partial.lfo2) onEffectsChange?.({ lfo2: partial.lfo2 });
            if (partial.bypass !== undefined) onEffectsChange?.({ lfo: { bypass: partial.bypass } });
          }
        };

        const lfo1RateId = effectId === 'lfo' ? `rack-lfo1-rate-${lane}` : `${effectId}-lfo1-rate`;
        const lfo1DepthId = effectId === 'lfo' ? `rack-lfo1-depth-${lane}` : `${effectId}-lfo1-depth`;
        const lfo2RateId = effectId === 'lfo' ? `rack-lfo2-rate-${lane}` : `${effectId}-lfo2-rate`;
        const lfo2DepthId = effectId === 'lfo' ? `rack-lfo2-depth-${lane}` : `${effectId}-lfo2-depth`;

        return (
          <div
            key={`${lane}-${effectId}`}
            data-testid="effect-rack-slot-lfo"
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              lfoBypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center justify-between mb-2 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Activity size={14} strokeWidth={1.5} className="text-teal-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Dual LFO Modulation{instanceSuffix}
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  双通道低频调制
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    lfoBypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {renderRackSlotControls(lane, slotIndex, totalInLane, effectId, 'Dual LFO')}
                <button
                  type="button"
                  onClick={() =>
                    updateLfoModule({ bypass: !lfoBypass })
                  }
                  aria-label="Dual LFO Bypass"
                  className={getPowerButtonClass(lfoBypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* LFO 1 Channel */}
              <div className={`p-2.5 rounded border flex flex-col items-center gap-2 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-sky-400 font-semibold tracking-wider">LFO 1 PRIMARY</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">{lfo1Params.shape}</span>
                </div>
                <div className="w-full flex justify-center py-1">
                  <SerumLfoScope
                    id={`rack-lfo1-${lane}-${slotIndex}-${effectId}`}
                    shape={lfo1Params.shape}
                    rate={lfo1Params.rate}
                    depth={lfo1Params.depth}
                    isPlaying={isPlaying}
                    width={96}
                    height={46}
                    onShapeChange={shape => updateLfoModule({ lfo1: { shape } })}
                    isDark={isDark}
                  />
                </div>
                <div className="flex items-center justify-around w-full gap-1 pt-1 border-t border-inherit">
                  <Knob
                    id={lfo1RateId}
                    label="Rate"
                    ariaLabel="Rack LFO 1 Rate"
                    value={lfo1Params.rate}
                    min={0.01}
                    max={20.0}
                    step={0.01}
                    unit="Hz"
                    formatValue={v => `${v.toFixed(2)}Hz`}
                    onChange={v => updateLfoModule({ lfo1: { rate: v } })}
                  />
                  <Knob
                    id={lfo1DepthId}
                    label="Depth"
                    ariaLabel="Rack LFO 1 Depth"
                    value={lfo1Params.depth}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    onChange={v => updateLfoModule({ lfo1: { depth: v } })}
                  />
                </div>
              </div>

              {/* LFO 2 Channel */}
              <div className={`p-2.5 rounded border flex flex-col items-center gap-2 ${innerCardClass}`}>
                <div className="flex items-center justify-between w-full text-[10px] font-mono border-b pb-1.5 border-inherit">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span className="text-teal-400 font-semibold tracking-wider">LFO 2 SECONDARY</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">{lfo2Params.shape}</span>
                </div>
                <div className="w-full flex justify-center py-1">
                  <SerumLfoScope
                    id={`rack-lfo2-${lane}-${slotIndex}-${effectId}`}
                    shape={lfo2Params.shape}
                    rate={lfo2Params.rate}
                    depth={lfo2Params.depth}
                    isPlaying={isPlaying}
                    width={96}
                    height={46}
                    onShapeChange={shape => updateLfoModule({ lfo2: { shape } })}
                    isDark={isDark}
                  />
                </div>
                <div className="flex items-center justify-around w-full gap-1 pt-1 border-t border-inherit">
                  <Knob
                    id={lfo2RateId}
                    label="Rate"
                    ariaLabel="Rack LFO 2 Rate"
                    value={lfo2Params.rate}
                    min={0.01}
                    max={20.0}
                    step={0.01}
                    unit="Hz"
                    formatValue={v => `${v.toFixed(2)}Hz`}
                    onChange={v => updateLfoModule({ lfo2: { rate: v } })}
                  />
                  <Knob
                    id={lfo2DepthId}
                    label="Depth"
                    ariaLabel="Rack LFO 2 Depth"
                    value={lfo2Params.depth}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    onChange={v => updateLfoModule({ lfo2: { depth: v } })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      role="region"
      aria-label="Synthesizer Hardware Modulation Deck"
      className={`relative w-full rounded-xl border p-4 transition-colors select-none ${
        isDark
          ? 'border-neutral-800 bg-neutral-950 text-slate-100'
          : 'border-neutral-200 bg-neutral-100/70 text-neutral-900 shadow-sm'
      } ${className}`}
    >
      {/* 1. Deck Top Bar / Master Section */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-4 ${
        isDark ? 'border-neutral-800/90' : 'border-neutral-200'
      }`}>
        {/* Left Area: Brand & Breath Macro Stage Envelope Monitor */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          {/* Brand & Indicators */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Radio size={16} strokeWidth={1.5} className="text-sky-400" />
            <h1 className={`text-xs font-bold tracking-widest uppercase ${
              isDark ? 'text-slate-200' : 'text-neutral-900'
            }`}>
              Synhale Hardware Deck
            </h1>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-slate-400' : 'bg-white border-neutral-200 text-neutral-600 shadow-sm'
            }`}>
              Semi-Modular
            </span>
          </div>

          {/* Breath Macro Oscilloscope Timeline Curve - Bound to Master Stage Envelope */}
          <div className="w-64 max-w-full">
            <BreathMacroTimelineScope
              value={breathMacro}
              breathStage={breathStage}
              stageProgress={stageProgress}
              isPlaying={isPlaying}
              curveData={modulationRoutes['master-fader']?.curveData}
              stageMultipliers={modulationRoutes['master-fader']?.stageMultipliers}
              label="MASTER STAGE ENVELOPE"
              isDark={isDark}
              onClick={() => {
                setStudioTarget({ id: 'master-fader', label: 'Master Volume' });
                setIsStageStudioOpen(true);
              }}
            />
          </div>
        </div>

        {/* Right Area: Dedicated Master Output Bay + Theme Switch */}
        <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto shrink-0">

          <div className={`flex items-center gap-2.5 p-2 rounded-xl border shadow-inner ${
            isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <BipolarFader
              id="master-fader"
              label="Master"
              value={effects.masterGain}
              min={0.0}
              max={1.0}
              bipolar={false}
              height={115}
              assignedModulation={modulationRoutes['master-fader']}
              liveModOffset={computeLiveModOffset('master-fader')}
              onChange={val => onEffectsChange?.({ masterGain: val })}
              onLongPress={() =>
                setActiveModTarget({ id: 'master-fader', label: 'Master Volume' })
              }
            />

            <div className="flex flex-col items-center justify-between gap-2 self-stretch py-1">
              <Knob
                id="bus-mix"
                label="Bus Mix"
                ariaLabel="Bus Mix"
                value={effects.busMix ?? 0.5}
                min={0.0}
                max={1.0}
                step={0.01}
                bipolar={true}
                unit=""
                formatValue={v => {
                  if (Math.abs(v - 0.5) < 0.02) return 'BAL';
                  return v < 0.5 ? `A${Math.round((0.5 - v) * 200)}%` : `B${Math.round((v - 0.5) * 200)}%`;
                }}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['bus-mix']}
                liveModOffset={computeLiveModOffset('bus-mix')}
                onChange={val => onEffectsChange?.({ busMix: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: 'bus-mix', label: 'Bus Mix' })
                }
              />
              <span className={`text-[8px] font-mono uppercase tracking-tighter ${
                isDark ? 'text-slate-500' : 'text-neutral-500'
              }`}>
                BUS A/B
              </span>
            </div>

            <div className="flex flex-col items-center justify-between gap-2 self-stretch py-1">
              <Knob
                id="master-pan"
                label="Pan"
                ariaLabel="Master Pan"
                value={effects.masterPan ?? 0.0}
                min={-1.0}
                max={1.0}
                step={0.01}
                bipolar={true}
                unit=""
                formatValue={v => {
                  if (Math.abs(v) < 0.01) return 'C';
                  return v < 0 ? `L${Math.round(Math.abs(v) * 100)}` : `R${Math.round(v * 100)}`;
                }}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['master-pan']}
                liveModOffset={computeLiveModOffset('master-pan')}
                onChange={val => onEffectsChange?.({ masterPan: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: 'master-pan', label: 'Master Pan' })
                }
              />
              <span className={`text-[8px] font-mono uppercase tracking-tighter ${
                isDark ? 'text-slate-500' : 'text-neutral-500'
              }`}>
                Main Out
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2.5 rounded-lg border transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-slate-300'
                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-sm'
            }`}
          >
            {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Semi-Modular Audio Signal Flow Topology Overview */}
      <SignalFlowGraph
        channelStrip={channelStrip}
        effects={effects}
        isPlaying={isPlaying}
        isDark={isDark}
        className="mb-4"
        effectOrder={effectOrder}
        onReorderEffects={onReorderEffects}
        sourceRoutes={activeSourceRoutes}
        onSourceRouteChange={handleSourceRouteToggle}
        laneAOrder={laneAOrder}
        laneBOrder={laneBOrder}
        onLaneReorder={onLaneReorder}
        onMoveEffectBetweenLanes={onMoveEffectBetweenLanes}
      />

      {/* 2. Main Deck Grid: Channel Strips (Left) + Effects Rack (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ======================================================== */}
        {/* LEFT COLUMN: 3-Track Channel Strip (7 cols)             */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className={`text-[10px] font-semibold tracking-wider uppercase border-b pb-1 ${sectionTitleClass}`}>
            5-Track Acoustic Generation Strips · 5音轨独立声学发生器
          </div>

          {/* Track 1: OSC A (Wavetable) */}
          <div
            className={`relative rounded-lg border p-3 transition-opacity overflow-hidden ${cardContainerClass} ${
              channelStrip.oscA.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Strip Header */}
            <div className={`flex items-center justify-between mb-3 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Activity size={14} strokeWidth={1.5} className="text-sky-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  OSC A Wavetable
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  波表振荡器
                </span>
                {/* Active LED */}
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    channelStrip.oscA.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Source Route Capsule Selector */}
                <SourceRouteSelector
                  sourceId="oscA"
                  sourceLabel="OSC A"
                  currentLane={activeSourceRoutes.oscA}
                  onChange={handleSourceRouteToggle}
                  isDark={isDark}
                />

                {/* Bypass Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onChannelStripChange?.({
                      oscA: { bypass: !channelStrip.oscA.bypass }
                    })
                  }
                  aria-label="OSC A Bypass"
                  className={getPowerButtonClass(channelStrip.oscA.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Visualizer & Wavetable Selector Banner */}
            <div className={`mb-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5 p-2.5 rounded-lg border overflow-hidden ${innerCardClass}`}>
              {/* Left: Wavetable Stepper & Selector */}
              <div className="flex flex-col gap-1 min-w-[130px] flex-1 max-w-[165px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    Wavetable · 波表选择
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {activeTableIndex + 1}/{MULTI_FRAME_WAVETABLES.length}
                  </span>
                </div>
                <div className={`flex items-center gap-0.5 p-0.5 rounded border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const count = MULTI_FRAME_WAVETABLES.length;
                      const newIdx = (activeTableIndex - 1 + count) % count;
                      onChannelStripChange?.({
                        oscA: {
                          wavetableIndex: newIdx
                        }
                      });
                    }}
                    aria-label="Previous Wavetable"
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronLeft size={12} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWavetableDrawerOpen(true)}
                    aria-label="Select Wavetable Collection"
                    className="flex-1 px-1.5 py-0.5 text-center hover:bg-neutral-800/60 rounded transition-colors truncate"
                  >
                    <span className="block text-[11px] font-semibold text-sky-400 truncate">
                      {activeWavetable.name}
                    </span>
                    <span className="block text-[8px] font-mono text-slate-400">
                      {activeWavetable.category}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const count = MULTI_FRAME_WAVETABLES.length;
                      const newIdx = (activeTableIndex + 1) % count;
                      onChannelStripChange?.({
                        oscA: {
                          wavetableIndex: newIdx
                        }
                      });
                    }}
                    aria-label="Next Wavetable"
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Center: 3D Wavetable Visualizer */}
              <div className="flex-1 flex justify-center min-w-[150px] max-w-[195px]">
                <WavetableVisualizer
                  tableIndex={activeTableIndex}
                  sliceIndex={activeWavetable.sliceIndices[0]}
                  wtPosition={channelStrip.oscA.wtPosition ?? 0}
                  liveWtPosition={(channelStrip.oscA.wtPosition ?? 0) + computeLiveModOffset('osca-wt-pos')}
                  morph={channelStrip.oscA.morphDepth ?? 0.7}
                  liveMorph={Math.max(0, Math.min(1, (channelStrip.oscA.morphDepth ?? 0.7) + computeLiveModOffset('osca-morph')))}
                  harmonics={channelStrip.oscA.harmonics ?? 0.8}
                  liveHarmonics={Math.max(0, Math.min(1, (channelStrip.oscA.harmonics ?? 0.8) + computeLiveModOffset('osca-harmonics')))}
                  width={180}
                  height={54}
                  defaultViewMode="3d"
                  isDark={isDark}
                />
              </div>

              {/* Right: Dedicated Chord Mode Bay */}
              <div className={`flex flex-col gap-1.5 p-2 rounded-lg border min-w-[170px] max-w-[215px] flex-1 ${isDark ? 'bg-neutral-900/60 border-neutral-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider font-semibold">
                      Chord Mode · 和弦模式
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(channelStrip.oscA.chordMode)}
                    aria-label="Toggle OSC A Chord Mode"
                    onClick={() =>
                      onChannelStripChange?.({
                        oscA: { chordMode: !channelStrip.oscA.chordMode }
                      })
                    }
                    className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-semibold transition-all border ${
                      channelStrip.oscA.chordMode
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs'
                        : isDark
                        ? 'bg-neutral-800 text-slate-400 border-neutral-700 hover:text-slate-200'
                        : 'bg-white text-slate-600 border-slate-300 hover:text-slate-800'
                    }`}
                  >
                    {channelStrip.oscA.chordMode ? 'CHORD ON' : 'CHORD OFF'}
                  </button>
                </div>

                {/* 9 Chord Micro-Buttons Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {CHORD_TYPE_OPTIONS.map(opt => {
                    const isSelected = (channelStrip.oscA.chordType ?? 'octave') === opt.type;
                    const isActive = Boolean(channelStrip.oscA.chordMode) && isSelected;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={!channelStrip.oscA.chordMode}
                        onClick={() =>
                          onChannelStripChange?.({
                            oscA: { chordType: opt.type }
                          })
                        }
                        title={opt.desc}
                        className={`px-1 py-0.5 rounded text-[8px] font-mono transition-all text-center border ${
                          !channelStrip.oscA.chordMode
                            ? 'opacity-35 cursor-not-allowed border-transparent text-slate-500'
                            : isActive
                            ? 'bg-sky-500/25 text-sky-200 border-sky-400 font-bold shadow-xs'
                            : isDark
                            ? 'bg-neutral-800/80 text-slate-400 border-neutral-700/60 hover:text-slate-200 hover:bg-neutral-700/60'
                            : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Controls Sub-Panels: Knobs Matrix + Dedicated Level Fader Bay (Unified 4-Track Architecture) */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 flex flex-col gap-2.5">
                {/* Row 1: 12-TET Tuning, Continuous WT POS, Warp Shaper & Harmonics */}
                <div className={`p-2.5 rounded-lg border ${innerCardClass}`}>
                <div className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-2 flex items-center justify-between">
                  <span>OSC TUNING &amp; WAVETABLE WARP · 音高调谐与非线性塑形</span>
                  <span className="text-[9px] text-slate-500 font-normal">Serum 12-TET &amp; Warp Engine</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 items-center justify-items-center">
                  {/* 1. OCT */}
                  <Knob
                    id="osca-octave"
                    label="OCT"
                    ariaLabel="Osc A Octave"
                    value={channelStrip.oscA.octave ?? 0}
                    min={-4}
                    max={4}
                    step={1}
                    bipolar={true}
                    unit="Oct"
                    formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} Oct`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-octave']}
                    liveModOffset={computeLiveModOffset('osca-octave')}
                    onChange={val => onChannelStripChange?.({ oscA: { octave: Math.round(val) } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-octave', label: 'OSC A Octave' })}
                  />

                  {/* 2. SEMI */}
                  <Knob
                    id="osca-semi"
                    label="SEMI"
                    ariaLabel="Osc A Semitone"
                    value={channelStrip.oscA.semi ?? 0}
                    min={-12}
                    max={12}
                    step={1}
                    bipolar={true}
                    unit="st"
                    formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} st`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-semi']}
                    liveModOffset={computeLiveModOffset('osca-semi')}
                    onChange={val => onChannelStripChange?.({ oscA: { semi: Math.round(val) } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-semi', label: 'OSC A Semitone' })}
                  />

                  {/* 3. FINE (Matches Detune test) */}
                  <Knob
                    id="osca-fine"
                    label="FINE"
                    ariaLabel="Detune"
                    value={channelStrip.oscA.fine ?? (channelStrip.oscA.detune ?? 0)}
                    min={-100}
                    max={100}
                    step={1}
                    bipolar={true}
                    unit="c"
                    formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} c`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-detune']}
                    liveModOffset={computeLiveModOffset('osca-detune')}
                    onChange={val => onChannelStripChange?.({ oscA: { fine: Math.round(val), detune: Math.round(val) } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-detune', label: 'OSC A Fine Detune' })}
                  />

                  {/* 4. WT POS */}
                  <Knob
                    id="osca-wt-pos"
                    label="WT POS"
                    ariaLabel="WT POS"
                    value={channelStrip.oscA.wtPosition ?? 0}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-wt-pos']}
                    liveModOffset={computeLiveModOffset('osca-wt-pos')}
                    onChange={val => onChannelStripChange?.({ oscA: { wtPosition: val, morphDepth: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-wt-pos', label: 'OSC A WT Position' })}
                  />

                  {/* 5. WARP (With compact mode switcher) */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      aria-label="Warp Mode"
                      title="Click to cycle Warp Mode (OFF -> PWM -> SYNC -> BEND -> MIRR)"
                      onClick={() => {
                        const curMode = channelStrip.oscA.warpMode ?? 'off';
                        const idx = WARP_MODE_OPTIONS.findIndex(m => m.mode === curMode);
                        const next = WARP_MODE_OPTIONS[(idx + 1) % WARP_MODE_OPTIONS.length].mode;
                        onChannelStripChange?.({ oscA: { warpMode: next } });
                      }}
                      className={`mb-1 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider border transition-colors ${
                        (channelStrip.oscA.warpMode ?? 'off') !== 'off'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                          : isDark
                          ? 'bg-neutral-800 text-slate-400 border-neutral-700 hover:text-slate-200'
                          : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {(channelStrip.oscA.warpMode ?? 'off').toUpperCase()}
                    </button>
                    <Knob
                      id="osca-warp"
                      label="WARP"
                      ariaLabel="Osc A Warp"
                      value={channelStrip.oscA.warp ?? 0}
                      min={0}
                      max={1}
                      step={0.01}
                      unit="%"
                      formatValue={v => `${Math.round(v * 100)}%`}
                      breathStage={breathStage}
                      assignedModulation={modulationRoutes['osca-warp']}
                      liveModOffset={computeLiveModOffset('osca-warp')}
                      onChange={val => onChannelStripChange?.({ oscA: { warp: val } })}
                      onLongPress={() => setActiveModTarget({ id: 'osca-warp', label: 'OSC A Warp Shaping' })}
                    />
                  </div>

                  {/* 6. PHASE */}
                  <Knob
                    id="osca-phase"
                    label="PHASE"
                    ariaLabel="Osc A Phase"
                    value={channelStrip.oscA.phase ?? 0}
                    min={0}
                    max={360}
                    step={1}
                    unit="°"
                    formatValue={v => `${Math.round(v)}°`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-phase']}
                    liveModOffset={computeLiveModOffset('osca-phase')}
                    onChange={val => onChannelStripChange?.({ oscA: { phase: Math.round(val) } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-phase', label: 'OSC A Initial Phase' })}
                  />

                  {/* 7. RAND */}
                  <Knob
                    id="osca-phase-rand"
                    label="RAND"
                    ariaLabel="Osc A Phase Random"
                    value={channelStrip.oscA.phaseRand ?? 1.0}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-phase-rand']}
                    liveModOffset={computeLiveModOffset('osca-phase-rand')}
                    onChange={val => onChannelStripChange?.({ oscA: { phaseRand: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-phase-rand', label: 'OSC A Phase Randomization' })}
                  />

                  {/* 8. HARM (Matches Harmonics test) */}
                  <Knob
                    id="osca-harmonics"
                    label="HARM"
                    ariaLabel="Harmonics"
                    value={channelStrip.oscA.harmonics ?? 0.8}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-harmonics']}
                    liveModOffset={computeLiveModOffset('osca-harmonics')}
                    onChange={val => onChannelStripChange?.({ oscA: { harmonics: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-harmonics', label: 'OSC A Harmonics' })}
                  />
                </div>
              </div>

              {/* Row 2: Level, Pan, Unison Detune/Spread, Sub & Warmth */}
              <div className={`p-2.5 rounded-lg border ${innerCardClass}`}>
                <div className="text-[9px] font-mono uppercase text-sky-400/90 font-semibold tracking-wider mb-2 flex items-center justify-between">
                  <span>LEVEL, STEREO &amp; UNISON/CHORD VOICING · 输出电平、立体声与复音</span>
                  <span className="text-[9px] text-slate-500 font-normal">Stereo Imaging &amp; Saturation</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 items-center justify-items-center">
                  {/* 1. LEVEL */}
                  <Knob
                    id="osca-gain"
                    label="LEVEL"
                    ariaLabel="Osc A Level"
                    value={channelStrip.oscA.gain}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-gain']}
                    liveModOffset={computeLiveModOffset('osca-gain')}
                    onChange={val => onChannelStripChange?.({ oscA: { gain: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-gain', label: 'OSC A Level' })}
                  />

                  {/* 2. PAN */}
                  <Knob
                    id="osca-pan"
                    label="PAN"
                    ariaLabel="Osc A Pan"
                    value={channelStrip.oscA.pan ?? 0.0}
                    min={-1}
                    max={1}
                    step={0.01}
                    bipolar={true}
                    unit="%"
                    formatValue={v => (Math.abs(v) < 0.02 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}%` : `R${Math.round(v * 100)}%`)}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-pan']}
                    liveModOffset={computeLiveModOffset('osca-pan')}
                    onChange={val => onChannelStripChange?.({ oscA: { pan: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-pan', label: 'OSC A Pan' })}
                  />

                  {/* 3. UNISON (Matches Unison test) */}
                  <Knob
                    id="osca-unison-voices"
                    label="UNISON"
                    ariaLabel="Unison"
                    value={channelStrip.oscA.unisonVoices ?? 2}
                    min={1}
                    max={16}
                    step={1}
                    unit=" V"
                    formatValue={v => `${Math.round(v)} V`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-unison-voices']}
                    liveModOffset={computeLiveModOffset('osca-unison-voices')}
                    onChange={val => onChannelStripChange?.({ oscA: { unisonVoices: Math.round(val) } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-unison-voices', label: 'OSC A Unison Voices' })}
                  />

                  {/* 4. UNI DET */}
                  <Knob
                    id="osca-unison-detune"
                    label="UNI DET"
                    ariaLabel="Osc A Unison Detune"
                    value={channelStrip.oscA.unisonDetune ?? 0.25}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-unison-detune']}
                    liveModOffset={computeLiveModOffset('osca-unison-detune')}
                    onChange={val => onChannelStripChange?.({ oscA: { unisonDetune: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-unison-detune', label: 'OSC A Unison Detune' })}
                  />

                  {/* 5. UNI BLD (Matches Uni Blend test) */}
                  <Knob
                    id="osca-unison"
                    label="UNI BLD"
                    ariaLabel="Uni Blend"
                    value={channelStrip.oscA.unison ?? 0.35}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-unison']}
                    liveModOffset={computeLiveModOffset('osca-unison')}
                    onChange={val => onChannelStripChange?.({ oscA: { unison: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-unison', label: 'OSC A Unison Blend' })}
                  />

                  {/* 6. SPREAD */}
                  <Knob
                    id="osca-spread"
                    label="SPREAD"
                    ariaLabel="Osc A Spread"
                    value={channelStrip.oscA.spread ?? 0.2}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-spread']}
                    liveModOffset={computeLiveModOffset('osca-spread')}
                    onChange={val => onChannelStripChange?.({ oscA: { spread: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-spread', label: 'OSC A Spread' })}
                  />

                  {/* 7. SUB */}
                  <Knob
                    id="osca-sub"
                    label="SUB"
                    ariaLabel="Osc A Sub"
                    value={channelStrip.oscA.subGain ?? 0.15}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-sub']}
                    liveModOffset={computeLiveModOffset('osca-sub')}
                    onChange={val => onChannelStripChange?.({ oscA: { subGain: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-sub', label: 'OSC A Sub Gain' })}
                  />

                  {/* 8. WARMTH */}
                  <Knob
                    id="osca-warmth"
                    label="WARMTH"
                    ariaLabel="Osc A Warmth"
                    value={channelStrip.oscA.warmth ?? 0.1}
                    min={0}
                    max={1}
                    step={0.01}
                    unit="%"
                    formatValue={v => `${Math.round(v * 100)}%`}
                    breathStage={breathStage}
                    assignedModulation={modulationRoutes['osca-warmth']}
                    liveModOffset={computeLiveModOffset('osca-warmth')}
                    onChange={val => onChannelStripChange?.({ oscA: { warmth: val } })}
                    onLongPress={() => setActiveModTarget({ id: 'osca-warmth', label: 'OSC A Warmth' })}
                  />
                </div>
              </div>
            </div>

            {/* Right: Dedicated Channel Level Fader Strip (Unified 4-Track Architecture) */}
            <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
              <BipolarFader
                id="osca-gain"
                label="Level"
                value={channelStrip.oscA.gain}
                min={0}
                max={1}
                bipolar={false}
                height={180}
                assignedModulation={modulationRoutes['osca-gain']}
                liveModOffset={computeLiveModOffset('osca-gain')}
                onChange={val =>
                  onChannelStripChange?.({
                    oscA: { gain: val }
                  })
                }
                onLongPress={() =>
                  setActiveModTarget({ id: 'osca-gain', label: 'OSC A Level' })
                }
              />
            </div>
          </div>
        </div>

          {/* Track 2: GRANULAR (Standalone Grain Cloud Synthesizer) */}
          <div
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              channelStrip.granular?.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Strip Header */}
            <div className={`flex items-center justify-between mb-3 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} strokeWidth={1.5} className="text-emerald-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Granular Cloud
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  粒子发生器
                </span>
                {/* Active LED */}
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    channelStrip.granular?.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Source Route Capsule Selector */}
                <SourceRouteSelector
                  sourceId="granular"
                  sourceLabel="Granular"
                  currentLane={activeSourceRoutes.granular}
                  onChange={handleSourceRouteToggle}
                  isDark={isDark}
                />

                {/* Bypass Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onChannelStripChange?.({
                      granular: { bypass: !(channelStrip.granular?.bypass ?? false) }
                    })
                  }
                  aria-label="Granular Bypass"
                  className={getPowerButtonClass(channelStrip.granular?.bypass ?? false)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Visualizer Banner: Phase Plant Dual Scope (Source Waveform + Grain Envelope) */}
            <div className={`mb-2.5 flex flex-col md:flex-row items-stretch gap-2.5 p-2.5 rounded-lg border transition-colors ${
              isDark ? 'bg-neutral-950/90 border-neutral-800/80' : 'bg-slate-50/90 border-neutral-200/90 shadow-2xs'
            }`}>
              <div className="flex-1 min-w-[200px] h-[120px]">
                <GrainSourceVisualizer
                  sampleId={channelStrip.granular?.sampleId || 'handpan'}
                  position={channelStrip.granular?.position ?? 0.25}
                  positionJitter={channelStrip.granular?.positionJitter ?? 0.0}
                  rangeStart={channelStrip.granular?.rangeStart ?? 0.0}
                  rangeEnd={channelStrip.granular?.rangeEnd ?? 1.0}
                  sampleMetadata={{
                    sampleRate: 44100,
                    channels: 2,
                    duration: getSampleDuration(channelStrip.granular?.sampleId || 'handpan') ?? GRANULAR_SAMPLE_PRESETS[channelStrip.granular?.sampleId || 'handpan']?.duration ?? 3.6,
                    name: GRANULAR_SAMPLE_PRESETS[channelStrip.granular?.sampleId || 'handpan']?.name ?? 'Handpan'
                  }}
                  isPlaying={isPlaying}
                  bypass={channelStrip.granular?.bypass ?? false}
                  getLiveGrains={getVisualGrains}
                  getAudioCurrentTime={getAudioCurrentTime}
                  onPositionChange={val => onChannelStripChange?.({ granular: { position: val } })}
                  onRangeChange={(rStart, rEnd) => onChannelStripChange?.({ granular: { rangeStart: rStart, rangeEnd: rEnd } })}
                  onCustomSampleLoaded={id => onChannelStripChange?.({ granular: { sampleId: id } })}
                  duration={channelStrip.granular?.duration ?? 0.245}
                  height={120}
                />
              </div>
              <div className="w-full md:w-[270px] shrink-0 h-[120px]">
                <GrainEnvelopeScope
                  duration={channelStrip.granular?.duration ?? 0.245}
                  envelope={channelStrip.granular?.grainEnvelope}
                  activeGrainsCount={channelStrip.granular?.density ?? 4.0}
                  density={channelStrip.granular?.density ?? 4.0}
                  rate={channelStrip.granular?.rate ?? 16.3}
                  direction={channelStrip.granular?.direction ?? 'forward'}
                  onDirectionChange={dir => onChannelStripChange?.({ granular: { direction: dir } })}
                  onEnvelopeChange={env => onChannelStripChange?.({ granular: { grainEnvelope: env } })}
                  onDurationChange={dur => {
                    const currentDensity = channelStrip.granular?.density ?? 4.0;
                    const newRate = Number((currentDensity / Math.max(0.01, dur)).toFixed(1));
                    onChannelStripChange?.({ granular: { duration: dur, rate: newRate } });
                  }}
                  onDensityChange={dens => onChannelStripChange?.({ granular: { density: dens } })}
                  onRateChange={rt => onChannelStripChange?.({ granular: { rate: rt } })}
                  height={120}
                />
              </div>
            </div>

            {/* Sample Source Selector Bar (Phase Plant Acoustic Sample Matrix) */}
            <div className={`mb-2.5 p-1.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white shadow-2xs'
            }`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Disc size={13} strokeWidth={1.5} className="text-cyan-400 shrink-0" />
                <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  SAMPLE · 采样源:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const curId = channelStrip.granular?.sampleId || 'handpan';
                      const idx = GRANULAR_SAMPLE_LIST.findIndex(s => s.id === curId);
                      const prevIdx = (idx - 1 + GRANULAR_SAMPLE_LIST.length) % GRANULAR_SAMPLE_LIST.length;
                      onChannelStripChange?.({ granular: { sampleId: GRANULAR_SAMPLE_LIST[prevIdx].id } });
                    }}
                    title="Previous Sample (<)"
                    aria-label="Previous Sample"
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors ${
                      isDark ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800' : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    &lt;
                  </button>
                  <select
                    value={channelStrip.granular?.sampleId || 'handpan'}
                    onChange={e => onChannelStripChange?.({ granular: { sampleId: e.target.value } })}
                    aria-label="Granular Sample Source"
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-sky-300' : 'bg-slate-50 border-neutral-300 text-slate-800'
                    }`}
                  >
                    {(['Acoustic', 'Temple', 'Nature', 'Synthetic', 'Custom'] as const).map(cat => {
                      const items = GRANULAR_SAMPLE_LIST.filter(s => s.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={cat} label={`-- ${cat} --`}>
                          {items.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.enName} ({s.name})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const curId = channelStrip.granular?.sampleId || 'handpan';
                      const idx = GRANULAR_SAMPLE_LIST.findIndex(s => s.id === curId);
                      const nextIdx = (idx + 1) % GRANULAR_SAMPLE_LIST.length;
                      onChannelStripChange?.({ granular: { sampleId: GRANULAR_SAMPLE_LIST[nextIdx].id } });
                    }}
                    title="Next Sample (>)"
                    aria-label="Next Sample"
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors ${
                      isDark ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800' : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    &gt;
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400 shrink-0">
                <span>ROOT: <strong className="text-sky-300 font-semibold">{GRANULAR_SAMPLE_PRESETS[channelStrip.granular?.sampleId || 'handpan']?.rootNote || 'D 3 +00'}</strong></span>
                <span className="text-slate-600">|</span>
                <span>DIR: <strong className="text-emerald-400 font-semibold uppercase">{channelStrip.granular?.direction || 'forward'}</strong></span>
              </div>
            </div>

            {/* Mode & Scale Selector Panel (Phase Plant Harmonic Scale & Generation Mode) */}
            <div className={`mb-2.5 p-2 rounded-lg border flex flex-col gap-2 transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-950/70' : 'border-neutral-200 bg-slate-50/90 shadow-2xs'
            }`}>
              {/* Voice Mode Selector */}
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/40">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} strokeWidth={1.5} className="text-sky-400" />
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    VOICE MODE · 发声模式:
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {(['ambient', 'arp', 'burst'] as const).map(m => {
                    const activeMode = channelStrip.granular?.mode ?? 'ambient';
                    const isCur = activeMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChannelStripChange?.({ granular: { mode: m } })}
                        className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded border transition-colors ${
                          isCur
                            ? 'border-sky-500/60 bg-sky-500/20 text-sky-300 font-semibold'
                            : isDark
                              ? 'border-neutral-800 bg-neutral-950 text-slate-400 hover:text-slate-200'
                              : 'border-neutral-200 bg-white text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Harmonic Scale Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Music size={12} strokeWidth={1.5} className="text-emerald-500" />
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    HARMONIC SCALE · 调式量化:
                  </span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {SCALE_LIST.map(scale => {
                    const activeScale = channelStrip.granular?.scale ?? 'pentatonic';
                    const isCurrent = activeScale === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() =>
                          onChannelStripChange?.({
                            granular: {
                              scale: scale.id
                            }
                          })
                        }
                        title={`${scale.name} (${scale.enName}) - ${scale.description}`}
                        className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                          isCurrent
                            ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-medium'
                            : isDark
                              ? 'border-neutral-800 bg-neutral-950 text-slate-400 hover:text-slate-200 hover:bg-neutral-800'
                              : 'border-neutral-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-neutral-100'
                        }`}
                      >
                        {scale.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Controls: Knobs Grid + Dedicated Level Fader */}
            <div className="flex flex-col gap-2.5">
              <div className={`p-2.5 rounded-lg border ${innerCardClass}`}>
                <div className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-2 flex items-center justify-between">
                  <span>Phase Plant Micro &amp; Mother Parameter Matrix</span>
                  <span className="text-[9px] text-slate-500 font-normal">Dual-Row Grain Sculpting</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  {/* Left: 3 Rows Rotary Knobs Grid */}
                  <div className={`flex-1 flex flex-col gap-2 p-2 rounded-lg border ${innerGridClass}`}>
                    {/* Row 1: Mother Tuning & Output (Phase Plant Mother Parameter Matrix - 图三) */}
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-800/40">
                      <span className="text-[8px] font-mono uppercase text-sky-400 tracking-wider">
                        Row 1: Mother Tuning &amp; Output (母体调谐与基准)
                      </span>
                      <span className="text-[8px] font-mono text-slate-500">
                        Level · Oct · Semi · Cent · Harm · Shift · Phase · Ph.Jit · Track
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 items-center justify-items-center">
                      <Knob
                        id="granular-master-level"
                        label="Level"
                        ariaLabel="Granular Master Level"
                        value={channelStrip.granular?.level ?? 1.0}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        assignedModulation={modulationRoutes['granular-master-level']}
                        liveModOffset={computeLiveModOffset('granular-master-level')}
                        onChange={val => onChannelStripChange?.({ granular: { level: val } })}
                        onLongPress={() =>
                          setActiveModTarget({ id: 'granular-master-level', label: 'Granular Master Level' })
                        }
                      />

                      <Knob
                        id="granular-octave"
                        label="Oct"
                        ariaLabel="Granular Octave"
                        value={channelStrip.granular?.octave ?? 0}
                        min={-4}
                        max={4}
                        step={1}
                        unit=" Oct"
                        formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} Oct`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { octave: Math.round(val) } })}
                      />

                      <Knob
                        id="granular-semi"
                        label="Semi"
                        ariaLabel="Granular Semi"
                        value={channelStrip.granular?.semi ?? 0}
                        min={-24}
                        max={24}
                        step={1}
                        unit=" st"
                        formatValue={v => `${v > 0 ? '+' : ''}${v} st`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { semi: Math.round(val) } })}
                      />

                      <Knob
                        id="granular-cent"
                        label="Cent"
                        ariaLabel="Granular Cent"
                        value={channelStrip.granular?.cent ?? 0}
                        min={-100}
                        max={100}
                        step={1}
                        unit=" ct"
                        formatValue={v => `${v > 0 ? '+' : ''}${v} ct`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { cent: Math.round(val) } })}
                      />

                      <Knob
                        id="granular-harmonic"
                        label="Harm"
                        ariaLabel="Granular Harmonic"
                        value={channelStrip.granular?.harmonic ?? 1.0}
                        min={0.125}
                        max={16.0}
                        step={0.025}
                        unit="x"
                        formatValue={v => `×${v.toFixed(3)}`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { harmonic: val } })}
                      />

                      <Knob
                        id="granular-shift"
                        label="Shift"
                        ariaLabel="Granular Shift"
                        value={channelStrip.granular?.shift ?? 0}
                        min={-200}
                        max={200}
                        step={0.1}
                        unit=" Hz"
                        formatValue={v => `${v > 0 ? '+' : ''}${v.toFixed(2)} Hz`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { shift: Number(val.toFixed(2)) } })}
                      />

                      <Knob
                        id="granular-phase"
                        label="Phase"
                        ariaLabel="Granular Phase"
                        value={channelStrip.granular?.phase ?? 0}
                        min={0}
                        max={360}
                        step={1}
                        unit="°"
                        formatValue={v => `${Math.round(v)}°`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { phase: Math.round(val) } })}
                      />

                      <Knob
                        id="granular-phase-jitter"
                        label="Ph.Jit"
                        ariaLabel="Granular Phase Jitter"
                        value={channelStrip.granular?.phaseJitter ?? 0}
                        min={0}
                        max={180}
                        step={1}
                        unit="°"
                        formatValue={v => `±${Math.round(v)}°`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { phaseJitter: Math.round(val) } })}
                      />

                      <Knob
                        id="granular-keytrack"
                        label="Track"
                        ariaLabel="Granular Key Track"
                        value={channelStrip.granular?.keyTrack ?? 1.0}
                        min={0}
                        max={1}
                        step={0.05}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { keyTrack: val } })}
                      />
                    </div>

                    {/* Row 2: Micro Wander & Jitter (Phase Plant Micro Parameter Matrix - 图四) */}
                    <div className="flex items-center justify-between pt-1.5 pb-1 border-t border-neutral-800/40">
                      <span className="text-[8px] font-mono uppercase text-emerald-400 tracking-wider">
                        Row 2: Micro Wander &amp; Jitter (微粒游走与随机散布)
                      </span>
                      <span className="text-[8px] font-mono text-slate-500">
                        Position · Timing · Pitch · Level · Pan · Reverse · Rng Start · Rng End · Chance
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 items-center justify-items-center">
                      <Knob
                        id="granular-pos-jitter"
                        label="Position"
                        ariaLabel="Granular Position Jitter"
                        value={channelStrip.granular?.positionJitter ?? 0.0}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `±${(v * 100).toFixed(1)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { positionJitter: val } })}
                      />

                      <Knob
                        id="granular-timing"
                        label="Timing"
                        ariaLabel="Granular Timing Jitter"
                        value={channelStrip.granular?.timingJitter ?? 0.35}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `±${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { timingJitter: val } })}
                      />

                      <Knob
                        id="granular-pitch-jitter"
                        label="Pitch"
                        ariaLabel="Granular Pitch Jitter"
                        value={channelStrip.granular?.pitchJitter ?? 0.01}
                        min={0}
                        max={1.0}
                        step={0.01}
                        unit=" st"
                        formatValue={v => `±${v.toFixed(2)}`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { pitchJitter: Number(val.toFixed(2)) } })}
                      />

                      <Knob
                        id="granular-level-jitter"
                        label="Level"
                        ariaLabel="Granular Level Jitter"
                        value={channelStrip.granular?.levelJitter ?? 0.0}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `±${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { levelJitter: val } })}
                      />

                      <Knob
                        id="granular-pan"
                        label="Pan"
                        ariaLabel="Granular Pan"
                        value={channelStrip.granular?.panJitter ?? channelStrip.granular?.randomPan ?? 1.0}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `±${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { panJitter: val, randomPan: val } })}
                      />

                      <Knob
                        id="granular-reverse"
                        label="Reverse"
                        ariaLabel="Granular Reverse Chance"
                        value={channelStrip.granular?.reverseChance ?? 0.26}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { reverseChance: val } })}
                      />

                      <Knob
                        id="granular-range-start"
                        label="Rng Start"
                        ariaLabel="Granular Range Start"
                        value={channelStrip.granular?.rangeStart ?? 0.0}
                        min={0}
                        max={0.95}
                        step={0.01}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { rangeStart: val } })}
                      />

                      <Knob
                        id="granular-range-end"
                        label="Rng End"
                        ariaLabel="Granular Range End"
                        value={channelStrip.granular?.rangeEnd ?? 1.0}
                        min={0.05}
                        max={1.0}
                        step={0.01}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { rangeEnd: val } })}
                      />

                      <Knob
                        id="granular-chance"
                        label="Chance"
                        ariaLabel="Granular Trigger Chance"
                        value={channelStrip.granular?.probability ?? 0.85}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        formatValue={v => `${Math.round(v * 100)}%`}
                        breathStage={breathStage}
                        onChange={val => onChannelStripChange?.({ granular: { probability: val } })}
                      />
                    </div>
                  </div>

                  {/* Right: Dedicated Channel Level Fader Strip */}
                  <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
                    <BipolarFader
                      id="granular-gain"
                      label="Level"
                      value={channelStrip.granular?.gain ?? 0.75}
                      min={0}
                      max={1}
                      bipolar={false}
                      height={180}
                      assignedModulation={modulationRoutes['granular-gain']}
                      liveModOffset={computeLiveModOffset('granular-gain')}
                      onChange={val =>
                        onChannelStripChange?.({
                          granular: { gain: val }
                        })
                      }
                      onLongPress={() =>
                        setActiveModTarget({ id: 'granular-gain', label: 'Granular Level' })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Track 3: OSC B (Airway Pink Noise) */}
          <div
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              channelStrip.oscB.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Strip Header */}
            <div className={`flex items-center justify-between mb-3 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Wind size={14} strokeWidth={1.5} className="text-violet-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  OSC B Pink Noise
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  粉红气流噪声
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    channelStrip.oscB.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5">
                {/* Source Route Capsule Selector */}
                <SourceRouteSelector
                  sourceId="oscB"
                  sourceLabel="OSC B"
                  currentLane={activeSourceRoutes.oscB}
                  onChange={handleSourceRouteToggle}
                  isDark={isDark}
                />

                {/* Noise Type selector buttons */}
                {[
                  { type: 'pink' as NoiseType, label: '粉噪' },
                  { type: 'white' as NoiseType, label: '白噪' },
                  { type: 'brown' as NoiseType, label: '红噪' },
                  { type: 'violet' as NoiseType, label: '紫噪' }
                ].map(nt => {
                  const currentNoiseType = channelStrip.oscB.noiseType ?? 'pink';
                  const isSelected = currentNoiseType === nt.type;
                  return (
                    <button
                      key={nt.type}
                      type="button"
                      onClick={() => onChannelStripChange?.({ oscB: { noiseType: nt.type } })}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                        isSelected
                          ? 'border-violet-500 bg-violet-950/50 text-violet-300 font-medium'
                          : isDark
                            ? 'border-neutral-800 bg-neutral-900 text-slate-500 hover:text-slate-300'
                            : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {nt.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    onChannelStripChange?.({
                      oscB: { bypass: !channelStrip.oscB.bypass }
                    })
                  }
                  aria-label="OSC B Bypass"
                  className={getPowerButtonClass(channelStrip.oscB.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Controls Row: Knob Matrix + Independent Channel Fader Bay */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className={`flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center justify-items-center p-2 rounded-lg border ${innerGridClass}`}>
                <Knob
                  id="oscb-color"
                  label="Airway Color"
                  value={channelStrip.oscB.color}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['oscb-color']}
                  liveModOffset={computeLiveModOffset('oscb-color')}
                  onChange={val => onChannelStripChange?.({ oscB: { color: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'oscb-color', label: 'Airway Color' })
                  }
                />

                <Knob
                  id="oscb-friction"
                  label="Friction (Q)"
                  value={channelStrip.oscB.friction}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['oscb-friction']}
                  liveModOffset={computeLiveModOffset('oscb-friction')}
                  onChange={val => onChannelStripChange?.({ oscB: { friction: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'oscb-friction', label: 'Noise Friction' })
                  }
                />

                <Knob
                  id="oscb-lowcut"
                  label="Low Cut"
                  value={channelStrip.oscB.lowCut ?? 80}
                  min={20}
                  max={3000}
                  step={5}
                  unit="Hz"
                  formatValue={v => `${Math.round(v)} Hz`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['oscb-lowcut']}
                  liveModOffset={computeLiveModOffset('oscb-lowcut')}
                  onChange={val => onChannelStripChange?.({ oscB: { lowCut: Math.round(val) } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'oscb-lowcut', label: 'Noise Low Cut' })
                  }
                />

                <Knob
                  id="oscb-motion"
                  label="Motion"
                  value={channelStrip.oscB.motion ?? 0.2}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['oscb-motion']}
                  liveModOffset={computeLiveModOffset('oscb-motion')}
                  onChange={val => onChannelStripChange?.({ oscB: { motion: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'oscb-motion', label: 'Airflow Motion' })
                  }
                />
              </div>

              <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
                <BipolarFader
                  id="oscb-gain"
                  label="Level"
                  value={channelStrip.oscB.gain}
                  min={0}
                  max={1}
                  bipolar={false}
                  height={115}
                  assignedModulation={modulationRoutes['oscb-gain']}
                  liveModOffset={computeLiveModOffset('oscb-gain')}
                  onChange={val => onChannelStripChange?.({ oscB: { gain: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'oscb-gain', label: 'OSC B Level' })
                  }
                />
              </div>
            </div>
          </div>

          {/* Track 3: Sub/Drone (432Hz Tuning) */}
          <div
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              channelStrip.drone.bypass ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Strip Header */}
            <div className={`flex items-center justify-between mb-3 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Disc size={14} strokeWidth={1.5} className="text-indigo-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Sub / Drone (432Hz)
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  次谐波低频基底
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    channelStrip.drone.bypass ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Source Route Capsule Selector */}
                <SourceRouteSelector
                  sourceId="drone"
                  sourceLabel="Sub Drone"
                  currentLane={activeSourceRoutes.drone}
                  onChange={handleSourceRouteToggle}
                  isDark={isDark}
                />

                <button
                  type="button"
                  onClick={() =>
                    onChannelStripChange?.({
                      drone: { bypass: !channelStrip.drone.bypass }
                    })
                  }
                  aria-label="Drone Bypass"
                  className={getPowerButtonClass(channelStrip.drone.bypass)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Controls Row: Drone Knobs + Independent Channel Fader Bay */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className={`flex-1 grid grid-cols-2 gap-2.5 items-center justify-items-center p-2 rounded-lg border ${innerGridClass}`}>
                <Knob
                  id="drone-basefreq"
                  label="Base Freq"
                  value={channelStrip.drone.baseFreq}
                  min={20}
                  max={200}
                  step={0.5}
                  unit=" Hz"
                  formatValue={v => `${v.toFixed(1)} Hz`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['drone-basefreq']}
                  liveModOffset={computeLiveModOffset('drone-basefreq')}
                  onChange={val => onChannelStripChange?.({ drone: { baseFreq: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'drone-basefreq', label: 'Drone Base Freq' })
                  }
                />

                <Knob
                  id="drone-drift"
                  label="Pitch Drift"
                  value={channelStrip.drone.pitchDrift}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['drone-drift']}
                  liveModOffset={computeLiveModOffset('drone-drift')}
                  onChange={val => onChannelStripChange?.({ drone: { pitchDrift: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'drone-drift', label: 'Pitch Drift' })
                  }
                />
              </div>

              <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
                <BipolarFader
                  id="drone-gain"
                  label="Level"
                  value={channelStrip.drone.gain}
                  min={0}
                  max={1}
                  bipolar={false}
                  height={115}
                  assignedModulation={modulationRoutes['drone-gain']}
                  liveModOffset={computeLiveModOffset('drone-gain')}
                  onChange={val => onChannelStripChange?.({ drone: { gain: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'drone-gain', label: 'Drone Level' })
                  }
                />
              </div>
            </div>
          </div>

          {/* Track 5: Ambient Soundscape (自然氛围声景) */}
          <div
            className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
              (channelStrip.ambient?.bypass ?? false) ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Strip Header */}
            <div className={`flex items-center justify-between mb-3 border-b pb-1.5 ${cardHeaderBorderClass}`}>
              <div className="flex items-center gap-2">
                <Waves size={14} strokeWidth={1.5} className="text-teal-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  Ambient Soundscape
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  自然氛围声景
                </span>
                <div
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    (channelStrip.ambient?.bypass ?? false) ? 'bg-slate-700' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Source Route Capsule Selector */}
                <SourceRouteSelector
                  sourceId="ambient"
                  sourceLabel="Ambient"
                  currentLane={activeSourceRoutes.ambient ?? 'laneA'}
                  onChange={handleSourceRouteToggle}
                  isDark={isDark}
                />

                <button
                  type="button"
                  onClick={() =>
                    onChannelStripChange?.({
                      ambient: { bypass: !(channelStrip.ambient?.bypass ?? false) }
                    })
                  }
                  aria-label="Ambient Bypass"
                  className={getPowerButtonClass(channelStrip.ambient?.bypass ?? false)}
                >
                  <Power size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Soundscape Selection Carousel (120 Curated Soundscapes with Mouse Drag & Swipe across 12 Distinct Thematic Categories) */}
            <div className="mb-3">
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>SOUNDSCAPE SELECT · 自然声景</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSoundscapePage(p => Math.max(0, p - 1))}
                      disabled={soundscapePage === 0}
                      aria-label="Previous Soundscape Page"
                      className={`p-0.5 rounded border transition-colors ${
                        soundscapePage === 0
                          ? 'opacity-30 cursor-not-allowed border-transparent text-slate-600'
                          : isDark
                            ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800'
                            : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ChevronLeft size={10} strokeWidth={2} />
                    </button>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      isDark
                        ? 'text-teal-400 bg-teal-950/40 border-teal-800/40'
                        : 'text-teal-700 bg-teal-50 border-teal-300'
                    }`}>
                      PAGE {soundscapePage + 1}/{SOUNDSCAPE_THEMES.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSoundscapePage(p => Math.min(SOUNDSCAPE_THEMES.length - 1, p + 1))}
                      disabled={soundscapePage === SOUNDSCAPE_THEMES.length - 1}
                      aria-label="Next Soundscape Page"
                      className={`p-0.5 rounded border transition-colors ${
                        soundscapePage === SOUNDSCAPE_THEMES.length - 1
                          ? 'opacity-30 cursor-not-allowed border-transparent text-slate-600'
                          : isDark
                            ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800'
                            : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ChevronRight size={10} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-slate-500 font-mono hidden sm:inline-block">
                    {SOUNDSCAPE_THEMES[soundscapePage]?.name}
                  </span>
                  <span className={`text-[8px] font-semibold uppercase font-mono ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {AMBIENT_SOUNDSCAPES.find(s => s.id === (channelStrip.ambient?.sampleId ?? 'oceanTide'))?.nameEn ?? 'Ocean Surf'}
                  </span>
                </div>
              </div>

              {/* 12 Category Quick Switcher Pills */}
              <div
                className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 mb-1.5"
                role="tablist"
                aria-label="Soundscape Categories"
              >
                {SOUNDSCAPE_THEMES.map((theme, idx) => {
                  const isActive = soundscapePage === idx;
                  return (
                    <button
                      key={theme.name}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSoundscapePage(idx)}
                      title={`Page ${idx + 1}: ${theme.name} (${theme.nameEn}) - ${theme.desc}`}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap transition-all cursor-pointer border ${
                        isActive
                          ? isDark
                            ? 'bg-teal-950/70 border-teal-500/80 text-teal-300 font-bold shadow-[0_0_8px_rgba(45,212,191,0.25)]'
                            : 'bg-teal-50 border-teal-600 text-teal-800 font-bold'
                          : isDark
                            ? 'bg-neutral-900/40 border-neutral-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            : 'bg-slate-100 border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      <span className="opacity-60 mr-1">{theme.range.split('-')[0]}</span>
                      {theme.shortName}
                    </button>
                  );
                })}
              </div>

              {/* Current Theme Detail Sub-row */}
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mb-1 px-0.5">
                <span className={`font-medium truncate ${isDark ? 'text-teal-400/90' : 'text-teal-700'}`}>
                  [{SOUNDSCAPE_THEMES[soundscapePage]?.range}] {SOUNDSCAPE_THEMES[soundscapePage]?.name} · {SOUNDSCAPE_THEMES[soundscapePage]?.nameEn}
                </span>
                <span className="truncate max-w-[280px] opacity-75 hidden sm:inline-block">
                  {SOUNDSCAPE_THEMES[soundscapePage]?.desc}
                </span>
              </div>

              {/* Sliding Carousel Viewport with Mouse Drag / Swipe (Mouse wheel disabled per user specification) */}
              <div
                data-testid="soundscape-carousel-viewport"
                className="relative overflow-hidden w-full select-none cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
                onPointerUp={handleCarouselPointerUp}
                onPointerCancel={handleCarouselPointerCancel}
              >
                <div
                  className={`flex ${isDraggingSoundscape ? 'transition-none select-none' : 'transition-transform duration-300 ease-out'}`}
                  style={{
                    width: `${SOUNDSCAPE_THEMES.length * 100}%`,
                    transform: isDraggingSoundscape
                      ? `translateX(calc(-${(soundscapePage * 100) / SOUNDSCAPE_THEMES.length}% + ${
                          (soundscapePage === 0 && soundscapeDragDeltaX > 0) ||
                          (soundscapePage === SOUNDSCAPE_THEMES.length - 1 && soundscapeDragDeltaX < 0)
                            ? soundscapeDragDeltaX * 0.25
                            : soundscapeDragDeltaX
                        }px))`
                      : `translateX(-${(soundscapePage * 100) / SOUNDSCAPE_THEMES.length}%)`
                  }}
                >
                  {SOUNDSCAPE_THEMES.map((theme, pageIdx) => {
                    const startIdx = pageIdx * 10;
                    const endIdx = startIdx + 10;
                    return (
                      <div
                        key={theme.name}
                        style={{ width: `${100 / SOUNDSCAPE_THEMES.length}%` }}
                        className="shrink-0 px-0.5 grid grid-cols-2 sm:grid-cols-5 gap-1.5"
                      >
                        {AMBIENT_SOUNDSCAPES.slice(startIdx, endIdx).map(sc => {
                          const isSelected = (channelStrip.ambient?.sampleId ?? 'oceanTide') === sc.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                if (hasDraggedSoundscapeRef.current || Math.abs(soundscapeDragDeltaX) > 6) return;
                                onChannelStripChange?.({ ambient: { sampleId: sc.id } });
                              }}
                              title={sc.description}
                              className={`px-2 py-1.5 rounded border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-teal-950/40 border-teal-500/60 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-semibold'
                                    : 'bg-teal-50 border-teal-500 text-teal-800 font-semibold'
                                  : isDark
                                    ? 'bg-neutral-900/40 border-neutral-800 hover:border-slate-600 text-slate-400 hover:text-slate-200'
                                    : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-800'
                              }`}
                            >
                              <div className="text-[10px] leading-tight truncate">{sc.name}</div>
                              <div className="text-[7.5px] opacity-70 tracking-tighter truncate font-mono">{sc.nameEn}</div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Controls Row: Knobs + Independent Channel Fader Bay */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className={`flex-1 grid grid-cols-3 gap-2.5 items-center justify-items-center p-2 rounded-lg border ${innerGridClass}`}>
                <Knob
                  id="ambient-tone"
                  label="Amb Tone"
                  value={channelStrip.ambient?.tone ?? 0.5}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['ambient-tone']}
                  liveModOffset={computeLiveModOffset('ambient-tone')}
                  onChange={val => onChannelStripChange?.({ ambient: { tone: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'ambient-tone', label: 'Ambient Tone' })
                  }
                />

                <Knob
                  id="ambient-breath-sync"
                  label="Breath Sync"
                  value={channelStrip.ambient?.breathSync ?? 0.35}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['ambient-breath-sync']}
                  liveModOffset={computeLiveModOffset('ambient-breath-sync')}
                  onChange={val => onChannelStripChange?.({ ambient: { breathSync: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'ambient-breath-sync', label: 'Ambient Breath Sync' })
                  }
                />

                <Knob
                  id="ambient-width"
                  label="Stereo Width"
                  value={channelStrip.ambient?.width ?? 0.65}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['ambient-width']}
                  liveModOffset={computeLiveModOffset('ambient-width')}
                  onChange={val => onChannelStripChange?.({ ambient: { width: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'ambient-width', label: 'Ambient Stereo Width' })
                  }
                />
              </div>

              <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
                <BipolarFader
                  id="ambient-gain"
                  label="Level"
                  value={channelStrip.ambient?.gain ?? 0.5}
                  min={0}
                  max={1}
                  bipolar={false}
                  height={115}
                  assignedModulation={modulationRoutes['ambient-gain']}
                  liveModOffset={computeLiveModOffset('ambient-gain')}
                  onChange={val => onChannelStripChange?.({ ambient: { gain: val } })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'ambient-gain', label: 'Ambient Level' })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Modular Dual-Lane Effects Rack (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className={`text-[10px] font-semibold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${sectionTitleClass}`}>
            <span>Modular Dual-Lane Effects Rack · 双轨模块化效果器机架</span>
            <span className="font-mono text-[9px] text-sky-400">HOT-PLUGGABLE · 3MS XFADE</span>
          </div>

          {/* Section: LANE A BUS */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-sky-400">
                  LANE A BUS ({activeLaneAOrder.length} MODULES)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="add-module-laneA-button"
                  onClick={() => setAddModuleLane(addModuleLane === 'laneA' ? null : 'laneA')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono tracking-wider transition-colors ${
                    addModuleLane === 'laneA'
                      ? (isDark ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-semibold' : 'bg-sky-50 text-sky-700 border-sky-400 font-semibold')
                      : (isDark ? 'border-sky-500/30 text-sky-400 hover:bg-sky-950/40' : 'border-sky-300 text-sky-600 hover:bg-sky-50')
                  }`}
                >
                  <Plus size={10} strokeWidth={2} />
                  <span>新增模块</span>
                </button>
                <span className="text-[9px] font-mono text-slate-400">SERIAL DSP CHAIN</span>
              </div>
            </div>

            {addModuleLane === 'laneA' && renderAddModuleModal('laneA')}

            {activeLaneAOrder.length === 0 ? (
              <div className={`p-4 rounded-lg border border-dashed text-center text-xs font-mono flex flex-col items-center gap-2 ${isDark ? 'border-neutral-800 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}>
                <span>LANE A EMPTY · 可从 LANE B 迁移模块或新增模块</span>
                <button
                  type="button"
                  onClick={() => setAddModuleLane('laneA')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
                    isDark ? 'border-sky-500/30 bg-sky-950/30 text-sky-400 hover:bg-sky-900/40' : 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                  <span>为 LANE A 新增模块</span>
                </button>
              </div>
            ) : (
              activeLaneAOrder.map((effectId, idx) => renderEffectCard(effectId, 'laneA', idx, activeLaneAOrder.length))
            )}

            {/* Dedicated BUS A Master Strip */}
            <div
              className={`rounded-lg border p-2.5 transition-colors flex items-center justify-between ${
                isDark
                  ? 'border-sky-500/30 bg-sky-950/20 shadow-[0_0_12px_rgba(56,189,248,0.06)]'
                  : 'border-sky-200 bg-sky-50/70 shadow-xs'
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-sky-400">
                    BUS A MASTER
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    主推子
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight">
                    POST-FX SUMMING STAGE
                  </span>
                  <span className="text-[9px] font-mono font-bold text-sky-400">
                    {Math.round((effects.busLevelA ?? 1.0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <BipolarFader
                  id="bus-master-a"
                  label="BUS A Master"
                  value={effects.busLevelA ?? 1.0}
                  min={0}
                  max={1}
                  bipolar={false}
                  height={80}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  onChange={val => onEffectsChange?.({ busLevelA: val })}
                />
              </div>
            </div>
          </div>

          {/* Section: LANE B BUS */}
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-teal-400">
                  LANE B BUS ({activeLaneBOrder.length} MODULES)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="add-module-laneB-button"
                  onClick={() => setAddModuleLane(addModuleLane === 'laneB' ? null : 'laneB')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono tracking-wider transition-colors ${
                    addModuleLane === 'laneB'
                      ? (isDark ? 'bg-teal-500/20 text-teal-300 border-teal-400 font-semibold' : 'bg-teal-50 text-teal-700 border-teal-400 font-semibold')
                      : (isDark ? 'border-teal-500/30 text-teal-400 hover:bg-teal-950/40' : 'border-teal-300 text-teal-600 hover:bg-teal-50')
                  }`}
                >
                  <Plus size={10} strokeWidth={2} />
                  <span>新增模块</span>
                </button>
                <span className="text-[9px] font-mono text-slate-400">SERIAL DSP CHAIN</span>
              </div>
            </div>

            {addModuleLane === 'laneB' && renderAddModuleModal('laneB')}

            {activeLaneBOrder.length === 0 ? (
              <div className={`p-4 rounded-lg border border-dashed text-center text-xs font-mono flex flex-col items-center gap-2 ${isDark ? 'border-neutral-800 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}>
                <span>LANE B EMPTY · 可从 LANE A 迁移模块或新增模块</span>
                <button
                  type="button"
                  onClick={() => setAddModuleLane('laneB')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
                    isDark ? 'border-teal-500/30 bg-teal-950/30 text-teal-400 hover:bg-teal-900/40' : 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                  <span>为 LANE B 新增模块</span>
                </button>
              </div>
            ) : (
              activeLaneBOrder.map((effectId, idx) => renderEffectCard(effectId, 'laneB', idx, activeLaneBOrder.length))
            )}

            {/* Dedicated BUS B Master Strip */}
            <div
              className={`rounded-lg border p-2.5 transition-colors flex items-center justify-between ${
                isDark
                  ? 'border-teal-500/30 bg-teal-950/20 shadow-[0_0_12px_rgba(20,184,166,0.06)]'
                  : 'border-teal-200 bg-teal-50/70 shadow-xs'
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_#2dd4bf]" />
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-teal-400">
                    BUS B MASTER
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    主推子
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight">
                    POST-FX SUMMING STAGE
                  </span>
                  <span className="text-[9px] font-mono font-bold text-teal-400">
                    {Math.round((effects.busLevelB ?? 1.0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <BipolarFader
                  id="bus-master-b"
                  label="BUS B Master"
                  value={effects.busLevelB ?? 1.0}
                  min={0}
                  max={1}
                  bipolar={false}
                  height={80}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  onChange={val => onEffectsChange?.({ busLevelB: val })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Modulation Assignment Card Popover */}
      {activeModTarget && (
        <ModulationCard
          isOpen={true}
          isDark={isDark}
          target={activeModTarget.id}
          targetLabel={activeModTarget.label}
          route={modulationRoutes[activeModTarget.id]}
          onAssign={handleModAssign}
          onUnassign={handleModUnassign}
          onClose={() => setActiveModTarget(null)}
          onOpenStudio={() => {
            setStudioTarget(activeModTarget);
            setIsStageStudioOpen(true);
          }}
          breathMacro={breathMacro}
          isPlaying={isPlaying}
          clockSnapshot={clockSnapshot}
          lfo1Rate={lfo1Rate}
          lfo2Rate={lfo2Rate}
        />
      )}

      {/* Dedicated Studio MSEG Workspace for Stage Envelope */}
      <StageEnvelopeStudio
        isOpen={isStageStudioOpen}
        isDark={isDark}
        onClose={() => setIsStageStudioOpen(false)}
        initialCurveData={
          modulationRoutes[studioTarget?.id || 'master-fader']?.curveData ??
          (modulationRoutes[studioTarget?.id || 'master-fader']?.stageMultipliers
            ? createCurveDataFromMultipliers(modulationRoutes[studioTarget?.id || 'master-fader']!.stageMultipliers!)
            : undefined)
        }
        targetLabel={studioTarget?.label ?? 'Master Volume'}
        currentStage={breathStage}
        stageProgress={stageProgress}
        isPlaying={isPlaying}
        onSave={handleStudioSave}
        onChange={handleStudioSave}
      />

      {/* Bottom Sheet Drawer for Wavetable Selection */}
      <BottomSheetDrawer
        isOpen={isWavetableDrawerOpen}
        isDark={isDark}
        onClose={() => setIsWavetableDrawerOpen(false)}
        title="Select Sound Therapy Wavetable"
        items={wavetableDrawerItems}
        selectedId={String(channelStrip.oscA.wavetableIndex)}
        onSelect={id => {
          const idx = parseInt(id, 10);
          onChannelStripChange?.({
            oscA: {
              wavetableIndex: idx
            }
          });
        }}
      />
    </div>
  );
};
