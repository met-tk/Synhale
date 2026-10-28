import React from 'react';
import { Wind, Power } from 'lucide-react';
import {
  ChannelStripParams,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  SoundSourceId,
  LaneId,
  SoundSourceType,
  NoiseType,
  OscBParams
} from '../../../types';
import { DEFAULT_CHANNEL_STRIP } from '../../../audio/engine';
import { Knob } from '../knob';
import { BipolarFader } from '../fader';
import { SourceRouteSelector } from './HardwareDeck';

export interface OscBCardProps {
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

export const OscBCard: React.FC<OscBCardProps> = ({
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
  const typeName = 'OSC B Pink Noise';
  const typeCn = isInstance ? '粉红气流噪声 (克隆通道)' : '粉红气流噪声';

  const oscBParams = sourceId === 'oscB'
    ? channelStrip.oscB
    : { ...DEFAULT_CHANNEL_STRIP.oscB, ...(channelStrip.instances?.[sourceId] || {}) };

  const updateOscB = (partial: DeepPartial<OscBParams>) => {
    if (sourceId === 'oscB') {
      onChannelStripChange?.({ oscB: partial });
    } else {
      onChannelStripChange?.({
        instances: {
          [sourceId]: {
            ...oscBParams,
            ...partial
          }
        }
      });
    }
  };

  const isBypass = Boolean(oscBParams.bypass);
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
        onDragStart={onSourceDragStart(sourceId, 'oscB', `${typeName}${instanceSuffix}`)}
        onDragEnd={onDragEnd}
        onClick={onSourceTapLift?.(sourceId, 'oscB', `${typeName}${instanceSuffix}`)}
        title="拖至上方复制或删除"
        className={`flex items-center justify-between mb-3 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
      >
        <div className="flex items-center gap-2">
          <Wind size={14} strokeWidth={1.5} className="text-violet-400" />
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

        <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
          {/* Source Route Capsule Selector */}
          <SourceRouteSelector
            sourceId={sourceId as SoundSourceId}
            sourceLabel={isInstance ? `OSC B #${sourceId.split('_')[1]}` : 'OSC B'}
            currentLane={route}
            onChange={onSourceRouteChange}
            isDark={isDark}
          />

          {/* Noise Type selector buttons */}
          {[
            { type: 'pink' as NoiseType, label: '粉噪' },
            { type: 'white' as NoiseType, label: '白噪' },
            { type: 'brown' as NoiseType, label: '红噪' },
            { type: 'violet' as NoiseType, label: '紫噪' }
          ].map(nt => {
            const currentNoiseType = oscBParams.noiseType ?? 'pink';
            const isSelected = currentNoiseType === nt.type;
            return (
              <button
                key={nt.type}
                type="button"
                onClick={() => updateOscB({ noiseType: nt.type })}
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
            onClick={() => updateOscB({ bypass: !isBypass })}
            aria-label={isInstance ? `${typeName}${instanceSuffix} Bypass` : 'OSC B Bypass'}
            className={getPowerButtonClass(isBypass)}
          >
            <Power size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Controls Row: Knob Matrix + Independent Channel Fader Bay */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className={`flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center justify-items-center p-2 rounded-lg border ${innerGridClass}`}>
          <Knob
            id={isInstance ? `${sourceId}-color` : "oscb-color"}
            label="Airway Color"
            value={oscBParams.color}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['oscb-color']}
            liveModOffset={computeLiveModOffset('oscb-color')}
            onChange={val => updateOscB({ color: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'oscb-color', label: 'Airway Color' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-friction` : "oscb-friction"}
            label="Friction (Q)"
            value={oscBParams.friction}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['oscb-friction']}
            liveModOffset={computeLiveModOffset('oscb-friction')}
            onChange={val => updateOscB({ friction: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'oscb-friction', label: 'Noise Friction' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-lowcut` : "oscb-lowcut"}
            label="Low Cut"
            value={oscBParams.lowCut ?? 80}
            min={20}
            max={3000}
            step={5}
            unit="Hz"
            formatValue={v => `${Math.round(v)} Hz`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['oscb-lowcut']}
            liveModOffset={computeLiveModOffset('oscb-lowcut')}
            onChange={val => updateOscB({ lowCut: Math.round(val) })}
            onLongPress={() =>
              setActiveModTarget({ id: 'oscb-lowcut', label: 'Noise Low Cut' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-motion` : "oscb-motion"}
            label="Motion"
            value={oscBParams.motion ?? 0.2}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['oscb-motion']}
            liveModOffset={computeLiveModOffset('oscb-motion')}
            onChange={val => updateOscB({ motion: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'oscb-motion', label: 'Airflow Motion' })
            }
          />
        </div>

        <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
          <BipolarFader
            id={isInstance ? `${sourceId}-gain` : "oscb-gain"}
            label="Level"
            value={oscBParams.gain}
            min={0}
            max={1}
            bipolar={false}
            height={115}
            assignedModulation={modulationRoutes['oscb-gain']}
            liveModOffset={computeLiveModOffset('oscb-gain')}
            onChange={val => updateOscB({ gain: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'oscb-gain', label: 'OSC B Level' })
            }
          />
        </div>
      </div>
    </div>
  );
};
