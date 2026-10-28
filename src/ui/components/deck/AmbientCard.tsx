import React, { useState, useRef, useEffect } from 'react';
import { Waves, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ChannelStripParams,
  DeepPartial,
  ModulationRoute,
  BreathStage,
  SoundSourceId,
  LaneId,
  SoundSourceType,
  DEFAULT_AMBIENT_PARAMS,
  AmbientSoundscapeParams
} from '../../../types';
import { Knob } from '../knob';
import { BipolarFader } from '../fader';
import { AMBIENT_SOUNDSCAPES } from '../../../audio/nodes/AmbientSoundscapeLibrary';
import { SOUNDSCAPE_THEMES, SourceRouteSelector } from './HardwareDeck';

export interface AmbientCardProps {
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
  soundscapePage?: number;
  onSoundscapePageChange?: (page: number | ((p: number) => number)) => void;
}

export const AmbientCard: React.FC<AmbientCardProps> = ({
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
  soundscapePage: propSoundscapePage,
  onSoundscapePageChange: propOnSoundscapePageChange
}) => {
  const isInstance = sourceId.includes('_');
  const instanceSuffix = isInstance ? ` #${sourceId.split('_')[1]}` : '';
  const typeName = 'Ambient Soundscape';
  const typeCn = isInstance ? '自然氛围声景 (克隆通道)' : '自然氛围声景';

  const ambientParams = sourceId === 'ambient'
    ? (channelStrip.ambient ?? DEFAULT_AMBIENT_PARAMS)
    : { ...DEFAULT_AMBIENT_PARAMS, ...(channelStrip.instances?.[sourceId] || {}) };

  const [localPage, setLocalPage] = useState<number>(() => {
    if (propSoundscapePage !== undefined) return propSoundscapePage;
    const currentId = ambientParams.sampleId ?? 'oceanTide';
    const idx = AMBIENT_SOUNDSCAPES.findIndex(s => s.id === currentId);
    return idx !== -1 ? Math.min(SOUNDSCAPE_THEMES.length - 1, Math.floor(idx / 10)) : 0;
  });
  const soundscapePage = propSoundscapePage ?? localPage;
  const setSoundscapePage = propOnSoundscapePageChange ?? setLocalPage;

  // Auto-sync page when current sampleId changes (e.g. from preset change)
  useEffect(() => {
    if (propSoundscapePage !== undefined) return;
    const currentId = ambientParams.sampleId;
    if (!currentId) return;
    const idx = AMBIENT_SOUNDSCAPES.findIndex(s => s.id === currentId);
    if (idx !== -1) {
      const targetPage = Math.min(SOUNDSCAPE_THEMES.length - 1, Math.floor(idx / 10));
      if (targetPage !== localPage) {
        setLocalPage(targetPage);
      }
    }
  }, [ambientParams.sampleId, propSoundscapePage]);

  // Ambient Soundscape Mouse Drag & Swipe State
  const [isDraggingSoundscape, setIsDraggingSoundscape] = useState(false);
  const [soundscapeDragDeltaX, setSoundscapeDragDeltaX] = useState(0);
  const soundscapeDragStartXRef = useRef<number | null>(null);
  const hasDraggedSoundscapeRef = useRef<boolean>(false);

  const updateAmbient = (partial: DeepPartial<AmbientSoundscapeParams>) => {
    if (sourceId === 'ambient') {
      onChannelStripChange?.({ ambient: partial });
    } else {
      onChannelStripChange?.({
        instances: {
          [sourceId]: {
            ...ambientParams,
            ...partial
          }
        }
      });
    }
  };

  const isBypass = Boolean(ambientParams.bypass);
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
      setSoundscapePage(p => Math.min(maxPage, (typeof p === 'number' ? p : 0) + 1));
    } else if (deltaX > threshold) {
      setSoundscapePage(p => Math.max(0, (typeof p === 'number' ? p : 0) - 1));
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
        onDragStart={onSourceDragStart(sourceId, 'ambient', `${typeName}${instanceSuffix}`)}
        onDragEnd={onDragEnd}
        onClick={onSourceTapLift?.(sourceId, 'ambient', `${typeName}${instanceSuffix}`)}
        title="拖至上方复制或删除"
        className={`flex items-center justify-between mb-3 border-b pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-white/[0.02] rounded-t transition-colors ${cardHeaderBorderClass}`}
      >
        <div className="flex items-center gap-2">
          <Waves size={14} strokeWidth={1.5} className="text-teal-400" />
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
            sourceLabel={isInstance ? `Ambient #${sourceId.split('_')[1]}` : 'Ambient'}
            currentLane={route}
            onChange={onSourceRouteChange}
            isDark={isDark}
          />

          <button
            type="button"
            onClick={() => updateAmbient({ bypass: !isBypass })}
            aria-label={isInstance ? `${typeName}${instanceSuffix} Bypass` : 'Ambient Bypass'}
            className={getPowerButtonClass(isBypass)}
          >
            <Power size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Soundscape Selection Carousel */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>自然声景</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundscapePage(p => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
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
                onClick={() => setSoundscapePage(p => Math.min(SOUNDSCAPE_THEMES.length - 1, (typeof p === 'number' ? p : 0) + 1))}
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
              {AMBIENT_SOUNDSCAPES.find(s => s.id === (ambientParams.sampleId ?? 'oceanTide'))?.nameEn ?? 'Ocean Surf'}
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
                title={`${idx + 1} ${theme.name} · ${theme.desc}`}
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
            {SOUNDSCAPE_THEMES[soundscapePage]?.name}
          </span>
          <span className="truncate max-w-[280px] opacity-75 hidden sm:inline-block">
            {SOUNDSCAPE_THEMES[soundscapePage]?.desc}
          </span>
        </div>

        {/* Sliding Carousel Viewport with Mouse Drag / Swipe */}
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
                    const isSelected = (ambientParams.sampleId ?? 'oceanTide') === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          if (hasDraggedSoundscapeRef.current || Math.abs(soundscapeDragDeltaX) > 6) return;
                          updateAmbient({ sampleId: sc.id });
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
            id={isInstance ? `${sourceId}-tone` : "ambient-tone"}
            label="Amb Tone"
            value={ambientParams.tone ?? 0.5}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['ambient-tone']}
            liveModOffset={computeLiveModOffset('ambient-tone')}
            onChange={val => updateAmbient({ tone: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'ambient-tone', label: 'Ambient Tone' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-breath-sync` : "ambient-breath-sync"}
            label="Breath Sync"
            value={ambientParams.breathSync ?? 0.35}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['ambient-breath-sync']}
            liveModOffset={computeLiveModOffset('ambient-breath-sync')}
            onChange={val => updateAmbient({ breathSync: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'ambient-breath-sync', label: 'Ambient Breath Sync' })
            }
          />

          <Knob
            id={isInstance ? `${sourceId}-width` : "ambient-width"}
            label="Stereo Width"
            value={ambientParams.width ?? 0.65}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            formatValue={v => `${Math.round(v * 100)}%`}
            breathStage={breathStage}
            assignedModulation={modulationRoutes['ambient-width']}
            liveModOffset={computeLiveModOffset('ambient-width')}
            onChange={val => updateAmbient({ width: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'ambient-width', label: 'Ambient Stereo Width' })
            }
          />
        </div>

        <div className={`flex sm:flex-col items-center justify-center p-2 rounded-lg min-w-[76px] self-stretch border ${faderBayClass}`}>
          <BipolarFader
            id={isInstance ? `${sourceId}-gain` : "ambient-gain"}
            label="Level"
            value={ambientParams.gain ?? 0.5}
            min={0}
            max={1}
            bipolar={false}
            height={115}
            assignedModulation={modulationRoutes['ambient-gain']}
            liveModOffset={computeLiveModOffset('ambient-gain')}
            onChange={val => updateAmbient({ gain: val })}
            onLongPress={() =>
              setActiveModTarget({ id: 'ambient-gain', label: 'Ambient Level' })
            }
          />
        </div>
      </div>
    </div>
  );
};
