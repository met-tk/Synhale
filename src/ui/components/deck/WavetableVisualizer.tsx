import React, { useMemo, useState } from 'react';
import { readAccent } from '../../theme/deckPalette';
import {
  computeWavetableTimeDomain,
  WAVETABLE_DEFINITIONS,
  MULTI_FRAME_WAVETABLES,
  computeMultiFrameTimeDomain
} from '../../../audio/dsp/wavetableData';

export interface WavetableVisualizerProps {
  sliceIndex: number;
  tableIndex?: number;       // Multi-frame wavetable collection index (0..7)
  wtPosition?: number;       // Continuous wavetable position 0..1 (or legacy 0..23)
  morph?: number;            // Legacy / fallback morph depth 0..1
  liveMorph?: number;
  liveWtPosition?: number;   // Real-time modulated wtPosition
  harmonics?: number;
  liveHarmonics?: number;
  breathMacro?: number;
  width?: number;
  height?: number;
  className?: string;
  isDark?: boolean;
  defaultViewMode?: '2d' | '3d';
}

const REF_SLICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];

export const WavetableVisualizer: React.FC<WavetableVisualizerProps> = ({
  sliceIndex,
  tableIndex,
  wtPosition,
  morph = 0,
  liveMorph,
  liveWtPosition,
  harmonics = 1.0,
  liveHarmonics,
  breathMacro = 0,
  width = 180,
  height = 54,
  className = '',
  isDark = true,
  defaultViewMode = '2d'
}) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>(defaultViewMode);

  // Soft palette accent driving wave strokes and gradient fills
  const wtAccent = readAccent(isDark ? '400' : '600', '#38bdf8');

  // Multi-frame mode is active when tableIndex is explicitly provided
  const isMultiFrameMode = tableIndex !== undefined && tableIndex >= 0 && tableIndex < MULTI_FRAME_WAVETABLES.length;
  const activeTable = isMultiFrameMode
    ? (MULTI_FRAME_WAVETABLES[tableIndex] ?? MULTI_FRAME_WAVETABLES[0])
    : null;

  // Continuous wtPosition resolution (prioritizing live modulated position)
  const rawWtPosition = liveWtPosition !== undefined
    ? liveWtPosition
    : (wtPosition !== undefined
        ? wtPosition
        : Math.max(0, Math.min(23, Math.floor(sliceIndex) + (morph ?? 0))));
  const effectiveWtPosition = isMultiFrameMode
    ? Math.max(0, Math.min(1.0, rawWtPosition))
    : Math.max(0, Math.min(23, rawWtPosition));
  const safeIdx = Math.max(0, Math.min(23, Math.floor(effectiveWtPosition)));
  const nextIdx = Math.min(23, safeIdx + 1);
  const currentDef = WAVETABLE_DEFINITIONS[safeIdx] ?? WAVETABLE_DEFINITIONS[0];

  const displayName = activeTable ? activeTable.name : currentDef.name;
  const displayCategory = activeTable ? activeTable.category : currentDef.category;

  // Dynamic morph within the current integer slice step
  const effectiveMorph = Math.max(
    0,
    Math.min(
      1,
      liveMorph !== undefined
        ? liveMorph
        : (wtPosition !== undefined ? (isMultiFrameMode ? effectiveWtPosition : effectiveWtPosition - safeIdx) : (morph ?? 0)) + (breathMacro > 0 ? breathMacro * 0.2 : 0)
    )
  );

  const effectiveHarmonics = Math.max(
    0,
    Math.min(1, liveHarmonics !== undefined ? liveHarmonics : (harmonics ?? 1.0))
  );

  // ----------------------------------------------------
  // 1. 2D Standard Waveform Geometry
  // ----------------------------------------------------
  const basePoints = useMemo(() => {
    if (isMultiFrameMode && activeTable) {
      return computeMultiFrameTimeDomain(activeTable.id, effectiveWtPosition, effectiveHarmonics, 64);
    }
    return computeWavetableTimeDomain(safeIdx, 0, effectiveHarmonics, 64);
  }, [isMultiFrameMode, activeTable, effectiveWtPosition, safeIdx, effectiveHarmonics]);

  const morphPoints = useMemo(() => {
    if (effectiveMorph <= 0.02) return null;
    return computeWavetableTimeDomain(safeIdx, effectiveMorph, effectiveHarmonics, 64);
  }, [safeIdx, effectiveMorph, effectiveHarmonics]);

  const paddingX = 4;
  const paddingY = 4;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const centerY = paddingY + usableHeight / 2;

  const buildPointsSvgPath = (pts: ArrayLike<number> | null): string => {
    if (!pts || pts.length === 0) return '';
    const numPoints = pts.length;
    let d = '';
    for (let i = 0; i < numPoints; i++) {
      const x = paddingX + (i / (numPoints - 1)) * usableWidth;
      const y = centerY - pts[i] * (usableHeight / 2);
      d += `${i === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  const basePathD = useMemo(
    () => buildPointsSvgPath(basePoints),
    [basePoints, paddingX, usableWidth, usableHeight, centerY]
  );

  const morphPathD = useMemo(
    () => buildPointsSvgPath(morphPoints),
    [morphPoints, paddingX, usableWidth, usableHeight, centerY]
  );

  const areaD = useMemo(() => {
    if (!basePathD) return '';
    const lastX = paddingX + usableWidth;
    const firstX = paddingX;
    return `${basePathD} L ${lastX.toFixed(1)} ${centerY.toFixed(1)} L ${firstX.toFixed(1)} ${centerY.toFixed(1)} Z`;
  }, [basePathD, paddingX, usableWidth, centerY]);

  // ----------------------------------------------------
  // 2. 3D Isometric Wavetable Waterfall Geometry
  // ----------------------------------------------------
  const isometricSlices = useMemo(() => {
    if (viewMode !== '3d') return [];

    const dxTotal = Math.max(12, Math.min(28, usableWidth * 0.16));
    const dyTotal = Math.max(10, Math.min(22, usableHeight * 0.42));
    const waveW = usableWidth - dxTotal;
    const baseY = centerY + dyTotal * 0.4;
    const amp = usableHeight * 0.24;

    const buildSlicePaths = (z: number, wave: number[]) => {
      const t = Math.max(0, Math.min(1, z / 23)); // 0: distant (back), 1: foreground (front)
      const ox = (1 - t) * dxTotal;
      const oy = -(1 - t) * dyTotal;
      const n = wave.length;

      let lineD = '';
      for (let i = 0; i < n; i++) {
        const px = paddingX + ox + (i / (n - 1)) * waveW;
        const py = baseY + oy - wave[i] * amp;
        lineD += (i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      const lastX = paddingX + ox + waveW;
      const firstX = paddingX + ox;
      const floorY = baseY + oy;
      const fillD = `${lineD} L ${lastX.toFixed(1)} ${floorY.toFixed(1)} L ${firstX.toFixed(1)} ${floorY.toFixed(1)} Z`;

      return { lineD, fillD, t };
    };

    const slicesList: Array<{
      z: number;
      t: number;
      isActive: boolean;
      lineD: string;
      fillD: string;
      opacity: number;
      beacon?: { x: number; y: number };
    }> = [];

    if (isMultiFrameMode && activeTable) {
      // 1. Multi-Frame Mode: render table's frames plus interpolated intermediate contours
      const numSlices = activeTable.sliceIndices.length;
      for (let s = 0; s < numSlices; s++) {
        const sliceIdx = activeTable.sliceIndices[s];
        const slicePos = s / (numSlices - 1);
        const zEquiv = slicePos * 23;
        if (Math.abs(zEquiv - effectiveWtPosition * 23) < 0.3) continue;
        const pts = computeWavetableTimeDomain(sliceIdx, 0, effectiveHarmonics, 32);
        const { lineD, fillD, t } = buildSlicePaths(zEquiv, pts);
        slicesList.push({
          z: zEquiv,
          t,
          isActive: false,
          lineD,
          fillD,
          opacity: 0.22 + 0.45 * t
        });
      }

      // Add high-density contours across table to ensure lush terrain and >10 paths
      for (let step = 1; step <= 8; step++) {
        const p = step / 9;
        const zEquiv = p * 23;
        if (Math.abs(zEquiv - effectiveWtPosition * 23) < 0.3) continue;
        const pts = computeMultiFrameTimeDomain(activeTable.id, p, effectiveHarmonics, 32);
        const { lineD, fillD, t } = buildSlicePaths(zEquiv, pts);
        slicesList.push({
          z: zEquiv,
          t,
          isActive: false,
          lineD,
          fillD,
          opacity: 0.16 + 0.35 * t
        });
      }

      // Active scanning ribbon at effectiveWtPosition (0..1)
      const activeWave = computeMultiFrameTimeDomain(activeTable.id, effectiveWtPosition, effectiveHarmonics, 48);
      const activeZ = effectiveWtPosition * 23;
      const { lineD: actLineD, fillD: actFillD, t: actT } = buildSlicePaths(activeZ, activeWave);
      const actOx = (1 - actT) * dxTotal;
      const actOy = -(1 - actT) * dyTotal;
      const midIdx = Math.floor(activeWave.length / 2);
      const beaconX = paddingX + actOx + (midIdx / (activeWave.length - 1)) * waveW;
      const beaconY = baseY + actOy - activeWave[midIdx] * amp;

      slicesList.push({
        z: activeZ,
        t: actT,
        isActive: true,
        lineD: actLineD,
        fillD: actFillD,
        opacity: 1.0,
        beacon: { x: beaconX, y: beaconY }
      });
    } else {
      // 2. Legacy Slice Mode (0..23 raw slices)
      for (const rz of REF_SLICES) {
        if (Math.abs(rz - effectiveWtPosition) < 0.25) continue; // Skip if collides with active ribbon
        const pts = computeWavetableTimeDomain(rz, 0, effectiveHarmonics, 32);
        const { lineD, fillD, t } = buildSlicePaths(rz, pts);
        slicesList.push({
          z: rz,
          t,
          isActive: false,
          lineD,
          fillD,
          opacity: 0.18 + 0.45 * t
        });
      }

      // Active continuous scanning ribbon at effectiveWtPosition
      const activeWave = computeWavetableTimeDomain(safeIdx, effectiveMorph, effectiveHarmonics, 48);
      const { lineD: actLineD, fillD: actFillD, t: actT } = buildSlicePaths(effectiveWtPosition, activeWave);
      const actOx = (1 - actT) * dxTotal;
      const actOy = -(1 - actT) * dyTotal;
      const midIdx = Math.floor(activeWave.length / 2);
      const beaconX = paddingX + actOx + (midIdx / (activeWave.length - 1)) * waveW;
      const beaconY = baseY + actOy - activeWave[midIdx] * amp;

      slicesList.push({
        z: effectiveWtPosition,
        t: actT,
        isActive: true,
        lineD: actLineD,
        fillD: actFillD,
        opacity: 1.0,
        beacon: { x: beaconX, y: beaconY }
      });
    }

    // Painter's Algorithm: render from back (t=0) to front (t=1)
    slicesList.sort((a, b) => a.t - b.t);
    return slicesList;
  }, [viewMode, usableWidth, usableHeight, centerY, effectiveHarmonics, effectiveWtPosition, safeIdx, effectiveMorph, isMultiFrameMode, activeTable]);

  return (
    <div
      role="img"
      aria-label={`Wavetable Waveform Scope: ${currentDef.name}`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-md border p-1.5 shadow-inner select-none transition-colors ${
        isDark
          ? 'border-neutral-800 bg-neutral-950 text-slate-100'
          : 'border-neutral-200 bg-slate-50/90 text-neutral-800'
      } ${className}`}
      style={{ width, height }}
    >
      {/* Background Scope Grid & Waterfall Display */}
      <svg
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`wv-grad-${safeIdx}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={wtAccent} />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id={`wv-area-${safeIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={wtAccent} stopOpacity={isDark ? "0.22" : "0.12"} />
            <stop offset="100%" stopColor={wtAccent} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`wv-morph-grad-${safeIdx}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="wv-3d-active-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={wtAccent} stopOpacity={isDark ? "0.28" : "0.16"} />
            <stop offset="100%" stopColor={wtAccent} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {viewMode === '2d' ? (
          <>
            {/* Center Zero-Volt Reference Axis */}
            <line
              x1={paddingX}
              y1={centerY}
              x2={width - paddingX}
              y2={centerY}
              stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}
              strokeDasharray="2,3"
              strokeWidth={1}
            />

            {/* Grid Quarter Ticks */}
            <line
              x1={paddingX + usableWidth * 0.25}
              y1={paddingY}
              x2={paddingX + usableWidth * 0.25}
              y2={height - paddingY}
              stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}
              strokeWidth={1}
            />
            <line
              x1={paddingX + usableWidth * 0.5}
              y1={paddingY}
              x2={paddingX + usableWidth * 0.5}
              y2={height - paddingY}
              stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}
              strokeWidth={1}
            />
            <line
              x1={paddingX + usableWidth * 0.75}
              y1={paddingY}
              x2={paddingX + usableWidth * 0.75}
              y2={height - paddingY}
              stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}
              strokeWidth={1}
            />

            {/* Shaded Area under Base Waveform */}
            {areaD && <path d={areaD} fill={`url(#wv-area-${safeIdx})`} />}

            {/* 1. Base Waveform Curve */}
            {basePathD && (
              <path
                d={basePathD}
                fill="none"
                stroke={`url(#wv-grad-${safeIdx})`}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={morphPathD ? 0.75 : 1.0}
              />
            )}

            {/* 2. Dynamic Morph Evolving Stream */}
            {morphPathD && (
              <path
                d={morphPathD}
                fill="none"
                stroke={`url(#wv-morph-grad-${safeIdx})`}
                strokeWidth={1.5}
                strokeDasharray="3,1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />
            )}
          </>
        ) : (
          /* 3D Isometric Wavetable Waterfall Render */
          <>
            {isometricSlices.map((s, idx) => {
              if (s.isActive) {
                return (
                  <g key={`3d-act-${idx}`}>
                    {/* Active Slice Occlusion and Glow Ribbon */}
                    <path
                      d={s.fillD}
                      fill="url(#wv-3d-active-glow)"
                    />
                    <path
                      d={s.lineD}
                      fill="none"
                      stroke={wtAccent}
                      strokeWidth={2.0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {s.beacon && (
                      <circle
                        cx={s.beacon.x}
                        cy={s.beacon.y}
                        r={1.8}
                        fill={wtAccent}
                        stroke={isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              }

              return (
                <g key={`3d-slice-${idx}`}>
                  {/* Background Slice Depth Occlusion */}
                  <path
                    d={s.fillD}
                    fill={isDark ? 'rgba(3, 7, 18, 0.75)' : 'rgba(241, 245, 249, 0.82)'}
                  />
                  {/* Subtle Wireframe Curve */}
                  <path
                    d={s.lineD}
                    fill="none"
                    stroke={isDark ? 'rgba(148, 163, 184, 0.40)' : 'rgba(100, 116, 139, 0.45)'}
                    strokeWidth={1.0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={s.opacity}
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* Scope Header / Badges */}
      <div className={`relative z-10 flex items-center justify-between text-[8px] font-mono tracking-wider uppercase ${
        isDark ? 'text-slate-400' : 'text-neutral-500'
      }`}>
        <span className={`truncate max-w-[95px] font-semibold ${
          isDark ? 'text-sky-300' : 'text-sky-600'
        }`}>
          {displayName}
        </span>
        <div className="flex items-center gap-1">
          {/* 2D / 3D Mode Toggle Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode(v => v === '2d' ? '3d' : '2d');
            }}
            aria-label="Toggle 2D/3D Wavetable View"
            className={`text-[7px] px-1 py-0.2 rounded border transition-colors cursor-pointer pointer-events-auto ${
              viewMode === '3d'
                ? (isDark ? 'bg-sky-950/80 border-sky-600 text-sky-300 font-semibold' : 'bg-sky-100 border-sky-400 text-sky-700 font-semibold')
                : (isDark ? 'bg-neutral-900/80 border-neutral-800 text-slate-400 hover:text-slate-200' : 'bg-neutral-200/80 border-neutral-300 text-neutral-600')
            }`}
          >
            {viewMode.toUpperCase()}
          </button>
          <span className={`text-[7.5px] px-1 py-0.2 rounded border ${
            isDark
              ? 'bg-neutral-900/80 border-neutral-800 text-slate-400'
              : 'bg-neutral-200/80 border-neutral-300 text-neutral-600 font-medium'
          }`}>
            S{safeIdx.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Scope Footer / Status Indicator */}
      <div className={`relative z-10 flex items-center justify-between text-[7.5px] font-mono ${
        isDark ? 'text-slate-500' : 'text-neutral-500'
      }`}>
        <span className="truncate max-w-[80px]">{displayCategory}</span>
        {viewMode === '3d' ? (
          <span className={`font-medium truncate max-w-[95px] ${
            isDark ? 'text-sky-300' : 'text-sky-600'
          }`}>
            {effectiveWtPosition > 1.0 ? `WT ${effectiveWtPosition.toFixed(2)}` : `WT ${Math.round(effectiveWtPosition * 100)}%`}
          </span>
        ) : effectiveMorph > 0.05 ? (
          <span className={`font-medium truncate max-w-[85px] ${
            isDark ? 'text-violet-400' : 'text-violet-600'
          }`}>
            {Math.round(effectiveMorph * 100)}% &gt; S{nextIdx.toString().padStart(2, '0')}
          </span>
        ) : (
          <span className={isDark ? "text-emerald-400/80" : "text-emerald-600"}>Pure Wave</span>
        )}
      </div>
    </div>
  );
};
