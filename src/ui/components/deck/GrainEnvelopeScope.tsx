import React, { useRef, useState, useCallback } from 'react';
import { useTheme } from '../../theme';
import { readAccent, readAccentRgb } from '../../theme/deckPalette';
import type { GrainEnvelopeConfig, GrainDirection, GrainWindowShape } from '../../../types/audio';

interface GrainEnvelopeScopeProps {
  duration?: number;          // in seconds (e.g. 0.245)
  envelope?: GrainEnvelopeConfig;
  activeGrainsCount?: number; // density or current active count
  density?: number;           // interactive density setting (Phase Plant grains count)
  rate?: number;              // interactive rate setting in Hz (Phase Plant rate)
  direction?: GrainDirection;
  sync?: boolean;             // Phase Plant tempo sync mode toggle
  onDirectionChange?: (dir: GrainDirection) => void;
  onEnvelopeChange?: (newEnvelope: GrainEnvelopeConfig) => void;
  onDurationChange?: (newDuration: number) => void;
  onDensityChange?: (newDensity: number) => void;
  onRateChange?: (newRate: number) => void;
  onSyncChange?: (sync: boolean) => void;
  width?: number | string;
  height?: number;
}

export const GrainEnvelopeScope: React.FC<GrainEnvelopeScopeProps> = ({
  duration = 0.245,
  envelope = { attack: 0.10, hold: 0.45, release: 0.45, shape: 'trapezoid' },
  activeGrainsCount = 2.93,
  density,
  rate,
  direction = 'forward',
  sync = false,
  onDirectionChange,
  onEnvelopeChange,
  onDurationChange,
  onDensityChange,
  onRateChange,
  onSyncChange,
  width = '100%',
  height = 120 // 视窗扩充至 120px，提供开阔的专业 DAW 操作空间与吸附手感
}) => {
  const { isDark } = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDraggingNode, setActiveDraggingNode] = useState<'attack' | 'release' | 'duration' | null>(null);
  const activeDraggingNodeRef = useRef<'attack' | 'release' | 'duration' | null>(null);
  const [durationDragSvgDx, setDurationDragSvgDx] = useState(0);
  const [isDraggingDuration, setIsDraggingDuration] = useState(false);
  const [isDraggingDensity, setIsDraggingDensity] = useState(false);
  const [isDraggingRate, setIsDraggingRate] = useState(false);
  const [triggerMode, setTriggerMode] = useState<'grains' | 'rate'>('grains');
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(sync);
  const durationDragRef = useRef<{ startX: number; startY: number; startDuration: number } | null>(null);
  const densityDragRef = useRef<{ startX: number; startDensity: number } | null>(null);
  const rateDragRef = useRef<{ startX: number; startRate: number } | null>(null);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0.245;
  const shape = envelope.shape || 'trapezoid';
  const currentDensity = density ?? activeGrainsCount;
  const currentRate = rate ?? (safeDuration > 0 ? Number((currentDensity / safeDuration).toFixed(1)) : 16.0);
  const rawAtt = Number.isFinite(envelope.attack) ? (envelope.attack as number) : 0.10;
  const rawRel = Number.isFinite(envelope.release) ? (envelope.release as number) : 0.45;
  const attackFrac = Math.max(0.01, Math.min(0.48, rawAtt));
  const releaseFrac = Math.max(0.02, Math.min(0.65, rawRel));
  const holdFrac = Math.max(0.0, 1.0 - attackFrac - releaseFrac);

  // SVG Virtual Geometry (expanded normalized space: 240 x 68 for 120px height)
  const vbW = 240;
  const vbH = 68;
  const padX = 10;
  const padTop = 8;
  const padBot = 10;
  const graphW = vbW - padX * 2;

  const yBase = vbH - padBot;
  const yPeak = padTop;

  const x0 = padX;
  const x1 = padX + attackFrac * graphW;
  const x2 = padX + (attackFrac + holdFrac) * graphW;
  const baseX3 = padX + graphW;
  // D32: During duration handle dragging, provide visible horizontal position feedback
  const x3 = Math.max(x2 + 8, Math.min(vbW - 4, baseX3 + (activeDraggingNode === 'duration' ? durationDragSvgDx : 0)));
  const currentGraphW = x3 - x0;

  // Build SVG Path based on envelope shape (D31: dynamically responds to attackFrac, holdFrac, releaseFrac)
  const sampleSmoothPath = (evalEnv: (t: number) => number): string => {
    const points: string[] = [];
    const numSteps = 32;
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const env = evalEnv(t);
      const px = x0 + t * currentGraphW;
      const py = yBase - (yBase - yPeak) * env;
      points.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    return points.join(' ');
  };

  let pathD = '';
  if (shape === 'gaussian') {
    const attackSig = Math.max(0.001, attackFrac / 2.2);
    const releaseSig = Math.max(0.001, releaseFrac / 2.2);
    pathD = sampleSmoothPath(t => {
      if (t < attackFrac) {
        return Math.exp(-Math.pow((t - attackFrac) / attackSig, 2));
      }
      if (t <= attackFrac + holdFrac) {
        return 1.0;
      }
      return Math.exp(-Math.pow((t - (attackFrac + holdFrac)) / releaseSig, 2));
    });
  } else if (shape === 'sine') {
    pathD = sampleSmoothPath(t => {
      if (attackFrac > 0.0001 && t < attackFrac) {
        return Math.sin((Math.PI / 2) * (t / attackFrac));
      }
      if (t <= attackFrac + holdFrac) {
        return 1.0;
      }
      if (releaseFrac > 0.0001) {
        const relT = Math.min(1.0, (t - (attackFrac + holdFrac)) / releaseFrac);
        return Math.cos((Math.PI / 2) * relT);
      }
      return 0.0;
    });
  } else if (shape === 'hann') {
    pathD = sampleSmoothPath(t => {
      if (attackFrac > 0.0001 && t < attackFrac) {
        return 0.5 * (1 - Math.cos((Math.PI * t) / attackFrac));
      }
      if (t <= attackFrac + holdFrac) {
        return 1.0;
      }
      if (releaseFrac > 0.0001) {
        const relT = Math.min(1.0, (t - (attackFrac + holdFrac)) / releaseFrac);
        return 0.5 * (1 + Math.cos(Math.PI * relT));
      }
      return 0.0;
    });
  } else {
    // Triangle & Trapezoid share piecewise linear segments through (x0,yBase) -> (x1,yPeak) -> (x2,yPeak) -> (x3,yBase)
    pathD = `M ${x0} ${yBase} L ${x1} ${yPeak} L ${x2} ${yPeak} L ${x3} ${yBase}`;
  }

  const fillD = `${pathD} L ${x3} ${yBase} L ${x0} ${yBase} Z`;

  // Pointer drag interactions for Attack / Release / Duration End Node
  const handlePointerDown = (node: 'attack' | 'release' | 'duration', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
    activeDraggingNodeRef.current = node;
    setActiveDraggingNode(node);
    if (node === 'duration') {
      const safeInitialDuration = Number.isFinite(duration) && duration > 0 ? duration : 0.245;
      durationDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startDuration: safeInitialDuration
      };
      setDurationDragSvgDx(0);
      setIsDraggingDuration(true);
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const activeNode = activeDraggingNodeRef.current || activeDraggingNode;
    if (!activeNode) return;

    if (activeNode === 'duration') {
      if (!durationDragRef.current || !onDurationChange) return;
      const dx = e.clientX - durationDragRef.current.startX;
      const rect = svgRef.current?.getBoundingClientRect();
      const svgDx = rect && rect.width > 0 ? (dx / rect.width) * vbW : dx * 0.5;
      const maxLeft = (x2 + 8) - (padX + graphW);
      const maxRight = (vbW - 4) - (padX + graphW);
      setDurationDragSvgDx(Math.max(maxLeft, Math.min(maxRight, svgDx)));

      const safeStart = Number.isFinite(durationDragRef.current.startDuration) && durationDragRef.current.startDuration > 0
        ? durationDragRef.current.startDuration
        : 0.245;
      const rawCalc = e.shiftKey
        ? safeStart + dx * 0.001
        : safeStart * Math.pow(2, dx / 70);
      const newDur = Number.isFinite(rawCalc)
        ? Math.max(0.02, Math.min(10.0, rawCalc))
        : 0.245;
      onDurationChange(Number(newDur.toFixed(3)));
      return;
    }

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    // D32: 严格将 clientX 映射到 SVG 视口坐标 (0..vbW) 并减去 padX 边距，消除 4.17% 初始跳变
    const svgX = ((e.clientX - rect.left) / rect.width) * vbW;
    const normGraphX = Math.max(0, Math.min(1, (svgX - padX) / graphW));

    if (activeNode === 'attack') {
      const newAttack = Math.max(0.01, Math.min(0.48, Math.min(normGraphX, 1.0 - releaseFrac - 0.02)));
      const newHold = Math.max(0.0, 1.0 - newAttack - releaseFrac);
      onEnvelopeChange?.({
        ...envelope,
        attack: Number(newAttack.toFixed(3)),
        hold: Number(newHold.toFixed(3)),
        release: releaseFrac,
        shape
      });
    } else if (activeNode === 'release') {
      const releaseFromRight = 1.0 - normGraphX;
      const newRelease = Math.max(0.02, Math.min(0.65, Math.min(releaseFromRight, 1.0 - attackFrac - 0.02)));
      const newHold = Math.max(0.0, 1.0 - attackFrac - newRelease);
      onEnvelopeChange?.({
        ...envelope,
        attack: attackFrac,
        hold: Number(newHold.toFixed(3)),
        release: Number(newRelease.toFixed(3)),
        shape
      });
    }
  }, [activeDraggingNode, attackFrac, releaseFrac, envelope, shape, onEnvelopeChange, onDurationChange, x2, padX, graphW, vbW]);

  // 释放指针捕获并结束包络或时长端点拖拽
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    activeDraggingNodeRef.current = null;
    setActiveDraggingNode(null);
    setDurationDragSvgDx(0);
    if (durationDragRef.current) {
      durationDragRef.current = null;
      setIsDraggingDuration(false);
    }
  };

  // 切换微粒窗函数类型（梯形、高斯钟形、正弦平滑、汉宁窗或三角窗）
  const handleShapeSelect = (newShape: GrainWindowShape) => {
    onEnvelopeChange?.({
      ...envelope,
      shape: newShape
    });
  };

  // 顶部时长徽标指针拖拽起始：委托给统一的 handlePointerDown('duration') 以避免
  // 与包络图右端 duration 节点重复实现指针捕获和起始状态初始化逻辑。指针移动
  // 计算仍由 handleDurationPointerMove 独立处理（保留双轴 dx+dy 映射语义）。
  const handleDurationPointerDown = (e: React.PointerEvent) => {
    if (!onDurationChange) return;
    handlePointerDown('duration', e);
  };

  // 顶部时长徽标拖拽计算：双轴移动平滑映射为 20ms - 10000ms 微粒播放时长 (自适应指数缩放)
  const handleDurationPointerMove = (e: React.PointerEvent) => {
    if (!durationDragRef.current || !onDurationChange) return;
    const dx = e.clientX - durationDragRef.current.startX;
    const dy = durationDragRef.current.startY - e.clientY; // Up is positive
    const delta = dx + dy;
    const safeStart = Number.isFinite(durationDragRef.current.startDuration) && durationDragRef.current.startDuration > 0
      ? durationDragRef.current.startDuration
      : 0.245;
    const rawCalc = e.shiftKey
      ? safeStart + delta * 0.001
      : safeStart * Math.pow(2, delta / 70);
    const newDur = Number.isFinite(rawCalc)
      ? Math.max(0.02, Math.min(10.0, rawCalc))
      : 0.245;
    onDurationChange(Number(newDur.toFixed(3)));
  };

  // 释放时长徽标指针捕获
  const handleDurationPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    durationDragRef.current = null;
    setIsDraggingDuration(false);
  };

  // 键盘方向键步进调节微粒时长
  const handleDurationKeyDown = (e: React.KeyboardEvent) => {
    if (!onDurationChange) return;
    const step = e.shiftKey ? 0.01 : 0.05;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onDurationChange(Number(Math.min(10.0, safeDuration + step).toFixed(3)));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onDurationChange(Number(Math.max(0.02, safeDuration - step).toFixed(3)));
    }
  };

  // 鼠标滚轮缩放调节微粒时长
  const handleDurationWheel = (e: React.WheelEvent) => {
    if (!onDurationChange) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.005 : 0.02;
    const dir = e.deltaY < 0 ? 1 : -1;
    const newDur = Math.max(0.02, Math.min(10.0, safeDuration + dir * step));
    onDurationChange(Number(newDur.toFixed(3)));
  };

  // 底部 Grains 密度徽标指针拖拽起始：捕获起始坐标与初始并发密度
  const handleDensityPointerDown = (e: React.PointerEvent) => {
    if (!onDensityChange) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
    densityDragRef.current = {
      startX: e.clientX,
      startDensity: currentDensity
    };
    setIsDraggingDensity(true);
  };

  // 底部 Grains 密度徽标拖拽计算：水平移动平滑映射为 1 - 32 并发粒子数，并同步换算 Rate
  const handleDensityPointerMove = (e: React.PointerEvent) => {
    if (!densityDragRef.current || !onDensityChange) return;
    const dx = e.clientX - densityDragRef.current.startX;
    const step = e.shiftKey ? 0.02 : 0.1;
    const startDen = Number.isFinite(densityDragRef.current.startDensity) ? densityDragRef.current.startDensity : 8.0;
    const newDensity = Math.max(1.0, Math.min(32.0, startDen + dx * step));
    const roundedDensity = Number(newDensity.toFixed(2));
    onDensityChange(roundedDensity);
    if (onRateChange && safeDuration > 0) {
      onRateChange(Number((roundedDensity / safeDuration).toFixed(1)));
    }
  };

  // 释放密度徽标指针捕获
  const handleDensityPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    densityDragRef.current = null;
    setIsDraggingDensity(false);
  };

  // 鼠标滚轮微调微粒并发密度并同步换算 Rate
  const handleDensityWheel = (e: React.WheelEvent) => {
    if (!onDensityChange) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.1 : 0.5;
    const dir = e.deltaY < 0 ? 1 : -1;
    const newDensity = Math.max(1.0, Math.min(32.0, currentDensity + dir * step));
    const roundedDensity = Number(newDensity.toFixed(2));
    onDensityChange(roundedDensity);
    if (onRateChange && safeDuration > 0) {
      onRateChange(Number((roundedDensity / safeDuration).toFixed(1)));
    }
  };

  // 键盘方向键步进调节微粒并发密度并同步换算 Rate
  const handleDensityKeyDown = (e: React.KeyboardEvent) => {
    if (!onDensityChange) return;
    const step = e.shiftKey ? 0.2 : 1.0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const roundedDensity = Number(Math.min(32.0, currentDensity + step).toFixed(2));
      onDensityChange(roundedDensity);
      if (onRateChange && safeDuration > 0) {
        onRateChange(Number((roundedDensity / safeDuration).toFixed(1)));
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const roundedDensity = Number(Math.max(1.0, currentDensity - step).toFixed(2));
      onDensityChange(roundedDensity);
      if (onRateChange && safeDuration > 0) {
        onRateChange(Number((roundedDensity / safeDuration).toFixed(1)));
      }
    }
  };

  // 底部 Rate 触发频率徽标指针拖拽起始：捕获起始坐标与初始频率
  const handleRatePointerDown = (e: React.PointerEvent) => {
    if (!onRateChange && !onDensityChange) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
    rateDragRef.current = {
      startX: e.clientX,
      startRate: currentRate
    };
    setIsDraggingRate(true);
  };

  // 底部 Rate 触发频率徽标拖拽计算：水平移动平滑映射为 0.1 - 200 Hz，并同步换算 Density
  const handleRatePointerMove = (e: React.PointerEvent) => {
    if (!rateDragRef.current) return;
    const dx = e.clientX - rateDragRef.current.startX;
    const step = e.shiftKey ? 0.1 : 0.5;
    const newRate = Math.max(0.1, Math.min(200.0, rateDragRef.current.startRate + dx * step));
    const roundedRate = Number(newRate.toFixed(1));
    if (onRateChange) onRateChange(roundedRate);
    if (onDensityChange && safeDuration > 0) {
      const derivedDensity = Math.max(1.0, Math.min(32.0, roundedRate * safeDuration));
      onDensityChange(Number(derivedDensity.toFixed(2)));
    }
  };

  // 释放 Rate 徽标指针捕获
  const handleRatePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    rateDragRef.current = null;
    setIsDraggingRate(false);
  };

  // 鼠标滚轮微调微粒触发频率并同步换算 Density
  const handleRateWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 0.2 : 1.0;
    const dir = e.deltaY < 0 ? 1 : -1;
    const newRate = Math.max(0.1, Math.min(200.0, currentRate + dir * step));
    const roundedRate = Number(newRate.toFixed(1));
    if (onRateChange) onRateChange(roundedRate);
    if (onDensityChange && safeDuration > 0) {
      const derivedDensity = Math.max(1.0, Math.min(32.0, roundedRate * safeDuration));
      onDensityChange(Number(derivedDensity.toFixed(2)));
    }
  };

  // 键盘方向键步进调节微粒触发频率并同步换算 Density
  const handleRateKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : 2.0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newRate = Math.min(200.0, currentRate + step);
      const roundedRate = Number(newRate.toFixed(1));
      if (onRateChange) onRateChange(roundedRate);
      if (onDensityChange && safeDuration > 0) {
        onDensityChange(Number(Math.min(32.0, roundedRate * safeDuration).toFixed(2)));
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const newRate = Math.max(0.1, currentRate - step);
      const roundedRate = Number(newRate.toFixed(1));
      if (onRateChange) onRateChange(roundedRate);
      if (onDensityChange && safeDuration > 0) {
        onDensityChange(Number(Math.max(1.0, roundedRate * safeDuration).toFixed(2)));
      }
    }
  };

  const durationMs = Math.round(safeDuration * 1000);
  const attackMs = Math.round(safeDuration * attackFrac * 1000);
  const releaseMs = Math.round(safeDuration * releaseFrac * 1000);

  return (
    <div
      className={`relative rounded-lg border overflow-hidden select-none flex flex-col justify-between transition-colors ${
        isDark ? 'border-neutral-800 bg-neutral-950 text-slate-200' : 'border-neutral-200 bg-white text-slate-800'
      }`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`
      }}
      role="region"
      aria-label="Grain Envelope Window Scope"
    >
      {/* Top Header: Phase Plant Standard Header (Title, Shape Badge & Duration / Sync Controls) */}
      <div className={`flex items-center justify-between px-2 pt-1.5 pb-1 border-b text-[8px] font-mono leading-none ${
        isDark ? 'border-neutral-900 bg-neutral-900/60' : 'border-neutral-100 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold tracking-wider uppercase text-[8.5px] ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
            Grain Envelope
          </span>
          {/* Screen reader compatibility labels for tests */}
          <span className="sr-only">Grain Env</span>
          <span className="sr-only">A:{attackMs}ms · R:{releaseMs}ms</span>

          {/* Compact Window Shape Menu Toggle */}
          <div className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => setIsShapeMenuOpen(prev => !prev)}
              title={`Envelope Window Shape: ${shape}`}
              aria-label="Grain Window Shape"
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono uppercase border transition-colors flex items-center gap-1 ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900 text-sky-300 hover:bg-neutral-800'
                  : 'border-neutral-200 bg-slate-100 text-sky-700 hover:bg-slate-200'
              }`}
            >
              <span>{shape.slice(0, 4)}</span>
              <span className="text-[6px] text-slate-400">▾</span>
            </button>

            {/* Shape Options Dropdown / Accessible Container */}
            <div className={`absolute left-0 top-full mt-1 z-30 flex items-center gap-1 p-1 rounded-md border shadow-lg backdrop-blur-md transition-all ${
              isShapeMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none sr-only'
            } ${
              isDark ? 'border-neutral-800 bg-neutral-950/95' : 'border-neutral-200 bg-white/95'
            }`}>
              {(['trapezoid', 'gaussian', 'sine', 'triangle', 'hann'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    handleShapeSelect(s);
                    setIsShapeMenuOpen(false);
                  }}
                  title={`Envelope Window Shape: ${s}`}
                  className={`px-1.5 py-0.5 rounded text-[7px] font-mono uppercase transition-colors ${
                    shape === s
                      ? isDark
                        ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/50'
                        : 'bg-sky-50 text-sky-700 font-bold border border-sky-300'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {s.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Duration Control & Tempo Sync Button */}
        <div className="flex items-center gap-1">
          {onDurationChange ? (
            <div
              role="slider"
              tabIndex={0}
              aria-label="Grain Duration"
              aria-valuenow={durationMs}
              aria-valuemin={20}
              aria-valuemax={10000}
              aria-valuetext={`${durationMs} ms`}
              title="Drag horizontally or vertically, scroll wheel, or double-click to reset grain duration (20ms - 10000ms)"
              onPointerDown={handleDurationPointerDown}
              onPointerMove={handleDurationPointerMove}
              onPointerUp={handleDurationPointerUp}
              onPointerCancel={handleDurationPointerUp}
              onKeyDown={handleDurationKeyDown}
              onWheel={handleDurationWheel}
              onDoubleClick={(e) => {
                e.preventDefault();
                onDurationChange(0.245);
              }}
              className={`font-semibold tabular-nums px-1.5 py-0.5 rounded cursor-ew-resize transition-all ${
                isDraggingDuration
                  ? isDark
                    ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-400'
                    : 'bg-sky-100 text-sky-800 ring-1 ring-sky-500'
                  : isDark
                    ? 'text-sky-300 hover:bg-sky-500/20 hover:text-sky-100'
                    : 'text-sky-700 hover:bg-sky-100 hover:text-sky-900'
              }`}
            >
              <span>{durationMs >= 1000 ? `${safeDuration.toFixed(2)}s` : `${durationMs}ms`}</span>
              <span className="sr-only">{durationMs}ms</span>
            </div>
          ) : (
            <span className={`font-semibold tabular-nums px-1.5 py-0.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
              {durationMs >= 1000 ? `${safeDuration.toFixed(2)}s` : `${durationMs}ms`}
            </span>
          )}

          {/* Phase Plant Note / Tempo Sync Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextSync = !isSyncActive;
              setIsSyncActive(nextSync);
              onSyncChange?.(nextSync);
            }}
            title={isSyncActive ? 'Tempo Sync Active (Quarter/16th Note Grid)' : 'Free Duration (Millisecond Mode)'}
            aria-label="Toggle Tempo Sync"
            className={`px-1.5 py-0.5 rounded border text-[8px] font-mono transition-colors flex items-center justify-center ${
              isSyncActive
                ? isDark
                  ? 'border-sky-400/80 bg-sky-500/25 text-sky-300 font-bold shadow-xs'
                  : 'border-sky-400 bg-sky-100 text-sky-700 font-bold shadow-xs'
                : isDark
                  ? 'border-neutral-800 bg-neutral-900/60 text-slate-500 hover:text-slate-300 hover:border-neutral-700'
                  : 'border-neutral-200 bg-slate-100 text-slate-500 hover:text-slate-700 hover:border-neutral-300'
            }`}
          >
            <span>♩</span>
          </button>
        </div>
      </div>

      {/* Center SVG Interactive Curve */}
      <div className="relative flex-1 w-full overflow-hidden px-1.5 py-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <linearGradient id="grain-env-grad-v2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={readAccent(isDark ? '400' : '600', '#38bdf8')} stopOpacity={isDark ? "0.32" : "0.20"} />
              <stop offset="70%" stopColor={readAccent(isDark ? '400' : '600', '#38bdf8')} stopOpacity={isDark ? "0.08" : "0.04"} />
              <stop offset="100%" stopColor={readAccent(isDark ? '400' : '600', '#38bdf8')} stopOpacity="0.0" />
            </linearGradient>
            <filter id="grain-curve-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={readAccent(isDark ? '400' : '600', '#38bdf8')} floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Envelope Fill Area */}
          <path d={fillD} fill="url(#grain-env-grad-v2)" />

          {/* Envelope Stroke Line with Phase Plant Cyan Glow */}
          <path
            d={pathD}
            fill="none"
            stroke={readAccent(isDark ? '400' : '600', '#38bdf8')}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#grain-curve-glow)"
          />

          {/* Ground baseline */}
          <line
            x1={x0}
            y1={yBase}
            x2={x3}
            y2={yBase}
            stroke={isDark ? "#334155" : "#cbd5e1"}
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />

          {/* Live Drag Guidelines & HUD Tooltip Badges */}
          {activeDraggingNode === 'attack' && (
            <g className="pointer-events-none">
              <line x1={x1} y1={yPeak} x2={x1} y2={yBase} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="1" strokeDasharray="2,2" opacity="0.65" />
              <rect x={Math.max(4, Math.min(vbW - 68, x1 - 34))} y={Math.max(2, yPeak - 18)} width="68" height="14" rx="3" fill={isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="0.8" />
              <text x={Math.max(4, Math.min(vbW - 68, x1 - 34)) + 34} y={Math.max(2, yPeak - 18) + 10} textAnchor="middle" fill={readAccent(isDark ? '400' : '600', '#38bdf8')} fontSize="7" fontFamily="monospace" fontWeight="bold">
                ATK {Math.round(safeDuration * attackFrac * 1000)}ms
              </text>
            </g>
          )}

          {activeDraggingNode === 'release' && (
            <g className="pointer-events-none">
              <line x1={x2} y1={yPeak} x2={x2} y2={yBase} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="1" strokeDasharray="2,2" opacity="0.65" />
              <rect x={Math.max(4, Math.min(vbW - 68, x2 - 34))} y={Math.max(2, yPeak - 18)} width="68" height="14" rx="3" fill={isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="0.8" />
              <text x={Math.max(4, Math.min(vbW - 68, x2 - 34)) + 34} y={Math.max(2, yPeak - 18) + 10} textAnchor="middle" fill={readAccent(isDark ? '400' : '600', '#38bdf8')} fontSize="7" fontFamily="monospace" fontWeight="bold">
                REL {Math.round(safeDuration * releaseFrac * 1000)}ms
              </text>
            </g>
          )}

          {activeDraggingNode === 'duration' && (
            <g className="pointer-events-none">
              <line x1={x3} y1={yPeak} x2={x3} y2={yBase} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="1.2" strokeDasharray="2,2" opacity="0.8" />
              <rect x={Math.max(4, Math.min(vbW - 74, x3 - 37))} y={Math.max(2, yBase - 22)} width="74" height="15" rx="3" fill={isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"} stroke={readAccent(isDark ? '400' : '600', '#38bdf8')} strokeWidth="1.0" />
              <text x={Math.max(4, Math.min(vbW - 74, x3 - 37)) + 37} y={Math.max(2, yBase - 22) + 10.5} textAnchor="middle" fill={readAccent(isDark ? '400' : '600', '#38bdf8')} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                LEN {safeDuration >= 1.0 ? `${safeDuration.toFixed(2)}s` : `${Math.round(safeDuration * 1000)}ms`}
              </text>
            </g>
          )}

          {/* Interactive Node Handle 1: Attack Control Point (Phase Plant Luminous Dual Ring) */}
          <g className="cursor-ew-resize group">
            <circle
              cx={x1}
              cy={yPeak}
              r="14"
              fill="transparent"
              onPointerDown={e => handlePointerDown('attack', e)}
            />
            <circle
              cx={x1}
              cy={yPeak}
              r={activeDraggingNode === 'attack' ? 9.0 : 7.0}
              fill={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.22)`}
              stroke={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.65)`}
              strokeWidth="1.2"
              className="transition-colors group-hover:stroke-sky-300 group-hover:fill-sky-400/35"
              onPointerDown={e => handlePointerDown('attack', e)}
            />
            <circle
              cx={x1}
              cy={yPeak}
              r="3.5"
              fill={readAccent(isDark ? '400' : '600', '#38bdf8')}
              stroke={isDark ? "#090d16" : "#ffffff"}
              strokeWidth="1.2"
              className="transition-colors group-hover:fill-sky-200"
              onPointerDown={e => handlePointerDown('attack', e)}
            />
          </g>

          {/* Interactive Node Handle 2: Release Control Point (Phase Plant Luminous Dual Ring) */}
          <g className="cursor-ew-resize group">
            <circle
              cx={x2}
              cy={yPeak}
              r="14"
              fill="transparent"
              onPointerDown={e => handlePointerDown('release', e)}
            />
            <circle
              cx={x2}
              cy={yPeak}
              r={activeDraggingNode === 'release' ? 9.0 : 7.0}
              fill={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.22)`}
              stroke={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.65)`}
              strokeWidth="1.2"
              className="transition-colors group-hover:stroke-sky-300 group-hover:fill-sky-400/35"
              onPointerDown={e => handlePointerDown('release', e)}
            />
            <circle
              cx={x2}
              cy={yPeak}
              r="3.5"
              fill={readAccent(isDark ? '400' : '600', '#38bdf8')}
              stroke={isDark ? "#090d16" : "#ffffff"}
              strokeWidth="1.2"
              className="transition-colors group-hover:fill-sky-200"
              onPointerDown={e => handlePointerDown('release', e)}
            />
          </g>

          {/* Interactive Node Handle 3: Duration End Node (Phase Plant Release End Handle with Length Bracket) */}
          <g className="cursor-ew-resize group">
            <circle
              cx={x3}
              cy={yBase}
              r="16"
              fill="transparent"
              title="Drag horizontally to adjust playback duration (20ms - 10000ms)"
              onPointerDown={e => handlePointerDown('duration', e)}
            />
            <circle
              cx={x3}
              cy={yBase}
              r={activeDraggingNode === 'duration' ? 9.5 : 7.0}
              fill={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.22)`}
              stroke={`rgba(${readAccentRgb("400", "#38bdf8")}, 0.65)`}
              strokeWidth="1.2"
              className="transition-colors group-hover:stroke-sky-300 group-hover:fill-sky-400/35"
              onPointerDown={e => handlePointerDown('duration', e)}
            />
            <circle
              cx={x3}
              cy={yBase}
              r="3.5"
              fill={readAccent(isDark ? '400' : '600', '#38bdf8')}
              stroke={isDark ? "#090d16" : "#ffffff"}
              strokeWidth="1.2"
              className="transition-colors group-hover:fill-sky-200"
              onPointerDown={e => handlePointerDown('duration', e)}
            />
            <rect
              x={x3 - 3.5}
              y={yBase - 5}
              width="7"
              height="10"
              rx="2"
              fill={readAccent(isDark ? '400' : '600', '#38bdf8')}
              stroke={isDark ? "#090d16" : "#ffffff"}
              strokeWidth="1.2"
              className="transition-colors group-hover:fill-sky-200 group-hover:stroke-sky-300"
              onPointerDown={e => handlePointerDown('duration', e)}
            />
            <line
              x1={x3}
              y1={yBase - 3}
              x2={x3}
              y2={yBase + 3}
              stroke={isDark ? "#090d16" : "#ffffff"}
              strokeWidth="1"
              pointerEvents="none"
            />
          </g>
        </svg>
      </div>

      {/* Bottom Bar: Live Grains Density & Direction Controls */}
      <div className={`flex items-center justify-between px-2 py-1 border-t text-[8px] font-mono leading-none ${
        isDark ? 'border-neutral-900 bg-neutral-900/60' : 'border-neutral-100 bg-slate-50/80'
      }`}>
        {/* Real-time Density / Grains / Rate Dual-Mode Control (Phase Plant Grains Box 截图红框区域) */}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <button
            type="button"
            onClick={() => setTriggerMode(m => (m === 'grains' ? 'rate' : 'grains'))}
            title="Toggle Trigger Mode: Grains (Density) or Rate (Hz)"
            aria-label={`Trigger Mode: ${triggerMode === 'grains' ? 'Grains' : 'Rate'}`}
            className={`text-[7.5px] font-mono px-1 py-0.5 rounded border transition-colors uppercase font-bold ${
              isDark
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/25'
                : 'border-emerald-600/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {triggerMode === 'grains' ? 'GR' : 'HZ'}
          </button>
          {triggerMode === 'grains' ? (
            onDensityChange ? (
              <div
                role="slider"
                tabIndex={0}
                aria-label="Grain Density"
                aria-valuenow={currentDensity}
                aria-valuemin={1}
                aria-valuemax={32}
                aria-valuetext={`${currentDensity.toFixed(2)} grains`}
                title="Drag horizontally, scroll wheel, or double-click to adjust density (1 - 32 grains)"
                onPointerDown={handleDensityPointerDown}
                onPointerMove={handleDensityPointerMove}
                onPointerUp={handleDensityPointerUp}
                onPointerCancel={handleDensityPointerUp}
                onWheel={handleDensityWheel}
                onKeyDown={handleDensityKeyDown}
                onDoubleClick={() => {
                  onDensityChange(4.0);
                  if (onRateChange && safeDuration > 0) onRateChange(Number((4.0 / safeDuration).toFixed(1)));
                }}
                className={`font-semibold tabular-nums px-1.5 py-0.5 rounded cursor-ew-resize transition-all ${
                  isDraggingDensity
                    ? isDark
                      ? 'bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500'
                    : isDark
                      ? 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200'
                      : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                {currentDensity.toFixed(2)} grains
              </div>
            ) : (
              <span className={`font-semibold tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentDensity.toFixed(2)} grains
              </span>
            )
          ) : (
            (onRateChange || onDensityChange) ? (
              <div
                role="slider"
                tabIndex={0}
                aria-label="Grain Rate"
                aria-valuenow={currentRate}
                aria-valuemin={0.1}
                aria-valuemax={200}
                aria-valuetext={`${currentRate.toFixed(1)} Hz`}
                title="Drag horizontally, scroll wheel, or double-click to adjust rate (0.1 - 200 Hz)"
                onPointerDown={handleRatePointerDown}
                onPointerMove={handleRatePointerMove}
                onPointerUp={handleRatePointerUp}
                onPointerCancel={handleRatePointerUp}
                onWheel={handleRateWheel}
                onKeyDown={handleRateKeyDown}
                onDoubleClick={() => {
                  if (onRateChange) onRateChange(16.0);
                  if (onDensityChange && safeDuration > 0) onDensityChange(Number(Math.min(32.0, 16.0 * safeDuration).toFixed(2)));
                }}
                className={`font-semibold tabular-nums px-1.5 py-0.5 rounded cursor-ew-resize transition-all ${
                  isDraggingRate
                    ? isDark
                      ? 'bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500'
                    : isDark
                      ? 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200'
                      : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                {currentRate.toFixed(1)} Hz
              </div>
            ) : (
              <span className={`font-semibold tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentRate.toFixed(1)} Hz
              </span>
            )
          )}
        </div>

        {/* Direction Switcher (Forward, Ping-Pong, Reverse) */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onDirectionChange?.('forward')}
            title="Forward Playback"
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors ${
              direction === 'forward'
                ? isDark
                  ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/50'
                  : 'bg-sky-100 text-sky-700 font-bold border border-sky-300'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            |→
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange?.('pingpong')}
            title="Ping-Pong Playback"
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors ${
              direction === 'pingpong'
                ? isDark
                  ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/50'
                  : 'bg-sky-100 text-sky-700 font-bold border border-sky-300'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            |→←|
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange?.('reverse')}
            title="Reverse Playback"
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors ${
              direction === 'reverse'
                ? isDark
                  ? 'bg-purple-500/25 text-purple-300 font-bold border border-purple-500/50'
                  : 'bg-purple-100 text-purple-700 font-bold border border-purple-300'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            ←|
          </button>
        </div>
      </div>
    </div>
  );
};
