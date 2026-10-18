import React, { useMemo } from 'react';
import type { FilterType } from '../../../types/audio';

interface FilterVisualizerProps {
  type: FilterType;
  cutoff: number;
  resonance: number;
  liveModCutoff?: number;
  liveModResonance?: number;
  isDark: boolean;
  className?: string;
}

/**
 * Computes frequency response magnitude (in normalized Y: 0=top +18dB, 1=bottom -42dB)
 * for a cascaded 4-pole dual biquad filter.
 */
function computeResponsePoint(
  freq: number,
  type: FilterType,
  cutoff: number,
  resonance: number
): number {
  const safeCutoff = Math.max(20, Math.min(20000, cutoff));
  const safeQ = Math.max(0.1, Math.min(18.0, resonance));
  const stageQ = Math.sqrt(safeQ);
  const ratio = freq / safeCutoff;

  let gainDb = 0;

  switch (type) {
    case 'lowpass': {
      // 4-pole cascaded lowpass (-24dB/oct)
      // |H(s)| = 1 / sqrt((1 - ratio^2)^2 + (ratio / stageQ)^2)^2
      const denomSingle = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / stageQ, 2));
      const mag = 1.0 / Math.max(0.0001, denomSingle * denomSingle);
      gainDb = 20 * Math.log10(Math.max(0.0001, mag));
      break;
    }

    case 'highpass': {
      // 4-pole cascaded highpass (+24dB/oct roll-off below cutoff)
      const num = Math.pow(ratio, 4);
      const denomSingle = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / stageQ, 2));
      const mag = num / Math.max(0.0001, denomSingle * denomSingle);
      gainDb = 20 * Math.log10(Math.max(0.0001, mag));
      break;
    }

    case 'bandpass': {
      // 2-pole cascaded bandpass
      const num = ratio / stageQ;
      const denomSingle = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / stageQ, 2));
      const magSingle = num / Math.max(0.0001, denomSingle);
      const mag = magSingle * magSingle;
      gainDb = 20 * Math.log10(Math.max(0.0001, mag));
      break;
    }

    case 'notch': {
      // Band-reject notch
      const num = Math.abs(1 - ratio * ratio);
      const denom = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / (stageQ * 1.5), 2));
      const magSingle = num / Math.max(0.0001, denom);
      const mag = magSingle * magSingle;
      gainDb = 20 * Math.log10(Math.max(0.0001, mag));
      break;
    }

    case 'peak': {
      // Bell-shaped peaking filter
      const peakBoostDb = Math.min(18, safeQ * 3.5);
      const bandwidth = Math.max(0.15, 1.2 / stageQ);
      const octDiff = Math.abs(Math.log2(Math.max(0.0001, ratio)));
      const bell = Math.exp(-Math.pow(octDiff / bandwidth, 2));
      gainDb = peakBoostDb * bell;
      break;
    }

    case 'ladder': {
      // Moog 24dB ladder emulation (steep resonance with slight warm roll-off)
      const ladderQ = stageQ * 1.35;
      const denomSingle = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / ladderQ, 2));
      const mag = 1.0 / Math.max(0.0001, denomSingle * denomSingle);
      gainDb = 20 * Math.log10(Math.max(0.0001, mag));
      // Subtle warmth roll-off above 8kHz
      if (freq > 8000) {
        gainDb -= 4 * Math.log2(freq / 8000);
      }
      break;
    }
  }

  // Clamp gain range [-40dB .. +18dB] and map to Y: 0 (top: +18dB) .. 1 (bottom: -40dB)
  const clampedDb = Math.max(-40, Math.min(18, gainDb));
  const normY = (18 - clampedDb) / 58; // 18 - (-40) = 58dB span
  return Math.max(0.02, Math.min(0.98, normY));
}

export const FilterVisualizer: React.FC<FilterVisualizerProps> = ({
  type,
  cutoff,
  resonance,
  liveModCutoff,
  liveModResonance,
  isDark,
  className = ''
}) => {
  const effectiveCutoff = liveModCutoff !== undefined ? liveModCutoff : cutoff;
  const effectiveResonance = liveModResonance !== undefined ? liveModResonance : resonance;

  const width = 200;
  const height = 58;

  // Compute SVG path across 64 logarithmic frequency points from 20Hz to 20kHz
  const { pathData, areaPathData, cutoffX, cutoffY, isModulated } = useMemo(() => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const logSpan = maxLog - minLog;
    const numPoints = 64;

    const points: Array<[number, number]> = [];

    for (let i = 0; i <= numPoints; i++) {
      const logFreq = minLog + (i / numPoints) * logSpan;
      const freq = Math.pow(10, logFreq);
      const x = (i / numPoints) * width;
      const normY = computeResponsePoint(freq, type, effectiveCutoff, effectiveResonance);
      const y = normY * height;
      points.push([x, y]);
    }

    // Build SVG path
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)}`;
    }

    const areaD = `${d} L ${width} ${height} L 0 ${height} Z`;

    // Calculate current cutoff marker position
    const cutoffLog = Math.log10(Math.max(20, Math.min(20000, effectiveCutoff)));
    const cX = Math.max(2, Math.min(width - 2, ((cutoffLog - minLog) / logSpan) * width));
    const cNormY = computeResponsePoint(effectiveCutoff, type, effectiveCutoff, effectiveResonance);
    const cY = cNormY * height;

    const diff = Math.abs(effectiveCutoff - cutoff);
    const modulated = diff > 8 || Math.abs(effectiveResonance - resonance) > 0.05;

    return {
      pathData: d,
      areaPathData: areaD,
      cutoffX: cX,
      cutoffY: cY,
      isModulated: modulated
    };
  }, [type, effectiveCutoff, effectiveResonance, cutoff, resonance]);

  const typeLabels: Record<FilterType, string> = {
    lowpass: 'LP 24dB',
    highpass: 'HP 24dB',
    bandpass: 'BP 12dB',
    notch: 'NOTCH',
    peak: 'PEAK BELL',
    ladder: 'Ladder 24dB'
  };

  return (
    <div
      className={`relative rounded-md border overflow-hidden select-none transition-colors duration-200 ${
        isDark
          ? 'bg-neutral-950/90 border-neutral-800/80 shadow-inner'
          : 'bg-slate-50/90 border-neutral-200/90 shadow-2xs'
      } ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Filter Frequency Response Scope"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="filterAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? '0.22' : '0.18'} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="modBeadGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {/* Subtle Decibel / Octave Grid Lines */}
        <line
          x1="0"
          y1={height * 0.31}
          x2={width}
          y2={height * 0.31}
          stroke={isDark ? '#262626' : '#e2e8f0'}
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
        <line
          x1={width * 0.33}
          y1="0"
          x2={width * 0.33}
          y2={height}
          stroke={isDark ? '#1f2937' : '#f1f5f9'}
          strokeWidth="0.8"
          strokeDasharray="2 4"
        />
        <line
          x1={width * 0.67}
          y1="0"
          x2={width * 0.67}
          y2={height}
          stroke={isDark ? '#1f2937' : '#f1f5f9'}
          strokeWidth="0.8"
          strokeDasharray="2 4"
        />

        {/* Shaded Response Area */}
        <path d={areaPathData} fill="url(#filterAreaGrad)" />

        {/* Dynamic Cutoff Vertical Guide & Modulation Pulse */}
        <line
          x1={cutoffX}
          y1="0"
          x2={cutoffX}
          y2={height}
          stroke={isModulated ? '#22d3ee' : isDark ? '#38bdf8' : '#0284c7'}
          strokeWidth={isModulated ? '1.4' : '1.0'}
          strokeDasharray={isModulated ? '3 2' : 'none'}
          strokeOpacity={isModulated ? '0.85' : '0.45'}
        />

        {/* Response Curve Stroke */}
        <path
          d={pathData}
          fill="none"
          stroke={isModulated ? '#38bdf8' : isDark ? '#7dd3fc' : '#0284c7'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Resonance / Cutoff Peak Bead */}
        <circle
          cx={cutoffX}
          cy={cutoffY}
          r={isModulated ? '3.2' : '2.5'}
          fill="url(#modBeadGrad)"
          stroke={isDark ? '#09090b' : '#ffffff'}
          strokeWidth="1.2"
          className="transition-transform duration-75"
        />
      </svg>

      {/* Top Left HUD: Mode & Slope Badge */}
      <div className="absolute top-1 left-1.5 flex items-center gap-1 pointer-events-none">
        <span
          className={`text-[9px] font-mono tracking-wider px-1 py-0.5 rounded leading-none ${
            isDark
              ? 'bg-neutral-900/80 text-sky-400 border border-neutral-800/80'
              : 'bg-white/80 text-sky-600 border border-neutral-200'
          }`}
        >
          {typeLabels[type]}
        </span>
      </div>

      {/* Bottom Right HUD: Instant Modulated Frequency & Q */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-1.5 pointer-events-none">
        <span
          className={`text-[9px] font-mono ${
            isModulated
              ? 'text-cyan-400 font-semibold animate-pulse'
              : isDark
              ? 'text-neutral-400'
              : 'text-neutral-600'
          }`}
        >
          {isModulated ? 'MOD ' : ''}
          {effectiveCutoff >= 1000
            ? `${(effectiveCutoff / 1000).toFixed(1)}k Hz`
            : `${Math.round(effectiveCutoff)} Hz`}
        </span>
        <span className={`text-[8px] font-mono ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Q:{effectiveResonance.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
