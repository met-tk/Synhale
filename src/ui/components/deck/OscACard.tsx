import React from 'react';
import { Activity, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ChannelStripParams,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  SoundSourceId,
  LaneId,
  SoundSourceType,
  OscAParams,
  DEFAULT_OSC_A_PARAMS
} from '../../../types';
import { DEFAULT_CHANNEL_STRIP } from '../../../audio/engine';
import { Knob } from '../knob';
import { BipolarFader } from '../fader';
import { WavetableVisualizer } from './WavetableVisualizer';
import { MULTI_FRAME_WAVETABLES } from '../../../audio/dsp/wavetableData';
import {
  CHORD_TYPE_OPTIONS,
  WARP_MODE_OPTIONS,
  SourceRouteSelector
} from './HardwareDeck';

export interface OscACardProps {
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
  onDragEnd: () => void;
  onOpenWavetableDrawer: (sourceId: string) => void;
}

export const OscACard: React.FC<OscACardProps> = ({
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
  onDragEnd,
  onOpenWavetableDrawer
}) => {
  const isInstance = sourceId.includes('_');
  const instanceSuffix = isInstance ? ` #${sourceId.split('_')[1]}` : '';
  const typeName = 'OSC A Wavetable';
  const typeCn = isInstance ? '波表振荡器 (克隆通道)' : '波表振荡器';

  const oscAParams = sourceId === 'oscA'
    ? channelStrip.oscA
    : { ...DEFAULT_OSC_A_PARAMS, ...DEFAULT_CHANNEL_STRIP.oscA, ...(channelStrip.instances?.[sourceId] || {}) };

  const updateOscA = (partial: DeepPartial<OscAParams>) => {
    if (sourceId === 'oscA') {
      onChannelStripChange?.({ oscA: partial });
    } else {
      onChannelStripChange?.({
        instances: {
          [sourceId]: {
            ...oscAParams,
            ...partial
          }
        }
      });
    }
  };

  const isBypass = Boolean(oscAParams.bypass);
  const instTableIndex = Math.max(
    0,
    Math.min(MULTI_FRAME_WAVETABLES.length - 1, Math.floor(oscAParams.wavetableIndex ?? 0))
  );
  const instWavetable = MULTI_FRAME_WAVETABLES[instTableIndex] ?? MULTI_FRAME_WAVETABLES[0];
  const route = activeSourceRoutes[sourceId] ?? 'laneA';

  const cardContainerClass = isDark ? 'border-neutral-800 bg-[#07080c]/90' : 'border-neutral-200 bg-white/90 shadow-sm';
  const cardHeaderBorderClass = isDark ? 'border-neutral-800/80' : 'border-neutral-200';
  const cardTitleClass = isDark ? 'text-slate-200' : 'text-neutral-800';
  const cardSubTitleClass = isDark ? 'text-slate-400' : 'text-neutral-500';
  const innerCardClass = isDark ? 'bg-neutral-900/50 border-neutral-800/80' : 'bg-neutral-50/80 border-neutral-200';
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
      className={`relative rounded-lg border p-3 transition-opacity overflow-hidden ${cardContainerClass} ${
        isBypass ? 'opacity-40' : 'opacity-100'
      } ${
        draggingItem?.sourceId === sourceId ? 'opacity-30 border-dashed border-sky-400/60 scale-[0.99]' : ''
      }`}
    >
      {/* Strip Header */}
      <div
        draggable={true}
        onDragStart={onSourceDragStart(sourceId, 'oscA', `${typeName}${instanceSuffix}`)}
        onDragEnd={onDragEnd}
        title="拖至上方复制或删除"
        className={`flex items-center justify-between mb-3 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
      >
        <div className="flex items-center gap-2">
          <Activity size={14} strokeWidth={1.5} className="text-sky-400" />
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
            sourceLabel={isInstance ? `OSC A #${sourceId.split('_')[1]}` : 'OSC A'}
            currentLane={route}
            onChange={onSourceRouteChange}
            isDark={isDark}
          />

          {/* Bypass Toggle */}
          <button
            type="button"
            onClick={() => updateOscA({ bypass: !isBypass })}
            aria-label={isInstance ? `${typeName}${instanceSuffix} Bypass` : 'OSC A Bypass'}
            className={getPowerButtonClass(isBypass)}
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
              波表
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {instTableIndex + 1}/{MULTI_FRAME_WAVETABLES.length}
            </span>
          </div>
          <div className={`flex items-center gap-0.5 p-0.5 rounded border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
            <button
              type="button"
              onClick={() => {
                const count = MULTI_FRAME_WAVETABLES.length;
                const newIdx = (instTableIndex - 1 + count) % count;
                updateOscA({ wavetableIndex: newIdx });
              }}
              aria-label="上一个波表"
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft size={12} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => onOpenWavetableDrawer(sourceId)}
              aria-label="选择波表集"
              className="flex-1 px-1.5 py-0.5 text-center hover:bg-neutral-800/60 rounded transition-colors truncate"
            >
              <span className="block text-[11px] font-semibold text-sky-400 truncate">
                {instWavetable.name}
              </span>
              <span className="block text-[8px] font-mono text-slate-400">
                {instWavetable.category}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                const count = MULTI_FRAME_WAVETABLES.length;
                const newIdx = (instTableIndex + 1) % count;
                updateOscA({ wavetableIndex: newIdx });
              }}
              aria-label="下一个波表"
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Center: 3D Wavetable Visualizer */}
        <div className="flex-1 flex justify-center min-w-[150px] max-w-[195px]">
          <WavetableVisualizer
            tableIndex={instTableIndex}
            sliceIndex={instWavetable.sliceIndices[0]}
            wtPosition={oscAParams.wtPosition ?? 0}
            liveWtPosition={(oscAParams.wtPosition ?? 0) + computeLiveModOffset('osca-wt-pos')}
            morph={oscAParams.morphDepth ?? 0.7}
            liveMorph={Math.max(0, Math.min(1, (oscAParams.morphDepth ?? 0.7) + computeLiveModOffset('osca-morph')))}
            harmonics={oscAParams.harmonics ?? 0.8}
            liveHarmonics={Math.max(0, Math.min(1, (oscAParams.harmonics ?? 0.8) + computeLiveModOffset('osca-harmonics')))}
            width={180}
            height={54}
            defaultViewMode="3d"
            isDark={isDark}
          />
        </div>

        {/* Right: Dedicated Chord Mode Bay */}
        <div className={`flex flex-col gap-2 p-2.5 rounded-lg border min-w-[220px] max-w-[260px] flex-1 ${isDark ? 'bg-neutral-950/40 border-neutral-800/70 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] uppercase font-mono font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                和弦模式
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(oscAParams.chordMode)}
              aria-label="Toggle OSC A Chord Mode"
              onClick={() => updateOscA({ chordMode: !oscAParams.chordMode })}
              className={`shrink-0 min-h-7 px-2.5 py-1 rounded-md text-[10px] leading-none font-mono font-semibold transition-all border ${
                oscAParams.chordMode
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.25)] hover:bg-sky-500/30 font-bold'
                    : 'bg-sky-500 text-white border-sky-600 hover:bg-sky-600 font-bold shadow-xs'
                  : isDark
                    ? 'bg-neutral-900/80 text-slate-400 border-neutral-700/60 hover:text-slate-200 hover:border-neutral-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {oscAParams.chordMode ? 'CHORD ON' : 'CHORD OFF'}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {CHORD_TYPE_OPTIONS.map(opt => {
              const isSelected = (oscAParams.chordType ?? 'octave') === opt.type;
              const isActive = Boolean(oscAParams.chordMode) && isSelected;
              return (
                <button
                  key={opt.type}
                  type="button"
                  disabled={!oscAParams.chordMode}
                  aria-pressed={isActive}
                  onClick={() => updateOscA({ chordType: opt.type })}
                  title={opt.desc}
                  className={`min-h-7 px-1 py-1 rounded-md text-[11px] leading-none font-mono font-semibold transition-all text-center whitespace-nowrap border ${opt.type === 'sacred' ? 'col-span-2' : ''} ${
                    !oscAParams.chordMode
                      ? isDark
                        ? 'bg-neutral-950/30 text-neutral-600 border-neutral-900/80 cursor-not-allowed'
                        : 'bg-slate-100/60 text-slate-400 border-slate-200 cursor-not-allowed'
                      : isActive
                      ? isDark
                        ? 'bg-sky-500/25 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.25)] font-bold'
                        : 'bg-sky-500 text-white border-sky-600 font-bold shadow-xs'
                      : isDark
                        ? 'bg-neutral-900/60 text-slate-300 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 hover:text-slate-100'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
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
              <span>调谐与塑形 · Tuning &amp; Warp</span>
              
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 items-center justify-items-center">
              {/* 1. OCT */}
              <Knob
                id={isInstance ? `${sourceId}-octave` : "osca-octave"}
                label="OCT"
                ariaLabel="Osc A Octave"
                value={oscAParams.octave ?? 0}
                min={-4}
                max={4}
                step={1}
                bipolar={true}
                unit="Oct"
                formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} Oct`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-octave']}
                liveModOffset={computeLiveModOffset('osca-octave')}
                onChange={val => updateOscA({ octave: Math.round(val) })}
                onLongPress={() => setActiveModTarget({ id: 'osca-octave', label: 'OSC A Octave' })}
              />

              {/* 2. SEMI */}
              <Knob
                id={isInstance ? `${sourceId}-semi` : "osca-semi"}
                label="SEMI"
                ariaLabel="Osc A Semitone"
                value={oscAParams.semi ?? 0}
                min={-12}
                max={12}
                step={1}
                bipolar={true}
                unit="st"
                formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} st`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-semi']}
                liveModOffset={computeLiveModOffset('osca-semi')}
                onChange={val => updateOscA({ semi: Math.round(val) })}
                onLongPress={() => setActiveModTarget({ id: 'osca-semi', label: 'OSC A Semitone' })}
              />

              {/* 3. FINE (Matches Detune test) */}
              <Knob
                id={isInstance ? `${sourceId}-fine` : "osca-fine"}
                label="FINE"
                ariaLabel="Detune"
                value={oscAParams.fine ?? (oscAParams.detune ?? 0)}
                min={-100}
                max={100}
                step={1}
                bipolar={true}
                unit="c"
                formatValue={v => `${v > 0 ? '+' : ''}${Math.round(v)} c`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-detune']}
                liveModOffset={computeLiveModOffset('osca-detune')}
                onChange={val => updateOscA({ fine: Math.round(val), detune: Math.round(val) })}
                onLongPress={() => setActiveModTarget({ id: 'osca-detune', label: 'OSC A Fine Detune' })}
              />

              {/* 4. WT POS */}
              <Knob
                id={isInstance ? `${sourceId}-wt-pos` : "osca-wt-pos"}
                label="WT POS"
                ariaLabel="WT POS"
                value={oscAParams.wtPosition ?? 0}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-wt-pos']}
                liveModOffset={computeLiveModOffset('osca-wt-pos')}
                onChange={val => updateOscA({ wtPosition: val, morphDepth: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-wt-pos', label: 'OSC A WT Position' })}
              />

              {/* 5. WARP (With compact mode switcher) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  aria-label="Warp Mode"
                  title="切换 Warp 模式"
                  onClick={() => {
                    const curMode = oscAParams.warpMode ?? 'off';
                    const idx = WARP_MODE_OPTIONS.findIndex(m => m.mode === curMode);
                    const next = WARP_MODE_OPTIONS[(idx + 1) % WARP_MODE_OPTIONS.length].mode;
                    updateOscA({ warpMode: next });
                  }}
                  className={`mb-1 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider border transition-colors ${
                    (oscAParams.warpMode ?? 'off') !== 'off'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                      : isDark
                      ? 'bg-neutral-800 text-slate-400 border-neutral-700 hover:text-slate-200'
                      : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800'
                  }`}
                >
                  {(oscAParams.warpMode ?? 'off').toUpperCase()}
                </button>
                <Knob
                  id={isInstance ? `${sourceId}-warp` : "osca-warp"}
                  label="WARP"
                  ariaLabel="Osc A Warp"
                  value={oscAParams.warp ?? 0}
                  min={0}
                  max={1}
                  step={0.01}
                  unit="%"
                  formatValue={v => `${Math.round(v * 100)}%`}
                  breathStage={breathStage}
                  assignedModulation={modulationRoutes['osca-warp']}
                  liveModOffset={computeLiveModOffset('osca-warp')}
                  onChange={val => updateOscA({ warp: val })}
                  onLongPress={() => setActiveModTarget({ id: 'osca-warp', label: 'OSC A Warp Shaping' })}
                />
              </div>

              {/* 6. PHASE */}
              <Knob
                id={isInstance ? `${sourceId}-phase` : "osca-phase"}
                label="PHASE"
                ariaLabel="Osc A Phase"
                value={oscAParams.phase ?? 0}
                min={0}
                max={360}
                step={1}
                unit="°"
                formatValue={v => `${Math.round(v)}°`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-phase']}
                liveModOffset={computeLiveModOffset('osca-phase')}
                onChange={val => updateOscA({ phase: Math.round(val) })}
                onLongPress={() => setActiveModTarget({ id: 'osca-phase', label: 'OSC A Initial Phase' })}
              />

              {/* 7. RAND */}
              <Knob
                id={isInstance ? `${sourceId}-phase-rand` : "osca-phase-rand"}
                label="RAND"
                ariaLabel="Osc A Phase Random"
                value={oscAParams.phaseRand ?? 1.0}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-phase-rand']}
                liveModOffset={computeLiveModOffset('osca-phase-rand')}
                onChange={val => updateOscA({ phaseRand: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-phase-rand', label: 'OSC A Phase Randomization' })}
              />

              {/* 8. HARM (Matches Harmonics test) */}
              <Knob
                id={isInstance ? `${sourceId}-harmonics` : "osca-harmonics"}
                label="HARM"
                ariaLabel="Harmonics"
                value={oscAParams.harmonics ?? 0.8}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-harmonics']}
                liveModOffset={computeLiveModOffset('osca-harmonics')}
                onChange={val => updateOscA({ harmonics: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-harmonics', label: 'OSC A Harmonics' })}
              />
            </div>
          </div>

          {/* Row 2: Level, Pan, Unison Detune/Spread, Sub & Warmth */}
          <div className={`p-2.5 rounded-lg border ${innerCardClass}`}>
            <div className="text-[9px] font-mono uppercase text-sky-400/90 font-semibold tracking-wider mb-2 flex items-center justify-between">
              <span>输出与复音 · Voicing</span>
              
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 items-center justify-items-center">
              {/* 1. LEVEL */}
              <Knob
                id={isInstance ? `${sourceId}-gain` : "osca-gain"}
                label="LEVEL"
                ariaLabel="Osc A Level"
                value={oscAParams.gain}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-gain']}
                liveModOffset={computeLiveModOffset('osca-gain')}
                onChange={val => updateOscA({ gain: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-gain', label: 'OSC A Level' })}
              />

              {/* 2. PAN */}
              <Knob
                id={isInstance ? `${sourceId}-pan` : "osca-pan"}
                label="PAN"
                ariaLabel="Osc A Pan"
                value={oscAParams.pan ?? 0.0}
                min={-1}
                max={1}
                step={0.01}
                bipolar={true}
                unit="%"
                formatValue={v => (Math.abs(v) < 0.02 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}%` : `R${Math.round(v * 100)}%`)}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-pan']}
                liveModOffset={computeLiveModOffset('osca-pan')}
                onChange={val => updateOscA({ pan: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-pan', label: 'OSC A Pan' })}
              />

              {/* 3. UNISON */}
              <Knob
                id={isInstance ? `${sourceId}-unison` : "osca-unison"}
                label="UNISON"
                ariaLabel="Unison"
                value={oscAParams.unison ?? 0.35}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-unison']}
                liveModOffset={computeLiveModOffset('osca-unison')}
                onChange={val => updateOscA({ unison: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-unison', label: 'OSC A Unison' })}
              />

              {/* 4. DETUNE */}
              <Knob
                id={isInstance ? `${sourceId}-detune-mod` : "osca-detune"}
                label="DETUNE"
                ariaLabel="Osc A Unison Detune"
                value={oscAParams.detune ?? 0.25}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-detune']}
                liveModOffset={computeLiveModOffset('osca-detune')}
                onChange={val => updateOscA({ detune: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-detune', label: 'OSC A Detune' })}
              />

              {/* 5. BLEND */}
              <Knob
                id={isInstance ? `${sourceId}-blend` : "osca-blend"}
                label="BLEND"
                ariaLabel="Uni Blend"
                value={oscAParams.blend ?? 0.7}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-blend']}
                liveModOffset={computeLiveModOffset('osca-blend')}
                onChange={val => updateOscA({ blend: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-blend', label: 'OSC A Blend' })}
              />

              {/* 6. SPREAD */}
              <Knob
                id={isInstance ? `${sourceId}-spread` : "osca-spread"}
                label="SPREAD"
                ariaLabel="Osc A Spread"
                value={oscAParams.spread ?? 0.8}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-spread']}
                liveModOffset={computeLiveModOffset('osca-spread')}
                onChange={val => updateOscA({ spread: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-spread', label: 'OSC A Stereo Spread' })}
              />

              {/* 7. SUB */}
              <Knob
                id={isInstance ? `${sourceId}-sub` : "osca-sub"}
                label="SUB"
                ariaLabel="Osc A Sub"
                value={oscAParams.subGain ?? 0.15}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-sub']}
                liveModOffset={computeLiveModOffset('osca-sub')}
                onChange={val => updateOscA({ subGain: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-sub', label: 'OSC A Sub Gain' })}
              />

              {/* 8. WARMTH */}
              <Knob
                id={isInstance ? `${sourceId}-warmth` : "osca-warmth"}
                label="WARMTH"
                ariaLabel="Osc A Warmth"
                value={oscAParams.warmth ?? 0.1}
                min={0}
                max={1}
                step={0.01}
                unit="%"
                formatValue={v => `${Math.round(v * 100)}%`}
                breathStage={breathStage}
                assignedModulation={modulationRoutes['osca-warmth']}
                liveModOffset={computeLiveModOffset('osca-warmth')}
                onChange={val => updateOscA({ warmth: val })}
                onLongPress={() => setActiveModTarget({ id: 'osca-warmth', label: 'OSC A Warmth' })}
              />
            </div>
          </div>
        </div>

        {/* Right: Dedicated Channel Level Fader Strip (Unified 4-Track Architecture) */}
        <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
          <BipolarFader
            id={isInstance ? `${sourceId}-gain` : "osca-gain"}
            label="Level"
            value={oscAParams.gain}
            min={0}
            max={1}
            bipolar={false}
            height={180}
            assignedModulation={modulationRoutes['osca-gain']}
            liveModOffset={computeLiveModOffset('osca-gain')}
            onChange={val => updateOscA({ gain: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'osca-gain', label: 'OSC A Level' })
            }
          />
        </div>
      </div>
    </div>
  );
};
