import React from 'react';
import { Disc, Power } from 'lucide-react';
import {
  ChannelStripParams,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  SoundSourceId,
  LaneId,
  SoundSourceType,
  DroneParams
} from '../../../types';
import { DEFAULT_CHANNEL_STRIP } from '../../../audio/engine';
import { Knob } from '../knob';
import { BipolarFader } from '../fader';
import { SourceRouteSelector } from './HardwareDeck';

export interface DroneCardProps {
  sourceId: string;
  channelStrip: ChannelStripParams;
  onChannelStripChange?: (params: DeepPartial<ChannelStripParams>) => void;
  activeSourceRoutes: Record<string, LaneId>;
  onSourceRouteChange?: (sourceId: SoundSourceId, lane: LaneId) => void;
  modulationRoutes: Record<string, ModulationRoute>;
  computeLiveModOffset: (targetId: string) => number;
  setActiveModTarget: (target: { id: string; label: string } | null) => void;
  breathStage?: BreathStage;
  isDark: boolean;
  draggingItem?: any;
  onSourceDragStart: (sourceId: string, sourceType: SoundSourceType, sourceName: string) => (e: React.DragEvent) => void;
  /** 触屏「点击托举」处理器（tap-to-carry 替代 HTML5 拖拽） */
  onSourceTapLift?: (sourceId: string, sourceType: SoundSourceType, sourceName: string) => (e: React.MouseEvent) => void;
  onDragEnd: () => void;
}

export const DroneCard: React.FC<DroneCardProps> = ({
  sourceId,
  channelStrip,
  onChannelStripChange,
  activeSourceRoutes,
  onSourceRouteChange,
  modulationRoutes,
  computeLiveModOffset,
  setActiveModTarget,
  breathStage = 'inhale',
  isDark,
  draggingItem,
  onSourceDragStart,
  onSourceTapLift,
  onDragEnd
}) => {
  const isInstance = sourceId.includes('_');
  const instanceSuffix = isInstance ? ` #${sourceId.split('_')[1]}` : '';
  const typeName = 'Sub / Drone (432Hz)';
  const typeCn = isInstance ? '次谐波低频基底 (克隆通道)' : '次谐波低频基底';

  const droneParams = sourceId === 'drone'
    ? channelStrip.drone
    : { ...DEFAULT_CHANNEL_STRIP.drone, ...(channelStrip.instances?.[sourceId] || {}) };

  const updateDrone = (partial: DeepPartial<DroneParams>) => {
    if (sourceId === 'drone') {
      onChannelStripChange?.({ drone: partial });
    } else {
      onChannelStripChange?.({
        instances: {
          [sourceId]: {
            ...droneParams,
            ...partial
          }
        }
      });
    }
  };

  const isBypass = Boolean(droneParams.bypass);
  const route = activeSourceRoutes[sourceId] ?? 'laneA';

  const cardContainerClass = isDark ? 'border-neutral-800 bg-[#07080c]/90' : 'border-neutral-200 bg-white/90 shadow-sm';
  const cardHeaderBorderClass = isDark ? 'border-neutral-800/80' : 'border-neutral-200';
  const cardTitleClass = isDark ? 'text-slate-200' : 'text-neutral-800';
  const cardSubTitleClass = isDark ? 'text-slate-400' : 'text-neutral-500';
  const innerGridClass = isDark ? 'bg-neutral-900/40 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200';
  const faderBayClass = isDark ? 'border-neutral-800/80 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50';

  const getPowerButtonClass = (bypass: boolean) =>
    `p-1.5 rounded transition-colors ${
      isDark
        ? bypass
          ? 'bg-neutral-900 text-slate-500 border border-neutral-800 hover:text-slate-300'
          : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900/60'
        : bypass
        ? 'bg-neutral-100 text-neutral-400 border border-neutral-300 hover:text-neutral-600'
        : 'bg-emerald-50 text-emerald-600 border border-emerald-300 hover:bg-emerald-100'
    }`;

  return (
    <div
      key={sourceId}
      data-testid={`sound-source-${sourceId}`}
      className={`relative rounded-lg border p-3 transition-opacity ${cardContainerClass} ${
        isBypass ? 'opacity-40' : 'opacity-100'
      } ${
        draggingItem?.sourceId === sourceId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
      }`}
    >
      {/* Strip Header */}
      <div
        draggable={true}
        onDragStart={onSourceDragStart(sourceId, 'drone', `${typeName}${instanceSuffix}`)}
        onDragEnd={onDragEnd}
        onClick={onSourceTapLift?.(sourceId, 'drone', `${typeName}${instanceSuffix}`)}
        title="拖至上方复制或删除"
        className={`flex items-center justify-between mb-3 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
      >
        <div className="flex items-center gap-2">
          <Disc size={14} strokeWidth={1.5} className="text-indigo-400" />
          <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
            {typeName}{instanceSuffix}
          </span>
          <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
            {typeCn}
          </span>
          <div
            aria-hidden="true"
            className={`w-2 h-2 rounded-full ${
              isBypass ? 'bg-slate-700' : 'bg-emerald-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          {/* Source Route Capsule Selector */}
          <SourceRouteSelector
            sourceId={sourceId as SoundSourceId}
            sourceLabel={isInstance ? `Drone #${sourceId.split('_')[1]}` : 'Sub Drone'}
            currentLane={route}
            onChange={onSourceRouteChange}
            isDark={isDark}
          />

          <button
            type="button"
            onClick={() => updateDrone({ bypass: !isBypass })}
            aria-label={isInstance ? `${typeName}${instanceSuffix} Bypass` : 'Drone Bypass'}
            className={getPowerButtonClass(isBypass)}
          >
            <Power size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Controls Row: Drone Knobs + Independent Channel Fader Bay */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className={`flex-1 grid grid-cols-2 gap-2.5 items-center justify-items-center p-2 rounded-lg border ${innerGridClass}`}>
          <Knob
            id={isInstance ? `${sourceId}-basefreq` : "drone-basefreq"}
            label="Base Freq"
            value={droneParams.baseFreq}
            min={20}
            max={200}
            step={0.5}
            unit=" Hz"
            formatValue={v => `${v.toFixed(1)} Hz`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['drone-basefreq']}
            liveModOffset={computeLiveModOffset('drone-basefreq')}
            onChange={val => updateDrone({ baseFreq: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'drone-basefreq', label: 'Drone Base Freq' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-drift` : "drone-drift"}
            label="Pitch Drift"
            value={droneParams.pitchDrift}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['drone-drift']}
            liveModOffset={computeLiveModOffset('drone-drift')}
            onChange={val => updateDrone({ pitchDrift: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'drone-drift', label: 'Pitch Drift' })
            }
          />
        </div>

        <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
          <BipolarFader
            id={isInstance ? `${sourceId}-gain` : "drone-gain"}
            label="Level"
            value={droneParams.gain}
            min={0}
            max={1}
            bipolar={false}
            height={115}
            assignedModulation={modulationRoutes['drone-gain']}
            liveModOffset={computeLiveModOffset('drone-gain')}
            onChange={val => updateDrone({ gain: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'drone-gain', label: 'Drone Level' })
            }
          />
        </div>
      </div>
    </div>
  );
};
