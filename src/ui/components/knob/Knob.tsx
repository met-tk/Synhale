import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { ModulationRoute, BreathStage } from '../../../types';

export function isLongPressKnob(dx: number, dy: number, holdDurationMs: number): boolean {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 5.0) return false;
  return holdDurationMs >= 320;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  if (Math.abs(endAngle - startAngle) < 0.5) {
    return '';
  }
  const actualStart = Math.min(startAngle, endAngle);
  const actualEnd = Math.max(startAngle, endAngle);
  const start = polarToCartesian(cx, cy, r, actualEnd);
  const end = polarToCartesian(cx, cy, r, actualStart);
  const largeArcFlag = actualEnd - actualStart <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export interface KnobProps {
  id: string;
  label: string;
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  size?: number;
  bipolar?: boolean;
  disabled?: boolean;
  assignedModulation?: ModulationRoute;
  breathStage?: BreathStage;
  liveModOffset?: number;
  onChange: (val: number) => void;
  onLongPress?: () => void;
  formatValue?: (val: number) => string;
  className?: string;
}

export const Knob: React.FC<KnobProps> = ({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  unit = '',
  size = 48,
  bipolar = false,
  disabled = false,
  assignedModulation,
  breathStage,
  liveModOffset,
  onChange,
  onLongPress,
  formatValue,
  className = ''
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number; val: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const effectiveDefault = defaultValue ?? (bipolar ? 0 : min);

  // Clamp value to [min, max]
  const clampedValue = Math.min(max, Math.max(min, value));
  const range = max - min;
  const norm = range === 0 ? 0 : Math.max(0, Math.min(1, (clampedValue - min) / range));

  // Angles: 225 deg (bottom-left) to 495 deg (bottom-right, 270 deg total)
  const startAngle = 225;
  const totalSweep = 270;
  const currentAngle = startAngle + norm * totalSweep;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore in environments without pointer capture support
      }
    }

    const startTime = Date.now();
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      val: clampedValue,
      time: startTime
    };
    isDraggingRef.current = false;
    setIsActive(true);

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (pointerStartRef.current && !isDraggingRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {
            // Ignore vibration errors
          }
        }
        onLongPress?.();
      }
    }, 320);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !pointerStartRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5.0) {
      clearLongPressTimer();
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      // Dragging up (negative dy) increases value; dragging right (positive dx) also helps
      const pixelDelta = -dy;
      const speed = e.shiftKey ? 0.2 : 1.0;
      const pixelsForFullRange = 150;
      const valueChange = (pixelDelta / pixelsForFullRange) * range * speed;
      const rawNewVal = pointerStartRef.current.val + valueChange;

      // Quantize to step
      const steps = Math.round((rawNewVal - min) / step);
      const steppedVal = min + steps * step;
      const finalVal = Math.min(max, Math.max(min, Number(steppedVal.toFixed(6))));

      if (finalVal !== clampedValue) {
        onChange(finalVal);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearLongPressTimer();
    pointerStartRef.current = null;
    isDraggingRef.current = false;
    setIsActive(false);
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
    onChange(effectiveDefault);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const multiplier = e.shiftKey ? 10 : 1;
    let nextVal = clampedValue;

    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextVal = Math.min(max, clampedValue + step * multiplier);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextVal = Math.max(min, clampedValue - step * multiplier);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextVal = min;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextVal = max;
    }

    if (nextVal !== clampedValue) {
      onChange(Number(nextVal.toFixed(6)));
    }
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  // Formatted string
  const displayString = formatValue
    ? formatValue(clampedValue)
    : step >= 1
    ? `${Math.round(clampedValue)}${unit}`
    : `${clampedValue.toFixed(2)}${unit}`;

  // SVG Geometry
  const cx = size / 2;
  const cy = size / 2;
  // Base knob dial radius
  const radius = (size / 2) - 6;
  const bgArc = describeArc(cx, cy, radius, startAngle, startAngle + totalSweep);

  let activeArc = '';
  if (bipolar) {
    const centerAngle = startAngle + totalSweep / 2;
    if (currentAngle >= centerAngle) {
      activeArc = describeArc(cx, cy, radius, centerAngle, currentAngle);
    } else {
      activeArc = describeArc(cx, cy, radius, currentAngle, centerAngle);
    }
  } else {
    activeArc = describeArc(cx, cy, radius, startAngle, currentAngle);
  }

  const needleEnd = polarToCartesian(cx, cy, radius - 4, currentAngle);

  // Dedicated Serum outer orbital modulation ring radius (spaced cleanly away from knob body)
  const modRadius = (size / 2) - 1.5;
  const bgModArc = describeArc(cx, cy, modRadius, startAngle, startAngle + totalSweep);

  // Modulation Depth Arc (Visual indication of the assigned modulation span)
  let modArc = '';
  let baseModAnchorPos: { x: number; y: number } | null = null;
  if (assignedModulation) {
    baseModAnchorPos = polarToCartesian(cx, cy, modRadius, currentAngle);
    const modDepth = assignedModulation.depth;
    const isBipolarMod = assignedModulation.bipolar ?? true;
    let modStart = currentAngle;
    let modEnd = currentAngle;
    if (isBipolarMod) {
      const halfSweep = (modDepth * totalSweep) / 2;
      modStart = Math.max(startAngle, currentAngle - halfSweep);
      modEnd = Math.min(startAngle + totalSweep, currentAngle + halfSweep);
    } else {
      const sweep = modDepth * totalSweep;
      if (sweep >= 0) {
        modStart = currentAngle;
        modEnd = Math.min(startAngle + totalSweep, currentAngle + sweep);
      } else {
        modStart = Math.max(startAngle, currentAngle + sweep);
        modEnd = currentAngle;
      }
    }
    if (Math.abs(modEnd - modStart) > 1) {
      modArc = describeArc(cx, cy, modRadius, modStart, modEnd);
    }
  }

  // Live animated modulation position & Serum dynamic live sweep arc
  let liveIndicatorPos: { x: number; y: number } | null = null;
  let liveSweepArc = '';
  if (assignedModulation) {
    const offset = liveModOffset !== undefined ? liveModOffset : 0;
    const isBipolarMod = assignedModulation.bipolar ?? true;
    const sweepRange = isBipolarMod
      ? (assignedModulation.depth * totalSweep) / 2
      : assignedModulation.depth * totalSweep;
    const liveAngle = Math.max(
      startAngle,
      Math.min(startAngle + totalSweep, currentAngle + offset * sweepRange)
    );
    liveIndicatorPos = polarToCartesian(cx, cy, modRadius, liveAngle);

    // Serum Dynamic Live Sweep Arc between current base angle and live modulated angle
    if (Math.abs(liveAngle - currentAngle) > 0.8) {
      liveSweepArc = describeArc(cx, cy, modRadius, currentAngle, liveAngle);
    }
  }

  // Distinct visual styling based on breath stage
  const getBreathStageGlow = () => {
    if (!breathStage) return '';
    switch (breathStage) {
      case 'inhale':
        return 'drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]';
      case 'holdIn':
        return 'drop-shadow-[0_0_8px_rgba(129,140,248,0.7)]';
      case 'exhale':
        return 'drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]';
      case 'holdOut':
        return 'drop-shadow-[0_0_2px_rgba(148,163,184,0.3)]';
      default:
        return '';
    }
  };

  return (
    <div
      className={`flex flex-col items-center select-none ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      {/* Knob Dial Container */}
      <div
        ref={knobRef}
        id={id}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel || label}
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={displayString}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={`relative flex items-center justify-center cursor-ns-resize touch-none outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded-full min-w-[44px] min-h-[44px] transition-transform ${
          isActive ? 'scale-[1.02]' : ''
        }`}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* 1. Base Knob Track Arc */}
          <path
            d={bgArc}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="text-neutral-300 dark:text-neutral-800"
          />

          {/* 2. Base Knob Active Arc (Current Value) */}
          {activeArc && (
            <path
              d={activeArc}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              className={`text-slate-700 dark:text-slate-300 ${getBreathStageGlow()}`}
            />
          )}

          {/* 3. Outer Serum Modulation Slot Track (when modulated) */}
          {assignedModulation && (
            <path
              d={bgModArc}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              className="text-neutral-300 dark:text-neutral-800"
            />
          )}

          {/* 4. Modulation Depth Span Arc (illuminated range track) */}
          {modArc && (
            <path
              d={modArc}
              fill="none"
              stroke="#0284c7"
              strokeWidth={3.5}
              strokeOpacity={0.65}
              strokeLinecap="round"
              className="drop-shadow-[0_0_4px_rgba(2,132,199,0.5)]"
            />
          )}

          {/* 5. Dial Center Face */}
          <circle
            cx={cx}
            cy={cy}
            r={radius - 6}
            className="fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-800"
            strokeWidth={1}
          />

          {/* 6. Center Needle Line */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-neutral-900 dark:text-slate-100"
          />

          {/* 7. TOP LAYER: Serum Dynamic Live Sweep Arc (high-voltage neon cyan beam) */}
          {liveSweepArc && (
            <path
              d={liveSweepArc}
              fill="none"
              stroke="#00f0ff"
              strokeWidth={4}
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(0,240,255,0.95)]"
            />
          )}

          {/* 8. Base Modulation Origin Anchor Dot */}
          {baseModAnchorPos && (
            <circle
              cx={baseModAnchorPos.x}
              cy={baseModAnchorPos.y}
              r={2}
              className="fill-sky-400 drop-shadow-[0_0_4px_#38bdf8]"
            />
          )}

          {/* 9. Live Modulation Animated Playhead Indicator Dot (Serum Bead) */}
          {liveIndicatorPos && (
            <circle
              cx={liveIndicatorPos.x}
              cy={liveIndicatorPos.y}
              r={3.8}
              className="fill-white stroke-[#00f0ff] drop-shadow-[0_0_10px_#00f0ff]"
              strokeWidth={2}
            />
          )}

          {/* Modulation Indicator Center Dot */}
          {assignedModulation && (
            <circle
              cx={cx}
              cy={cy + radius - 2}
              r={1.5}
              className="fill-sky-400 drop-shadow-[0_0_4px_#38bdf8]"
            />
          )}
        </svg>
      </div>

      {/* Label & Value Readout */}
      <div className="mt-1 flex flex-col items-center">
        <span
          title={label}
          className="text-[9.5px] uppercase tracking-wider text-neutral-600 dark:text-slate-400 font-medium text-center min-w-[56px] max-w-[82px] leading-tight break-words line-clamp-2"
        >
          {label}
        </span>
        <span className="font-mono tabular-nums text-[11px] text-neutral-900 dark:text-slate-200">
          {displayString}
        </span>
      </div>
    </div>
  );
};
