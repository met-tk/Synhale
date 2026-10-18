/**
 * Synhale 2 - SignalFlowGraph
 * 
 * Semi-modular synthesis audio signal routing & topological overview.
 * Visualizes sound sources parallel summing & multi-lane routing,
 * processing chain order (Lane A / Lane B / Thru), dynamic bypass routing,
 * and live photon signal flow.
 * 
 * Strict industrial aesthetic: 100% zero emoji, 1px precision borders, high contrast.
 */

import React from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ChannelStripParams,
  EffectsChainParams,
  LaneId,
  SoundSourceId,
  SourceRouteMap,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  getEffectModuleType,
  getDefaultEffectParams,
  EffectModuleType
} from '../../../types/audio';

export interface SignalFlowGraphProps {
  channelStrip: ChannelStripParams;
  effects: EffectsChainParams;
  isPlaying?: boolean;
  isDark?: boolean;
  className?: string;
  effectOrder?: string[];
  onReorderEffects?: (newOrder: string[]) => void;
  // Multi-Lane Routing Extensions
  sourceRoutes?: SourceRouteMap;
  onSourceRouteChange?: (sourceId: SoundSourceId, lane: LaneId) => void;
  laneAOrder?: string[];
  laneBOrder?: string[];
  onLaneReorder?: (lane: 'laneA' | 'laneB', newOrder: string[]) => void;
  onMoveEffectBetweenLanes?: (effectId: string, fromLane: 'laneA' | 'laneB', toLane: 'laneA' | 'laneB') => void;
}

export const SignalFlowGraph: React.FC<SignalFlowGraphProps> = ({
  channelStrip,
  effects,
  isPlaying = false,
  isDark = true,
  className = '',
  effectOrder,
  onReorderEffects,
  sourceRoutes: propsSourceRoutes,
  onSourceRouteChange,
  laneAOrder: propsLaneAOrder,
  laneBOrder: propsLaneBOrder,
  onLaneReorder,
  onMoveEffectBetweenLanes
}) => {
  // Source active states
  const oscAActive = !channelStrip.oscA.bypass;
  const granularActive = !(channelStrip.granular?.bypass ?? false);
  const oscBActive = !channelStrip.oscB.bypass;
  const droneActive = !channelStrip.drone.bypass;
  const ambientActive = !(channelStrip.ambient?.bypass ?? true);

  // Effects active states
  const gainActive = !(effects.gain?.bypass ?? false);
  const driveActive = !effects.drive.bypass;
  const filterActive = !effects.filter.bypass;
  const eqActive = !(effects.eq?.bypass ?? false);
  const adsrActive = !(effects.adsr?.bypass ?? false);
  const delayActive = !effects.delay.bypass;
  const reverbActive = !effects.reverb.bypass;
  const lfoActive = !(effects.lfo?.bypass ?? false);

  const isEffectActive = (id: string): boolean => {
    if (effects.instances && effects.instances[id] && effects.instances[id].bypass !== undefined) {
      return !effects.instances[id].bypass;
    }
    const baseType = getEffectModuleType(id);
    switch (baseType) {
      case 'gain': return gainActive;
      case 'drive': return driveActive;
      case 'filter': return filterActive;
      case 'eq': return eqActive;
      case 'adsr': return adsrActive;
      case 'delay': return delayActive;
      case 'reverb': return reverbActive;
      case 'lfo': return lfoActive;
      default: return false;
    }
  };

  // Total signal flow state (at least one source active and playing)
  const isSignalFlowing = isPlaying && (oscAActive || granularActive || oscBActive || droneActive || ambientActive);

  // Active routes mapping
  const sourceRoutes: SourceRouteMap = propsSourceRoutes ?? effects.sourceRoutes ?? DEFAULT_SOURCE_ROUTES;
  const laneAOrder: string[] = propsLaneAOrder ?? effects.laneAOrder ?? DEFAULT_LANE_A_ORDER;
  const laneBOrder: string[] = propsLaneBOrder ?? effects.laneBOrder ?? DEFAULT_LANE_B_ORDER;

  // Single-lane compatibility fallback
  const isMultiLaneMode = Boolean(propsLaneBOrder || effects.laneBOrder || onLaneReorder || propsSourceRoutes);
  const singleLaneOrder = effectOrder ?? ['gain', 'drive', 'filter', 'eq', 'adsr', 'delay', 'reverb'];

  // Common node style builder
  const getNodeClass = (isActive: boolean) => {
    if (isActive) {
      return isDark
        ? 'border-sky-500/70 bg-[#090b10] text-slate-100 shadow-[0_0_10px_rgba(56,189,248,0.08)]'
        : 'border-sky-400 bg-white text-neutral-800 shadow-xs';
    }
    return isDark
      ? 'border-neutral-800/80 bg-neutral-950/60 text-slate-500 border-dashed'
      : 'border-neutral-300 bg-neutral-100/70 text-neutral-400 border-dashed';
  };

  const getLedClass = (isActive: boolean) => {
    if (!isActive) return isDark ? 'bg-neutral-700' : 'bg-neutral-400';
    return isSignalFlowing ? 'bg-cyan-400 shadow-[0_0_6px_#38bdf8] animate-pulse' : 'bg-emerald-500';
  };

  // Lane A/B Reorder Handlers
  const handleMoveInLane = (lane: 'laneA' | 'laneB', index: number, direction: 'left' | 'right') => {
    const order = lane === 'laneA' ? [...laneAOrder] : [...laneBOrder];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;

    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;

    if (onLaneReorder) {
      onLaneReorder(lane, order);
    } else if (lane === 'laneA' && onReorderEffects) {
      onReorderEffects(order);
    }
  };

  // Single-chain legacy move handlers
  const handleSingleMoveLeft = (index: number) => {
    if (index <= 0 || !onReorderEffects) return;
    const newOrder = [...singleLaneOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    onReorderEffects(newOrder);
  };

  const handleSingleMoveRight = (index: number) => {
    if (index >= singleLaneOrder.length - 1 || !onReorderEffects) return;
    const newOrder = [...singleLaneOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    onReorderEffects(newOrder);
  };

  const renderReorderButton = (
    direction: 'left' | 'right',
    title: string,
    index: number,
    lane?: 'laneA' | 'laneB'
  ) => {
    const isLeft = direction === 'left';
    const onClick = () => {
      if (lane) {
        handleMoveInLane(lane, index, direction);
      } else {
        if (isLeft) handleSingleMoveLeft(index);
        else handleSingleMoveRight(index);
      }
    };

    return (
      <button
        type="button"
        aria-label={`Move ${title} ${isLeft ? 'Left' : 'Right'}`}
        data-touch-target="44px"
        onClick={onClick}
        className="relative inline-flex items-center justify-center w-5 h-5 -m-1 text-slate-400 hover:text-sky-400 cursor-pointer touch-manipulation focus:outline-none before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[44px] before:h-[44px] before:min-w-[44px] before:min-h-[44px]"
      >
        {isLeft ? <ChevronLeft size={9} strokeWidth={2} /> : <ChevronRight size={9} strokeWidth={2} />}
      </button>
    );
  };

  const getModuleParams = (targetId: string, type: EffectModuleType): any => {
    if (effects.instances && effects.instances[targetId]) {
      return effects.instances[targetId];
    }
    if ((effects as any)[targetId]) {
      return (effects as any)[targetId];
    }
    if (targetId === type && (effects as any)[type]) {
      return (effects as any)[type];
    }
    return (effects as any)[type] || getDefaultEffectParams(type);
  };

  const renderEffectNode = (id: string, index: number, lane?: 'laneA' | 'laneB', totalInLane?: number) => {
    const active = isEffectActive(id);
    const orderLength = totalInLane ?? singleLaneOrder.length;
    const canMoveLeft = index > 0;
    const canMoveRight = index < orderLength - 1;
    const baseType = getEffectModuleType(id);
    const instanceSuffix = id.includes('_') ? ` #${id.split('_')[1]}` : '';

    let title = '';
    let centerContent: React.ReactNode = null;
    let bottomBadge = '';

    switch (baseType) {
      case 'gain': {
        const gainParams = getModuleParams(id, 'gain');
        title = 'PREAMP';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto">
            {(gainParams?.value ?? 0) >= 0 ? `+${(gainParams?.value ?? 0).toFixed(1)}` : (gainParams?.value ?? 0).toFixed(1)}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">dB</span>
          </div>
        );
        bottomBadge = gainParams?.softClip !== false ? 'SOFT-CLIP' : 'CLEAN';
        break;
      }
      case 'drive': {
        const driveParams = getModuleParams(id, 'drive');
        title = 'DRIVE';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto">
            {Math.round((driveParams?.amount ?? 0) * 100)}%
          </div>
        );
        bottomBadge = '4X OVERSAMP';
        break;
      }
      case 'filter': {
        const filterParams = getModuleParams(id, 'filter');
        title = 'FILTER';
        const cutoff = filterParams?.cutoff ?? 2000;
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto truncate">
            {cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)}k` : `${Math.round(cutoff)}`}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">Hz</span>
          </div>
        );
        bottomBadge = String(filterParams?.type ?? 'lowpass').toUpperCase();
        break;
      }
      case 'eq': {
        const eqParams = getModuleParams(id, 'eq');
        title = 'EQ';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto truncate">
            {eqParams ? `${eqParams.midLow?.frequency ?? 432}` : '432'}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">Hz</span>
          </div>
        );
        bottomBadge = eqParams?.low?.type === 'highpass' ? 'HP+3B' : 'SHELF+2P';
        break;
      }
      case 'adsr': {
        title = 'ADSR';
        centerContent = <div className="text-[10px] font-semibold text-center my-auto">VCA</div>;
        bottomBadge = active ? 'ENVELOPE' : 'BYPASS';
        break;
      }
      case 'lfo': {
        const lfoParams = getModuleParams(id, 'lfo');
        const lfo1 = lfoParams?.lfo1 ?? effects.lfo1;
        title = 'LFO';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto">
            {lfo1?.rate ? `${lfo1.rate.toFixed(2)}` : 'DUAL'}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">Hz</span>
          </div>
        );
        bottomBadge = String(lfo1?.shape ?? 'SINE').toUpperCase();
        break;
      }
      case 'delay': {
        const delayParams = getModuleParams(id, 'delay');
        title = 'DELAY';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto">
            {(delayParams?.time ?? 0.35).toFixed(2)}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">s</span>
          </div>
        );
        bottomBadge = `WET ${Math.round((delayParams?.mix ?? 0.3) * 100)}%`;
        break;
      }
      case 'reverb': {
        const reverbParams = getModuleParams(id, 'reverb');
        title = 'REVERB';
        centerContent = (
          <div className="text-[10px] font-semibold text-center my-auto">
            {(reverbParams?.decayTime ?? 3.5).toFixed(1)}
            <span className="text-[7.5px] font-normal opacity-70 ml-0.5">s</span>
          </div>
        );
        bottomBadge = `WET ${Math.round((reverbParams?.mix ?? 0.35) * 100)}%`;
        break;
      }
      default:
        return null;
    }

    const readableTitle = title.charAt(0) + title.slice(1).toLowerCase();

    return (
      <div
        key={`${lane ?? 'single'}-${id}`}
        className={`group relative flex flex-col justify-between p-1.5 rounded border text-[9px] font-mono h-14 transition-all ${getNodeClass(active)}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[8px] uppercase">{title === 'EQ' ? `EQ 4-BAND${instanceSuffix}` : `${title}${instanceSuffix}`}</span>
          <div className="flex items-center gap-1">
            {lane && onMoveEffectBetweenLanes && (
              <button
                type="button"
                onClick={() => onMoveEffectBetweenLanes(id, lane, lane === 'laneA' ? 'laneB' : 'laneA')}
                aria-label={`Transfer ${readableTitle} to ${lane === 'laneA' ? 'Lane B' : 'Lane A'}`}
                title={`Transfer to ${lane === 'laneA' ? 'Lane B' : 'Lane A'}`}
                className="text-[7px] px-0.5 rounded border border-neutral-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-300"
              >
                {lane === 'laneA' ? '→B' : '←A'}
              </button>
            )}
            <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(active)}`} />
          </div>
        </div>
        {centerContent}
        <div className="flex items-center justify-between text-[7.5px] opacity-60">
          {canMoveLeft ? (
            renderReorderButton('left', readableTitle, index, lane)
          ) : (
            <span className="w-2" />
          )}
          <span className="truncate mx-auto">{bottomBadge}</span>
          {canMoveRight ? (
            renderReorderButton('right', readableTitle, index, lane)
          ) : (
            <span className="w-2" />
          )}
        </div>
      </div>
    );
  };

  // Route indicator badge helper
  const renderRouteBadge = (sourceId: SoundSourceId) => {
    const current = sourceRoutes[sourceId] ?? 'laneA';
    if (!onSourceRouteChange) {
      return (
        <span className="text-[7.5px] px-1 py-0.2 rounded border border-neutral-700 font-mono text-cyan-400">
          {current === 'laneA' ? 'BUS A' : current === 'laneB' ? 'BUS B' : 'THRU'}
        </span>
      );
    }

    return (
      <div className="inline-flex items-center gap-0.5" role="group" aria-label={`${sourceId} Bus Routing`}>
        {(['laneA', 'laneB', 'thru'] as LaneId[]).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => onSourceRouteChange(sourceId, l)}
            className={`px-1 py-0.2 rounded text-[7px] font-mono transition-colors cursor-pointer ${
              current === l
                ? l === 'laneA'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 font-bold'
                  : l === 'laneB'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 font-bold'
                    : 'bg-slate-700/40 text-slate-300 border border-slate-600 font-bold'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {l === 'laneA' ? 'A' : l === 'laneB' ? 'B' : 'T'}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      role="region"
      aria-label="Synthesizer Signal Flow Architecture"
      className={`rounded-xl border p-2.5 transition-colors select-none ${
        isDark
          ? 'border-neutral-800/90 bg-[#07080c]/90'
          : 'border-neutral-200 bg-slate-50/80 shadow-xs'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
        <div className="flex items-center gap-2">
          <Activity size={12} strokeWidth={1.5} className="text-cyan-400" />
          <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-cyan-400">
            AUDIO ROUTING ARCHITECTURE · 多链路动态分轨拓扑
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSignalFlowing ? 'bg-cyan-400 animate-pulse' : isDark ? 'bg-neutral-600' : 'bg-neutral-400'
              }`}
            />
            <span className={isDark ? 'text-slate-400' : 'text-neutral-500'}>
              {isSignalFlowing ? 'SIGNAL STREAMING' : isPlaying ? 'MUTED / BYPASS' : 'IDLE'}
            </span>
          </div>
          <span className={isDark ? 'text-slate-500' : 'text-neutral-400'}>
            MULTI-BUS MATRIX &gt; MODULAR DSP LANES
          </span>
        </div>
      </div>

      {/* Interactive Topology Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
        {/* Branch 1: 5 Sound Sources (Parallel Summing / Multi-Bus Source Deck) - 3 cols */}
        <div className="md:col-span-3 flex flex-col gap-1">
          {/* Source A */}
          <div className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(oscAActive)}`}>
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(oscAActive)}`} />
              <span className="font-semibold">OSC A</span>
              <span className="text-[7.5px] opacity-70">WAVETABLE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-medium opacity-60">S{channelStrip.oscA.wavetableIndex.toString().padStart(2, '0')}</span>
              {renderRouteBadge('oscA')}
            </div>
          </div>

          {/* Granular Source */}
          <div className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(granularActive)}`}>
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(granularActive)}`} />
              <span className="font-semibold">GRAIN</span>
              <span className="text-[7.5px] opacity-70">CLOUD</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-medium opacity-60">
                {channelStrip.granular?.density ?? 4}V
              </span>
              {renderRouteBadge('granular')}
            </div>
          </div>

          {/* Source B */}
          <div className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(oscBActive)}`}>
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(oscBActive)}`} />
              <span className="font-semibold">OSC B</span>
              <span className="text-[7.5px] opacity-70">NOISE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-medium opacity-60">{Math.round((channelStrip.oscB.gain ?? 0.35) * 100)}%</span>
              {renderRouteBadge('oscB')}
            </div>
          </div>

          {/* Sub Drone */}
          <div className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(droneActive)}`}>
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(droneActive)}`} />
              <span className="font-semibold">SUB</span>
              <span className="text-[7.5px] opacity-70">432Hz</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-medium opacity-60">{channelStrip.drone.baseFreq ?? 54}Hz</span>
              {renderRouteBadge('drone')}
            </div>
          </div>

          {/* Ambient Soundscape Source */}
          <div className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(ambientActive)}`}>
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${getLedClass(ambientActive)}`} />
              <span className="font-semibold">NATURE</span>
              <span className="text-[7.5px] opacity-70">AMBIENT</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-medium opacity-60">
                {Math.round((channelStrip.ambient?.gain ?? 0.5) * 100)}%
              </span>
              {renderRouteBadge('ambient')}
            </div>
          </div>
        </div>

        {/* Summing Bus Connector: 5 Independent Paths Reflecting Source Bypass States */}
        <div className="hidden md:flex md:col-span-1 items-center justify-center">
          <div className="flex flex-col items-center gap-0.5">
            <svg width={30} height={66} viewBox="0 0 30 66" className="overflow-visible" aria-label="Parallel Sound Sources Summing Bus">
              <defs>
                <style>{`
                  @keyframes photonStream {
                    from { stroke-dashoffset: 14; }
                    to { stroke-dashoffset: 0; }
                  }
                  .photon-stream {
                    animation: photonStream 0.65s linear infinite;
                  }
                `}</style>
              </defs>
              {[
                { id: 'oscA', name: 'OSC A', y: 6, active: isPlaying && oscAActive, route: sourceRoutes.oscA },
                { id: 'granular', name: 'GRAIN', y: 19, active: isPlaying && granularActive, route: sourceRoutes.granular },
                { id: 'oscB', name: 'OSC B', y: 32, active: isPlaying && oscBActive, route: sourceRoutes.oscB },
                { id: 'drone', name: 'SUB', y: 45, active: isPlaying && droneActive, route: sourceRoutes.drone },
                { id: 'ambient', name: 'AMBIENT', y: 58, active: isPlaying && ambientActive, route: sourceRoutes.ambient }
              ].map(src => {
                const strokeColor = src.active
                  ? src.route === 'laneB'
                    ? '#2dd4bf'
                    : src.route === 'thru'
                      ? '#94a3b8'
                      : '#38bdf8'
                  : isDark
                    ? '#262626'
                    : '#cbd5e1';

                const targetY = isMultiLaneMode && laneBOrder.length > 0
                  ? src.route === 'laneB'
                    ? 44
                    : src.route === 'thru'
                      ? 33
                      : 20
                  : 33;

                return (
                  <path
                    key={src.id}
                    data-testid={`bus-path-${src.id}`}
                    data-active={src.active ? 'true' : 'false'}
                    d={`M 2 ${src.y} C 16 ${src.y}, 16 ${targetY}, 28 ${targetY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={src.active ? 1.6 : 1.0}
                    strokeDasharray={src.active ? '3 3' : 'none'}
                    className={src.active ? 'photon-stream' : ''}
                  />
                );
              })}
            </svg>
            <span className={`text-[7.5px] font-mono uppercase tracking-tighter ${isSignalFlowing ? 'text-cyan-400 font-semibold' : 'text-slate-500'}`}>
              BUS
            </span>
          </div>
        </div>

        {/* Branch 2: Processing Chain Pipeline (Dual-Lane Multi-Chain or Legacy Single-Chain Grid) - 8 cols */}
        {isMultiLaneMode && laneBOrder.length > 0 ? (
          <div className="md:col-span-8 flex flex-col gap-1.5">
            {/* Lane A: Core Tone & Shaper Strip */}
            <div className="flex items-center gap-1.5 p-1 rounded border border-sky-900/30 bg-sky-950/10">
              <span className="text-[8px] font-mono font-bold text-sky-400 px-1 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 shrink-0">
                LANE A ({Math.round((effects.busLevelA ?? 1.0) * 100)}%)
              </span>
              <div className="grid grid-cols-5 gap-1 flex-1 items-center">
                {laneAOrder.map((id, index) => renderEffectNode(id, index, 'laneA', laneAOrder.length))}
              </div>
            </div>

            {/* Lane B: Space & Ambient Strip + Master Sum Output */}
            <div className="flex items-center gap-1.5 p-1 rounded border border-teal-900/30 bg-teal-950/10">
              <span className="text-[8px] font-mono font-bold text-teal-400 px-1 py-0.5 rounded bg-teal-950/60 border border-teal-800/40 shrink-0">
                LANE B ({Math.round((effects.busLevelB ?? 1.0) * 100)}%)
              </span>
              <div className="grid grid-cols-5 gap-1 flex-1 items-center">
                {laneBOrder.map((id, index) => renderEffectNode(id, index, 'laneB', laneBOrder.length))}
                {/* Out Master Node */}
                <div
                  className={`flex flex-col justify-between p-1.5 rounded border text-[9px] font-mono h-14 transition-all ${
                    isDark
                      ? 'border-emerald-500/70 bg-[#090b10] text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.08)]'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[8px] uppercase">SUM OUT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                  </div>
                  <div className="text-[10px] font-bold text-center my-auto">
                    {Math.round(effects.masterGain * 100)}%
                  </div>
                  <span className="text-[7.5px] opacity-70 text-center truncate font-mono">
                    {effects.busMix !== undefined
                      ? `MIX ${Math.round((1 - effects.busMix) * 100)}A/${Math.round(effects.busMix * 100)}B`
                      : 'LIMITER ON'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-8 grid grid-cols-8 gap-1 items-center">
            {singleLaneOrder.map((id, index) => renderEffectNode(id, index))}

            {/* Master Output */}
            <div
              className={`flex flex-col justify-between p-1.5 rounded border text-[9px] font-mono h-14 transition-all ${
                isDark
                  ? 'border-emerald-500/70 bg-[#090b10] text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.08)]'
                  : 'border-emerald-500 bg-emerald-50 text-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[8px] uppercase">OUT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
              </div>
              <div className="text-[10px] font-bold text-center my-auto">
                {Math.round(effects.masterGain * 100)}%
              </div>
              <span className="text-[7.5px] opacity-70 text-center truncate">LIMITER ON</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
