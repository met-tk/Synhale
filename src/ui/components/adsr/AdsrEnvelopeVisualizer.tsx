/**
 * Synhale 2 - ADSR Physical Envelope Studio Visualizer
 * 
 * High-precision studio graphic visualization of Attack, Decay, Sustain, Release
 * acoustic envelope curves, featuring precision dB/time coordinate grids,
 * true S-Curve attack and exponential decay/release geometry, and anchor node rings.
 * 
 * Decoupled from breath stage cycles:
 * - Truly represents per-note physical envelope curves.
 * - In polyphonic / particle modes (particles / arp), animations are gracefully disabled
 *   to present a clean, high-precision acoustic baseline.
 * - In monophonic mode, displays steady sustained state without fake breathing oscillations.
 * 
 * Strict modern minimalist industrial aesthetic: 100% zero emoji, 1px lines.
 */

import React, { useRef, useState, useCallback } from 'react';
import { readAccent } from '../../theme/deckPalette';

export interface AdsrEnvelopeVisualizerProps {
  attack: number; // 0.005 - 15.0s
  decay: number; // 0.005 - 15.0s
  sustain: number; // 0.0 - 1.0 (multiplier)
  release: number; // 0.005 - 15.0s
  isPlaying?: boolean;
  voiceMode?: 'drone' | 'particles' | 'arp';
  isDark?: boolean;
  className?: string;
  onChange?: (params: { attack?: number; decay?: number; sustain?: number; release?: number }) => void;
  disabled?: boolean;
}

type DragHandleType = 'attack' | 'decay' | 'sustain' | 'release' | 'sustain-bar';

const MAX_TIME = 15.0;
const MIN_TIME = 0.005;
const K_CURVE = 6.0;

const normLog = (val: number, maxT = MAX_TIME, k = K_CURVE) => {
  const clamped = Math.max(0, Math.min(maxT, val));
  return Math.log(1 + k * clamped) / Math.log(1 + k * maxT);
};

const invNormLog = (norm: number, maxT = MAX_TIME, k = K_CURVE) => {
  const clamped = Math.max(0, Math.min(1, norm));
  // Recompute the denominator with the actual maxT/k arguments instead of using
  // a module-level cache; otherwise callers passing non-default values would
  // receive incorrectly inverted results. The cost is negligible (single log).
  const denom = Math.log(1 + k * maxT);
  const val = (Math.exp(clamped * denom) - 1) / k;
  return Math.max(MIN_TIME, Math.min(maxT, val));
};

export const AdsrEnvelopeVisualizer: React.FC<AdsrEnvelopeVisualizerProps> = ({
  attack = 0.8,
  decay = 1.5,
  sustain = 0.75,
  release = 2.5,
  isPlaying = false,
  voiceMode = 'drone',
  isDark = true,
  className = '',
  onChange,
  disabled = false
}) => {
  const isPoly = voiceMode !== 'drone';
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Soft palette accent driving the envelope curve, nodes and stage labels
  const acc400 = readAccent('400', '#38bdf8');
  const acc500 = readAccent('500', '#0ea5e9');
  const acc600 = readAccent('600', '#0284c7');

  const [activeHandle, setActiveHandle] = useState<DragHandleType | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<DragHandleType | null>(null);

  // SVG coordinate layout with generous uncompressed vertical depth
  const width = 280;
  const height = 110;
  const padLeft = 24; // Left margin reserved for dB level indicators
  const padRight = 10;
  const topY = 14; // 0 dB peak
  const botY = 96; // -inf dB baseline
  const hRange = botY - topY; // 82px vertical range (generous studio proportion)

  const clampedSustain = Math.max(0, Math.min(1, sustain));
  const sustainY = botY - clampedSustain * hRange;

  // Proportional horizontal segment widths with zero-anchored continuous log mapping
  const rawWAttack = normLog(attack) * 65;
  const rawWDecay = 4 + normLog(decay) * 55;
  const rawWSustain = 34; // Dedicated sustain plateau
  const rawWRelease = 4 + normLog(release) * 65;

  const totalRaw = Math.max(40, rawWAttack + rawWDecay + rawWSustain + rawWRelease);
  const availableW = width - padLeft - padRight; // 246px
  const scale = availableW / totalRaw;

  const wAttack = rawWAttack * scale;
  const wDecay = rawWDecay * scale;
  const wSustain = rawWSustain * scale;
  const wRelease = rawWRelease * scale;

  const x0 = padLeft;
  const x1 = x0 + wAttack;
  const x2 = x1 + wDecay;
  const x3 = x2 + wSustain;
  const x4 = x3 + wRelease;

  // Mathematical smooth S-Curve for Attack (analog capacitor charge profile)
  // Exponential decay curve for Decay and Release
  const pathD =
    `M ${x0} ${botY} ` +
    `C ${x0 + wAttack * 0.45} ${botY}, ${x0 + wAttack * 0.7} ${topY}, ${x1} ${topY} ` +
    `C ${x1 + wDecay * 0.35} ${topY + (sustainY - topY) * 0.65}, ${x1 + wDecay * 0.75} ${sustainY}, ${x2} ${sustainY} ` +
    `L ${x3} ${sustainY} ` +
    `C ${x3 + wRelease * 0.35} ${sustainY + (botY - sustainY) * 0.65}, ${x3 + wRelease * 0.75} ${botY}, ${x4} ${botY}`;

  const areaD = `${pathD} L ${x4} ${height} L ${x0} ${height} Z`;

  // Precision dB reference grid levels
  const yMinus3dB = botY - 0.707 * hRange;
  const yMinus6dB = botY - 0.5 * hRange;
  const yMinus12dB = botY - 0.25 * hRange;

  // Dragging state tracking ref
  const dragRef = useRef<{
    handle: DragHandleType;
    startX: number;
    startNormA: number;
    startNormD: number;
    startNormR: number;
  } | null>(null);

  const isInteractive = Boolean(onChange) && !disabled;

  const handlePointerDown = useCallback((handle: DragHandleType, e: React.PointerEvent) => {
    if (!isInteractive || !onChange) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // In non-DOM test environments, ignore setPointerCapture errors
    }

    dragRef.current = {
      handle,
      startX: e.clientX,
      startNormA: normLog(attack),
      startNormD: normLog(decay),
      startNormR: normLog(release)
    };
    setActiveHandle(handle);
  }, [isInteractive, onChange, attack, decay, release]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !onChange) return;
    const { handle, startX, startNormA, startNormD, startNormR } = dragRef.current;

    const dx = e.clientX - startX;
    const dragSensitivity = 160; // 160px for full log range

    // Calculate current vertical sustain based on pointer absolute height in SVG
    let currentSustain = clampedSustain;
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.height > 0) {
        const svgY = (e.clientY - rect.top) * (height / rect.height);
        currentSustain = Math.max(0, Math.min(1, (botY - svgY) / hRange));
      }
    }

    if (handle === 'attack') {
      const newNorm = Math.max(0, Math.min(1, startNormA + dx / dragSensitivity));
      const newAttack = Math.max(MIN_TIME, Math.min(MAX_TIME, Number(invNormLog(newNorm).toFixed(2))));
      onChange({ attack: newAttack });
    } else if (handle === 'decay') {
      const newNorm = Math.max(0, Math.min(1, startNormD + dx / dragSensitivity));
      const newDecay = Math.max(MIN_TIME, Math.min(MAX_TIME, Number(invNormLog(newNorm).toFixed(2))));
      const roundedSustain = Number(currentSustain.toFixed(2));
      onChange({ decay: newDecay, sustain: roundedSustain });
    } else if (handle === 'sustain' || handle === 'sustain-bar') {
      const roundedSustain = Number(currentSustain.toFixed(2));
      onChange({ sustain: roundedSustain });
    } else if (handle === 'release') {
      const newNorm = Math.max(0, Math.min(1, startNormR + dx / dragSensitivity));
      const newRelease = Math.max(MIN_TIME, Math.min(MAX_TIME, Number(invNormLog(newNorm).toFixed(2))));
      onChange({ release: newRelease });
    }
  }, [onChange, clampedSustain, height, botY, hRange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      dragRef.current = null;
      setActiveHandle(null);
    }
  }, []);

  // Keyboard accessibility handler for nodes
  const handleKeyDown = useCallback((handle: DragHandleType, e: React.KeyboardEvent) => {
    if (!isInteractive || !onChange) return;
    const stepTime = e.shiftKey ? 0.2 : 0.05;
    const stepSustain = e.shiftKey ? 0.05 : 0.02;

    if (handle === 'attack') {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onChange({ attack: Math.min(MAX_TIME, Number((attack + stepTime).toFixed(2))) });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onChange({ attack: Math.max(MIN_TIME, Number((attack - stepTime).toFixed(2))) });
      }
    } else if (handle === 'decay') {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange({ decay: Math.min(MAX_TIME, Number((decay + stepTime).toFixed(2))) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange({ decay: Math.max(MIN_TIME, Number((decay - stepTime).toFixed(2))) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChange({ sustain: Math.min(1.0, Number((clampedSustain + stepSustain).toFixed(2))) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChange({ sustain: Math.max(0.0, Number((clampedSustain - stepSustain).toFixed(2))) });
      }
    } else if (handle === 'sustain') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChange({ sustain: Math.min(1.0, Number((clampedSustain + stepSustain).toFixed(2))) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChange({ sustain: Math.max(0.0, Number((clampedSustain - stepSustain).toFixed(2))) });
      }
    } else if (handle === 'release') {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onChange({ release: Math.min(MAX_TIME, Number((release + stepTime).toFixed(2))) });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onChange({ release: Math.max(MIN_TIME, Number((release - stepTime).toFixed(2))) });
      }
    }
  }, [isInteractive, onChange, attack, decay, clampedSustain, release]);

  return (
    <div
      role="region"
      aria-label="ADSR Envelope Visualizer"
      className={`relative w-full rounded-lg border p-2.5 shadow-inner select-none transition-colors ${
        isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-slate-50/90 shadow-2xs'
      } ${className}`}
    >
      {/* Header bar: Mode indicator and readouts */}
      <div className="flex items-center justify-between text-[9px] font-mono leading-none mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying
                ? isPoly
                  ? 'bg-emerald-400'
                  : 'bg-sky-400 animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
          <span className={`uppercase font-semibold tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {isPoly
              ? 'PER-NOTE ADSR · 独立音符物理包络基线 (多音动效已停用)'
              : isPlaying
              ? 'MONOPHONIC ADSR · 单音发声维持包络'
              : 'ADSR ENVELOPE · 音色物理包络'}
          </span>
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-1.5">
          {isInteractive && (
            <span className={`text-[7.5px] font-mono px-1 py-0.5 rounded border uppercase tracking-wider ${
              activeHandle
                ? 'border-sky-500/80 bg-sky-950/80 text-sky-300'
                : isDark
                ? 'border-neutral-800 bg-neutral-900/60 text-slate-400'
                : 'border-neutral-200 bg-white text-slate-500'
            }`}>
              {activeHandle ? `DRAGGING ${activeHandle}` : 'DRAG NODES'}
            </span>
          )}
          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
            isDark ? 'border-neutral-800 bg-neutral-900/90 text-slate-400' : 'border-neutral-200 bg-white text-slate-600 shadow-2xs'
          }`}>
            {isPoly ? 'POLYPHONIC' : 'MONO DRONE'}
          </span>
        </div>
      </div>

      {/* SVG Canvas with Precision Grid, Curved Geometry & Interactive Nodes */}
      <div className={`relative w-full h-[110px] overflow-hidden rounded border transition-colors ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/60' : 'border-neutral-200 bg-white shadow-inner'
      }`}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            {/* Luminous area gradient */}
            <linearGradient id="adsr-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={acc600} stopOpacity={isDark ? 0.32 : 0.22} />
              <stop offset="50%" stopColor={acc500} stopOpacity={isDark ? 0.12 : 0.08} />
              <stop offset="100%" stopColor={acc600} stopOpacity="0.01" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="adsr-line-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={acc400} floodOpacity={isDark ? 0.45 : 0.3} />
            </filter>
          </defs>

          {/* 1. Precision dB Horizontal Grid Lines */}
          <line x1={padLeft - 2} y1={topY} x2={width - padRight} y2={topY} stroke={isDark ? "#333333" : "#e2e8f0"} strokeDasharray="2,2" strokeWidth={0.7} />
          <line x1={padLeft - 2} y1={yMinus3dB} x2={width - padRight} y2={yMinus3dB} stroke={isDark ? "#1f2937" : "#f1f5f9"} strokeDasharray="2,2" strokeWidth={0.7} />
          <line x1={padLeft - 2} y1={yMinus6dB} x2={width - padRight} y2={yMinus6dB} stroke={isDark ? "#262626" : "#f1f5f9"} strokeDasharray="2,2" strokeWidth={0.7} />
          <line x1={padLeft - 2} y1={yMinus12dB} x2={width - padRight} y2={yMinus12dB} stroke={isDark ? "#202020" : "#f8fafc"} strokeDasharray="2,2" strokeWidth={0.7} />
          <line x1={padLeft - 2} y1={botY} x2={width - padRight} y2={botY} stroke={isDark ? "#2a2a2a" : "#cbd5e1"} strokeWidth={1} />

          {/* dB Level Labels */}
          <text x={padLeft - 4} y={topY + 2.5} textAnchor="end" fill={isDark ? "#525252" : "#94a3b8"} fontSize="6.5" fontFamily="monospace">0dB</text>
          <text x={padLeft - 4} y={yMinus3dB + 2.5} textAnchor="end" fill={isDark ? "#374151" : "#94a3b8"} fontSize="6" fontFamily="monospace">-3</text>
          <text x={padLeft - 4} y={yMinus6dB + 2.5} textAnchor="end" fill={isDark ? "#404040" : "#94a3b8"} fontSize="6.5" fontFamily="monospace">-6</text>
          <text x={padLeft - 4} y={yMinus12dB + 2.5} textAnchor="end" fill={isDark ? "#333333" : "#94a3b8"} fontSize="6.5" fontFamily="monospace">-12</text>
          <text x={padLeft - 4} y={botY + 2.5} textAnchor="end" fill={isDark ? "#404040" : "#94a3b8"} fontSize="6.5" fontFamily="monospace">-∞</text>

          {/* 2. Vertical Stage Partition Lines */}
          <line x1={x1} y1={topY} x2={x1} y2={botY} stroke={isDark ? "#262626" : "#e2e8f0"} strokeDasharray="2,2" strokeWidth={0.8} />
          <line x1={x2} y1={topY} x2={x2} y2={botY} stroke={isDark ? "#262626" : "#e2e8f0"} strokeDasharray="2,2" strokeWidth={0.8} />
          <line x1={x3} y1={topY} x2={x3} y2={botY} stroke={isDark ? "#262626" : "#e2e8f0"} strokeDasharray="2,2" strokeWidth={0.8} />

          {/* Stage Zone Labels with Adaptive Abbreviation for Narrow Segments */}
          {wAttack >= 12 && (
            <text x={x0 + wAttack * 0.5} y={botY - 4} textAnchor="middle" fill={acc600} fillOpacity={0.35} fontSize="7" fontFamily="monospace" fontWeight="600">
              {wAttack >= 28 ? 'ATTACK' : 'A'}
            </text>
          )}
          {wDecay >= 12 && (
            <text x={x1 + wDecay * 0.5} y={botY - 4} textAnchor="middle" fill={acc600} fillOpacity={0.35} fontSize="7" fontFamily="monospace" fontWeight="600">
              {wDecay >= 28 ? 'DECAY' : 'D'}
            </text>
          )}
          <text x={x2 + wSustain * 0.5} y={botY - 4} textAnchor="middle" fill={acc600} fillOpacity={0.35} fontSize="7" fontFamily="monospace" fontWeight="600">SUSTAIN</text>
          {wRelease >= 14 && (
            <text x={x3 + wRelease * 0.5} y={botY - 4} textAnchor="middle" fill={acc600} fillOpacity={0.35} fontSize="7" fontFamily="monospace" fontWeight="600">
              {wRelease >= 30 ? 'RELEASE' : 'R'}
            </text>
          )}

          {/* 3. Filled Envelope Area */}
          <path d={areaD} fill="url(#adsr-fill-grad)" />

          {/* 4. Envelope Contour Curve with Glow Filter */}
          <path d={pathD} fill="none" stroke={acc400} strokeWidth={1.5} filter="url(#adsr-line-glow)" />

          {/* 5. Anchor Visual Node Circles (Preserving exact circle indices for test assertions) */}
          {/* Start Node: circles[0], circles[1] */}
          <circle cx={x0} cy={botY} r={3} fill="#0a0a0a" stroke={acc400} strokeWidth={1} />
          <circle cx={x0} cy={botY} r={1.2} fill="#ffffff" />

          {/* Peak Node: circles[2], circles[3] */}
          <circle
            cx={x1}
            cy={topY}
            r={activeHandle === 'attack' || hoveredHandle === 'attack' ? 4.2 : 3.2}
            fill="#0a0a0a"
            stroke={acc400}
            strokeWidth={activeHandle === 'attack' ? 2 : 1.2}
            className="transition-all" style={{ filter: `drop-shadow(0 0 6px ${acc400})` }}
          />
          <circle cx={x1} cy={topY} r={1.3} fill="#ffffff" />

          {/* Decay -> Sustain Node: circles[4], circles[5] */}
          <circle
            cx={x2}
            cy={sustainY}
            r={activeHandle === 'decay' || hoveredHandle === 'decay' ? 4.2 : 3.2}
            fill="#0a0a0a"
            stroke={acc400}
            strokeWidth={activeHandle === 'decay' ? 2 : 1.2}
            className="transition-all" style={{ filter: `drop-shadow(0 0 6px ${acc400})` }}
          />
          <circle cx={x2} cy={sustainY} r={1.3} fill="#ffffff" />

          {/* Sustain -> Release Node: circles[6], circles[7] */}
          <circle
            cx={x3}
            cy={sustainY}
            r={activeHandle === 'sustain' || hoveredHandle === 'sustain' ? 4.2 : 3.2}
            fill="#0a0a0a"
            stroke={acc400}
            strokeWidth={activeHandle === 'sustain' ? 2 : 1.2}
            className="transition-all" style={{ filter: `drop-shadow(0 0 6px ${acc400})` }}
          />
          <circle cx={x3} cy={sustainY} r={1.3} fill="#ffffff" />

          {/* Release End Node: circles[8], circles[9] */}
          <circle
            cx={x4}
            cy={botY}
            r={activeHandle === 'release' || hoveredHandle === 'release' ? 4.0 : 3}
            fill="#0a0a0a"
            stroke={acc400}
            strokeWidth={activeHandle === 'release' ? 2 : 1}
            className="transition-all" style={{ filter: `drop-shadow(0 0 6px ${acc400})` }}
          />
          <circle cx={x4} cy={botY} r={1.2} fill="#ffffff" />

          {/* 6. Interactive Sustain Bar (Hitbox for vertical dragging) */}
          {isInteractive && (
            <line
              x1={x2}
              y1={sustainY}
              x2={x3}
              y2={sustainY}
              stroke="transparent"
              strokeWidth={14}
              cursor="ns-resize"
              data-testid="adsr-bar-sustain"
              onPointerDown={e => handlePointerDown('sustain-bar', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onMouseEnter={() => setHoveredHandle('sustain-bar')}
              onMouseLeave={() => setHoveredHandle(null)}
            />
          )}

          {/* 7. Interactive Node Hitboxes & A11y Controls */}
          {isInteractive && (
            <g className="touch-none select-none">
              {/* Attack Peak Node Handle */}
              <circle
                cx={x1}
                cy={topY}
                r={12}
                fill="transparent"
                cursor="ew-resize"
                tabIndex={0}
                role="slider"
                aria-label="ADSR Attack Node"
                aria-valuemin={0.005}
                aria-valuemax={15.0}
                aria-valuenow={attack}
                data-testid="adsr-handle-attack"
                onPointerDown={e => handlePointerDown('attack', e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={e => handleKeyDown('attack', e)}
                onMouseEnter={() => setHoveredHandle('attack')}
                onMouseLeave={() => setHoveredHandle(null)}
              />

              {/* Decay / Sustain In Node Handle */}
              <circle
                cx={x2}
                cy={sustainY}
                r={12}
                fill="transparent"
                cursor="move"
                tabIndex={0}
                role="slider"
                aria-label="ADSR Decay and Sustain Node"
                aria-valuemin={0.005}
                aria-valuemax={15.0}
                aria-valuenow={decay}
                data-testid="adsr-handle-decay"
                onPointerDown={e => handlePointerDown('decay', e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={e => handleKeyDown('decay', e)}
                onMouseEnter={() => setHoveredHandle('decay')}
                onMouseLeave={() => setHoveredHandle(null)}
              />

              {/* Sustain / Release In Node Handle */}
              <circle
                cx={x3}
                cy={sustainY}
                r={12}
                fill="transparent"
                cursor="ns-resize"
                tabIndex={0}
                role="slider"
                aria-label="ADSR Sustain Level Node"
                aria-valuemin={0}
                aria-valuemax={1.0}
                aria-valuenow={clampedSustain}
                data-testid="adsr-handle-sustain"
                onPointerDown={e => handlePointerDown('sustain', e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={e => handleKeyDown('sustain', e)}
                onMouseEnter={() => setHoveredHandle('sustain')}
                onMouseLeave={() => setHoveredHandle(null)}
              />

              {/* Release End Node Handle */}
              <circle
                cx={x4}
                cy={botY}
                r={12}
                fill="transparent"
                cursor="ew-resize"
                tabIndex={0}
                role="slider"
                aria-label="ADSR Release Node"
                aria-valuemin={0.005}
                aria-valuemax={15.0}
                aria-valuenow={release}
                data-testid="adsr-handle-release"
                onPointerDown={e => handlePointerDown('release', e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={e => handleKeyDown('release', e)}
                onMouseEnter={() => setHoveredHandle('release')}
                onMouseLeave={() => setHoveredHandle(null)}
              />
            </g>
          )}

          {/* 8. Steady Sustain Playhead Indicator (Monophonic Playback Only, disabled in Poly mode) */}
          {!isPoly && isPlaying && (
            <g className="animate-pulse">
              <line x1={x2} y1={topY} x2={x2} y2={botY} stroke={acc400} strokeDasharray="2,2" strokeWidth={1} />
              <circle
                cx={x2}
                cy={sustainY}
                r={4.5}
                fill="#ffffff"
                stroke={acc600}
                strokeWidth={2}
                style={{ filter: `drop-shadow(0 0 8px ${acc400})` }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Metric Badges Footer: Concise, professional readouts with zero emoji */}
      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
        {[
          { key: 'attack', label: 'Attack', value: `${attack.toFixed(2)}s`, isActive: activeHandle === 'attack' },
          { key: 'decay', label: 'Decay', value: `${decay.toFixed(2)}s`, isActive: activeHandle === 'decay' },
          { key: 'sustain', label: 'Sustain', value: `${Math.round(clampedSustain * 100)}%`, isActive: activeHandle === 'sustain' || activeHandle === 'sustain-bar' },
          { key: 'release', label: 'Release', value: `${release.toFixed(2)}s`, isActive: activeHandle === 'release' }
        ].map(badge => (
          <div
            key={badge.key}
            className={`flex flex-col items-center justify-center p-1 rounded border transition-colors ${
              badge.isActive
                ? 'bg-sky-950/40 border-sky-500/80'
                : isDark ? 'bg-neutral-900/60 border-neutral-800/80' : 'bg-white border-neutral-200 shadow-2xs'
            }`}
          >
            <span className={`text-[8px] font-mono uppercase ${badge.isActive ? 'text-sky-300 font-semibold' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {badge.label}
            </span>
            <span className={`text-[10px] font-mono font-semibold tabular-nums ${badge.isActive ? 'text-sky-200' : isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {badge.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

