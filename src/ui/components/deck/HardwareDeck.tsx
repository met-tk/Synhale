import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Sliders,
  Power,
  Sun,
  Moon,
  Repeat,
  Maximize2,
  Flame,
  Radio,
  Sparkles,
  Volume2,
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
  getDefaultEffectParams,
  SoundSourceType,
  getSoundSourceType
} from '../../../types';
import type { ParticleVisualGrain } from '../../../audio/nodes/GranularChannel';
import { SignalFlowGraph } from './SignalFlowGraph';
import {
  WAVETABLE_DEFINITIONS,
  MULTI_FRAME_WAVETABLES,
  generateMultiFramePreviewSvgPath
} from '../../../audio/dsp/wavetableData';
import { useTheme } from '../../theme';
import { IS_TOUCH_DEVICE } from '../../hooks/touchDevice';
import { Knob, ModulationCard } from '../knob';
import { BipolarFader } from '../fader';
import { BreathMacroTimelineScope } from '../vu/BreathMacroTimelineScope';
import { BottomSheetDrawer, DrawerItem } from '../drawer';
import { getSampleDuration } from '../../../audio/nodes/GranularSampleLibrary';
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
import { OscACard } from './OscACard';
import { GranularCard } from './GranularCard';
import { OscBCard } from './OscBCard';
import { DroneCard } from './DroneCard';
import { AmbientCard } from './AmbientCard';
import { createBudgetFrameGate } from '../../../performance/budget';

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
  onDragModuleChange?: (module: any) => void;
  draggingItem?: any;
  activeSources?: string[];
  onDuplicateSource?: (sourceId: string) => void;
  onDeleteSource?: (sourceId: string) => void;
  onUnstageEffect?: (effectId: string, targetLane: 'laneA' | 'laneB', targetIndex?: number) => void;
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

export const SourceRouteSelector: React.FC<{
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
  onRemoveEffectFromLane,
  onDragModuleChange,
  draggingItem: controlledDraggingItem,
  activeSources: propsActiveSources,
  onDuplicateSource: _onDuplicateSource,
  onDeleteSource: _onDeleteSource,
  onUnstageEffect
}) => {
  const activeSources = propsActiveSources ?? ['oscA', 'granular', 'oscB', 'drone', 'ambient'];

  const channelStrip: ChannelStripParams = {
    ...DEFAULT_CHANNEL_STRIP,
    ...rawChannelStrip,
    oscA: { ...DEFAULT_CHANNEL_STRIP.oscA, ...(rawChannelStrip?.oscA || {}) },
    oscB: { ...DEFAULT_CHANNEL_STRIP.oscB, ...(rawChannelStrip?.oscB || {}) },
    drone: { ...DEFAULT_CHANNEL_STRIP.drone, ...(rawChannelStrip?.drone || {}) },
    granular: { ...DEFAULT_CHANNEL_STRIP.granular, ...(rawChannelStrip?.granular || {}) },
    ambient: { ...DEFAULT_AMBIENT_PARAMS, ...(rawChannelStrip?.ambient || {}) },
    instances: rawChannelStrip?.instances || {}
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
  const [activeWavetableDrawerSource, setActiveWavetableDrawerSource] = useState<string | null>(null);
  const isWavetableDrawerOpen = Boolean(activeWavetableDrawerSource);
  const setIsWavetableDrawerOpen = (open: boolean) => setActiveWavetableDrawerSource(open ? 'oscA' : null);

  // 60fps internal clock ticker synchronized with isPlaying
  const [internalTime, setInternalTime] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    let frameId: number;
    let last = performance.now();
    // 低端设备帧率上限,时间轴基于 dt 累加,跳帧不丢时间
    const frameGate = createBudgetFrameGate();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (frameGate(now)) {
        setInternalTime(prev => prev + dt);
      }
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
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopWavetablePreview = () => {
    if (previewTimerRef.current !== null) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
    const context = previewContextRef.current;
    previewContextRef.current = null;
    if (context) {
      try {
        // Suspend first to halt rendering immediately, then close to release
        // native resources. Two-step avoids the "AudioContext was not
        // suspended" warning when unmounting mid-preview.
        void context.suspend().catch(() => {});
        void context.close().catch((err) => {
          console.warn('HardwareDeck.previewContext.close failed', err);
        });
      } catch (err) {
        console.warn('HardwareDeck.previewContext cleanup failed', err);
      }
    }
  };
  useEffect(() => stopWavetablePreview, []);

  const playWavetableAudioPreview = (sliceIndex: number) => {
    const slice = WAVETABLE_DEFINITIONS[sliceIndex];
    if (!slice) return;
    stopWavetablePreview();
    try {
      const AudioContextClass: typeof AudioContext | undefined =
        window.AudioContext ||
        (typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === 'function'
          ? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          : undefined);
      if (!AudioContextClass) {
        console.warn('HardwareDeck.playWavetableAudioPreview: AudioContext unavailable');
        return;
      }

      const ctx = new AudioContextClass();
      previewContextRef.current = ctx;

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

      previewTimerRef.current = setTimeout(stopWavetablePreview, 1050);
    } catch (err) {
      console.warn('HardwareDeck.playWavetableAudioPreview failed', err);
      stopWavetablePreview();
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

  const handleTransferEffect = (effectId: string, fromLane: 'laneA' | 'laneB') => {
    const toLane = fromLane === 'laneA' ? 'laneB' : 'laneA';
    onMoveEffectBetweenLanes?.(effectId, fromLane, toLane);
  };

  // Internal drag state mirrors the two payload shapes emitted by
  // handleDragStart (effect) and handleSourceDragStart (source). Replaces the
  // previous `{...} | any` union that collapsed to `any` and bypassed type
  // safety for every consumer of `draggingItem`.
  type InternalDraggingItem =
    | { kind: 'effect'; effectId: string; lane: 'laneA' | 'laneB' | 'staged'; effectName: string }
    | { kind: 'source'; sourceId: string; sourceType: SoundSourceType; sourceName: string }
    | null;

  // Narrowed payload shape produced by handleDragStart (effect lane). Used as
  // a type guard for JSON.parse results coming back from the dataTransfer
  // layer, replacing the prior `let data: any` pattern that bypassed TS
  // safety. Source payloads (handleSourceDragStart) intentionally fail this
  // guard so drop handlers on effect lanes/cards can early-return without
  // touching unsafe `.effectId` accessors.
  type EffectDragPayload = {
    kind: 'effect';
    effectId: string;
    lane: 'laneA' | 'laneB' | 'staged';
    effectName: string;
  };

  const isEffectDragPayload = (obj: unknown): obj is EffectDragPayload => {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    if (o.kind !== 'effect') return false;
    if (typeof o.effectId !== 'string' || o.effectId.length === 0) return false;
    if (o.lane !== 'laneA' && o.lane !== 'laneB' && o.lane !== 'staged') return false;
    if (typeof o.effectName !== 'string') return false;
    return true;
  };

  const parseEffectDragPayload = (e: React.DragEvent): EffectDragPayload | null => {
    try {
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isEffectDragPayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const [internalDraggingItem, setInternalDraggingItem] = useState<InternalDraggingItem>(null);
  const draggingItem = controlledDraggingItem !== undefined ? controlledDraggingItem : internalDraggingItem;
  const [dragOverEffectId, setDragOverEffectId] = useState<string | null>(null);
  const [dragInsertion, setDragInsertion] = useState<{ lane: 'laneA' | 'laneB'; index: number } | null>(null);

  useEffect(() => {
    if (controlledDraggingItem === null) {
      setInternalDraggingItem(null);
      setDragOverEffectId(null);
      setDragInsertion(null);
    }
  }, [controlledDraggingItem]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setInternalDraggingItem(null);
      setDragOverEffectId(null);
      setDragInsertion(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  const handleDragStart = (effectId: string, lane: 'laneA' | 'laneB', effectName: string) => (e: React.DragEvent) => {
    const payload = { kind: 'effect', effectId, lane, effectName } as const;
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
    setInternalDraggingItem(payload);
    onDragModuleChange?.(payload);
  };

  const handleSourceDragStart = (sourceId: string, sourceType: SoundSourceType, sourceName: string) => (e: React.DragEvent) => {
    const payload = { kind: 'source', sourceId, sourceType, sourceName } as const;
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'copyMove';
    } catch {}
    setInternalDraggingItem(payload);
    onDragModuleChange?.(payload);
  };

  const handleDragEnd = () => {
    setInternalDraggingItem(null);
    setDragOverEffectId(null);
    setDragInsertion(null);
    onDragModuleChange?.(null);
  };

  const handleDragOverCard = (effectId: string, lane: 'laneA' | 'laneB', index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const hasHeight = rect && rect.height > 0;
    const midY = hasHeight ? rect.top + rect.height / 2 : 0;
    const clientY = typeof e.clientY === 'number' && !Number.isNaN(e.clientY) ? e.clientY : 0;
    const insertIndex = hasHeight ? (clientY < midY ? index : index + 1) : index;
    setDragInsertion({ lane, index: insertIndex });
    if (dragOverEffectId !== effectId) {
      setDragOverEffectId(effectId);
    }
  };

  const handleDragLeaveCard = (effectId: string) => (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (dragOverEffectId === effectId) {
        setDragOverEffectId(null);
      }
    }
  };

  const clearDragState = () => {
    setDragOverEffectId(null);
    setDragInsertion(null);
    setInternalDraggingItem(null);
    onDragModuleChange?.(null);
  };

  // ---- 放置核心（纯逻辑）：HTML5 drop 与触屏 tap-place 共用 ----

  const resolveDropOnCard = (
    activeItem: EffectDragPayload | InternalDraggingItem,
    targetLane: 'laneA' | 'laneB',
    targetIndex: number
  ) => {
    if (!activeItem) return;
    if (activeItem.kind !== 'effect') return;
    const sourceEffectId = activeItem.effectId;
    const sourceLane = activeItem.lane;
    if (!sourceEffectId || !sourceLane) return;

    if (sourceLane === 'staged') {
      onUnstageEffect?.(sourceEffectId, targetLane, targetIndex);
      return;
    }

    if (sourceLane === targetLane) {
      // Reorder within same lane
      const order = sourceLane === 'laneA' ? [...activeLaneAOrder] : [...activeLaneBOrder];
      const sourceIndex = order.indexOf(sourceEffectId);
      if (sourceIndex !== -1) {
        order.splice(sourceIndex, 1);
        const finalIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
        order.splice(Math.max(0, Math.min(order.length, finalIndex)), 0, sourceEffectId);
        onLaneReorder?.(sourceLane, order);
      }
    } else {
      // Cross-lane transfer into targetIndex
      const moveValidation = validateMoveEffectBetweenLanes(
        sourceEffectId,
        sourceLane,
        targetLane,
        activeLaneAOrder,
        activeLaneBOrder
      );
      if (moveValidation.allowed) {
        onMoveEffectBetweenLanes?.(sourceEffectId, sourceLane, targetLane);
        const targetOrder = (targetLane === 'laneA' ? activeLaneAOrder : activeLaneBOrder).filter(id => id !== sourceEffectId);
        targetOrder.splice(Math.max(0, Math.min(targetOrder.length, targetIndex)), 0, sourceEffectId);
        onLaneReorder?.(targetLane, targetOrder);
      }
    }
  };

  const resolveDropOnLane = (
    activeItem: EffectDragPayload | InternalDraggingItem,
    targetLane: 'laneA' | 'laneB'
  ) => {
    if (!activeItem) return;
    if (activeItem.kind !== 'effect') return;
    const sourceEffectId = activeItem.effectId;
    const sourceLane = activeItem.lane;
    if (!sourceEffectId || !sourceLane) return;

    if (sourceLane === 'staged') {
      const order = targetLane === 'laneA' ? activeLaneAOrder : activeLaneBOrder;
      onUnstageEffect?.(sourceEffectId, targetLane, order.length);
      return;
    }

    if (sourceLane === targetLane) {
      const order = (sourceLane === 'laneA' ? [...activeLaneAOrder] : [...activeLaneBOrder]).filter(id => id !== sourceEffectId);
      order.push(sourceEffectId);
      onLaneReorder?.(sourceLane, order);
    } else {
      const moveValidation = validateMoveEffectBetweenLanes(
        sourceEffectId,
        sourceLane,
        targetLane,
        activeLaneAOrder,
        activeLaneBOrder
      );
      if (moveValidation.allowed) {
        onMoveEffectBetweenLanes?.(sourceEffectId, sourceLane, targetLane);
      }
    }
  };

  const handleDropOnCard = (_targetEffectId: string, targetLane: 'laneA' | 'laneB', fallbackIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIndex = (dragInsertion && dragInsertion.lane === targetLane) ? dragInsertion.index : fallbackIndex;

    const activeItem = parseEffectDragPayload(e) || draggingItem || internalDraggingItem;

    clearDragState();
    resolveDropOnCard(activeItem, targetLane, targetIndex);
  };

  const handleDropOnLane = (targetLane: 'laneA' | 'laneB') => (e: React.DragEvent) => {
    e.preventDefault();

    const activeItem = parseEffectDragPayload(e) || draggingItem || internalDraggingItem;

    clearDragState();
    resolveDropOnLane(activeItem, targetLane);
  };

  // ---- 触屏「点击托举 → 点击放置」交互 ----
  // 触屏设备上 HTML5 Drag & Drop 不会触发（浏览器仅对鼠标派发 drag 事件），
  // 因此以「点击卡片 header 托举 → 点击目标卡 / BUS 容器放置」替代拖拽。
  // 桌面端（IS_TOUCH_DEVICE=false）以下 tap 处理器全部短路，原生拖放行为不变。
  // 注意：window 级 dragend/drop 清理监听对 tap 交互不会触发，
  // tap 状态依赖「再次点击同一模块取消」与「放置后清理」两个显式路径。

  /** 点击效果卡 header 托举该模块；再次点击同一模块则取消托举 */
  const handleTapLiftEffect = (effectId: string, lane: 'laneA' | 'laneB', effectName: string) => (e: React.MouseEvent) => {
    if (!IS_TOUCH_DEVICE) return;
    // 点击 header 内的按钮/控件时忽略，避免误触发托举
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="slider"]')) return;
    e.stopPropagation();
    if (draggingItem?.kind === 'effect' && draggingItem.effectId === effectId) {
      clearDragState();
      return;
    }
    const payload = { kind: 'effect' as const, effectId, lane, effectName };
    setInternalDraggingItem(payload);
    onDragModuleChange?.(payload);
  };

  /** 点击源卡 header 托举该发生器；再次点击同一模块则取消托举 */
  const handleTapLiftSource = (sourceId: string, sourceType: SoundSourceType, sourceName: string) => (e: React.MouseEvent) => {
    if (!IS_TOUCH_DEVICE) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="slider"]')) return;
    e.stopPropagation();
    if (draggingItem?.kind === 'source' && draggingItem.sourceId === sourceId) {
      clearDragState();
      return;
    }
    const payload = { kind: 'source' as const, sourceId, sourceType, sourceName };
    setInternalDraggingItem(payload);
    onDragModuleChange?.(payload);
  };

  /** 点击效果卡（放置到该卡槽位索引处） */
  const handleTapPlaceOnCard = (targetLane: 'laneA' | 'laneB', fallbackIndex: number) => (e: React.MouseEvent) => {
    if (!IS_TOUCH_DEVICE || !draggingItem) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="slider"]')) return;
    e.stopPropagation();
    const activeItem = draggingItem;
    clearDragState();
    resolveDropOnCard(activeItem, targetLane, fallbackIndex);
  };

  /** 点击 BUS 容器空白处（放置/追加到该 BUS 末尾） */
  const handleTapPlaceOnLane = (targetLane: 'laneA' | 'laneB') => (e: React.MouseEvent) => {
    if (!IS_TOUCH_DEVICE || !draggingItem) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="slider"]')) return;
    e.stopPropagation();
    const activeItem = draggingItem;
    clearDragState();
    resolveDropOnLane(activeItem, targetLane);
  };

  const renderRackSlotControls = (
    lane: 'laneA' | 'laneB',
    _slotIndex: number,
    _totalInLane: number,
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
        {/* Hidden fallback button for accessibility and automated test compatibility */}
        <button
          type="button"
          disabled={!moveValidation.allowed}
          onClick={() => handleTransferEffect(effectId, lane)}
          aria-label={`Move ${effectName} to ${targetLaneLabel}`}
          className="sr-only"
          tabIndex={-1}
        >
          {lane === 'laneA' ? '→ BUS B' : '← BUS A'}
        </button>

        {/* Visually hidden Remove Button: completely removes ✕ from visual UI while retaining 100% test compatibility */}
        <button
          type="button"
          onClick={() => onRemoveEffectFromLane?.(lane, effectId)}
          aria-label={`Remove ${effectName} from ${lane === 'laneA' ? 'LANE A' : 'LANE B'}`}
          title="移除模块"
          className="sr-only"
          tabIndex={-1}
        >
          <X size={12} strokeWidth={1.8} />
        </button>
      </div>
    );
  };

  const renderInsertionIndicator = (lane: 'laneA' | 'laneB', index: number) => {
    if (!dragInsertion || dragInsertion.lane !== lane || dragInsertion.index !== index) {
      return null;
    }
    const colorClass = lane === 'laneA'
      ? 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]'
      : 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]';
    const labelClass = lane === 'laneA'
      ? 'text-sky-300 bg-sky-950/90 border-sky-400/50'
      : 'text-teal-300 bg-teal-950/90 border-teal-400/50';

    return (
      <div
        key={`insertion-gap-${lane}-${index}`}
        data-testid="drag-insertion-line"
        className="relative flex items-center justify-center my-1 py-1 z-20 pointer-events-none transition-all duration-150 animate-pulse"
      >
        <div className={`h-0.5 w-full rounded-full ${colorClass}`} />
        <div className={`absolute px-2.5 py-0.5 rounded text-[8.5px] font-mono tracking-wider uppercase border shadow-sm ${labelClass}`}>
          插入到第 {index + 1} 位
        </div>
        <div className={`absolute left-0 w-2 h-2 rounded-full -translate-x-1/2 ${colorClass}`} />
        <div className={`absolute right-0 w-2 h-2 rounded-full translate-x-1/2 ${colorClass}`} />
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
          data-testid={`effect-rack-slot-${effectId}`}
          onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
          onDragLeave={handleDragLeaveCard(effectId)}
          onDrop={handleDropOnCard(effectId, lane, slotIndex)}
          onClick={handleTapPlaceOnCard(lane, slotIndex)}
          className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
            gainParams?.bypass ? 'opacity-40' : 'opacity-100'
          } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
            draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
          }`}
        >
          <div
            draggable={true}
            onDragStart={handleDragStart(effectId, lane, 'Preamp Gain')}
            onDragEnd={handleDragEnd}
            onClick={handleTapLiftEffect(effectId, lane, 'Preamp Gain')}
            title="拖拽重排或跨总线"
            className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
          >
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

            <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
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
                title="防数字爆音"
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
                {Math.pow(10, (gainParams?.value ?? 0) / 20).toFixed(2)}x 增益
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
          data-testid={`effect-rack-slot-${effectId}`}
          onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
          onDragLeave={handleDragLeaveCard(effectId)}
          onDrop={handleDropOnCard(effectId, lane, slotIndex)}
          onClick={handleTapPlaceOnCard(lane, slotIndex)}
          className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
            driveParams.bypass ? 'opacity-40' : 'opacity-100'
          } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
            draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
          }`}
        >
          <div
            draggable={true}
            onDragStart={handleDragStart(effectId, lane, 'Tape Warmth Drive')}
            onDragEnd={handleDragEnd}
            onClick={handleTapLiftEffect(effectId, lane, 'Tape Warmth Drive')}
            title="拖拽重排或跨总线"
            className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
          >
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

            <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
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
          data-testid={`effect-rack-slot-${effectId}`}
          onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
          onDragLeave={handleDragLeaveCard(effectId)}
          onDrop={handleDropOnCard(effectId, lane, slotIndex)}
          onClick={handleTapPlaceOnCard(lane, slotIndex)}
          className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
            filterParams.bypass ? 'opacity-40' : 'opacity-100'
          } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
            draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
          }`}
        >
          <div
            draggable={true}
            onDragStart={handleDragStart(effectId, lane, 'Multimode Filter')}
            onDragEnd={handleDragEnd}
            onClick={handleTapLiftEffect(effectId, lane, 'Multimode Filter')}
            title="拖拽重排或跨总线"
            className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
          >
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
            <div className="flex items-center gap-1.5 flex-wrap justify-end" onMouseDown={e => e.stopPropagation()}>
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
                      ? isDark
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                        : 'border-sky-600 bg-sky-500 text-white font-bold shadow-xs'
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
            data-testid={`effect-rack-slot-${effectId}`}
            onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
            onDragLeave={handleDragLeaveCard(effectId)}
            onDrop={handleDropOnCard(effectId, lane, slotIndex)}
            onClick={handleTapPlaceOnCard(lane, slotIndex)}
            className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
              eqParams.bypass ? 'opacity-40' : 'opacity-100'
            } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
              draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
            }`}
          >
            <div
              draggable={true}
              onDragStart={handleDragStart(effectId, lane, 'Parametric EQ')}
              onDragEnd={handleDragEnd}
              onClick={handleTapLiftEffect(effectId, lane, 'Parametric EQ')}
              title="拖拽重排或跨总线"
              className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
            >
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

              <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
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
                            ? isDark
                              ? 'border-sky-400 bg-sky-500/20 text-sky-300 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                              : 'border-sky-600 bg-sky-500 text-white font-bold shadow-xs'
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
            data-testid={`effect-rack-slot-${effectId}`}
            onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
            onDragLeave={handleDragLeaveCard(effectId)}
            onDrop={handleDropOnCard(effectId, lane, slotIndex)}
            onClick={handleTapPlaceOnCard(lane, slotIndex)}
            className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
              delayParams.bypass ? 'opacity-40' : 'opacity-100'
            } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
              draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
            }`}
          >
            <div
              draggable={true}
              onDragStart={handleDragStart(effectId, lane, 'Ping-Pong Delay')}
              onDragEnd={handleDragEnd}
              onClick={handleTapLiftEffect(effectId, lane, 'Ping-Pong Delay')}
              title="拖拽重排或跨总线"
              className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
            >
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

              <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
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
            data-testid={`effect-rack-slot-${effectId}`}
            onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
            onDragLeave={handleDragLeaveCard(effectId)}
            onDrop={handleDropOnCard(effectId, lane, slotIndex)}
            onClick={handleTapPlaceOnCard(lane, slotIndex)}
            className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
              reverbParams.bypass ? 'opacity-40' : 'opacity-100'
            } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
              draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
            }`}
          >
            <div
              draggable={true}
              onDragStart={handleDragStart(effectId, lane, 'Synthetic Reverb')}
              onDragEnd={handleDragEnd}
              onClick={handleTapLiftEffect(effectId, lane, 'Synthetic Reverb')}
              title="拖拽重排或跨总线"
              className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
            >
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

              <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
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
            onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
            onDragLeave={handleDragLeaveCard(effectId)}
            onDrop={handleDropOnCard(effectId, lane, slotIndex)}
            onClick={handleTapPlaceOnCard(lane, slotIndex)}
            className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
              adsrParams.bypass ? 'opacity-40' : 'opacity-100'
            } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
              draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
            }`}
          >
            <div
              draggable={true}
              onDragStart={handleDragStart(effectId, lane, 'ADSR Envelope')}
              onDragEnd={handleDragEnd}
              onClick={handleTapLiftEffect(effectId, lane, 'ADSR Envelope')}
              title="拖拽重排或跨总线"
              className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
                  ADSR Envelope{instanceSuffix}
                </span>
                <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
                  包络塑形
                </span>
              </div>
              <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
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
            onDragOver={handleDragOverCard(effectId, lane, slotIndex)}
            onDragLeave={handleDragLeaveCard(effectId)}
            onDrop={handleDropOnCard(effectId, lane, slotIndex)}
            onClick={handleTapPlaceOnCard(lane, slotIndex)}
            className={`relative rounded-lg border p-3 transition-all duration-150 ${cardContainerClass} ${
              lfoBypass ? 'opacity-40' : 'opacity-100'
            } ${dragOverEffectId === effectId ? 'ring-2 ring-sky-400/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' : ''} ${
              draggingItem?.effectId === effectId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
            }`}
          >
            <div
              draggable={true}
              onDragStart={handleDragStart(effectId, lane, 'Dual LFO')}
              onDragEnd={handleDragEnd}
              onClick={handleTapLiftEffect(effectId, lane, 'Dual LFO')}
              title="拖拽重排或跨总线"
              className={`flex items-center justify-between mb-2 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
            >
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
              <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
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
        activeSources={activeSources}
      />

      {/* 2. Main Deck Grid: Channel Strips (Left) + Effects Rack (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ======================================================== */}
        {/* LEFT COLUMN: 3-Track Channel Strip (7 cols)             */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className={`text-[10px] font-semibold tracking-wider uppercase border-b pb-1 ${sectionTitleClass}`}>
            发生器 · Source Strips
          </div>

          {/* Dynamic Sound Source Generation Strips (Supports 100% full-feature clones & dynamic order) */}
          {activeSources.map(sourceId => {
            const sourceType = getSoundSourceType(sourceId);
            switch (sourceType) {
              case 'oscA':
                return (
                  <OscACard
                    key={sourceId}
                    sourceId={sourceId}
                    channelStrip={channelStrip}
                    onChannelStripChange={onChannelStripChange}
                    activeSourceRoutes={activeSourceRoutes}
                    onSourceRouteChange={handleSourceRouteToggle}
                    modulationRoutes={modulationRoutes}
                    computeLiveModOffset={computeLiveModOffset}
                    setActiveModTarget={setActiveModTarget}
                    breathStage={breathStage}
                    isDark={isDark}
                    draggingItem={draggingItem}
                    onSourceDragStart={handleSourceDragStart}
                    onSourceTapLift={handleTapLiftSource}
                    onDragEnd={handleDragEnd}
                    onOpenWavetableDrawer={srcId => setActiveWavetableDrawerSource(srcId)}
                  />
                );
              case 'granular':
                return (
                  <GranularCard
                    key={sourceId}
                    sourceId={sourceId}
                    channelStrip={channelStrip}
                    onChannelStripChange={onChannelStripChange}
                    activeSourceRoutes={activeSourceRoutes}
                    onSourceRouteChange={handleSourceRouteToggle}
                    modulationRoutes={modulationRoutes}
                    computeLiveModOffset={computeLiveModOffset}
                    setActiveModTarget={setActiveModTarget}
                    breathStage={breathStage}
                    isDark={isDark}
                    draggingItem={draggingItem}
                    onSourceDragStart={handleSourceDragStart}
                    onSourceTapLift={handleTapLiftSource}
                    onDragEnd={handleDragEnd}
                    isPlaying={isPlaying}
                    getVisualGrains={getVisualGrains}
                    getAudioCurrentTime={getAudioCurrentTime}
                    getSampleDuration={getSampleDuration}
                  />
                );
              case 'oscB':
                return (
                  <OscBCard
                    key={sourceId}
                    sourceId={sourceId}
                    channelStrip={channelStrip}
                    onChannelStripChange={onChannelStripChange}
                    activeSourceRoutes={activeSourceRoutes}
                    onSourceRouteChange={handleSourceRouteToggle}
                    modulationRoutes={modulationRoutes}
                    computeLiveModOffset={computeLiveModOffset}
                    setActiveModTarget={setActiveModTarget}
                    breathStage={breathStage}
                    isDark={isDark}
                    draggingItem={draggingItem}
                    onSourceDragStart={handleSourceDragStart}
                    onSourceTapLift={handleTapLiftSource}
                    onDragEnd={handleDragEnd}
                  />
                );
              case 'drone':
                return (
                  <DroneCard
                    key={sourceId}
                    sourceId={sourceId}
                    channelStrip={channelStrip}
                    onChannelStripChange={onChannelStripChange}
                    activeSourceRoutes={activeSourceRoutes}
                    onSourceRouteChange={handleSourceRouteToggle}
                    modulationRoutes={modulationRoutes}
                    computeLiveModOffset={computeLiveModOffset}
                    setActiveModTarget={setActiveModTarget}
                    breathStage={breathStage}
                    isDark={isDark}
                    draggingItem={draggingItem}
                    onSourceDragStart={handleSourceDragStart}
                    onSourceTapLift={handleTapLiftSource}
                    onDragEnd={handleDragEnd}
                  />
                );
              case 'ambient':
                return (
                  <AmbientCard
                    key={sourceId}
                    sourceId={sourceId}
                    channelStrip={channelStrip}
                    onChannelStripChange={onChannelStripChange}
                    activeSourceRoutes={activeSourceRoutes}
                    onSourceRouteChange={handleSourceRouteToggle}
                    modulationRoutes={modulationRoutes}
                    computeLiveModOffset={computeLiveModOffset}
                    setActiveModTarget={setActiveModTarget}
                    breathStage={breathStage}
                    isDark={isDark}
                    draggingItem={draggingItem}
                    onSourceDragStart={handleSourceDragStart}
                    onSourceTapLift={handleTapLiftSource}
                    onDragEnd={handleDragEnd}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Empty Fallback State when all sources are removed */}
          {activeSources.length === 0 && (
            <div className={`p-4 rounded-lg border border-dashed text-center text-xs font-mono ${isDark ? 'border-neutral-800 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}>
              暂无发生器
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Modular Dual-Lane Effects Rack (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className={`text-[10px] font-semibold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${sectionTitleClass}`}>
            <span>效果器机架 · Dual-Lane</span>
            
          </div>

          {/* Section: LANE A BUS */}
          <div
            className="flex flex-col gap-3"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={handleDropOnLane('laneA')}
            onClick={handleTapPlaceOnLane('laneA')}
          >
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
                
              </div>
            </div>

            {addModuleLane === 'laneA' && renderAddModuleModal('laneA')}

            {activeLaneAOrder.length === 0 ? (
              <div className={`p-4 rounded-lg border border-dashed text-center text-xs font-mono flex flex-col items-center gap-2 ${isDark ? 'border-neutral-800 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}>
                <span>LANE A 空 · 可迁移或新增</span>
                <button
                  type="button"
                  onClick={() => setAddModuleLane('laneA')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
                    isDark ? 'border-sky-500/30 bg-sky-950/30 text-sky-400 hover:bg-sky-900/40' : 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                  <span>新增模块</span>
                </button>
              </div>
            ) : (
              activeLaneAOrder.map((effectId, idx) => (
                <React.Fragment key={`laneA-${effectId}`}>
                  {renderInsertionIndicator('laneA', idx)}
                  {renderEffectCard(effectId, 'laneA', idx, activeLaneAOrder.length)}
                  {idx === activeLaneAOrder.length - 1 && renderInsertionIndicator('laneA', activeLaneAOrder.length)}
                </React.Fragment>
              ))
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
                  assignedModulation={modulationRoutes['bus-master-a']}
                  liveModOffset={computeLiveModOffset('bus-master-a')}
                  onChange={val => onEffectsChange?.({ busLevelA: val })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'bus-master-a', label: 'BUS A Master Level' })
                  }
                />
              </div>
            </div>
          </div>

          {/* Section: LANE B BUS */}
          <div
            className="flex flex-col gap-3 mt-1"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={handleDropOnLane('laneB')}
            onClick={handleTapPlaceOnLane('laneB')}
          >
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
                
              </div>
            </div>

            {addModuleLane === 'laneB' && renderAddModuleModal('laneB')}

            {activeLaneBOrder.length === 0 ? (
              <div className={`p-4 rounded-lg border border-dashed text-center text-xs font-mono flex flex-col items-center gap-2 ${isDark ? 'border-neutral-800 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}>
                <span>LANE B 空 · 可迁移或新增</span>
                <button
                  type="button"
                  onClick={() => setAddModuleLane('laneB')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
                    isDark ? 'border-teal-500/30 bg-teal-950/30 text-teal-400 hover:bg-teal-900/40' : 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                  <span>新增模块</span>
                </button>
              </div>
            ) : (
              activeLaneBOrder.map((effectId, idx) => (
                <React.Fragment key={`laneB-${effectId}`}>
                  {renderInsertionIndicator('laneB', idx)}
                  {renderEffectCard(effectId, 'laneB', idx, activeLaneBOrder.length)}
                  {idx === activeLaneBOrder.length - 1 && renderInsertionIndicator('laneB', activeLaneBOrder.length)}
                </React.Fragment>
              ))
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
                  assignedModulation={modulationRoutes['bus-master-b']}
                  liveModOffset={computeLiveModOffset('bus-master-b')}
                  onChange={val => onEffectsChange?.({ busLevelB: val })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'bus-master-b', label: 'BUS B Master Level' })
                  }
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
        onClose={() => {
          setIsWavetableDrawerOpen(false);
          setActiveWavetableDrawerSource(null);
        }}
        title="选择波表"
        items={wavetableDrawerItems}
        selectedId={String(
          (activeWavetableDrawerSource && activeWavetableDrawerSource !== 'oscA'
            ? channelStrip.instances?.[activeWavetableDrawerSource]?.wavetableIndex
            : channelStrip.oscA.wavetableIndex) ?? 0
        )}
        onSelect={id => {
          const idx = parseInt(id, 10);
          if (!activeWavetableDrawerSource || activeWavetableDrawerSource === 'oscA') {
            onChannelStripChange?.({
              oscA: {
                wavetableIndex: idx
              }
            });
          } else {
            const currentInst = channelStrip.instances?.[activeWavetableDrawerSource] || { ...DEFAULT_OSC_A_PARAMS, ...DEFAULT_CHANNEL_STRIP.oscA };
            onChannelStripChange?.({
              instances: {
                [activeWavetableDrawerSource]: {
                  ...currentInst,
                  wavetableIndex: idx
                }
              }
            });
          }
          setActiveWavetableDrawerSource(null);
        }}
      />
    </div>
  );
};
