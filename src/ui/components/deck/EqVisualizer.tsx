/**
 * Synhale 2 - EqVisualizer
 * 
 * Interactive 4-Band Parametric Equalizer Visualizer Scope.
 * Features:
 * - 20Hz ~ 20kHz logarithmic frequency scale (3 decades)
 * - -18dB ~ +18dB linear gain scale
 * - Analytical biquad transfer function magnitude calculation
 * - 4 draggable frequency & gain control handles with hover readouts
 * - Double-click to reset band, touch/mouse dragging support
 * - S6 industrial aesthetics: 100% zero emoji, cold tech sky/aurora palette
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import type { EqParams, EqBandConfig } from '../../../types/audio';
import { DEFAULT_EQ_PARAMS } from '../../../types/audio';

export interface EqVisualizerProps {
  params?: EqParams;
  onChange?: (newParams: Partial<EqParams>) => void;
  isDark?: boolean;
  height?: number;
  className?: string;
}

type BandKey = 'low' | 'midLow' | 'midHigh' | 'high';

interface BandInfo {
  key: BandKey;
  label: string;
  color: string;
  minFreq: number;
  maxFreq: number;
  defaultFreq: number;
  defaultGain: number;
}

const BANDS: BandInfo[] = [
  { key: 'low', label: 'LOW', color: '#38bdf8', minFreq: 20, maxFreq: 500, defaultFreq: 80, defaultGain: 0 },
  { key: 'midLow', label: '432Hz', color: '#2dd4bf', minFreq: 100, maxFreq: 2000, defaultFreq: 432, defaultGain: 0 },
  { key: 'midHigh', label: '2.1k', color: '#67e8f9', minFreq: 500, maxFreq: 8000, defaultFreq: 2160, defaultGain: 0 },
  { key: 'high', label: 'HIGH', color: '#818cf8', minFreq: 2000, maxFreq: 20000, defaultFreq: 8000, defaultGain: 0 }
];

// Analytical Biquad Coefficients
interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

function computeFilterCoeffs(band: BandKey, config: EqBandConfig & { type?: 'lowshelf' | 'highpass' }, fs = 44100): BiquadCoeffs {
  const f0 = Math.max(10, Math.min(fs * 0.49, config.frequency));
  const gain = config.gain;
  const q = Math.max(0.1, config.q);
  const w0 = (2 * Math.PI * f0) / fs;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);

  if (band === 'low' && config.type === 'highpass') {
    const alpha = sinW / (2 * q);
    return {
      b0: (1 + cosW) / 2,
      b1: -(1 + cosW),
      b2: (1 + cosW) / 2,
      a0: 1 + alpha,
      a1: -2 * cosW,
      a2: 1 - alpha
    };
  }

  if (band === 'low') {
    // Low Shelf
    const A = Math.pow(10, gain / 40);
    const alpha = (sinW / 2) * Math.SQRT2;
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    return {
      b0: A * ((A + 1) - (A - 1) * cosW + twoSqrtAAlpha),
      b1: 2 * A * ((A - 1) - (A + 1) * cosW),
      b2: A * ((A + 1) - (A - 1) * cosW - twoSqrtAAlpha),
      a0: (A + 1) + (A - 1) * cosW + twoSqrtAAlpha,
      a1: -2 * ((A - 1) + (A + 1) * cosW),
      a2: (A + 1) + (A - 1) * cosW - twoSqrtAAlpha
    };
  }

  if (band === 'high') {
    // High Shelf
    const A = Math.pow(10, gain / 40);
    const alpha = (sinW / 2) * Math.SQRT2;
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    return {
      b0: A * ((A + 1) + (A - 1) * cosW + twoSqrtAAlpha),
      b1: -2 * A * ((A - 1) + (A + 1) * cosW),
      b2: A * ((A + 1) + (A - 1) * cosW - twoSqrtAAlpha),
      a0: (A + 1) - (A - 1) * cosW + twoSqrtAAlpha,
      a1: 2 * ((A - 1) - (A + 1) * cosW),
      a2: (A + 1) - (A - 1) * cosW - twoSqrtAAlpha
    };
  }

  // Peaking EQ for midLow and midHigh
  const A = Math.pow(10, gain / 40);
  const alpha = sinW / (2 * q);
  return {
    b0: 1 + alpha * A,
    b1: -2 * cosW,
    b2: 1 - alpha * A,
    a0: 1 + alpha / A,
    a1: -2 * cosW,
    a2: 1 - alpha / A
  };
}

function evaluateBiquadDb(coeffs: BiquadCoeffs, f: number, fs = 44100): number {
  const phi = (2 * Math.PI * f) / fs;
  const cos1 = Math.cos(phi);
  const cos2 = Math.cos(2 * phi);
  const sin1 = Math.sin(phi);
  const sin2 = Math.sin(2 * phi);

  const numReal = coeffs.b0 + coeffs.b1 * cos1 + coeffs.b2 * cos2;
  const numImag = -(coeffs.b1 * sin1 + coeffs.b2 * sin2);
  const denReal = coeffs.a0 + coeffs.a1 * cos1 + coeffs.a2 * cos2;
  const denImag = -(coeffs.a1 * sin1 + coeffs.a2 * sin2);

  const numMagSq = numReal * numReal + numImag * numImag;
  const denMagSq = denReal * denReal + denImag * denImag;

  if (denMagSq < 1e-14) return 0;
  const magSq = numMagSq / denMagSq;
  return 10 * Math.log10(Math.max(1e-12, magSq));
}

export const EqVisualizer: React.FC<EqVisualizerProps> = ({
  params = DEFAULT_EQ_PARAMS,
  onChange,
  isDark = true,
  height = 120,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDragBand, setActiveDragBand] = useState<BandKey | null>(null);
  const [hoveredBand, setHoveredBand] = useState<BandKey | null>(null);

  const svgWidth = 400; // Virtual coordinate width
  const svgHeight = height;

  // Coordinate conversions: 20Hz ~ 20kHz logarithmic X axis
  const freqToX = useCallback((f: number): number => {
    const clampedF = Math.max(20, Math.min(20000, f));
    const logFrac = (Math.log10(clampedF) - Math.log10(20)) / 3; // 3 decades
    return logFrac * svgWidth;
  }, [svgWidth]);

  const xToFreq = useCallback((x: number): number => {
    const frac = Math.max(0, Math.min(1, x / svgWidth));
    return 20 * Math.pow(10, frac * 3);
  }, [svgWidth]);

  // Coordinate conversions: -18dB ~ +18dB linear Y axis
  const dbToY = useCallback((db: number): number => {
    const clampedDb = Math.max(-18, Math.min(18, db));
    return ((18 - clampedDb) / 36) * svgHeight;
  }, [svgHeight]);

  const yToDb = useCallback((y: number): number => {
    const frac = Math.max(0, Math.min(1, y / svgHeight));
    return 18 - frac * 36;
  }, [svgHeight]);

  // Generate Frequency Response Curve SVG Path
  const { curvePath, fillPath } = useMemo(() => {
    if (params.bypass) {
      const yZero = dbToY(0);
      return {
        curvePath: `M 0 ${yZero} L ${svgWidth} ${yZero}`,
        fillPath: `M 0 ${yZero} L ${svgWidth} ${yZero} L ${svgWidth} ${yZero} L 0 ${yZero} Z`
      };
    }

    const lowCoeffs = computeFilterCoeffs('low', params.low);
    const midLowCoeffs = computeFilterCoeffs('midLow', params.midLow);
    const midHighCoeffs = computeFilterCoeffs('midHigh', params.midHigh);
    const highCoeffs = computeFilterCoeffs('high', params.high);

    const pointsCount = 120;
    const points: Array<[number, number]> = [];
    const yZero = dbToY(0);

    for (let i = 0; i <= pointsCount; i++) {
      const x = (i / pointsCount) * svgWidth;
      const f = xToFreq(x);

      const dbLow = evaluateBiquadDb(lowCoeffs, f);
      const dbMidLow = evaluateBiquadDb(midLowCoeffs, f);
      const dbMidHigh = evaluateBiquadDb(midHighCoeffs, f);
      const dbHigh = evaluateBiquadDb(highCoeffs, f);

      const totalDb = Math.max(-24, Math.min(24, dbLow + dbMidLow + dbMidHigh + dbHigh));
      const y = dbToY(totalDb);
      points.push([x, y]);
    }

    const cPath = points.map((p, idx) => (idx === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    const fPath = `${cPath} L ${svgWidth} ${yZero} L 0 ${yZero} Z`;

    return { curvePath: cPath, fillPath: fPath };
  }, [params, dbToY, svgWidth, xToFreq]);

  // Pointer drag handling for handles
  const handlePointerDown = (band: BandKey, e: React.PointerEvent) => {
    if (params.bypass) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveDragBand(band);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragBand || !svgRef.current || !onChange) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;

    const newX = clientX * scaleX;
    const newY = clientY * scaleY;

    const rawFreq = xToFreq(newX);
    const rawDb = yToDb(newY);

    const bandDef = BANDS.find(b => b.key === activeDragBand);
    if (!bandDef) return;

    const clampedFreq = Math.round(Math.max(bandDef.minFreq, Math.min(bandDef.maxFreq, rawFreq)));
    const clampedGain = Number(Math.max(-18, Math.min(18, rawDb)).toFixed(1));

    if (activeDragBand === 'low' && params.low.type === 'highpass') {
      onChange({
        low: {
          ...params.low,
          frequency: clampedFreq
        }
      });
    } else {
      onChange({
        [activeDragBand]: {
          ...params[activeDragBand],
          frequency: clampedFreq,
          gain: clampedGain
        }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDragBand) {
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignored
      }
      setActiveDragBand(null);
    }
  };

  // Double-click to reset band
  const handleDoubleClick = (band: BandKey) => {
    if (!onChange) return;
    const bandDef = BANDS.find(b => b.key === band);
    if (!bandDef) return;

    onChange({
      [band]: {
        ...params[band],
        frequency: bandDef.defaultFreq,
        gain: bandDef.defaultGain
      }
    });
  };

  // Grid frequencies
  const gridFreqs = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

  return (
    <div
      className={`relative select-none rounded border overflow-hidden font-mono transition-colors ${
        isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-slate-50/90 border-neutral-200/90 shadow-2xs'
      } ${className}`}
      style={{ height }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full cursor-crosshair block"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <linearGradient id="eqFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={isDark ? "0.22" : "0.18"} />
            <stop offset="50%" stopColor={isDark ? "#2dd4bf" : "#0d9488"} stopOpacity={isDark ? "0.10" : "0.08"} />
            <stop offset="100%" stopColor={isDark ? "#2dd4bf" : "#0d9488"} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal dB Grid lines (-12dB, 0dB, +12dB) */}
        {[-12, 0, 12].map(db => {
          const y = dbToY(db);
          const isZero = db === 0;
          return (
            <g key={`grid-db-${db}`}>
              <line
                x1="0"
                y1={y}
                x2={svgWidth}
                y2={y}
                stroke={isZero ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#262626' : '#cbd5e1')}
                strokeWidth={isZero ? 1.0 : 0.6}
                strokeDasharray={isZero ? 'none' : '3 3'}
                strokeOpacity={isZero ? (isDark ? 0.45 : 0.7) : (isDark ? 0.35 : 0.75)}
              />
              <text
                x="6"
                y={y - 2}
                fill={isZero ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#64748b' : '#64748b')}
                fontSize="7.5"
                fontFamily="monospace"
                fontWeight={isZero ? 'bold' : 'normal'}
                opacity={isDark ? 0.6 : 0.85}
              >
                {db > 0 ? `+${db}dB` : `${db}dB`}
              </text>
            </g>
          );
        })}

        {/* Vertical Frequency Grid lines */}
        {gridFreqs.map(f => {
          const x = freqToX(f);
          const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
          return (
            <g key={`grid-f-${f}`}>
              <line
                x1={x}
                y1="0"
                x2={x}
                y2={svgHeight}
                stroke={isDark ? '#262626' : '#e2e8f0'}
                strokeWidth={0.6}
                strokeDasharray="2 3"
                strokeOpacity={isDark ? 0.4 : 0.9}
              />
              <text
                x={x + 2}
                y={svgHeight - 4}
                fill={isDark ? '#64748b' : '#64748b'}
                fontSize="7"
                fontFamily="monospace"
                opacity={isDark ? 0.5 : 0.85}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* EQ Response Area Fill */}
        <path d={fillPath} fill="url(#eqFillGrad)" />

        {/* EQ Response Curve Stroke */}
        <path
          d={curvePath}
          fill="none"
          stroke={params.bypass ? '#94a3b8' : (isDark ? '#38bdf8' : '#0284c7')}
          strokeWidth={params.bypass ? 1.2 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isDark ? "drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]" : "drop-shadow-[0_1px_2px_rgba(2,132,199,0.25)]"}
        />

        {/* 4 Interactive Band Handles */}
        {!params.bypass &&
          BANDS.map(band => {
            const cfg = params[band.key];
            const x = freqToX(cfg.frequency);
            const isHp = band.key === 'low' && 'type' in cfg && (cfg as any).type === 'highpass';
            const y = isHp ? dbToY(0) : dbToY(cfg.gain);
            const isHovered = hoveredBand === band.key;
            const isDragging = activeDragBand === band.key;
            const bandTextColor = isDark
              ? band.color
              : band.key === 'midHigh'
                ? '#0891b2'
                : band.key === 'midLow'
                  ? '#0d9488'
                  : band.key === 'low'
                    ? '#0284c7'
                    : '#4f46e5';

            return (
              <g
                key={`handle-${band.key}`}
                className="cursor-grab active:cursor-grabbing transition-transform"
                onPointerDown={e => handlePointerDown(band.key, e)}
                onDoubleClick={() => handleDoubleClick(band.key)}
                onPointerEnter={() => setHoveredBand(band.key)}
                onPointerLeave={() => setHoveredBand(null)}
              >
                {/* Outer Glow Halo */}
                <circle
                  cx={x}
                  cy={y}
                  r={isDragging ? 12 : isHovered ? 10 : 7}
                  fill={band.color}
                  fillOpacity={isDragging ? 0.35 : isHovered ? 0.25 : 0.12}
                  stroke={band.color}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />

                {/* Inner Tactile Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isDragging || isHovered ? 4.5 : 3.5}
                  fill={isDark ? '#090b10' : '#ffffff'}
                  stroke={isDark ? band.color : bandTextColor}
                  strokeWidth={2}
                />

                {/* Band Indicator Label */}
                <text
                  x={x}
                  y={y - 8}
                  fill={bandTextColor}
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                  className="pointer-events-none drop-shadow"
                >
                  {band.label}
                </text>
              </g>
            );
          })}
      </svg>

      {/* Floating Readout Pill on Hover/Drag */}
      {(hoveredBand || activeDragBand) && !params.bypass && (() => {
        const activeKey = activeDragBand || hoveredBand;
        if (!activeKey) return null;
        const activeCfg = params[activeKey];
        const bandDef = BANDS.find(b => b.key === activeKey);
        const pillBandColor = isDark
          ? bandDef?.color
          : activeKey === 'midHigh'
            ? '#0891b2'
            : activeKey === 'midLow'
              ? '#0d9488'
              : activeKey === 'low'
                ? '#0284c7'
                : '#4f46e5';
        return (
          <div className={`absolute top-1 right-1.5 px-1.5 py-0.5 rounded text-[8.5px] font-mono flex items-center gap-2 pointer-events-none shadow-md ${
            isDark ? 'bg-black/85 border border-neutral-700/80 text-sky-300' : 'bg-white/95 border border-slate-200 text-slate-700'
          }`}>
            <span style={{ color: pillBandColor, fontWeight: 'bold' }}>{bandDef?.label}</span>
            <span>{activeCfg.frequency >= 1000 ? `${(activeCfg.frequency / 1000).toFixed(2)}kHz` : `${activeCfg.frequency}Hz`}</span>
            <span>{activeCfg.gain >= 0 ? `+${activeCfg.gain.toFixed(1)}dB` : `${activeCfg.gain.toFixed(1)}dB`}</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Q:{activeCfg.q.toFixed(2)}</span>
          </div>
        );
      })()}

      {/* Bypass indicator overlay */}
      {params.bypass && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
          isDark ? 'bg-black/40' : 'bg-slate-100/60'
        }`}>
          <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border ${
            isDark
              ? 'border-neutral-800 bg-neutral-950/80 text-slate-500'
              : 'border-slate-300 bg-white/90 text-slate-600 shadow-2xs'
          }`}>
            EQ BYPASS
          </span>
        </div>
      )}
    </div>
  );
};
