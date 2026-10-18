import React, { useEffect, useRef, useState } from 'react';

export function computeVuBars(val: number): { leftPct: number; rightPct: number } {
  const clamped = Math.max(-1.0, Math.min(1.0, val));
  const leftPct = clamped < 0 ? Math.abs(clamped) * 100 : 0;
  const rightPct = clamped > 0 ? clamped * 100 : 0;
  return { leftPct, rightPct };
}

export function updatePeak(currentVal: number, nowMs: number, lastPeak: number, lastTimestamp: number): { peak: number; timestamp: number } {
  const absVal = Math.abs(currentVal);
  if (absVal >= lastPeak || nowMs - lastTimestamp > 400) {
    return { peak: absVal, timestamp: nowMs };
  }
  return { peak: lastPeak, timestamp: lastTimestamp };
}

export interface BipolarVuMeterProps {
  value: number; // -1.0 .. +1.0
  label?: string;
  showPeakHold?: boolean;
  peakHoldDurationMs?: number;
  segments?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const BipolarVuMeter: React.FC<BipolarVuMeterProps> = ({
  value,
  label = 'MOD VU',
  showPeakHold = true,
  peakHoldDurationMs = 400,
  orientation = 'horizontal',
  className = ''
}) => {
  const [peak, setPeak] = useState<number>(Math.abs(value));
  const lastPeakTimeRef = useRef<number>(Date.now());
  const peakRef = useRef<number>(Math.abs(value));

  const clamped = Math.max(-1.0, Math.min(1.0, value));
  const { leftPct, rightPct } = computeVuBars(clamped);

  useEffect(() => {
    const now = Date.now();
    const absVal = Math.abs(clamped);

    if (absVal >= peakRef.current || now - lastPeakTimeRef.current > peakHoldDurationMs) {
      peakRef.current = absVal;
      lastPeakTimeRef.current = now;
      setPeak(absVal);
    }
  }, [clamped, peakHoldDurationMs]);

  const displayValue = clamped >= 0 ? `+${clamped.toFixed(2)}` : clamped.toFixed(2);
  const peakDisplay = `PEAK ${peak.toFixed(2)}`;

  if (orientation === 'vertical') {
    return (
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={-1}
        aria-valuemax={1}
        className={`flex flex-col items-center gap-1.5 select-none ${className}`}
      >
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          {label}
        </span>
        <div className="relative w-4 h-36 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-center overflow-hidden">
          {/* Center 0 Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-neutral-600 z-10" />

          {/* Top Bar (Positive) */}
          <div
            className="absolute left-0 right-0 bottom-1/2 bg-sky-500 origin-bottom transition-transform duration-75"
            style={{
              height: '50%',
              transform: `scaleY(${rightPct / 100})`
            }}
          />

          {/* Bottom Bar (Negative) */}
          <div
            className="absolute left-0 right-0 top-1/2 bg-violet-500 origin-top transition-transform duration-75"
            style={{
              height: '50%',
              transform: `scaleY(${leftPct / 100})`
            }}
          />
        </div>
        <span className="font-mono tabular-nums text-[10px] text-slate-300">
          {displayValue}
        </span>
      </div>
    );
  }

  // Default: Horizontal
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={-1}
      aria-valuemax={1}
      className={`flex flex-col gap-1 select-none ${className}`}
    >
      {/* Top Header Readouts */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="uppercase tracking-wider font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {showPeakHold && (
            <span className="font-mono tabular-nums text-slate-400 text-[9px]">
              {peakDisplay}
            </span>
          )}
          <span className="font-mono tabular-nums text-slate-200 font-semibold">
            {displayValue}
          </span>
        </div>
      </div>

      {/* Meter Bar Container */}
      <div className="relative h-4 bg-neutral-950 border border-neutral-800 rounded px-0.5 flex items-center overflow-hidden">
        {/* Left (Negative) Half */}
        <div className="relative flex-1 h-2 flex justify-end overflow-hidden">
          <div
            className="h-full bg-violet-500 origin-right transition-transform duration-75"
            style={{
              width: '100%',
              transform: `scaleX(${leftPct / 100})`
            }}
          />
        </div>

        {/* Center Zero Divider */}
        <div className="w-[1.5px] h-3 bg-slate-300 z-10 shrink-0" />

        {/* Right (Positive) Half */}
        <div className="relative flex-1 h-2 flex justify-start overflow-hidden">
          <div
            className="h-full bg-sky-500 origin-left transition-transform duration-75"
            style={{
              width: '100%',
              transform: `scaleX(${rightPct / 100})`
            }}
          />
        </div>

        {/* Peak Hold Indicator Bar */}
        {showPeakHold && peak > 0.02 && (
          <div
            className="absolute top-0.5 bottom-0.5 w-[2px] bg-sky-400 pointer-events-none transition-all duration-100"
            style={{
              left: clamped >= 0 ? `calc(50% + ${peak * 50}% - 1px)` : `calc(50% - ${peak * 50}% - 1px)`
            }}
          />
        )}
      </div>

      {/* Axis Scale Ticks */}
      <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
        <span>-1.0</span>
        <span>-0.5</span>
        <span className="text-slate-300 font-medium">0.0</span>
        <span>+0.5</span>
        <span>+1.0</span>
      </div>
    </div>
  );
};
