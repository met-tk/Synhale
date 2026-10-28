/**
 * Synhale 2 - SignalFlowGraph
 * 
 * Semi-modular synthesis audio signal routing & topological overview.
 * Visualizes sound sources parallel summing & multi-lane routing,
 * processing chain order (Lane A / Lane B / Thru), dynamic bypass routing,
 * live photon signal flow, and high-precision drag-and-drop reordering
 * with cross-bus transfer between BUS A and BUS B.
 * 
 * Strict industrial aesthetic: 100% zero emoji, 1px precision borders, high contrast.
 */

import React, { useRef, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { readAccent } from '../../theme/deckPalette';
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
  activeSources?: string[];
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
  onMoveEffectBetweenLanes,
  activeSources: propsActiveSources
}) => {
  // Drag-and-drop state for live reordering and cross-bus transfers
  const [draggedItem, setDraggedItem] = useState<{ id: string; sourceLane: 'laneA' | 'laneB' } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ lane: 'laneA' | 'laneB'; targetIndex: number } | null>(null);

  // Touch / Pointer-based long-press drag state (Android / iOS touchscreens
  // do NOT fire HTML5 dragstart/dragover, so we replicate the whole pipeline
  // with Pointer Events. A 320ms long-press arms the drag; further pointer
  // movement tracks a floating ghost and locates the nearest drop slot.)
  const touchDragRef = useRef<{
    pointerId: number;
    id: string;
    sourceLane: 'laneA' | 'laneB';
    startX: number;
    startY: number;
    armed: boolean;          // long-press timer fired
    dragging: boolean;       // finger moved past slop while armed
    ghostEl: HTMLElement | null;
    sourceEl: HTMLElement | null;
    lastTarget: { lane: 'laneA' | 'laneB'; targetIndex: number } | null;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Helper: locate which effect card (if any) is at a given viewport point,
  // excluding the floating ghost. Reads data attributes written at render time.
  const hitTestEffectCard = (x: number, y: number): { id: string; lane: 'laneA' | 'laneB'; rect: DOMRect } | null => {
    if (typeof document === 'undefined') return null;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const card = el.closest('[data-effect-id]') as HTMLElement | null;
    if (!card) return null;
    const id = card.getAttribute('data-effect-id');
    const laneAttr = card.getAttribute('data-effect-lane');
    if (!id) return null;
    const lane: 'laneA' | 'laneB' = laneAttr === 'laneB' ? 'laneB' : 'laneA';
    return { id, lane, rect: card.getBoundingClientRect() };
  };

  const hitTestLaneContainer = (x: number, y: number): 'laneA' | 'laneB' | null => {
    if (typeof document === 'undefined') return null;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const zone = el.closest('[data-lane-drop]') as HTMLElement | null;
    if (!zone) return null;
    const laneAttr = zone.getAttribute('data-lane-drop');
    return laneAttr === 'laneB' ? 'laneB' : laneAttr === 'laneA' ? 'laneA' : null;
  };

  const teardownTouchDrag = () => {
    clearLongPressTimer();
    const st = touchDragRef.current;
    if (st?.ghostEl && st.ghostEl.parentNode) {
      st.ghostEl.parentNode.removeChild(st.ghostEl);
    }
    touchDragRef.current = null;
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleEffectPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string, lane: 'laneA' | 'laneB') => {
    // Only arm touch pen input here — mouse is handled by HTML5 DnD
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    // Prevent scroll-capture so the user can long-press without the page scrolling
    e.stopPropagation();
    // Capture the pointer so subsequent move/up events keep targeting this card
    // even when the finger slides across sibling lanes.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* noop */ }

    teardownTouchDrag();
    touchDragRef.current = {
      pointerId: e.pointerId,
      id,
      sourceLane: lane,
      startX: e.clientX,
      startY: e.clientY,
      armed: false,
      dragging: false,
      ghostEl: null,
      sourceEl: e.currentTarget,
      lastTarget: null
    };

    longPressTimerRef.current = setTimeout(() => {
      const st = touchDragRef.current;
      if (!st || st.dragging) return;
      st.armed = true;
      setDraggedItem({ id: st.id, sourceLane: st.sourceLane });

      // Spawn a floating ghost element that follows the finger
      if (st.sourceEl && typeof document !== 'undefined') {
        const rect = st.sourceEl.getBoundingClientRect();
        const ghost = st.sourceEl.cloneNode(true) as HTMLElement;
        ghost.style.position = 'fixed';
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '9999';
        ghost.style.opacity = '0.85';
        ghost.style.transform = 'scale(1.05)';
        ghost.style.boxShadow = '0 8px 24px rgba(56,189,248,0.35)';
        ghost.style.transition = 'none';
        document.body.appendChild(ghost);
        st.ghostEl = ghost;
      }

      try {
        if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
          (navigator as any).vibrate(15);
        }
      } catch { /* noop */ }
    }, 320);
  };

  const handleEffectPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = touchDragRef.current;
    if (!st || e.pointerId !== st.pointerId) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!st.armed) {
      // Cancel pending long-press if user moved before hold time
      if (dist > 8) {
        teardownTouchDrag();
      }
      return;
    }

    // Armed: any movement = dragging
    if (dist > 4) st.dragging = true;
    if (!st.dragging) return;

    // Prevent scrolling while dragging
    if (e.cancelable) e.preventDefault();

    if (st.ghostEl) {
      const w = st.ghostEl.offsetWidth;
      const h = st.ghostEl.offsetHeight;
      st.ghostEl.style.left = `${e.clientX - w / 2}px`;
      st.ghostEl.style.top = `${e.clientY - h / 2}px`;
    }

    // Locate drop target: prefer hovering card midpoint insertion, fallback to lane container
    const hit = hitTestEffectCard(e.clientX, e.clientY);
    let target: { lane: 'laneA' | 'laneB'; targetIndex: number } | null = null;
    if (hit) {
      const order = hit.lane === 'laneA' ? laneAOrder : laneBOrder;
      const idx = order.indexOf(hit.id);
      if (idx !== -1) {
        const midX = hit.rect.left + hit.rect.width / 2;
        const insertIndex = e.clientX < midX ? idx : idx + 1;
        target = { lane: hit.lane, targetIndex: insertIndex };
      }
    }
    if (!target) {
      const laneHit = hitTestLaneContainer(e.clientX, e.clientY);
      if (laneHit) {
        const order = laneHit === 'laneA' ? laneAOrder : laneBOrder;
        target = { lane: laneHit, targetIndex: order.length };
      }
    }

    if (
      (target && (!st.lastTarget || st.lastTarget.lane !== target.lane || st.lastTarget.targetIndex !== target.targetIndex)) ||
      (!target && st.lastTarget)
    ) {
      st.lastTarget = target;
      setDropTarget(target);
    }
  };

  const commitTouchDrop = (st: NonNullable<typeof touchDragRef.current>) => {
    const target = st.lastTarget;
    if (!target) return;
    const effectId = st.id;
    const sourceLane = st.sourceLane;
    const targetLane = target.lane;
    const targetIndex = target.targetIndex;

    if (sourceLane === targetLane) {
      const currentOrder = targetLane === 'laneA' ? [...laneAOrder] : [...laneBOrder];
      const oldIndex = currentOrder.indexOf(effectId);
      if (oldIndex !== -1) {
        currentOrder.splice(oldIndex, 1);
        const insertAt = targetIndex > oldIndex ? targetIndex - 1 : targetIndex;
        const clamped = Math.max(0, Math.min(insertAt, currentOrder.length));
        currentOrder.splice(clamped, 0, effectId);
        if (onLaneReorder) {
          onLaneReorder(targetLane, currentOrder);
        } else if (targetLane === 'laneA' && onReorderEffects) {
          onReorderEffects(currentOrder);
        }
      }
    } else {
      if (onMoveEffectBetweenLanes) {
        onMoveEffectBetweenLanes(effectId, sourceLane, targetLane);
      }
      if (onLaneReorder) {
        const targetList = (targetLane === 'laneA' ? [...laneAOrder] : [...laneBOrder]).filter(x => x !== effectId);
        const clamped = Math.max(0, Math.min(targetIndex, targetList.length));
        targetList.splice(clamped, 0, effectId);
        onLaneReorder(targetLane, targetList);
      }
    }
  };

  const handleEffectPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = touchDragRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const wasDragging = st.dragging;
    if (wasDragging) {
      commitTouchDrop(st);
    }
    teardownTouchDrag();
  };

  const handleEffectPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = touchDragRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    teardownTouchDrag();
  };

  const sourcesList = (propsActiveSources && propsActiveSources.length > 0)
    ? propsActiveSources
    : ['oscA', 'granular', 'oscB', 'drone', 'ambient'];

  const isSourceActive = (id: string): boolean => {
    const isInstance = id.includes('_');
    if (isInstance) {
      return channelStrip.instances?.[id]?.bypass !== undefined
        ? !channelStrip.instances[id].bypass
        : true;
    }
    const baseType = id;
    const params = (channelStrip as any)[baseType];
    if (params && params.bypass !== undefined) {
      return !params.bypass;
    }
    return true;
  };

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
  const isSignalFlowing = isPlaying && sourcesList.some(id => isSourceActive(id));

  // Active routes mapping
  const sourceRoutes: SourceRouteMap = propsSourceRoutes ?? effects.sourceRoutes ?? DEFAULT_SOURCE_ROUTES;
  const laneAOrder: string[] = propsLaneAOrder ?? effects.laneAOrder ?? DEFAULT_LANE_A_ORDER;
  const laneBOrder: string[] = propsLaneBOrder ?? effects.laneBOrder ?? DEFAULT_LANE_B_ORDER;

  // Multi-lane mode flag
  const isMultiLaneMode = Boolean(propsLaneBOrder || effects.laneBOrder || onLaneReorder || propsSourceRoutes || onMoveEffectBetweenLanes);
  const singleLaneOrder = effectOrder ?? ['gain', 'drive', 'filter', 'eq', 'adsr', 'delay', 'reverb'];

  // Common node style builder
  const getNodeClass = (isActive: boolean, isDragging = false) => {
    if (isDragging) {
      return isDark
        ? 'border-sky-400/80 bg-sky-950/40 text-slate-400 opacity-40 scale-95 border-dashed shadow-[0_0_12px_rgba(56,189,248,0.2)]'
        : 'border-sky-400 bg-sky-50 text-neutral-400 opacity-40 scale-95 border-dashed';
    }
    if (isActive) {
      return isDark
        ? 'border-sky-500/70 bg-[#090b10] text-slate-100 shadow-[0_0_10px_rgba(56,189,248,0.08)] hover:border-sky-400 hover:shadow-[0_0_12px_rgba(56,189,248,0.18)]'
        : 'border-sky-400 bg-white text-neutral-800 shadow-xs hover:border-sky-500';
    }
    return isDark
      ? 'border-neutral-800/80 bg-neutral-950/60 text-slate-500 border-dashed hover:border-neutral-700'
      : 'border-neutral-300 bg-neutral-100/70 text-neutral-400 border-dashed hover:border-neutral-400';
  };

  const getLedClass = (isActive: boolean) => {
    if (!isActive) return isDark ? 'bg-neutral-700' : 'bg-neutral-400';
    return isSignalFlowing ? 'bg-cyan-400 shadow-[0_0_6px_#38bdf8] animate-pulse' : 'bg-emerald-500';
  };

  // Legacy button click handlers preserved for a11y & automated test suite
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

  // Render hidden a11y reorder buttons so screen-readers and backward-compatible tests pass
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
        className="sr-only before:min-w-[44px] before:min-h-[44px]"
      >
        {isLeft ? <ChevronLeft size={9} strokeWidth={2} /> : <ChevronRight size={9} strokeWidth={2} />}
      </button>
    );
  };

  // Drag and Drop event handlers
  const handleDragStart = (e: React.DragEvent, id: string, lane: 'laneA' | 'laneB') => {
    setDraggedItem({ id, sourceLane: lane });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'topology-effect', id, sourceLane: lane }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleCardDragOver = (e: React.DragEvent, lane: 'laneA' | 'laneB', index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const clientX = typeof e.clientX === 'number' ? e.clientX : undefined;
    const insertIndex = (clientX !== undefined && rect.width > 0)
      ? (clientX < midX ? index : index + 1)
      : index;
    if (!dropTarget || dropTarget.lane !== lane || dropTarget.targetIndex !== insertIndex) {
      setDropTarget({ lane, targetIndex: insertIndex });
    }
  };

  const handleLaneContainerDragOver = (e: React.DragEvent, lane: 'laneA' | 'laneB', totalCount: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (!dropTarget || dropTarget.lane !== lane) {
      setDropTarget({ lane, targetIndex: totalCount });
    }
  };

  const handleCommitDrop = (e: React.DragEvent, targetLane: 'laneA' | 'laneB', fallbackIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    let effectId = draggedItem?.id;
    let sourceLane = draggedItem?.sourceLane;

    if (!effectId) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.id) {
            effectId = parsed.id;
            sourceLane = parsed.sourceLane;
          }
        }
      } catch {
        // fallback
      }
    }

    if (!effectId) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const effectiveSourceLane = sourceLane || (laneAOrder.includes(effectId) ? 'laneA' : 'laneB');
    const targetIndex = dropTarget && dropTarget.lane === targetLane ? dropTarget.targetIndex : fallbackIndex;

    if (effectiveSourceLane === targetLane) {
      // Reorder within the same bus lane
      const currentOrder = targetLane === 'laneA' ? [...laneAOrder] : [...laneBOrder];
      const oldIndex = currentOrder.indexOf(effectId);
      if (oldIndex !== -1) {
        currentOrder.splice(oldIndex, 1);
        const insertAt = targetIndex > oldIndex ? targetIndex - 1 : targetIndex;
        const clampedIndex = Math.max(0, Math.min(insertAt, currentOrder.length));
        currentOrder.splice(clampedIndex, 0, effectId);
        if (onLaneReorder) {
          onLaneReorder(targetLane, currentOrder);
        } else if (targetLane === 'laneA' && onReorderEffects) {
          onReorderEffects(currentOrder);
        }
      }
    } else {
      // Cross-bus migration (AudioEngine 3ms zero-click ducking + topological reorder)
      if (onMoveEffectBetweenLanes) {
        onMoveEffectBetweenLanes(effectId, effectiveSourceLane, targetLane);
      }
      if (onLaneReorder) {
        const targetList = (targetLane === 'laneA' ? [...laneAOrder] : [...laneBOrder]).filter(id => id !== effectId);
        const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));
        targetList.splice(clampedIndex, 0, effectId);
        onLaneReorder(targetLane, targetList);
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
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
    const isDraggingThis = draggedItem?.id === id;

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
        draggable={true}
        data-effect-id={id}
        data-effect-lane={lane ?? 'laneA'}
        onDragStart={(e) => handleDragStart(e, id, lane || 'laneA')}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleCardDragOver(e, lane || 'laneA', index)}
        onDrop={(e) => handleCommitDrop(e, lane || 'laneA', index)}
        onPointerDown={(e) => handleEffectPointerDown(e, id, lane || 'laneA')}
        onPointerMove={handleEffectPointerMove}
        onPointerUp={handleEffectPointerUp}
        onPointerCancel={handleEffectPointerCancel}
        className={`group relative flex flex-col justify-between p-1.5 rounded-lg border text-[9px] font-mono h-14 min-w-[76px] sm:min-w-[84px] flex-1 max-w-[130px] transition-all cursor-grab active:cursor-grabbing select-none touch-none ${getNodeClass(active, isDraggingThis)}`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 truncate">
            <GripVertical size={8} className="opacity-40 group-hover:opacity-90 text-cyan-400 shrink-0" />
            <span className="font-semibold text-[8px] uppercase truncate tracking-tight">
              {title === 'EQ' ? `EQ 4B${instanceSuffix}` : `${title}${instanceSuffix}`}
            </span>
          </div>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getLedClass(active)}`} />
        </div>

        {/* Center Readout */}
        <div className="pointer-events-none">
          {centerContent}
        </div>

        {/* Bottom Badge (Clean Centered Typography, 0 Arrow Clutter) */}
        <div className="text-center pointer-events-none">
          <span className="text-[7px] font-semibold opacity-75 tracking-wider truncate block font-mono">
            {bottomBadge}
          </span>
        </div>

        {/* Hidden a11y & automated test target buttons */}
        <div className="sr-only">
          {canMoveLeft && renderReorderButton('left', readableTitle, index, lane)}
          {canMoveRight && renderReorderButton('right', readableTitle, index, lane)}
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
            音频路由 · Routing
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
        </div>
      </div>

      {/* Interactive Topology Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
        {/* Branch 1: Dynamic Sound Sources (Parallel Summing / Multi-Bus Source Deck) - 3 cols */}
        <div className="md:col-span-3 flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-0.5 min-w-0 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {sourcesList.map(sourceId => {
            const isInstance = sourceId.includes('_');
            const baseType = isInstance ? sourceId.split('_')[0] : sourceId;
            const numSuffix = isInstance ? ` #${sourceId.split('_')[1]}` : '';
            const active = isSourceActive(sourceId);
            const params = isInstance
              ? (channelStrip.instances?.[sourceId] || {})
              : ((channelStrip as any)[baseType] || {});

            let title = 'SRC';
            let sub = 'GEN';
            let paramText = '';

            switch (baseType) {
              case 'oscA':
                title = `OSC A${numSuffix}`;
                sub = 'WAVETABLE';
                paramText = `S${(params.wavetableIndex ?? 0).toString().padStart(2, '0')}`;
                break;
              case 'granular':
                title = `GRAIN${numSuffix}`;
                sub = 'CLOUD';
                paramText = `${params.density ?? 4}V`;
                break;
              case 'oscB':
                title = `OSC B${numSuffix}`;
                sub = 'NOISE';
                paramText = `${Math.round((params.gain ?? 0.35) * 100)}%`;
                break;
              case 'drone':
                title = `SUB${numSuffix}`;
                sub = '432Hz';
                paramText = `${Math.round(params.baseFreq ?? 54)}Hz`;
                break;
              case 'ambient':
                title = `NATURE${numSuffix}`;
                sub = 'AMBIENT';
                paramText = `${Math.round((params.gain ?? 0.5) * 100)}%`;
                break;
              default:
                title = `${sourceId.toUpperCase()}`;
                sub = 'DSP';
                paramText = `${Math.round((params.gain ?? 0.5) * 100)}%`;
                break;
            }

            return (
              <div
                key={sourceId}
                className={`flex items-center justify-between px-2 py-0.5 rounded border text-[9px] font-mono transition-all ${getNodeClass(active)}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getLedClass(active)}`} />
                  <span className="font-semibold truncate">{title}</span>
                  <span className="text-[7.5px] opacity-70 shrink-0">{sub}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[8px] font-medium opacity-60">{paramText}</span>
                  {renderRouteBadge(sourceId as SoundSourceId)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summing Bus Connector: Dynamic Paths Reflecting Source Bypass States */}
        <div className="hidden md:flex md:col-span-1 items-center justify-center">
          <div className="flex flex-col items-center gap-0.5">
            {(() => {
              const svgHeight = Math.max(66, sourcesList.length * 22);
              return (
                <svg
                  width={30}
                  height={svgHeight}
                  viewBox={`0 0 30 ${svgHeight}`}
                  className="overflow-visible"
                  aria-label="Parallel Sound Sources Summing Bus"
                >
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
                  {sourcesList.map((sourceId, idx) => {
                    const active = isPlaying && isSourceActive(sourceId);
                    const route = sourceRoutes[sourceId as SoundSourceId] || 'laneA';
                    const y = sourcesList.length === 1 ? svgHeight / 2 : 11 + (idx * (svgHeight - 22)) / (sourcesList.length - 1);
                    const strokeColor = active
                      ? route === 'laneB'
                        ? '#2dd4bf'
                        : route === 'thru'
                          ? '#94a3b8'
                          : readAccent('400', '#38bdf8')
                      : isDark
                        ? '#262626'
                        : '#cbd5e1';

                    const targetY = isMultiLaneMode
                      ? route === 'laneB'
                        ? svgHeight * 0.75
                        : route === 'thru'
                          ? svgHeight * 0.5
                          : svgHeight * 0.25
                      : svgHeight * 0.5;

                    return (
                      <path
                        key={sourceId}
                        data-testid={`bus-path-${sourceId}`}
                        data-active={active ? 'true' : 'false'}
                        d={`M 2 ${y} C 16 ${y}, 16 ${targetY}, 28 ${targetY}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={active ? 1.6 : 1.0}
                        strokeDasharray={active ? '3 3' : 'none'}
                        className={active ? 'photon-stream' : ''}
                      />
                    );
                  })}
                </svg>
              );
            })()}
            <span className={`text-[7.5px] font-mono uppercase tracking-tighter ${isSignalFlowing ? 'text-cyan-400 font-semibold' : 'text-slate-500'}`}>
              BUS
            </span>
          </div>
        </div>

        {/* Branch 2: Processing Chain Pipeline (Dual-Lane Multi-Chain or Legacy Single-Chain Grid) - 8 cols */}
        {isMultiLaneMode ? (
          <div className="md:col-span-8 flex flex-col gap-2 min-w-0">
            {/* ======================================================== */}
            {/* LANE A: Core Tone & Shaper Strip                         */}
            {/* ======================================================== */}
            <div
              data-lane-drop="laneA"
              onDragOver={(e) => handleLaneContainerDragOver(e, 'laneA', laneAOrder.length)}
              onDrop={(e) => handleCommitDrop(e, 'laneA', laneAOrder.length)}
              className={`flex items-stretch gap-1.5 p-1.5 rounded-lg border min-h-[66px] transition-colors min-w-0 ${
                isDark ? 'border-sky-900/30 bg-sky-950/10' : 'border-sky-200/80 bg-sky-50/50'
              }`}
            >
              <div className={`flex flex-col items-start justify-center gap-0.5 px-2 py-1 rounded border shrink-0 self-stretch ${
                isDark ? 'bg-sky-950/70 border-sky-800/40' : 'bg-white border-sky-200 shadow-2xs'
              }`}>
                <span className={`text-[8px] font-mono font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  LANE A
                </span>
                <span className={`text-[7px] font-mono ${isDark ? 'text-sky-400/70' : 'text-sky-600 font-semibold'}`}>
                  {Math.round((effects.busLevelA ?? 1.0) * 100)}%
                </span>
              </div>

              {laneAOrder.length === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDropTarget({ lane: 'laneA', targetIndex: 0 }); }}
                  onDrop={(e) => handleCommitDrop(e, 'laneA', 0)}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg border border-dashed text-[8.5px] font-mono transition-all ${
                    dropTarget?.lane === 'laneA'
                      ? (isDark
                          ? 'border-sky-400 bg-sky-950/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'border-sky-400 bg-sky-100/80 text-sky-800 shadow-xs')
                      : isDark ? 'border-neutral-800/70 text-slate-500' : 'border-neutral-300 text-neutral-400'
                  }`}
                >
                  {dropTarget?.lane === 'laneA' ? '释放装载 BUS A' : '拖入 BUS A'}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 flex-1 py-0.5 min-w-0">
                  {laneAOrder.map((id, index) => {
                    const isInsertHere = dropTarget?.lane === 'laneA' && dropTarget?.targetIndex === index;
                    return (
                      <React.Fragment key={`laneA-node-${id}`}>
                        {isInsertHere && (
                          <div
                            key={`laneA-indicator-${index}`}
                            className="w-1 h-12 -mx-0.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8] animate-pulse shrink-0 z-10 self-center"
                          />
                        )}
                        {renderEffectNode(id, index, 'laneA', laneAOrder.length)}
                      </React.Fragment>
                    );
                  })}
                  {dropTarget?.lane === 'laneA' && dropTarget?.targetIndex === laneAOrder.length && (
                    <div
                      key="laneA-indicator-tail"
                      className="w-1 h-12 -mx-0.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8] animate-pulse shrink-0 z-10 self-center"
                    />
                  )}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* LANE B: Space & Ambient Strip + Master Sum Output        */}
            {/* ======================================================== */}
            <div
              data-lane-drop="laneB"
              onDragOver={(e) => handleLaneContainerDragOver(e, 'laneB', laneBOrder.length)}
              onDrop={(e) => handleCommitDrop(e, 'laneB', laneBOrder.length)}
              className={`flex items-stretch gap-1.5 p-1.5 rounded-lg border min-h-[66px] transition-colors min-w-0 ${
                isDark ? 'border-teal-900/30 bg-teal-950/10' : 'border-teal-200/80 bg-teal-50/50'
              }`}
            >
              <div className={`flex flex-col items-start justify-center gap-0.5 px-2 py-1 rounded border shrink-0 self-stretch ${
                isDark ? 'bg-teal-950/70 border-teal-800/40' : 'bg-white border-teal-200 shadow-2xs'
              }`}>
                <span className={`text-[8px] font-mono font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  LANE B
                </span>
                <span className={`text-[7px] font-mono ${isDark ? 'text-teal-400/70' : 'text-teal-600 font-semibold'}`}>
                  {Math.round((effects.busLevelB ?? 1.0) * 100)}%
                </span>
              </div>

              {laneBOrder.length === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDropTarget({ lane: 'laneB', targetIndex: 0 }); }}
                  onDrop={(e) => handleCommitDrop(e, 'laneB', 0)}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg border border-dashed text-[8.5px] font-mono transition-all ${
                    dropTarget?.lane === 'laneB'
                      ? (isDark
                          ? 'border-teal-400 bg-teal-950/40 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.2)]'
                          : 'border-teal-400 bg-teal-100/80 text-teal-800 shadow-xs')
                      : isDark ? 'border-neutral-800/70 text-slate-500' : 'border-neutral-300 text-neutral-400'
                  }`}
                >
                  {dropTarget?.lane === 'laneB' ? '释放装载 BUS B' : '拖入 BUS B'}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 flex-1 py-0.5 min-w-0">
                  {laneBOrder.map((id, index) => {
                    const isInsertHere = dropTarget?.lane === 'laneB' && dropTarget?.targetIndex === index;
                    return (
                      <React.Fragment key={`laneB-node-${id}`}>
                        {isInsertHere && (
                          <div
                            key={`laneB-indicator-${index}`}
                            className="w-1 h-12 -mx-0.5 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf] animate-pulse shrink-0 z-10 self-center"
                          />
                        )}
                        {renderEffectNode(id, index, 'laneB', laneBOrder.length)}
                      </React.Fragment>
                    );
                  })}
                  {dropTarget?.lane === 'laneB' && dropTarget?.targetIndex === laneBOrder.length && (
                    <div
                      key="laneB-indicator-tail"
                      className="w-1 h-12 -mx-0.5 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf] animate-pulse shrink-0 z-10 self-center"
                    />
                  )}
                </div>
              )}

              {/* Master Sum Node */}
              <div
                className={`flex flex-col justify-between p-1.5 rounded-lg border text-[9px] font-mono h-auto min-h-[56px] min-w-[70px] shrink-0 self-stretch transition-all ${
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
        ) : (
          <div className="md:col-span-8 flex flex-wrap items-center gap-1.5 py-1 min-w-0">
            {singleLaneOrder.map((id, index) => renderEffectNode(id, index))}

            {/* Master Output */}
            <div
              className={`flex flex-col justify-between p-1.5 rounded-lg border text-[9px] font-mono h-14 min-w-[70px] shrink-0 transition-all ${
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
