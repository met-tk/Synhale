import React, { useRef, useState, useEffect } from 'react';

import type { ModulationRoute } from '../../../types';

export function applyMagneticCenterDetent(val: number): number {
  if (Math.abs(val) < 0.03) return 0.0;
  return Math.max(-1.0, Math.min(1.0, val));
}

export interface BipolarFaderProps {
  id: string;
  label: string;
  ariaLabel?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  bipolar?: boolean;
  unit?: string;
  height?: number;
  disabled?: boolean;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  className?: string;
  assignedModulation?: ModulationRoute;
  liveModOffset?: number;
  onLongPress?: () => void;
}

export const BipolarFader: React.FC<BipolarFaderProps> = ({
  id,
  label,
  ariaLabel,
  value,
  min: propMin,
  max: propMax,
  step = 0.01,
  defaultValue = 0.0,
  bipolar = true,
  unit = '',
  height = 140,
  disabled = false,
  onChange,
  formatValue,
  className = '',
  assignedModulation,
  liveModOffset = 0,
  onLongPress
}) => {
  const min = propMin ?? (bipolar ? -1.0 : 0.0);
  const max = propMax ?? 1.0;
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ y: number; val: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (disabled) {
      pointerStartRef.current = null;
      setIsDragging(false);
    }
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, [disabled]);

  // Clamp & apply magnetic detent if bipolar
  const rawClamped = Math.max(min, Math.min(max, value));
  const effectiveValue = bipolar ? applyMagneticCenterDetent(rawClamped) : rawClamped;

  const range = max - min;
  const norm = range === 0 ? 0 : (effectiveValue - min) / range;
  // Normalized 0 at bottom, 1 at top
  const bottomPct = norm * 100;

  // Modulation range calculation
  let modTopPct = 0;
  let modBottomPct = 0;
  if (assignedModulation) {
    const depth = assignedModulation.depth ?? 0;
    const isModBipolar = assignedModulation.bipolar ?? false;

    if (!bipolar) {
      // Unipolar Fader (e.g. Master Volume, Channel Gain):
      // Represents VCA envelope / attenuation ceiling where effectiveValue is max headroom
      if (!isModBipolar) {
        // Unipolar modulation: depth scales down from effectiveValue towards effectiveValue * (1 - depth)
        const valMin = effectiveValue * (1 - Math.max(0, Math.min(1, Math.abs(depth))));
        const valMax = effectiveValue;
        modBottomPct = Math.max(0, Math.min(100, ((valMin - min) / range) * 100));
        modTopPct = Math.max(0, Math.min(100, 100 - ((valMax - min) / range) * 100));
      } else {
        const valMin = Math.max(min, effectiveValue * (1 - Math.abs(depth)));
        const valMax = Math.min(max, effectiveValue * (1 + Math.abs(depth)));
        modBottomPct = Math.max(0, Math.min(100, ((valMin - min) / range) * 100));
        modTopPct = Math.max(0, Math.min(100, 100 - ((valMax - min) / range) * 100));
      }
    } else {
      // Bipolar Fader (e.g. Pan, Detune):
      if (isModBipolar) {
        const minModVal = Math.max(min, Math.min(max, effectiveValue - Math.abs(depth) * range * 0.5));
        const maxModVal = Math.max(min, Math.min(max, effectiveValue + Math.abs(depth) * range * 0.5));
        modBottomPct = ((minModVal - min) / range) * 100;
        modTopPct = (1 - (maxModVal - min) / range) * 100;
      } else {
        const targetModVal = Math.max(min, Math.min(max, effectiveValue + depth * range * 0.5));
        const p1 = norm * 100;
        const p2 = ((targetModVal - min) / range) * 100;
        modBottomPct = Math.min(p1, p2);
        modTopPct = 100 - Math.max(p1, p2);
      }
    }
  }

  // Live modulated playhead position (truly reflects effective acoustic value)
  const hasLiveMod = assignedModulation !== undefined && Number.isFinite(liveModOffset);
  let liveBottomPct = bottomPct;
  if (hasLiveMod) {
    const depth = assignedModulation.depth ?? 0;
    const isModBipolar = assignedModulation.bipolar ?? false;

    if (!bipolar) {
      // Unipolar: matches AudioEngine actual effectiveMasterGain calculation
      let liveVal = effectiveValue;
      if (!isModBipolar) {
        const clampedOffset = Math.max(0, Math.min(1, liveModOffset ?? 0));
        liveVal = effectiveValue * ((1 - depth) + depth * clampedOffset);
      } else {
        const clampedOffset = Math.max(-1, Math.min(1, liveModOffset ?? 0));
        liveVal = Math.max(min, Math.min(max, effectiveValue * (1 + depth * clampedOffset)));
      }
      liveBottomPct = Math.max(0, Math.min(100, ((liveVal - min) / range) * 100));
    } else {
      const liveClampedVal = Math.max(min, Math.min(max, effectiveValue + (liveModOffset ?? 0) * depth * range * 0.5));
      liveBottomPct = Math.max(0, Math.min(100, ((liveClampedVal - min) / range) * 100));
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore in environments without pointer capture support
      }
    }

    pointerStartRef.current = {
      y: e.clientY,
      val: effectiveValue
    };
    setIsDragging(true);

    if (onLongPress) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        onLongPress();
      }, 320);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !pointerStartRef.current) return;

    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dy) > 5 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Dragging up (negative dy) increases value
    const pixelDelta = -dy;
    const speed = e.shiftKey ? 0.2 : 1.0;
    const valueDelta = (pixelDelta / Math.max(1, height - 24)) * range * speed;
    let nextVal = pointerStartRef.current.val + valueDelta;

    if (bipolar) {
      nextVal = applyMagneticCenterDetent(nextVal);
    } else {
      nextVal = Math.max(min, Math.min(max, nextVal));
    }

    // Step rounding
    const steps = Math.round((nextVal - min) / step);
    const steppedVal = min + steps * step;
    const clampedFinal = Math.max(min, Math.min(max, Number(steppedVal.toFixed(6))));

    if (clampedFinal !== effectiveValue) {
      onChange(clampedFinal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setIsDragging(false);
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore release capture errors
      }
    }
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    onChange(defaultValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (onLongPress && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
      e.preventDefault();
      onLongPress();
      return;
    }
    const multiplier = e.shiftKey ? 0.2 : 1.0;
    let nextVal = effectiveValue;

    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      nextVal = Math.min(max, effectiveValue + step * (e.key === 'PageUp' ? 10 : 1) * multiplier);
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      nextVal = Math.max(min, effectiveValue - step * (e.key === 'PageDown' ? 10 : 1) * multiplier);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextVal = min;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextVal = max;
    }

    if (bipolar) {
      const requested = nextVal;
      nextVal = applyMagneticCenterDetent(nextVal);
      // A keyboard step must be able to leave the magnetic center.
      if (effectiveValue === 0 && nextVal === 0 && requested !== 0) nextVal = Math.sign(requested) * 0.03;
      nextVal = Math.max(min, Math.min(max, nextVal));
    } else {
      nextVal = Math.max(min, Math.min(max, nextVal));
    }

    if (nextVal !== effectiveValue) {
      onChange(Number(nextVal.toFixed(6)));
    }
  };

  const displayString = formatValue
    ? formatValue(effectiveValue)
    : bipolar
    ? effectiveValue > 0
      ? `+${effectiveValue.toFixed(2)}${unit}`
      : `${effectiveValue.toFixed(2)}${unit}`
    : `${(effectiveValue * 100).toFixed(0)}%`;

  return (
    <div
      className={`flex flex-col items-center select-none ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      } ${className}`}
    >
      {/* Label */}
      <span
        title={label}
        className="text-[9.5px] uppercase tracking-wider text-neutral-600 dark:text-slate-400 font-medium mb-2.5 min-w-[56px] max-w-[84px] text-center leading-tight break-words line-clamp-2 select-none"
      >
        {label}
      </span>

      {/* Fader Track & Thumb */}
      <div
        ref={trackRef}
        id={id}
        role="slider"
        aria-orientation="vertical"
        aria-disabled={disabled}
        aria-haspopup={onLongPress ? 'dialog' : undefined}
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel || label}
        aria-valuenow={effectiveValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={displayString}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className="relative flex items-center justify-center cursor-pointer touch-none outline-none focus-visible:ring-1 focus-visible:ring-sky-500 min-w-[44px]"
        style={{ height }}
      >
        {/* Track Slot */}
        <div className="w-1.5 h-full rounded-full bg-neutral-200 border-neutral-300 dark:bg-neutral-900 dark:border-neutral-800 relative flex items-center justify-center">
          {/* Center Detent Line for Bipolar */}
          {bipolar && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-neutral-400 dark:bg-neutral-600 pointer-events-none" />
          )}

          {/* Active Fill Level */}
          {bipolar ? (
            <div
              className={`absolute left-0 right-0 rounded-full ${
                effectiveValue >= 0 ? 'bg-sky-500' : 'bg-violet-500'
              }`}
              style={{
                top: effectiveValue >= 0 ? `${(1 - norm) * 100}%` : '50%',
                bottom: effectiveValue >= 0 ? '50%' : `${bottomPct}%`
              }}
            />
          ) : (
            <div
              className="absolute left-0 right-0 bottom-0 bg-sky-500 rounded-full"
              style={{ height: `${bottomPct}%` }}
            />
          )}
        </div>

        {/* Serum-Style Modulation Depth Bar & Live Playhead on Side */}
        {assignedModulation && (
          <div className="absolute right-1.5 top-0 bottom-0 w-1 rounded-full bg-neutral-200/80 dark:bg-neutral-900/60 pointer-events-none">
            <div
              className="absolute left-0 right-0 rounded-full bg-sky-500/70 shadow-[0_0_6px_#0284c7]"
              style={{ top: `${modTopPct}%`, bottom: `${modBottomPct}%` }}
            />
            {hasLiveMod && (
              <div
                className="absolute -left-1.5 w-4 h-[2.5px] rounded-full bg-cyan-300 shadow-[0_0_8px_#00f0ff] z-10"
                style={{ bottom: `calc(${liveBottomPct}% - 1.25px)` }}
              />
            )}
          </div>
        )}

        {/* Fader Knob / Thumb Handle */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-8 h-4 rounded border shadow transition-transform ${
            isDragging
              ? 'scale-105 border-slate-400 bg-neutral-100 dark:border-slate-200 dark:bg-neutral-800'
              : assignedModulation
              ? 'border-sky-500 bg-white dark:bg-neutral-900 hover:border-sky-400'
              : 'border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-slate-400'
          }`}
          style={{
            bottom: `calc(${bottomPct}% - 8px)`
          }}
        >
          {/* Thumb Horizontal Grip Line */}
          <div
            className={`w-4 h-[1px] mx-auto my-[7px] ${
              assignedModulation ? 'bg-sky-500' : 'bg-neutral-400 dark:bg-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Value Readout */}
      <span className="mt-2.5 font-mono tabular-nums text-[11px] text-neutral-800 dark:text-slate-300 select-none">
        {displayString}
      </span>
    </div>
  );
};
