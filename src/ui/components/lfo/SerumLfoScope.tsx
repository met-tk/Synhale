import React, { useMemo } from 'react';
import type { LfoShape } from '../../../types/audio';
import { evaluateLfoWaveform } from '../../../audio/dsp/lfoMath';
import { readAccent, readAccentRgb } from '../../theme/deckPalette';
import { createBudgetFrameGate } from '../../../performance/budget';

export interface SerumLfoScopeProps {
  id: string;
  shape?: LfoShape;
  rate: number;
  depth: number;
  polarity?: 'bipolar' | 'unipolar';
  isPlaying?: boolean;
  width?: number;
  height?: number;
  onShapeChange?: (shape: LfoShape) => void;
  isDark?: boolean;
  className?: string;
}

const SHAPES: { id: LfoShape; label: string }[] = [
  { id: 'sine', label: 'SIN' },
  { id: 'triangle', label: 'TRI' },
  { id: 'sawtooth', label: 'SAW' },
  { id: 'square', label: 'SQR' },
  { id: 'random', label: 'RND' }
];

export const SerumLfoScope: React.FC<SerumLfoScopeProps> = ({
  id,
  shape = 'sine',
  rate,
  depth,
  polarity = 'bipolar',
  isPlaying = false,
  width = 160,
  height = 75,
  onShapeChange,
  isDark = true,
  className = ''
}) => {
  const isUni = polarity === 'unipolar';

  // Generate Serum-style Waveform Path
  const { pathData, evalY } = useMemo(() => {
    const padX = 6;
    const padY = 6;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const midY = isUni ? height - padY : padY + h / 2;
    const amp = isUni ? h * Math.max(0.2, Math.min(1.0, depth)) : (h / 2) * Math.max(0.2, Math.min(1.0, depth));

    const getWaveY = (phase: number): number => {
      const val = evaluateLfoWaveform(shape, phase);
      if (isUni) {
        const uniNorm = (val + 1) / 2;
        return (height - padY) - uniNorm * amp;
      }
      return midY - val * amp;
    };

    const points: string[] = [];
    const resolution = 48;
    for (let i = 0; i <= resolution; i++) {
      const p = i / resolution;
      const x = padX + p * w;
      const y = getWaveY(p);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    return {
      pathData: points.join(' '),
      evalY: getWaveY
    };
  }, [shape, depth, width, height, isUni]);

  // Compute live phase playhead
  const [playheadPhase, setPlayheadPhase] = React.useState(0);

  React.useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastT = performance.now();
    // 低端设备帧率上限,相位基于 dt 累加,跳帧不丢相位
    const frameGate = createBudgetFrameGate();
    const tick = (now: number) => {
      const dt = (now - lastT) / 1000;
      lastT = now;
      if (frameGate(now)) {
        setPlayheadPhase(prev => (prev + dt * rate) % 1.0);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, rate]);

  const padX = 6;
  const padY = 6;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const midY = isUni ? height - padY : padY + h / 2;

  const playheadX = padX + playheadPhase * w;
  const playheadY = evalY(playheadPhase);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {/* 1. Serum Dynamic Grid Screen */}
      <div
        className={`relative w-full rounded border overflow-hidden select-none transition-colors ${
          isDark ? 'border-neutral-800 bg-[#07090e]' : 'border-neutral-200 bg-slate-50/90 shadow-2xs'
        }`}
        style={{ height: `${height}px` }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full block"
        >
          {/* Subtle Grid Lines */}
          <line
            x1={padX}
            y1={midY}
            x2={width - padX}
            y2={midY}
            stroke={isDark ? "#1e293b" : "#cbd5e1"}
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <line
            x1={padX + w * 0.25}
            y1={padY}
            x2={padX + w * 0.25}
            y2={height - padY}
            stroke={isDark ? "#111827" : "#e2e8f0"}
            strokeWidth="1"
          />
          <line
            x1={padX + w * 0.5}
            y1={padY}
            x2={padX + w * 0.5}
            y2={height - padY}
            stroke={isDark ? "#172554" : "#bae6fd"}
            strokeWidth="1"
            strokeDasharray="1,3"
          />
          <line
            x1={padX + w * 0.75}
            y1={padY}
            x2={padX + w * 0.75}
            y2={height - padY}
            stroke={isDark ? "#111827" : "#e2e8f0"}
            strokeWidth="1"
          />

          {/* Waveform Trace */}
          <path
            d={pathData}
            fill="none"
            stroke={readAccent(isDark ? '400' : '600', isDark ? '#38bdf8' : '#0284c7')}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: isDark
                ? `drop-shadow(0 0 3px rgba(${readAccentRgb('400', '#38bdf8')}, 0.5))`
                : `drop-shadow(0 0 2px rgba(${readAccentRgb('600', '#0284c7')}, 0.3))`
            }}
          />

          {/* Phase Playhead Laser & Dot */}
          {isPlaying && (
            <>
              <line
                x1={playheadX}
                y1={padY}
                x2={playheadX}
                y2={height - padY}
                stroke={readAccent(isDark ? '400' : '600', isDark ? '#38bdf8' : '#0284c7')}
                strokeWidth="1"
                strokeOpacity={isDark ? "0.4" : "0.55"}
                strokeDasharray="2,2"
              />
              <circle
                cx={playheadX}
                cy={playheadY}
                r="3"
                fill={isDark ? "#ffffff" : readAccent('600', '#0284c7')}
                style={{
                  filter: isDark
                    ? `drop-shadow(0 0 4px ${readAccent('400', '#38bdf8')})`
                    : `drop-shadow(0 0 3px rgba(${readAccentRgb('600', '#0284c7')}, 0.5))`
                }}
              />
            </>
          )}
        </svg>

        {/* Top-Right Micro Rate & Polarity HUD */}
        <div className={`absolute top-1 right-1.5 text-[9px] font-mono pointer-events-none flex items-center gap-1.5 ${
          isDark ? 'text-sky-400/80' : 'text-sky-700 font-semibold'
        }`}>
          <span>{rate.toFixed(2)}Hz</span>
          <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold uppercase tracking-wider ${
            isUni
              ? isDark
                ? 'border-purple-500/50 bg-purple-950/60 text-purple-300'
                : 'border-purple-300 bg-purple-100 text-purple-800'
              : isDark
                ? 'border-sky-500/50 bg-sky-950/60 text-sky-300'
                : 'border-sky-300 bg-sky-100 text-sky-800'
          }`}>
            {isUni ? 'UNI' : 'BI'}
          </span>
        </div>
      </div>

      {/* 2. Waveform Selector Micro-Bar */}
      <div className={`flex items-center justify-between gap-0.5 p-0.5 rounded border transition-colors ${
        isDark ? 'bg-neutral-950/70 border-neutral-800/80' : 'bg-neutral-100/90 border-neutral-200'
      }`}>
        {SHAPES.map(s => {
          const isSelected = (shape || 'sine') === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onShapeChange?.(s.id)}
              aria-label={`${id} waveform ${s.id}`}
              className={`flex-1 py-0.5 text-[9px] font-mono rounded text-center transition-colors ${
                isSelected
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40 shadow-sm'
                    : 'bg-white text-sky-700 font-semibold border border-sky-400 shadow-xs'
                  : isDark
                    ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 border border-transparent'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
