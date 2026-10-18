/**
 * Synhale 2 - Breath Macro Timeline Scope (Dedicated Stage Envelope Visualizer)
 * 
 * High-precision minimalist industrial respiratory oscilloscope displaying the real-time
 * continuous 4-stage MSEG envelope curve (Inhale -> Hold In -> Exhale -> Hold Out)
 * configured for the Master Volume and audio engine.
 * 
 * Truly renders the actual Stage Env envelope curve (supports Smooth, Linear, Step modes)
 * and tracks the laser playhead along the real mathematical trajectory.
 * 
 * Strict industrial aesthetics: 100% zero emoji, 1px lines, high contrast.
 * Preserves role="meter", aria-label="Breath Macro VU" for 100% test compatibility.
 */

import React from 'react';
import type { BreathStage, FullBreathCurveData } from '../../../types';
import { evaluateFullBreathCurve } from '../../../audio/dsp/curveMath';

export interface BreathMacroTimelineScopeProps {
  value: number; // 0.0 to 1.0 (breathMacro or activeModulationValue)
  breathStage?: BreathStage;
  stageProgress?: number;
  isPlaying?: boolean;
  stageMultipliers?: {
    inhale: number;
    holdIn: number;
    exhale: number;
    holdOut: number;
    curve?: 'smooth' | 'linear' | 'step';
  };
  curveData?: FullBreathCurveData;
  label?: string;
  className?: string;
  isDark?: boolean;
  onClick?: () => void;
}

export const BreathMacroTimelineScope: React.FC<BreathMacroTimelineScopeProps> = ({
  value,
  breathStage = 'inhale',
  stageProgress = 0,
  isPlaying = false,
  stageMultipliers,
  curveData,
  label = 'STAGE ENVELOPE',
  className = '',
  isDark = true,
  onClick
}) => {
  const clampedVal = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  const progress = Number.isFinite(stageProgress) ? Math.max(0, Math.min(1, stageProgress)) : 0;

  // Visual dimensions
  const width = 240;
  const height = 36;
  const padX = 6;
  const topY = 6;
  const botY = 30;
  const hRange = botY - topY; // 24px vertical dynamic range
  const graphW = width - padX * 2; // 228px
  const stepW = graphW / 4; // 57px per stage: Inhale, Hold In, Exhale, Hold Out

  // Sanitize stage multipliers from active Stage Env
  const mults = {
    inhale: Math.max(0, Math.min(1, stageMultipliers?.inhale ?? 1.0)),
    holdIn: Math.max(0, Math.min(1, stageMultipliers?.holdIn ?? 0.85)),
    exhale: Math.max(0, Math.min(1, stageMultipliers?.exhale ?? 0.25)),
    holdOut: Math.max(0, Math.min(1, stageMultipliers?.holdOut ?? 0.05)),
    curve: stageMultipliers?.curve ?? 'smooth'
  };
  const curveMode = mults.curve;

  const getY = (val: number) => botY - Math.max(0, Math.min(1, val)) * hRange;

  const yIn = getY(mults.inhale);
  const yHoldIn = getY(mults.holdIn);
  const yEx = getY(mults.exhale);
  const yHoldOut = getY(mults.holdOut);

  // Stage colors
  const stageColors: Record<BreathStage, { stroke: string; glow: string; name: string }> = {
    inhale: { stroke: '#38bdf8', glow: '#38bdf8', name: '吸气 Inhale' },
    holdIn: { stroke: '#818cf8', glow: '#818cf8', name: '屏息 Hold In' },
    exhale: { stroke: '#c084fc', glow: '#c084fc', name: '呼气 Exhale' },
    holdOut: { stroke: '#94a3b8', glow: '#94a3b8', name: '静息 Hold Out' }
  };

  const currentTheme = stageColors[breathStage] ?? stageColors.inhale;

  // Horizontal coordinates for 4 stages
  const x0 = padX;
  const x1 = padX + stepW;
  const x2 = padX + stepW * 2;
  const x3 = padX + stepW * 3;
  const x4 = padX + graphW;

  // Continuous Stage Env Path based on custom curveData or selected curve interpolation mode
  let pathD = '';
  if (curveData) {
    const points: string[] = [];
    const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
    stages.forEach((stg, stgIdx) => {
      const segX0 = padX + stgIdx * stepW;
      for (let s = 0; s <= 16; s++) {
        const u = s / 16;
        const x = segX0 + u * stepW;
        const val = evaluateFullBreathCurve(curveData, stg, u);
        const y = getY(val);
        points.push(`${points.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
    });
    pathD = points.join(' ');
  } else if (curveMode === 'smooth') {
    pathD =
      `M ${x0} ${yHoldOut} ` +
      `C ${x0 + stepW * 0.45} ${yHoldOut}, ${x0 + stepW * 0.55} ${yIn}, ${x1} ${yIn} ` +
      `C ${x1 + stepW * 0.45} ${yIn}, ${x1 + stepW * 0.55} ${yHoldIn}, ${x2} ${yHoldIn} ` +
      `C ${x2 + stepW * 0.45} ${yHoldIn}, ${x2 + stepW * 0.55} ${yEx}, ${x3} ${yEx} ` +
      `C ${x3 + stepW * 0.45} ${yEx}, ${x3 + stepW * 0.55} ${yHoldOut}, ${x4} ${yHoldOut}`;
  } else if (curveMode === 'linear') {
    pathD = `M ${x0} ${yHoldOut} L ${x1} ${yIn} L ${x2} ${yHoldIn} L ${x3} ${yEx} L ${x4} ${yHoldOut}`;
  } else {
    // step mode
    pathD = `M ${x0} ${yIn} L ${x1} ${yIn} L ${x1} ${yHoldIn} L ${x2} ${yHoldIn} L ${x2} ${yEx} L ${x3} ${yEx} L ${x3} ${yHoldOut} L ${x4} ${yHoldOut}`;
  }

  const areaD = `${pathD} L ${x4} ${height} L ${x0} ${height} Z`;

  // Real-time laser playhead position faithfully aligned with curve trajectory
  const prevTarget =
    breathStage === 'inhale'
      ? mults.holdOut
      : breathStage === 'holdIn'
      ? mults.inhale
      : breathStage === 'exhale'
      ? mults.holdIn
      : mults.exhale;
  const currTarget = mults[breathStage as keyof typeof mults] as number;

  let liveMultiplier = currTarget;
  if (curveData) {
    liveMultiplier = evaluateFullBreathCurve(curveData, breathStage, progress);
  } else if (curveMode === 'smooth') {
    const t = 0.5 * (1 - Math.cos(Math.PI * progress));
    liveMultiplier = (1 - t) * prevTarget + t * currTarget;
  } else if (curveMode === 'linear') {
    liveMultiplier = (1 - progress) * prevTarget + progress * currTarget;
  } else {
    liveMultiplier = currTarget;
  }

  let playheadX = x0;
  if (breathStage === 'inhale') {
    playheadX = x0 + progress * stepW;
  } else if (breathStage === 'holdIn') {
    playheadX = x1 + progress * stepW;
  } else if (breathStage === 'exhale') {
    playheadX = x2 + progress * stepW;
  } else {
    playheadX = x3 + progress * stepW;
  }
  const playheadY = getY(liveMultiplier);

  return (
    <div
      role="meter"
      aria-label="Breath Macro VU"
      aria-valuenow={clampedVal}
      aria-valuemin={0}
      aria-valuemax={1}
      title="Master Volume Stage Envelope · 点击打开主音量 4 阶段包络线编辑器"
      onClick={onClick}
      className={`group relative flex flex-col justify-center rounded-lg border p-1.5 shadow-inner select-none transition-all cursor-pointer hover:border-sky-500/70 active:scale-[0.99] ${
        isDark
          ? 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900/80 text-slate-100'
          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-sm'
      } ${className}`}
    >
      {/* Top Header Label: Exclusively identifies Stage Envelope */}
      <div className="flex items-center justify-between text-[9px] font-mono leading-none mb-1 px-1">
        <span className={`uppercase tracking-wider flex items-center gap-1 ${
          isDark ? 'text-slate-400' : 'text-neutral-500'
        }`}>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isPlaying ? 'bg-sky-400/80 animate-pulse' : 'bg-slate-500'
            }`}
          />
          {label} · {currentTheme.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] group-hover:text-sky-400 transition-colors ${
            isDark ? 'text-slate-500' : 'text-neutral-400'
          }`}>
            [点击调节]
          </span>
          <span className={`font-semibold tabular-nums ${
            isDark ? 'text-sky-300' : 'text-sky-600'
          }`}>
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* Waveform Scope SVG */}
      <div className={`relative w-full h-8 overflow-hidden rounded border ${
        isDark ? 'bg-neutral-900/60 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="breath-stage-scope-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={currentTheme.stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={currentTheme.stroke} stopOpacity={0.03} />
            </linearGradient>
          </defs>

          {/* Vertical Partition Lines between the 4 Breath Stages */}
          <line x1={x1} y1={topY} x2={x1} y2={botY} stroke={isDark ? "#262626" : "#e5e5e5"} strokeDasharray="2,2" strokeWidth={1} />
          <line x1={x2} y1={topY} x2={x2} y2={botY} stroke={isDark ? "#262626" : "#e5e5e5"} strokeDasharray="2,2" strokeWidth={1} />
          <line x1={x3} y1={topY} x2={x3} y2={botY} stroke={isDark ? "#262626" : "#e5e5e5"} strokeDasharray="2,2" strokeWidth={1} />

          {/* Filled Envelope Area with Stage Gradient */}
          <path d={areaD} fill="url(#breath-stage-scope-grad)" />

          {/* Real Stage Envelope Contour Line */}
          <path
            d={pathD}
            fill="none"
            stroke={currentTheme.stroke}
            strokeWidth={1.5}
            className="transition-all duration-75"
          />

          {/* Vertical Laser tracking guide line */}
          <line
            x1={playheadX}
            y1={topY - 2}
            x2={playheadX}
            y2={botY + 2}
            stroke={currentTheme.stroke}
            strokeWidth={1}
            strokeDasharray="2,1"
          />

          {/* Real-time Laser tracking playhead bead positioned accurately on envelope */}
          <circle
            cx={playheadX}
            cy={playheadY}
            r={3.5}
            fill="#ffffff"
            stroke={currentTheme.stroke}
            strokeWidth={1.5}
            className="drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]"
          />
        </svg>
      </div>
    </div>
  );
};
