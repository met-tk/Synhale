import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../theme';
import { readAccent, readAccentRgb } from '../../theme/deckPalette';
import { getCachedSamplePeaks, registerCustomAudioSample, getSampleDuration, MAX_IMPORTED_AUDIO_BYTES } from '../../../audio/nodes/GranularSampleLibrary';
import type { ParticleVisualGrain } from '../../../audio/nodes/GranularChannel';
import { getPerformanceBudget, capDpr, createBudgetFrameGate } from '../../../performance/budget';

interface GrainSourceVisualizerProps {
  sampleId: string;
  position?: number;        // 0..1
  positionJitter?: number;  // 0..1
  rangeStart?: number;      // 0..1 (default 0.0)
  rangeEnd?: number;        // 0..1 (default 1.0)
  isPlaying?: boolean;
  bypass?: boolean;
  getLiveGrains?: () => ParticleVisualGrain[];
  getAudioCurrentTime?: () => number;
  onPositionChange?: (newPosition: number) => void;
  onRangeChange?: (start: number, end: number) => void;
  onCustomSampleLoaded?: (newSampleId: string) => void;
  sampleMetadata?: { sampleRate?: number; channels?: number; duration?: number; name?: string };
  duration?: number;        // Grain length in seconds (default 0.245)
  width?: number | string;
  height?: number;
}

export const GrainSourceVisualizer: React.FC<GrainSourceVisualizerProps> = ({
  sampleId,
  position = 0.25,
  positionJitter = 0.0,
  rangeStart = 0.0,
  rangeEnd = 1.0,
  isPlaying = false,
  bypass = false,
  getLiveGrains,
  getAudioCurrentTime,
  onPositionChange,
  onRangeChange,
  onCustomSampleLoaded,
  sampleMetadata,
  duration = 0.245,
  width = '100%',
  height = 120 // 视窗高度扩充至 120px，提供开阔的采样波形视野与触控精度
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();

  const [activeDragTarget, setActiveDragTarget] = useState<'playhead' | 'rangeStart' | 'rangeEnd' | null>(null);
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importingRef = useRef(false);
  const mountedRef = useRef(true);
  const importContextRef = useRef<AudioContext | null>(null);
  const hoverPositionRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const ctx = importContextRef.current;
      importContextRef.current = null;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, []);

  // Resize canvas to match container's actual pixel width
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = capDpr(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      const targetW = Math.max(120, Math.floor(rect.width));
      const targetH = Math.max(50, Math.floor(rect.height || height));

      if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
        canvas.width = targetW * dpr;
        canvas.height = targetH * dpr;
      }
    };

    updateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    if (ro) ro.observe(container);

    return () => ro?.disconnect();
  }, [height]);

  // Main 60fps waveform, range mask and grain particle render loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const peaks = getCachedSamplePeaks(sampleId, 200);
    const isVisuallyActive = isPlaying && !bypass;
    // 低端设备 30fps 上限,降低常驻波形/粒子绘制开销
    const frameGate = createBudgetFrameGate();

    const render = () => {
      if (!frameGate(typeof performance !== 'undefined' ? performance.now() : Date.now())) {
        if (isVisuallyActive) {
          animId = requestAnimationFrame(render);
        }
        return;
      }
      const { w: cachedW, h: cachedH, dpr } = sizeRef.current;
      const w = cachedW || (canvas.width > 0 ? canvas.width / dpr : 120);
      const h = cachedH || (canvas.height > 0 ? canvas.height / dpr : height);
      if (w <= 0 || h <= 0) return;
      const midY = h / 2;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // 1. Center Guide Line
      ctx.strokeStyle = isDark ? '#1e293b' : '#cbd5e1';
      ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([2, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([]);
      }

      // 2. Jitter / Spray Scan Region (Phase Plant POSITION (+0.0%) wander bandwidth)
      if (positionJitter > 0.001) {
        const minPos = Math.max(rangeStart, position - positionJitter);
        const maxPos = Math.min(rangeEnd, position + positionJitter);
        const startX = minPos * w;
        const scanWidth = Math.max(2, (maxPos - minPos) * w);

        if (typeof ctx.createLinearGradient === 'function') {
          const scanGrad = ctx.createLinearGradient(startX, 0, startX + scanWidth, 0);
          scanGrad.addColorStop(0, `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.02)`);
          scanGrad.addColorStop(0.5, `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.20)`);
          scanGrad.addColorStop(1, `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.02)`);
          ctx.fillStyle = scanGrad;
        } else {
          ctx.fillStyle = `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.08)`;
        }
        ctx.fillRect(startX, 1, scanWidth, h - 2);
      }

      // 3. Mirrored Waveform Silhouette (Phase Plant Inactive Background + Active Grain Window Highlight)
      const numPoints = peaks.length;
      const sliceWidth = w / numPoints;

      const drawWaveformPath = () => {
        ctx.beginPath();
        // Upper half
        for (let i = 0; i < numPoints; i++) {
          const x = i * sliceWidth;
          const peak = peaks[i];
          const amp = peak * (h * 0.43);
          const y = midY - amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Lower half (mirrored)
        for (let i = numPoints - 1; i >= 0; i--) {
          const x = i * sliceWidth;
          const peak = peaks[i];
          const amp = peak * (h * 0.43);
          const y = midY + amp;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      // 3a. Inactive Base Waveform (暗色冷灰底波形，未被微粒覆盖的部分)
      drawWaveformPath();
      if (typeof ctx.createLinearGradient === 'function') {
        const bgWaveGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (isDark) {
          bgWaveGrad.addColorStop(0, 'rgba(51, 65, 85, 0.45)');
          bgWaveGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.20)');
          bgWaveGrad.addColorStop(1, 'rgba(51, 65, 85, 0.45)');
        } else {
          bgWaveGrad.addColorStop(0, 'rgba(148, 163, 184, 0.40)');
          bgWaveGrad.addColorStop(0.5, 'rgba(203, 213, 225, 0.18)');
          bgWaveGrad.addColorStop(1, 'rgba(148, 163, 184, 0.40)');
        }
        ctx.fillStyle = bgWaveGrad;
      } else {
        ctx.fillStyle = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(148, 163, 184, 0.35)';
      }
      ctx.fill();

      ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.65)' : 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // 3b. Active Grain Window Highlight (Phase Plant 活跃播放区间高亮，基于绝对物理时间：Grain Length / 实际采样总时长)
      const detectedDur = getSampleDuration(sampleId);
      const actualSampleDuration = Math.max(0.1, detectedDur ?? sampleMetadata?.duration ?? 3.6);
      const dur = Math.max(0.01, duration);
      // 高亮占比严格等于 Grain Length 在采样上的绝对时间长度
      const activeGrainSpan = Math.min(1.0, Math.max(0.002, dur / actualSampleDuration));
      const activeStartX = Math.max(rangeStart * w, position * w);
      const activeEndX = Math.min(rangeEnd * w, (position + activeGrainSpan) * w);
      const activeWidth = Math.max(1, activeEndX - activeStartX);

      if (activeWidth > 1) {
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.rect === 'function') {
          ctx.rect(activeStartX, 0, activeWidth, h);
        }
        if (typeof ctx.clip === 'function') {
          ctx.clip();
        }

        drawWaveformPath();
        if (typeof ctx.createLinearGradient === 'function') {
          const activeWaveGrad = ctx.createLinearGradient(0, 0, 0, h);
          if (isDark) {
            activeWaveGrad.addColorStop(0, `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.75)`);
            activeWaveGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.28)');
            activeWaveGrad.addColorStop(1, `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.75)`);
          } else {
            activeWaveGrad.addColorStop(0, `rgba(${readAccentRgb('600', '#0284c7')}, 0.65)`);
            activeWaveGrad.addColorStop(0.5, 'rgba(3, 105, 161, 0.22)');
            activeWaveGrad.addColorStop(1, `rgba(${readAccentRgb('600', '#0284c7')}, 0.65)`);
          }
          ctx.fillStyle = activeWaveGrad;
        } else {
          ctx.fillStyle = isDark ? `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.5)` : `rgba(${readAccentRgb('600', '#0284c7')}, 0.5)`;
        }
        ctx.fill();

        ctx.strokeStyle = isDark ? `rgba(${readAccentRgb('400', readAccent('400', '#38bdf8'))}, 0.95)` : `rgba(${readAccentRgb('600', '#0284c7')}, 0.95)`;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Out-of-bounds Shaded Regions (Range Start / Range End boundaries)
      if (rangeStart > 0.002) {
        const rStartX = rangeStart * w;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.68)' : 'rgba(241, 245, 249, 0.68)';
        ctx.fillRect(0, 0, rStartX, h);

        // Range Start delimiter line & bracket handle
        ctx.strokeStyle = readAccent('400', '#38bdf8');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rStartX, 0);
        ctx.lineTo(rStartX, h);
        // Top handle flag
        ctx.moveTo(rStartX, 0);
        ctx.lineTo(rStartX + 6, 0);
        ctx.lineTo(rStartX + 6, 8);
        ctx.lineTo(rStartX, 8);
        ctx.stroke();
      }

      if (rangeEnd < 0.998) {
        const rEndX = rangeEnd * w;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.68)' : 'rgba(241, 245, 249, 0.68)';
        ctx.fillRect(rEndX, 0, w - rEndX, h);

        // Range End delimiter line & bracket handle
        ctx.strokeStyle = readAccent('400', '#38bdf8');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rEndX, 0);
        ctx.lineTo(rEndX, h);
        // Top handle flag
        ctx.moveTo(rEndX, 0);
        ctx.lineTo(rEndX - 6, 0);
        ctx.lineTo(rEndX - 6, 8);
        ctx.lineTo(rEndX, 8);
        ctx.stroke();
      }

      // 5. Live Active Grains (Phase Plant Dynamic Lifecycle: Span Bar, Waveform Scatter, Glow & Decay)
      if (isVisuallyActive && getLiveGrains) {
        const liveGrains = getLiveGrains();
        const now = getAudioCurrentTime
          ? getAudioCurrentTime()
          : (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

        for (const g of liveGrains) {
          const grainDur = Math.max(0.02, g.duration ?? 0.25);
          const elapsed = now - g.startTime;
          if (elapsed < 0 || elapsed > grainDur + 0.04) continue;

          // 生命周期归一化进度 (0.0 .. 1.0)
          const progress = Math.min(1.0, Math.max(0.0, elapsed / grainDur));

          // AHR 窗函数瞬时增益：控制粒子生灭透明度与光晕大小
          const atkTime = Math.max(0.003, g.attack ?? (grainDur * 0.1));
          const relTime = Math.max(0.005, g.release ?? (grainDur * 0.45));
          const holdTime = Math.max(0.0, grainDur - atkTime - relTime);
          let envGain = 0;
          if (elapsed < atkTime) {
            envGain = elapsed / atkTime;
          } else if (elapsed < atkTime + holdTime) {
            envGain = 1.0;
          } else if (elapsed < grainDur) {
            envGain = Math.max(0, 1.0 - (elapsed - atkTime - holdTime) / relTime);
          }

          // 核心运动方程：严丝合缝在当前粒子有效切片区间 [startLimit, endLimit] 内部滑行，绝不超过高亮范围
          const startLimit = Math.max(rangeStart, Math.min(rangeEnd, g.sampleOffset !== undefined ? g.sampleOffset : position));
          const endLimit = Math.min(rangeEnd, startLimit + (g.grainSpanNorm ?? activeGrainSpan));
          const effectiveSpan = Math.max(0.002, endLimit - startLimit);

          const instantaneousOffset = g.isReverse
            ? Math.max(startLimit, Math.min(endLimit, endLimit - progress * effectiveSpan))
            : Math.max(startLimit, Math.min(endLimit, startLimit + progress * effectiveSpan));
          const gx = Math.max(3, Math.min(w - 3, instantaneousOffset * w));

          // === 波形轮廓内垂直散布 (Phase Plant 风格) ===
          // 用粒子 ID 的黄金比例哈希生成确定性伪随机垂直偏移，同一粒子生命周期内位置恒定
          const yHash = (((g.id * 2654435761) & 0xFFFFFFFF) >>> 0) / 4294967296;
          const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor(instantaneousOffset * numPoints)));
          const localPeak = peaks[peakIdx] ?? 0.4;
          const localAmp = localPeak * (h * 0.38);
          // 在波形振幅范围内散布，pan 值施加微弱偏移
          const panBias = (g.pan ?? 0.0) * (h * 0.06);
          const gy = Math.max(5, Math.min(h - 5,
            midY + (yHash - 0.5) * localAmp * 1.8 - panBias
          ));

          const alpha = Math.max(0.08, Math.min(1.0, envGain));
          const peak = Math.max(0.3, Math.min(1.0, g.peakGain ?? 1.0));
          const radius = Math.max(2.5, Math.min(6.5, (2.5 + envGain * 3.5) * peak));

          // 方向感速度尾迹 (正向粒子拖尾朝左，反向朝右，严格约束在高亮切片内)
          const tailLen = Math.max(4, radius * (2.0 + (1 - progress) * 2.0));
          const minTailX = startLimit * w;
          const maxTailX = endLimit * w;
          const rawTailEndX = g.isReverse ? gx + tailLen : gx - tailLen;
          const boundedTailEndX = Math.max(minTailX, Math.min(maxTailX, rawTailEndX));

          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(boundedTailEndX, gy);
          ctx.strokeStyle = g.isReverse
            ? `rgba(168, 85, 247, ${(alpha * 0.55).toFixed(3)})`
            : `rgba(52, 211, 153, ${(alpha * 0.55).toFixed(3)})`;
          ctx.lineWidth = Math.max(1.5, radius * 0.5);
          ctx.lineCap = 'round';
          ctx.stroke();

          // 外层光晕圈 (Phase Plant 粒子辉光)
          ctx.beginPath();
          ctx.arc(gx, gy, radius * 1.7, 0, Math.PI * 2);
          ctx.fillStyle = g.isReverse
            ? `rgba(168, 85, 247, ${(alpha * 0.10).toFixed(3)})`
            : `rgba(52, 211, 153, ${(alpha * 0.10).toFixed(3)})`;
          ctx.fill();

          // 核心粒子发光体 (内核高亮 + 投影发光)
          ctx.beginPath();
          ctx.arc(gx, gy, radius, 0, Math.PI * 2);
          ctx.fillStyle = g.isReverse
            ? `rgba(216, 180, 254, ${(alpha * 0.95).toFixed(3)})`
            : `rgba(110, 231, 183, ${(alpha * 0.95).toFixed(3)})`;
          ctx.shadowColor = g.isReverse ? '#a855f7' : '#10b981';
          // Android WebView 上 shadowBlur 走昂贵的软件渲染,低端设备禁用
          ctx.shadowBlur = getPerformanceBudget().allowShadowBlur ? Math.round(envGain * 12) : 0;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 6. Hover indicator line
      const hoverPos = hoverPositionRef.current;
      if (hoverPos !== null) {
        const hoverX = hoverPos * w;
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, h);
        ctx.stroke();
      }

      // 7. Playhead Position Cursor (Phase Plant Main Playhead Pointer)
      const playheadX = position * w;
      ctx.strokeStyle = readAccent('400', '#38bdf8');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      // Top triangle pointer
      ctx.fillStyle = readAccent('400', '#38bdf8');
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 6);
      ctx.closePath();
      ctx.fill();

      // Bottom triangle pointer
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, h);
      ctx.lineTo(playheadX + 4, h);
      ctx.lineTo(playheadX, h - 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      if (isVisuallyActive) {
        animId = requestAnimationFrame(render);
      }
    };

    renderRef.current = render;
    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [sampleId, position, positionJitter, rangeStart, rangeEnd, isPlaying, bypass, getLiveGrains, getAudioCurrentTime, isDark, duration, sampleMetadata]);

  // Interactive Playhead & Range Scrubbing Handlers (D30 & D29)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    (e.target as Element).setPointerCapture(e.pointerId);

    const pxX = e.clientX - rect.left;
    const normX = Math.max(0, Math.min(1, pxX / rect.width));

    // 采用 16px 物理/逻辑触控热区替代不可靠的归一化 0.035
    const hitRadiusPx = 16;
    const distStartPx = Math.abs(pxX - rangeStart * rect.width);
    const distEndPx = Math.abs(pxX - rangeEnd * rect.width);
    const distPlayheadPx = Math.abs(pxX - position * rect.width);

    // 优先放行区间边界裁剪手柄 (即使 playhead 与 rangeStart/rangeEnd 重合)
    if (onRangeChange && distStartPx <= hitRadiusPx && (distStartPx <= distPlayheadPx || pxX <= rangeStart * rect.width)) {
      setActiveDragTarget('rangeStart');
    } else if (onRangeChange && distEndPx <= hitRadiusPx && (distEndPx <= distPlayheadPx || pxX >= rangeEnd * rect.width)) {
      setActiveDragTarget('rangeEnd');
    } else {
      setActiveDragTarget('playhead');
      const clampedPos = Math.max(rangeStart, Math.min(rangeEnd, normX));
      onPositionChange?.(Number(clampedPos.toFixed(3)));
    }
  };

  // 实时计算鼠标悬停位置 (useRef 解耦，避免 60fps 全组件 re-render)，并根据当前拖拽目标平滑更新 Position 或裁剪区间
  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    hoverPositionRef.current = normX;
    if (!isPlaying || bypass) {
      renderRef.current();
    }

    if (!activeDragTarget) return;

    if (activeDragTarget === 'rangeStart' && onRangeChange) {
      const newStart = Math.max(0, Math.min(rangeEnd - 0.04, normX));
      onRangeChange(Number(newStart.toFixed(3)), rangeEnd);
    } else if (activeDragTarget === 'rangeEnd' && onRangeChange) {
      const newEnd = Math.max(rangeStart + 0.04, Math.min(1.0, normX));
      onRangeChange(rangeStart, Number(newEnd.toFixed(3)));
    } else if (activeDragTarget === 'playhead') {
      const clampedPos = Math.max(rangeStart, Math.min(rangeEnd, normX));
      onPositionChange?.(Number(clampedPos.toFixed(3)));
    }
  };

  // 鼠标离开视窗时清理悬停指示线
  const handlePointerLeave = () => {
    hoverPositionRef.current = null;
    if (!isPlaying || bypass) {
      renderRef.current();
    }
  };

  // 释放指针捕获并结束拖拽交互状态
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    setActiveDragTarget(null);
  };

  // Custom Audio File Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFile(false);
  };

  // 外部音频文件拖入就地解码：注册至样本库并立即切换至该样本发声
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFile(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (importingRef.current) return;
    if (!file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) {
      setImportError('请选择 WAV、MP3、OGG、FLAC、AAC 或 M4A 音频。');
      return;
    }
    if (file.size > MAX_IMPORTED_AUDIO_BYTES) {
      setImportError('音频文件不能超过 64 MB，请先裁剪所需片段。');
      return;
    }
    importingRef.current = true;
    setIsImporting(true);
    setImportError(null);

    let tempCtx: AudioContext | null = null;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) throw new Error('当前环境不支持音频导入。');
      const arrayBuffer = await file.arrayBuffer();
      if (!mountedRef.current) return;
      tempCtx = new AudioCtxClass();
      importContextRef.current = tempCtx;
      const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      if (!mountedRef.current) return;

      const registered = registerCustomAudioSample(tempCtx, file.name, decodedBuffer);
      onCustomSampleLoaded?.(registered.id);
    } catch (err) {
      if (mountedRef.current) setImportError(err instanceof Error && !(err instanceof DOMException)
        ? err.message : '无法读取该音频，请检查文件后重试。');
    } finally {
      if (tempCtx && importContextRef.current === tempCtx) {
        importContextRef.current = null;
        void tempCtx.close().catch(() => {});
      }
      importingRef.current = false;
      if (mountedRef.current) setIsImporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg border overflow-hidden select-none transition-colors ${
        isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'
      } ${isDragOverFile ? 'ring-2 ring-sky-400 border-sky-400' : ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`
      }}
      role="region"
      aria-label="Granular Source Waveform & Interactive Playhead Scope"
      aria-busy={isImporting}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
      />

      {/* Accessible Slider for Screen Readers & Automated Tests */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Granular Position"
        aria-valuenow={Math.round(position * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(position * 100)}%`}
        className="sr-only"
      />

      {/* Top Header HUD: Title & Parameters */}
      <div className="absolute top-1 left-2 flex items-center gap-2 pointer-events-none text-[8px] font-mono leading-none">
        <span className={`font-semibold tracking-wider uppercase ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
          Sample Waveform
        </span>
        <span className={`font-semibold tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          POS: {Math.round(position * 100)}%
        </span>
        {positionJitter > 0 && (
          <span className={`font-semibold tabular-nums ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
            JIT: ±{Math.round(positionJitter * 100)}%
          </span>
        )}
        {(rangeStart > 0 || rangeEnd < 1) && (
          <span className={`font-semibold tabular-nums ${isDark ? 'text-cyan-300' : 'text-teal-700'}`}>
            RNG: [{Math.round(rangeStart * 100)}%..{Math.round(rangeEnd * 100)}%]
          </span>
        )}
      </div>

      {/* Top Right Sample Metadata Badge */}
      <div className={`absolute top-1 right-2 pointer-events-none text-[7.5px] font-mono flex items-center gap-1.5 ${
        isDark ? 'text-slate-400' : 'text-slate-600'
      }`}>
        <span className={`px-1 py-0.5 rounded border tabular-nums transition-colors ${
          isDark
            ? 'bg-slate-800/60 border-slate-700/50 text-slate-400'
            : 'bg-slate-100/90 border-slate-200 text-slate-600'
        }`}>
          {sampleMetadata?.sampleRate ? `${Math.round(sampleMetadata.sampleRate / 1000)}k` : '44.1k'} · {sampleMetadata?.channels === 1 ? 'Mono' : 'Stereo'} · {(getSampleDuration(sampleId) ?? sampleMetadata?.duration ?? 3.6).toFixed(1)}s
        </span>
      </div>

      {/* Drag & Drop Overlay */}
      {(isImporting || importError) && (
        <div role={importError ? 'alert' : 'status'} className={`absolute inset-x-2 bottom-5 rounded border px-2 py-1 text-[10px] ${
          isDark ? 'border-neutral-700 bg-neutral-950/95 text-slate-200' : 'border-neutral-300 bg-white/95 text-neutral-800'
        }`}>
          {importError ?? '正在加载音频，请稍候…'}
        </div>
      )}
      {isDragOverFile && (
        <div className="absolute inset-0 bg-sky-950/85 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="border border-sky-400/80 border-dashed rounded px-3 py-1.5 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-200 font-bold">
              Drop Audio File to Granularize
            </span>
          </div>
        </div>
      )}

      {/* Quick Drop Hint on Hover */}
      <div className={`absolute bottom-1 right-2 pointer-events-none text-[7.5px] font-mono ${
        isDark ? 'text-slate-500 opacity-70' : 'text-slate-500'
      }`}>
        Drag Handles to Crop Range · Click Playhead · Drop Audio
      </div>
    </div>
  );
};
