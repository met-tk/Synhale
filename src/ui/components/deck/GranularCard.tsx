import React from 'react';
import { Sparkles, Power, Disc } from 'lucide-react';
import {
  ChannelStripParams,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  SoundSourceId,
  LaneId,
  SoundSourceType,
  DEFAULT_GRANULAR_PARAMS,
  GranularParams
} from '../../../types';
import { DEFAULT_CHANNEL_STRIP } from '../../../audio/engine';
import type { ParticleVisualGrain } from '../../../audio/nodes/GranularChannel';
import { Knob } from '../knob';
import { BipolarFader } from '../fader';
import { GrainSourceVisualizer } from './GrainSourceVisualizer';
import { GrainEnvelopeScope } from './GrainEnvelopeScope';
import {
  GRANULAR_SAMPLE_LIST,
  GRANULAR_SAMPLE_PRESETS,
  getSampleDuration
} from '../../../audio/nodes/GranularSampleLibrary';
import { SCALE_LIST } from '../../../audio/dsp/scaleQuantizer';
import { SourceRouteSelector } from './HardwareDeck';

export interface GranularCardProps {
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
  isPlaying: boolean;
  getVisualGrains?: () => ParticleVisualGrain[];
  getAudioCurrentTime?: () => number;
  getSampleDuration?: (sampleId: string) => number | null;
}

export const GranularCard: React.FC<GranularCardProps> = ({
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
  onDragEnd,
  isPlaying,
  getVisualGrains,
  getAudioCurrentTime,
  getSampleDuration: propGetSampleDuration
}) => {
  const isInstance = sourceId.includes('_');
  const instanceSuffix = isInstance ? ` #${sourceId.split('_')[1]}` : '';
  const typeName = 'Granular Cloud';
  const typeCn = isInstance ? '粒子发生器 (克隆通道)' : '粒子发生器';

  const granularParams = sourceId === 'granular'
    ? (channelStrip.granular ?? DEFAULT_GRANULAR_PARAMS)
    : { ...DEFAULT_GRANULAR_PARAMS, ...DEFAULT_CHANNEL_STRIP.granular, ...(channelStrip.instances?.[sourceId] || {}) };

  const updateGranular = (partial: DeepPartial<GranularParams>) => {
    if (sourceId === 'granular') {
      onChannelStripChange?.({ granular: partial });
    } else {
      onChannelStripChange?.({
        instances: {
          [sourceId]: {
            ...granularParams,
            ...partial
          }
        }
      });
    }
  };

  const isBypass = Boolean(granularParams.bypass);
  const route = activeSourceRoutes[sourceId] ?? 'laneA';

  const cardContainerClass = isDark ? 'border-neutral-800 bg-[#07080c]/90' : 'border-neutral-200 bg-white/90 shadow-sm';
  const cardHeaderBorderClass = isDark ? 'border-neutral-800/80' : 'border-neutral-200';
  const cardTitleClass = isDark ? 'text-slate-200' : 'text-neutral-800';
  const cardSubTitleClass = isDark ? 'text-slate-400' : 'text-neutral-500';
  const innerCardClass = isDark ? 'bg-neutral-900/50 border-neutral-800/80' : 'bg-neutral-50/80 border-neutral-200';
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

  const sampleDurationGetter = propGetSampleDuration ?? getSampleDuration;

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
        onDragStart={onSourceDragStart(sourceId, 'granular', `${typeName}${instanceSuffix}`)}
        onDragEnd={onDragEnd}
        onClick={onSourceTapLift?.(sourceId, 'granular', `${typeName}${instanceSuffix}`)}
        title="拖至上方复制或删除"
        className={`flex items-center justify-between mb-3 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={1.5} className="text-emerald-400" />
          <span className={`text-xs font-medium tracking-wide uppercase ${cardTitleClass}`}>
            {typeName}{instanceSuffix}
          </span>
          <span className={`text-[10px] font-normal ${cardSubTitleClass}`}>
            {typeCn}
          </span>
          {/* Active LED */}
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
            sourceLabel={isInstance ? `Granular #${sourceId.split('_')[1]}` : 'Granular'}
            currentLane={route}
            onChange={onSourceRouteChange}
            isDark={isDark}
          />

          {/* Bypass Toggle */}
          <button
            type="button"
            onClick={() => updateGranular({ bypass: !isBypass })}
            aria-label={isInstance ? `${typeName}${instanceSuffix} Bypass` : 'Granular Bypass'}
            className={getPowerButtonClass(isBypass)}
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
            sampleId={granularParams.sampleId || 'handpan'}
            position={granularParams.position ?? 0.25}
            positionJitter={granularParams.positionJitter ?? 0.0}
            rangeStart={granularParams.rangeStart ?? 0.0}
            rangeEnd={granularParams.rangeEnd ?? 1.0}
            sampleMetadata={{
              sampleRate: 44100,
              channels: 2,
              duration: sampleDurationGetter(granularParams.sampleId || 'handpan') ?? GRANULAR_SAMPLE_PRESETS[granularParams.sampleId || 'handpan']?.duration ?? 3.6,
              name: GRANULAR_SAMPLE_PRESETS[granularParams.sampleId || 'handpan']?.name ?? 'Handpan'
            }}
            isPlaying={isPlaying}
            bypass={isBypass}
            getLiveGrains={getVisualGrains}
            getAudioCurrentTime={getAudioCurrentTime}
            onPositionChange={val => updateGranular({ position: val })}
            onRangeChange={(rStart, rEnd) => updateGranular({ rangeStart: rStart, rangeEnd: rEnd })}
            onCustomSampleLoaded={id => updateGranular({ sampleId: id })}
            duration={granularParams.duration ?? 0.245}
            height={120}
          />
        </div>
        <div className="w-full md:w-[270px] shrink-0 h-[120px]">
          <GrainEnvelopeScope
            duration={granularParams.duration ?? 0.245}
            envelope={granularParams.grainEnvelope}
            activeGrainsCount={granularParams.density ?? 4.0}
            density={granularParams.density ?? 4.0}
            rate={granularParams.rate ?? 16.3}
            direction={granularParams.direction ?? 'forward'}
            onDirectionChange={dir => updateGranular({ direction: dir })}
            onEnvelopeChange={env => updateGranular({ grainEnvelope: env })}
            onDurationChange={dur => {
              const currentDensity = granularParams.density ?? 4.0;
              const newRate = Number((currentDensity / Math.max(0.01, dur)).toFixed(1));
              updateGranular({ duration: dur, rate: newRate });
            }}
            onDensityChange={dens => updateGranular({ density: dens })}
            onRateChange={rt => updateGranular({ rate: rt })}
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
            采样源
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const curId = granularParams.sampleId || 'handpan';
                const idx = GRANULAR_SAMPLE_LIST.findIndex(s => s.id === curId);
                const prevIdx = (idx - 1 + GRANULAR_SAMPLE_LIST.length) % GRANULAR_SAMPLE_LIST.length;
                updateGranular({ sampleId: GRANULAR_SAMPLE_LIST[prevIdx].id });
              }}
              title="上一个采样"
              aria-label="Previous Sample"
              className={`px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800' : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              &lt;
            </button>
            <select
              value={granularParams.sampleId || 'handpan'}
              onChange={e => updateGranular({ sampleId: e.target.value })}
              aria-label="Granular Sample Source"
              className={`text-[10px] font-mono rounded px-1.5 py-0.5 border outline-none cursor-pointer transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900 text-sky-300 hover:border-neutral-700' : 'border-neutral-200 bg-slate-50 text-sky-700 hover:border-neutral-300'
              }`}
            >
              {GRANULAR_SAMPLE_LIST.map(sample => (
                <option key={sample.id} value={sample.id}>
                  {sample.name} ({sample.category})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const curId = granularParams.sampleId || 'handpan';
                const idx = GRANULAR_SAMPLE_LIST.findIndex(s => s.id === curId);
                const nextIdx = (idx + 1) % GRANULAR_SAMPLE_LIST.length;
                updateGranular({ sampleId: GRANULAR_SAMPLE_LIST[nextIdx].id });
              }}
              title="下一个采样"
              aria-label="Next Sample"
              className={`px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900 text-slate-300 hover:bg-neutral-800' : 'border-neutral-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Playback Controls & Voice Mode */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Playback Direction Switcher */}
          <div className="flex items-center gap-0.5" role="group" aria-label="Playback Direction">
            {(['forward', 'reverse', 'pingpong'] as const).map(dir => (
              <button
                key={dir}
                type="button"
                onClick={() => updateGranular({ direction: dir })}
                aria-pressed={granularParams.direction === dir}
                title={`方向 ${dir}`}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                  granularParams.direction === dir
                    ? 'border-sky-500/60 bg-sky-500/20 text-sky-300 font-medium'
                    : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-slate-400 hover:text-slate-200'
                      : 'border-neutral-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {dir === 'forward' ? 'FWD' : dir === 'reverse' ? 'REV' : 'PEND'}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-3 bg-neutral-800 mx-0.5" />

          {/* Voice Mode Switcher */}
          <div className="flex items-center gap-0.5" role="group" aria-label="Voice Mode">
            {(['ambient', 'arp', 'burst'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => updateGranular({ mode: m })}
                aria-pressed={(granularParams.mode ?? 'ambient') === m}
                title={`发声 ${m}`}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                  (granularParams.mode ?? 'ambient') === m
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-medium'
                    : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-slate-400 hover:text-slate-200'
                      : 'border-neutral-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Harmonic Scale Quantizer Pill Bar */}
      <div className={`mb-3 p-1.5 rounded-lg border transition-colors ${
        isDark ? 'border-neutral-800/80 bg-neutral-950/70' : 'border-neutral-200/80 bg-white/70 shadow-2xs'
      }`}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              调式量化
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-semibold">
              {SCALE_LIST.find(s => s.id === (granularParams.scale || 'pentatonic-major'))?.name || '五声大调'}
            </span>
          </div>
          <span className="text-[8px] font-mono text-slate-500 hidden sm:inline">
            疗愈调式 · 432Hz
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Harmonic Scales">
          {SCALE_LIST.map(scale => {
            const isCurrent = (granularParams.scale || 'pentatonic-major') === scale.id;
            return (
              <button
                key={scale.id}
                type="button"
                aria-pressed={isCurrent}
                onClick={() => updateGranular({ scale: scale.id })}
                title={`${scale.name} · ${scale.description}`}
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

      {/* Controls: Knobs Grid + Dedicated Level Fader */}
      <div className="flex flex-col gap-2.5">
        <div className={`p-2.5 rounded-lg border ${innerCardClass}`}>
          <div className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-2 flex items-center justify-between">
            
            
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Left: 3 Rows Rotary Knobs Grid */}
            <div className={`flex-1 flex flex-col gap-2 p-2 rounded-lg border ${innerGridClass}`}>
              {/* Row 1: Mother Tuning & Output */}
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/40">
                
                <span className="text-[8px] font-mono text-slate-500">
                  Level · Oct · Semi · Cent · Harm · Shift · Phase · Ph.Jit · Track
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 items-center justify-items-center">
                <Knob
                  id={isInstance ? `${sourceId}-master-level` : "granular-master-level"}
                  label="Level"
                  ariaLabel="Granular Master Level"
                  value={granularParams.level ?? 1.0}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['granular-master-level']}
                  liveModOffset={computeLiveModOffset('granular-master-level')}
                  onChange={val => updateGranular({ level: val })}
                  onLongPress={() =>
                    setActiveModTarget({ id: 'granular-master-level', label: 'Granular Master Level' })
                  }
                />

                <Knob
                  id={isInstance ? `${sourceId}-octave` : "granular-octave"}
                  label="Oct"
                  ariaLabel="Granular Octave"
                  value={granularParams.octave ?? 0}
                  min={-4}
                  max={4}
                  step={1}
                  unit=" Oct"
                  formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} Oct`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ octave: Math.round(val) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-semi` : "granular-semi"}
                  label="Semi"
                  ariaLabel="Granular Semi"
                  value={granularParams.semi ?? 0}
                  min={-24}
                  max={24}
                  step={1}
                  unit=" st"
                  formatValue={v => `${v > 0 ? '+' : ''}${v} st`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ semi: Math.round(val) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-cent` : "granular-cent"}
                  label="Cent"
                  ariaLabel="Granular Cent"
                  value={granularParams.cent ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  unit=" ct"
                  formatValue={v => `${v > 0 ? '+' : ''}${v} ct`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ cent: Math.round(val) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-harmonic` : "granular-harmonic"}
                  label="Harm"
                  ariaLabel="Granular Harmonic"
                  value={granularParams.harmonic ?? 1.0}
                  min={0.125}
                  max={16.0}
                  step={0.025}
                  unit="x"
                  formatValue={v => `×${v.toFixed(3)}`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ harmonic: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-shift` : "granular-shift"}
                  label="Shift"
                  ariaLabel="Granular Shift"
                  value={granularParams.shift ?? 0}
                  min={-200}
                  max={200}
                  step={0.1}
                  unit=" Hz"
                  formatValue={v => `${v > 0 ? '+' : ''}${v.toFixed(2)} Hz`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ shift: Number(val.toFixed(2)) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-phase` : "granular-phase"}
                  label="Phase"
                  ariaLabel="Granular Phase"
                  value={granularParams.phase ?? 0}
                  min={0}
                  max={360}
                  step={1}
                  unit="°"
                  formatValue={v => `${Math.round(v)}°`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ phase: Math.round(val) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-phase-jitter` : "granular-phase-jitter"}
                  label="Ph.Jit"
                  ariaLabel="Granular Phase Jitter"
                  value={granularParams.phaseJitter ?? 0}
                  min={0}
                  max={180}
                  step={1}
                  unit="°"
                  formatValue={v => `±${Math.round(v)}°`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ phaseJitter: Math.round(val) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-keytrack` : "granular-keytrack"}
                  label="Track"
                  ariaLabel="Granular Key Track"
                  value={granularParams.keyTrack ?? 1.0}
                  min={0}
                  max={1}
                  step={0.05}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ keyTrack: val })}
                />
              </div>

              {/* Row 2: Micro Wander & Jitter */}
              <div className="flex items-center justify-between pt-1.5 pb-1 border-t border-neutral-800/40">
                
                <span className="text-[8px] font-mono text-slate-500">
                  Position · Timing · Pitch · Level · Pan · Reverse · Rng Start · Rng End · Chance
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 items-center justify-items-center">
                <Knob
                  id={isInstance ? `${sourceId}-pos-jitter` : "granular-pos-jitter"}
                  label="Position"
                  ariaLabel="Granular Position Jitter"
                  value={granularParams.positionJitter ?? 0.0}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `±${(v * 100).toFixed(1)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ positionJitter: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-timing` : "granular-timing"}
                  label="Timing"
                  ariaLabel="Granular Timing Jitter"
                  value={granularParams.timingJitter ?? 0.35}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `±${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ timingJitter: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-pitch-jitter` : "granular-pitch-jitter"}
                  label="Pitch"
                  ariaLabel="Granular Pitch Jitter"
                  value={granularParams.pitchJitter ?? 0.01}
                  min={0}
                  max={1.0}
                  step={0.01}
                  unit=" st"
                  formatValue={v => `±${v.toFixed(2)}`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ pitchJitter: Number(val.toFixed(2)) })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-level-jitter` : "granular-level-jitter"}
                  label="Level"
                  ariaLabel="Granular Level Jitter"
                  value={granularParams.levelJitter ?? 0.0}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `±${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ levelJitter: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-pan` : "granular-pan"}
                  label="Pan"
                  ariaLabel="Granular Pan"
                  value={granularParams.panJitter ?? granularParams.randomPan ?? 1.0}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `±${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ panJitter: val, randomPan: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-reverse` : "granular-reverse"}
                  label="Reverse"
                  ariaLabel="Granular Reverse Chance"
                  value={granularParams.reverseChance ?? 0.26}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ reverseChance: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-range-start` : "granular-range-start"}
                  label="Rng Start"
                  ariaLabel="Granular Range Start"
                  value={granularParams.rangeStart ?? 0.0}
                  min={0}
                  max={0.95}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ rangeStart: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-range-end` : "granular-range-end"}
                  label="Rng End"
                  ariaLabel="Granular Range End"
                  value={granularParams.rangeEnd ?? 1.0}
                  min={0.05}
                  max={1.0}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ rangeEnd: val })}
                />

                <Knob
                  id={isInstance ? `${sourceId}-chance` : "granular-chance"}
                  label="Chance"
                  ariaLabel="Granular Trigger Chance"
                  value={granularParams.probability ?? 0.85}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  onChange={val => updateGranular({ probability: val })}
                />
              </div>
            </div>

            {/* Right: Dedicated Channel Level Fader Strip */}
            <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
              <BipolarFader
                id={isInstance ? `${sourceId}-gain` : "granular-gain"}
                label="Level"
                value={granularParams.gain ?? 0.75}
                min={0}
                max={1}
                bipolar={false}
                height={180}
                assignedModulation={modulationRoutes['granular-gain']}
                liveModOffset={computeLiveModOffset('granular-gain')}
                onChange={val => updateGranular({ gain: val })}
                onLongPress={() =>
                  setActiveModTarget({ id: 'granular-gain', label: 'Granular Level' })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
