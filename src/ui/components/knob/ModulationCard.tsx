import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Check, Sliders, Activity, Wind, Waves, Compass, Clock, Maximize2 } from 'lucide-react';
import { ThemeContext } from '../../theme/ThemeProvider';
import { useModalDialog } from '../../hooks/useModalDialog';
import type { ModulationRoute, ModulationSource, FullBreathCurveData } from '../../../types';
import {
  createDefaultBreathCurveData,
  generateStageSvgPath,
  evaluateFullBreathCurve,
  createCurveDataFromMultipliers,
  extractStageMultipliersFromCurve
} from '../../../audio/dsp/curveMath';
import { polarToCartesian, describeArc } from './arcUtils';


export interface ModulationCardProps {
  target: string;
  targetLabel: string;
  route?: ModulationRoute;
  isOpen: boolean;
  onAssign: (route: ModulationRoute) => void;
  onUnassign: () => void;
  onClose: () => void;
  onOpenStudio?: () => void;
  className?: string;
  breathMacro?: number;
  isPlaying?: boolean;
  clockSnapshot?: any;
  lfo1Rate?: number;
  lfo2Rate?: number;
  isDark?: boolean;
}

interface SourceMeta {
  id: ModulationSource;
  label: string;
  nameZh: string;
  icon: React.ComponentType<{ size: number; className?: string; strokeWidth?: number }>;
  descZh: string;
  group: 'breath' | 'lfo';
}

const BREATH_SOURCES: SourceMeta[] = [
  {
    id: 'breathMacro',
    label: 'Breath Macro',
    nameZh: '呼吸宏',
    icon: Wind,
    descZh: '随呼吸涨落，吸展呼敛',
    group: 'breath'
  },
  {
    id: 'stageProgress',
    label: 'Stage Env',
    nameZh: '阶段包络',
    icon: Clock,
    descZh: '四阶段步进动态',
    group: 'breath'
  }
];

const LFO_SOURCES: SourceMeta[] = [
  {
    id: 'lfo1',
    label: 'LFO 1',
    nameZh: '低频振荡 1',
    icon: Activity,
    descZh: '正弦微波，柔颤与音高漂移',
    group: 'lfo'
  },
  {
    id: 'lfo2',
    label: 'LFO 2',
    nameZh: '低频振荡 2',
    icon: Waves,
    descZh: '潮汐律动，扫频与声场摇摆',
    group: 'lfo'
  }
];

const SOURCES: SourceMeta[] = [...BREATH_SOURCES, ...LFO_SOURCES];

export const ModulationCard: React.FC<ModulationCardProps> = ({
  target,
  targetLabel,
  route,
  isOpen,
  onAssign,
  onUnassign,
  onClose,
  onOpenStudio,
  className = '',
  breathMacro = 0.5,
  isPlaying = false,
  clockSnapshot,
  lfo1Rate = 0.15,
  lfo2Rate = 0.08,
  isDark: propIsDark
}) => {
  const themeCtx = useContext(ThemeContext);
  const isDark = propIsDark ?? themeCtx?.isDark ?? true;
  const dialogRef = useModalDialog(isOpen, onClose);

  const [selectedSource, setSelectedSource] = useState<ModulationSource>(
    (route?.source && route.source !== 'manual')
      ? route.source
      : (target === 'stage-envelope' ? 'stageProgress' : 'breathMacro')
  );
  const [depth, setDepth] = useState<number>(route?.depth ?? 0.0);
  const [isBipolar, setIsBipolar] = useState<boolean>(route?.bipolar ?? true);
  const [stageMultipliers, setStageMultipliers] = useState<{
    inhale: number;
    holdIn: number;
    exhale: number;
    holdOut: number;
    curve?: 'smooth' | 'linear' | 'step';
  }>(
    route?.stageMultipliers ?? { inhale: 1.0, holdIn: 0.8, exhale: 0.3, holdOut: 0.0, curve: 'smooth' }
  );

  const [curveData, setCurveData] = useState<FullBreathCurveData>(() => {
    return route?.curveData ?? createDefaultBreathCurveData();
  });

  // Synchronize internal state when route prop changes (e.g. from studio edits or external preset switch)
  useEffect(() => {
    if (!isOpen) return;
    const activeSrc = (route?.source && route.source !== 'manual')
      ? route.source
      : (target === 'stage-envelope' ? 'stageProgress' : 'breathMacro');
    setSelectedSource(activeSrc);
    setDepth(route?.depth ?? 0.0);
    setIsBipolar(route?.bipolar ?? true);

    const mults = route?.stageMultipliers ?? { inhale: 1.0, holdIn: 0.8, exhale: 0.3, holdOut: 0.0, curve: 'smooth' };
    setStageMultipliers(mults);

    if (route?.curveData) {
      setCurveData(route.curveData);
    } else {
      setCurveData(createCurveDataFromMultipliers(mults));
    }
  }, [route, target, isOpen]);

  const [elapsedTime, setElapsedTime] = useState(0);

  // Real-time animation ticker driven by sound playback status
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    let frameId: number;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setElapsedTime(prev => prev + dt);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const handleApply = () => {
    const calculatedMultipliers = selectedSource === 'stageProgress'
      ? extractStageMultipliersFromCurve(curveData)
      : undefined;

    onAssign({
      source: selectedSource,
      target,
      depth,
      bipolar: isBipolar,
      stageMultipliers: calculatedMultipliers,
      curveData: selectedSource === 'stageProgress' ? curveData : undefined
    });
    onClose();
  };

  const handleClear = () => {
    onUnassign();
    onClose();
  };

  // Real-time modulation signal value (-1 to +1 for bipolar, 0 to 1 for unipolar)
  const getCurrentModSignal = (): number => {
    if (!isPlaying) return 0;
    switch (selectedSource) {
      case 'breathMacro': {
        const raw = clockSnapshot?.breathMacro ?? breathMacro ?? 0.5;
        const bm = Math.max(0, Math.min(1, raw));
        return isBipolar ? (bm * 2 - 1) : bm;
      }
      case 'lfo1': {
        const sinVal = Math.sin(2 * Math.PI * lfo1Rate * elapsedTime);
        return isBipolar ? sinVal : (sinVal + 1) / 2;
      }
      case 'lfo2': {
        const raw =
          Math.sin(2 * Math.PI * lfo2Rate * elapsedTime) * 0.7 +
          Math.sin(4 * Math.PI * lfo2Rate * elapsedTime) * 0.3;
        return isBipolar ? raw : (raw + 1) / 2;
      }
      case 'stageProgress': {
        const stage = clockSnapshot?.currentStage ?? 'inhale';
        const progress = Math.max(0, Math.min(1, clockSnapshot?.stageProgress ?? 0));
        const prevTarget: number =
          stage === 'inhale'
            ? stageMultipliers.holdOut
            : stage === 'holdIn'
            ? stageMultipliers.inhale
            : stage === 'exhale'
            ? stageMultipliers.holdIn
            : stageMultipliers.exhale;
        const currTarget: number = stageMultipliers[stage as 'inhale' | 'holdIn' | 'exhale' | 'holdOut'] ?? 0.5;
        let t = progress;
        if (stageMultipliers.curve === 'smooth') {
          t = 0.5 * (1 - Math.cos(Math.PI * progress));
        } else if (stageMultipliers.curve === 'step') {
          t = 1.0;
        }
        const val = prevTarget + (currTarget - prevTarget) * t;
        return isBipolar ? (val * 2 - 1) : val;
      }
      case 'manual':
      default:
        return 0;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    updateDepthFromPointer(e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateDepthFromPointer(e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const updateDepthFromPointer = (clientY: number, rect: DOMRect) => {
    if (rect.height <= 0) return;
    const ratio = (clientY - rect.top) / rect.height; // 0 (top) .. 1 (bottom)
    const clamped = Math.max(0, Math.min(1, ratio));
    let rawDepth = 1.0 - clamped * 2.0; // +1.0 (top) .. -1.0 (bottom)
    if (Math.abs(rawDepth) < 0.035) {
      rawDepth = 0.0;
    }
    setDepth(Math.round(rawDepth * 100) / 100);
  };

  const depthPercentage = Math.round(depth * 100);
  const depthDisplay = depth >= 0 ? `+${depthPercentage}%` : `${depthPercentage}%`;

  const currentSourceMeta = SOURCES.find(s => s.id === selectedSource) || SOURCES[0];

  // Dynamic visual calculations
  const absDepthPct = Math.round(Math.abs(depth) * 100);
  const formattedRange = (() => {
    if (absDepthPct === 0) return '[基准, 基准]';
    if (isBipolar) {
      return `[基准 - ${absDepthPct}%, 基准 + ${absDepthPct}%]`;
    }
    // 单向
    if (depth >= 0) {
      return `[基准, 基准 + ${absDepthPct}%]`;
    } else {
      return `[基准 - ${absDepthPct}%, 基准]`;
    }
  })();

  // Render Graphical Animation for the selected source driven by actual sound engine state
  const renderSourceGraphic = () => {
    switch (selectedSource) {
      case 'breathMacro': {
        const rawBreath = clockSnapshot?.breathMacro ?? breathMacro ?? 0.5;
        const breathFactor = Number.isFinite(rawBreath) ? Math.max(0, Math.min(1, rawBreath)) : 0.5;
        const radius = 10 + 22 * breathFactor;
        return (
          <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg width={56} height={56} className="overflow-visible">
                <circle
                  cx={28}
                  cy={28}
                  r={24}
                  fill="none"
                  stroke="#38bdf8"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <circle
                  cx={28}
                  cy={28}
                  r={radius}
                  fill="#38bdf8"
                  fillOpacity={0.18}
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                />
                <circle cx={28} cy={28} r={3.5} fill="#38bdf8" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between text-[11px] font-mono text-sky-500 font-medium mb-1">
                <span>{isPlaying ? '实时驱动' : '已暂停'}</span>
                <span>{Math.round(breathFactor * 100)}%</span>
              </div>
              <div className={`w-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'} h-1.5 rounded-full overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-75"
                  style={{ width: `${Math.round(breathFactor * 100)}%` }}
                />
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-neutral-500'} mt-1 leading-tight`}>
                {currentSourceMeta.descZh}
              </p>
            </div>
          </div>
        );
      }

      case 'lfo1': {
        const waveWidth = 140;
        const waveHeight = 36;
        const numSamples = 32;
        let d = '';
        for (let i = 0; i <= numSamples; i++) {
          const x = (i / numSamples) * waveWidth;
          const s = Math.sin((i / numSamples) * 2 * Math.PI);
          const y = isBipolar
            ? waveHeight / 2 - s * (waveHeight * 0.4)
            : (waveHeight - 4) - ((s + 1) / 2) * (waveHeight - 8);
          d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        const cycleProgress = isPlaying ? ((elapsedTime * lfo1Rate) % 1) : 0.25;
        const partX = cycleProgress * waveWidth;
        const partS = Math.sin(cycleProgress * 2 * Math.PI);
        const partY = isBipolar
          ? waveHeight / 2 - partS * (waveHeight * 0.4)
          : (waveHeight - 4) - ((partS + 1) / 2) * (waveHeight - 8);

        return (
          <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <svg width={waveWidth} height={waveHeight} className="overflow-visible">
              <line
                x1={0}
                y1={isBipolar ? waveHeight / 2 : waveHeight - 4}
                x2={waveWidth}
                y2={isBipolar ? waveHeight / 2 : waveHeight - 4}
                stroke={isDark ? "#334155" : "#cbd5e1"}
                strokeDasharray="2,2"
              />
              <path d={d} fill="none" stroke="#a855f7" strokeWidth={1.5} />
              <circle
                cx={partX}
                cy={partY}
                r={3.5}
                fill="#c084fc"
                className="drop-shadow-[0_0_6px_#c084fc]"
              />
            </svg>
            <div className="flex-1 text-left">
              <span className="text-[11px] font-mono text-purple-400 font-medium block mb-0.5">
                正弦周期震荡 · {lfo1Rate.toFixed(2)} Hz {isPlaying ? '' : '(已静止)'}
              </span>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-neutral-500'} leading-tight`}>
                {isBipolar ? '双极性 [-1, +1]' : '单极性 [0, +1]'}
              </p>
            </div>
          </div>
        );
      }

      case 'lfo2': {
        const waveWidth = 140;
        const waveHeight = 36;
        const numSamples = 32;
        const phase = isPlaying ? (elapsedTime * lfo2Rate * 2 * Math.PI) : 0;
        let d = '';
        for (let i = 0; i <= numSamples; i++) {
          const x = (i / numSamples) * waveWidth;
          const raw =
            Math.sin((i / numSamples) * 2 * Math.PI + phase) * 0.6 +
            Math.sin((i / numSamples) * 4 * Math.PI) * 0.3;
          const y = isBipolar
            ? waveHeight / 2 - raw * (waveHeight * 0.35)
            : (waveHeight - 4) - ((raw + 1) / 2) * (waveHeight - 8);
          d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        return (
          <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <svg width={waveWidth} height={waveHeight} className="overflow-visible">
              <line
                x1={0}
                y1={isBipolar ? waveHeight / 2 : waveHeight - 4}
                x2={waveWidth}
                y2={isBipolar ? waveHeight / 2 : waveHeight - 4}
                stroke={isDark ? "#334155" : "#cbd5e1"}
                strokeDasharray="2,2"
              />
              <path d={d} fill="none" stroke="#6366f1" strokeWidth={1.5} />
            </svg>
            <div className="flex-1 text-left">
              <span className="text-[11px] font-mono text-indigo-400 font-medium block mb-0.5">
                双频潮汐扫频 · {lfo2Rate.toFixed(2)} Hz {isPlaying ? '' : '(已静止)'}
              </span>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-neutral-500'} leading-tight`}>
                {isBipolar ? '双极性 [-1, +1]' : '单极性 [0, +1]'}
              </p>
            </div>
          </div>
        );
      }

      case 'stageProgress': {
        const stage = clockSnapshot?.currentStage ?? 'inhale';
        const progress = Number.isFinite(clockSnapshot?.stageProgress) ? Math.max(0, Math.min(1, clockSnapshot.stageProgress)) : 0;
        const totalW = 380;
        const totalH = 105;
        const stageW = totalW / 4; // 95px per stage

        const inhPath = generateStageSvgPath(curveData.inhale, stageW, totalH, 0, 24);
        const holdInPath = generateStageSvgPath(curveData.holdIn, stageW, totalH, stageW, 24);
        const exhPath = generateStageSvgPath(curveData.exhale, stageW, totalH, stageW * 2, 24);
        const holdOutPath = generateStageSvgPath(curveData.holdOut, stageW, totalH, stageW * 3, 24);
        const fullPanoramaD = `${inhPath} ${holdInPath.replace(/^M [^ ]+ [^ ]+/, '')} ${exhPath.replace(/^M [^ ]+ [^ ]+/, '')} ${holdOutPath.replace(/^M [^ ]+ [^ ]+/, '')}`;

        const stageIdx = stage === 'inhale' ? 0 : stage === 'holdIn' ? 1 : stage === 'exhale' ? 2 : 3;
        const globalPlayheadT = (stageIdx + progress) / 4.0;
        const playheadX = globalPlayheadT * totalW;
        const currentVal = evaluateFullBreathCurve(curveData, stage, progress);
        const playheadY = totalH - currentVal * totalH;

        const stageMetrics = extractStageMultipliersFromCurve(curveData);

        return (
          <div className={`flex flex-col gap-2.5 p-3 rounded-xl border ${
            isDark ? 'border-neutral-800 bg-neutral-900/70' : 'border-neutral-200 bg-neutral-50'
          }`}>
            {/* Medium Interactive Stage Envelope Viewport */}
            <div
              onClick={() => {
                onOpenStudio?.();
                onClose();
              }}
              className={`relative rounded-xl border p-2.5 overflow-hidden cursor-pointer group transition-all select-none ${
                isDark
                  ? 'border-neutral-800/90 bg-[#07090e] hover:border-sky-500/70 hover:shadow-[0_0_16px_rgba(56,189,248,0.12)]'
                  : 'border-neutral-300 bg-white hover:border-sky-400 hover:shadow-md'
              }`}
              title="点击打开包络工作台"
            >
              {/* Top Viewport Header */}
              <div className={`flex items-center justify-between text-[10px] font-mono mb-2 px-1 ${
                isDark ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold uppercase tracking-wider">
                  <Clock size={12} strokeWidth={1.5} />
                  <span>阶段包络全景</span>
                </span>
                <span className={`flex items-center gap-1 text-[9px] font-mono transition-colors ${
                  isDark ? 'text-sky-400/90 group-hover:text-sky-300' : 'text-sky-600 group-hover:text-sky-700'
                }`}>
                  <span>工作台</span>
                  <Maximize2 size={10} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                </span>
              </div>

              {/* Oscilloscope Stage Canvas */}
              <div className={`relative w-full h-[105px] rounded-lg border overflow-hidden flex items-center justify-center ${
                isDark ? 'bg-[#05070a] border-neutral-800/80' : 'bg-slate-50 border-neutral-200'
              }`}>
                {/* 4 Stage Ambient Columns & Status */}
                <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                  {[
                    { key: 'inhale', label: '吸气 Inhale', sub: '充能', activeBg: isDark ? 'bg-sky-500/[0.08]' : 'bg-sky-500/[0.12]', textCol: 'text-sky-500 font-semibold', val: stageMetrics.inhale },
                    { key: 'holdIn', label: '屏息 Hold In', sub: '悬停', activeBg: isDark ? 'bg-indigo-500/[0.08]' : 'bg-indigo-500/[0.12]', textCol: 'text-indigo-500 font-semibold', val: stageMetrics.holdIn },
                    { key: 'exhale', label: '呼气 Exhale', sub: '释放', activeBg: isDark ? 'bg-purple-500/[0.08]' : 'bg-purple-500/[0.12]', textCol: 'text-purple-500 font-semibold', val: stageMetrics.exhale },
                    { key: 'holdOut', label: '静息 Hold Out', sub: '止息', activeBg: isDark ? 'bg-teal-500/[0.08]' : 'bg-teal-500/[0.12]', textCol: 'text-teal-500 font-semibold', val: stageMetrics.holdOut }
                  ].map(s => {
                    const isCurr = stage === s.key;
                    return (
                      <div
                        key={s.key}
                        className={`h-full border-r last:border-r-0 flex flex-col justify-between p-1.5 transition-colors ${
                          isDark ? 'border-neutral-800/40' : 'border-neutral-200/80'
                        } ${isCurr ? s.activeBg : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono font-medium ${isCurr ? `${s.textCol} font-bold` : (isDark ? 'text-slate-400' : 'text-neutral-500')}`}>
                            {s.label}
                          </span>
                          {isCurr && isPlaying && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                        <div className={`flex items-center justify-between text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-neutral-400'}`}>
                          <span>{s.sub}</span>
                          <span className={`font-mono tabular-nums ${isCurr ? (isDark ? 'text-slate-200 font-semibold' : 'text-neutral-900 font-semibold') : (isDark ? 'text-slate-400' : 'text-neutral-600')}`}>
                            {Math.round(s.val * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Oscilloscope Grid & Waveform SVG */}
                <svg viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="none" className="w-full h-full overflow-visible z-10">
                  <defs>
                    <linearGradient id="medium-mseg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? "0.28" : "0.20"} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Dashes */}
                  <line x1={0} y1={totalH * 0.25} x2={totalW} y2={totalH * 0.25} stroke={isDark ? "#1f2937" : "#e2e8f0"} strokeDasharray="3,3" strokeWidth={0.7} />
                  <line x1={0} y1={totalH * 0.50} x2={totalW} y2={totalH * 0.50} stroke={isDark ? "#334155" : "#cbd5e1"} strokeDasharray="2,2" strokeWidth={0.8} />
                  <line x1={0} y1={totalH * 0.75} x2={totalW} y2={totalH * 0.75} stroke={isDark ? "#1f2937" : "#e2e8f0"} strokeDasharray="3,3" strokeWidth={0.7} />

                  {/* Vertical Stage Divider Ticks */}
                  <line x1={stageW} y1={0} x2={stageW} y2={totalH} stroke={isDark ? "#374151" : "#cbd5e1"} strokeDasharray="2,2" strokeWidth={0.8} />
                  <line x1={stageW * 2} y1={0} x2={stageW * 2} y2={totalH} stroke={isDark ? "#374151" : "#cbd5e1"} strokeDasharray="2,2" strokeWidth={0.8} />
                  <line x1={stageW * 3} y1={0} x2={stageW * 3} y2={totalH} stroke={isDark ? "#374151" : "#cbd5e1"} strokeDasharray="2,2" strokeWidth={0.8} />

                  {/* Curve Area Semi-transparent Fill */}
                  <path
                    d={`${fullPanoramaD} L ${totalW} ${totalH} L 0 ${totalH} Z`}
                    fill="url(#medium-mseg-grad)"
                  />

                  {/* Main Curve Luminous Stroke */}
                  <path
                    d={fullPanoramaD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    className="drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                  />

                  {/* Live Laser Playhead */}
                  {isPlaying && (
                    <g>
                      <line
                        x1={playheadX}
                        y1={0}
                        x2={playheadX}
                        y2={totalH}
                        stroke="#38bdf8"
                        strokeWidth={1.2}
                        strokeDasharray="2,1"
                      />
                      <circle
                        cx={playheadX}
                        cy={playheadY}
                        r={4}
                        fill="#ffffff"
                        stroke="#0284c7"
                        strokeWidth={1.8}
                        className="drop-shadow-[0_0_8px_#38bdf8]"
                      />
                    </g>
                  )}
                </svg>

                {/* Subtle Hover Action Hint Overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none backdrop-blur-[0.5px] z-20 ${
                  isDark ? 'bg-sky-950/25' : 'bg-sky-900/10'
                }`}>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-md border shadow-md flex items-center gap-1.5 ${
                    isDark ? 'text-sky-200 bg-neutral-950/90 border-sky-500/50' : 'text-sky-900 bg-white/95 border-sky-300'
                  }`}>
                    <Maximize2 size={11} strokeWidth={1.5} className="text-sky-400" />
                    <span>进入工作台</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Entry Button */}
            {onOpenStudio && (
              <button
                type="button"
                onClick={() => {
                  onOpenStudio();
                  onClose();
                }}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-mono font-medium shadow-sm transition-all ${
                  isDark
                    ? 'border-sky-500/40 bg-sky-950/25 hover:bg-sky-950/50 hover:border-sky-400 text-sky-200'
                    : 'border-sky-300 bg-sky-50 hover:bg-sky-100 hover:border-sky-400 text-sky-800'
                }`}
              >
                <Maximize2 size={13} strokeWidth={1.5} className={isDark ? "text-sky-400" : "text-sky-600"} />
                <span>打开工作台</span>
              </button>
            )}
          </div>
        );
      }

      case 'manual':
      default: {
        return (
          <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <Compass size={24} className={isDark ? "text-slate-500" : "text-neutral-400"} strokeWidth={1.5} />
            <div className="text-left">
              <span className={`text-[11px] font-mono font-medium block mb-0.5 ${
                isDark ? 'text-slate-300' : 'text-neutral-700'
              }`}>
                直通
              </span>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-neutral-500'} leading-tight`}>
                {currentSourceMeta.descZh}
              </p>
            </div>
          </div>
        );
      }
    }
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto ${
        isDark ? 'bg-black/75' : 'bg-neutral-900/40'
      }`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Modulation assignment for ${targetLabel}`}
        className={`relative w-full max-w-2xl rounded-2xl border p-5 shadow-2xl my-auto ${
          isDark ? 'border-neutral-800 bg-neutral-950 text-slate-100' : 'border-neutral-200 bg-white text-neutral-900'
        } ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-2">
            <Sliders size={16} strokeWidth={1.5} className="text-violet-400" />
            <div>
              <h2 className={`text-xs font-semibold tracking-wider uppercase truncate ${
                isDark ? 'text-slate-100' : 'text-neutral-900'
              }`}>
                {targetLabel}
              </h2>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-neutral-500'}`}>
                调制源分配
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modulation card"
            className={`transition-colors p-1.5 rounded-lg border border-transparent ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:border-neutral-800 hover:bg-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Responsive Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-4">
          {/* Left Column (7 cols): Sources & Preview */}
          <div className="md:col-span-7 flex flex-col gap-3.5">

        {/* 1. Modulation Source Selector - Two-Branch Architecture */}
        <div className="mb-4 space-y-2.5">
          <span className={`text-[10px] uppercase tracking-wider font-medium block ${
            isDark ? 'text-slate-400' : 'text-neutral-500'
          }`}>
            选择调制源
          </span>

          {/* Branch A & B: Breath Dynamic Group & Internal Synth LFO Group */}
          {[
            {
              key: 'breath',
              title: '呼吸动态',
              headerColor: 'text-sky-400',
              HeaderIcon: Wind,
              sources: BREATH_SOURCES,
              activeBtnDark: 'border-sky-500 bg-sky-950/70 text-sky-200 font-medium shadow-sm',
              activeBtnLight: 'border-sky-500 bg-sky-50 text-sky-800 font-semibold shadow-sm',
              activeIconColor: 'text-sky-400'
            },
            {
              key: 'lfo',
              title: '内部 LFO',
              headerColor: 'text-purple-400',
              HeaderIcon: Activity,
              sources: LFO_SOURCES,
              activeBtnDark: 'border-purple-500 bg-purple-950/70 text-purple-200 font-medium shadow-sm',
              activeBtnLight: 'border-purple-500 bg-purple-50 text-purple-800 font-semibold shadow-sm',
              activeIconColor: 'text-purple-400'
            }
          ].map(group => {
            const GroupIcon = group.HeaderIcon;
            return (
              <div key={group.key}>
                <div className={`flex items-center gap-1.5 text-[9.5px] uppercase tracking-wider ${group.headerColor} font-mono font-medium mb-1`}>
                  <GroupIcon size={11} strokeWidth={1.5} />
                  <span>{group.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.sources.map(s => {
                    const isSelected = selectedSource === s.id;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSource(s.id)}
                        className={`flex items-center gap-2 text-xs py-2 px-2.5 rounded-lg border transition-all text-left truncate ${
                          isSelected
                            ? (isDark ? group.activeBtnDark : group.activeBtnLight)
                            : (isDark
                                ? 'border-neutral-800 bg-neutral-900/60 text-slate-400 hover:border-neutral-700 hover:text-slate-200'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900')
                        }`}
                      >
                        <Icon size={14} strokeWidth={1.5} className={isSelected ? group.activeIconColor : (isDark ? 'text-slate-500' : 'text-neutral-400')} />
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Graphical Preview Area (Dynamic waveform/graphic for beginners) */}
        <div className="mb-0">
          <span className={`text-[10px] uppercase tracking-wider font-medium block mb-1.5 ${
            isDark ? 'text-slate-400' : 'text-neutral-500'
          }`}>
            波形预览
          </span>
          {renderSourceGraphic()}
        </div>
      </div>

      {/* Right Column (5 cols): Target Knob & Fader & Polarity */}
      <div className="md:col-span-5 flex flex-col gap-3.5 justify-between">

        {/* 3. Target Knob Preview & Vertical Bipolar Depth Fader */}
        <div className={`mb-4 rounded-xl border p-3 ${
          isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50'
        }`}>
          <div className={`flex justify-between items-center mb-2.5 pb-2 border-b ${
            isDark ? 'border-neutral-800/80' : 'border-neutral-200'
          }`}>
            <span className={`text-[10px] uppercase tracking-wider font-medium ${
              isDark ? 'text-slate-400' : 'text-neutral-500'
            }`}>
              {selectedSource === 'stageProgress'
                ? '阶段总控'
                : '调制强度'}
            </span>
            <span className={`font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded border shadow-sm ${
              isDark
                ? 'text-violet-300 bg-violet-950/70 border-violet-800/60'
                : 'text-violet-700 bg-violet-50 border-violet-200'
            }`}>
              {depthDisplay}
            </span>
          </div>

          <div className="flex items-center justify-around gap-4 pt-1">
            {/* Left: Target Knob Interactive Serum-style Preview */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg width={96} height={96} viewBox="0 0 96 96" className="overflow-visible select-none">
                  <defs>
                    <radialGradient id="card-knob-body-grad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#262626" />
                      <stop offset="100%" stopColor="#121212" />
                    </radialGradient>
                  </defs>

                  {/* Outer Base Track (270 deg from 135 to 405) */}
                  <path
                    d={describeArc(48, 48, 40, 135, 405)}
                    fill="none"
                    stroke={isDark ? "#262626" : "#e2e8f0"}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />

                  {/* Base Value Arc (50% position: 135 to 270) */}
                  <path
                    d={describeArc(48, 48, 40, 135, 270)}
                    fill="none"
                    stroke={isDark ? "#525252" : "#94a3b8"}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />

                  {/* Serum-Style Modulation Depth Arc (from 270 deg) */}
                  {Math.abs(depth) > 0.005 && (
                    <path
                      d={describeArc(
                        48,
                        48,
                        40,
                        270,
                        Math.max(135, Math.min(405, 270 + depth * 135))
                      )}
                      fill="none"
                      stroke={depth >= 0 ? '#38bdf8' : '#818cf8'}
                      strokeWidth={3.5}
                      strokeOpacity={0.65}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Real-time Dynamic Sweep Arc driven by live mod signal */}
                  {Math.abs(depth) > 0.005 && isPlaying && (
                    <path
                      d={describeArc(
                        48,
                        48,
                        40,
                        270,
                        Math.max(135, Math.min(405, 270 + depth * getCurrentModSignal() * 135))
                      )}
                      fill="none"
                      stroke={depth >= 0 ? '#00f0ff' : '#818cf8'}
                      strokeWidth={4}
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_6px_#00f0ff]"
                    />
                  )}

                  {/* Live Playhead Dot on Modulation Arc */}
                  {(() => {
                    const effectiveSig = isPlaying ? getCurrentModSignal() : 0;
                    const liveAng = Math.max(135, Math.min(405, 270 + depth * effectiveSig * 135));
                    const pt = polarToCartesian(48, 48, 40, liveAng);
                    return (
                      <g>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={4.5}
                          fill="#ffffff"
                          stroke={depth >= 0 ? '#00f0ff' : '#818cf8'}
                          strokeWidth={2}
                          className="drop-shadow-[0_0_8px_#00f0ff]"
                        />
                        <circle cx={pt.x} cy={pt.y} r={1.5} fill={depth >= 0 ? "#0284c7" : "#4f46e5"} />
                      </g>
                    );
                  })()}

                  {/* Knob Metal Core Body */}
                  <circle
                    cx={48}
                    cy={48}
                    r={28}
                    fill={isDark ? "#171717" : "#f1f5f9"}
                    stroke={isDark ? "#404040" : "#cbd5e1"}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={48}
                    cy={48}
                    r={24}
                    fill={isDark ? "url(#card-knob-body-grad)" : "#ffffff"}
                    stroke={isDark ? "#262626" : "#e2e8f0"}
                    strokeWidth={1}
                  />

                  {/* Knob Center Indicator Pointer (12 o'clock default baseline) */}
                  <line
                    x1={48}
                    y1={24}
                    x2={48}
                    y2={34}
                    stroke={isDark ? "#f8fafc" : "#0f172a"}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Knob Target Descriptor */}
              <div className="text-center mt-1.5 max-w-[120px]">
                <span className={`text-[11px] font-semibold block truncate ${
                  isDark ? 'text-slate-200' : 'text-neutral-800'
                }`} title={targetLabel}>
                  控制旋钮
                </span>
                <span className={`text-[9px] font-mono block ${
                  isDark ? 'text-slate-400' : 'text-neutral-500'
                }`}>
                  {isPlaying ? '调制中' : '待命'}
                </span>
              </div>
            </div>

            {/* Right: Vertical Bipolar Depth Fader (-100% to +100%, Center 0%, Default 0) */}
            <div className="flex items-center gap-2.5">
              {/* Vertical Fader Track */}
              <div
                role="slider"
                tabIndex={0}
                aria-label="调制强度"
                aria-orientation="vertical"
                aria-valuemin={-1}
                aria-valuemax={1}
                aria-valuenow={depth}
                aria-valuetext={depthDisplay}
                className={`relative w-7 h-36 rounded-md cursor-ns-resize select-none overflow-hidden touch-none flex items-center justify-center shadow-inner ${
                  isDark ? 'bg-neutral-950 border border-neutral-800' : 'bg-neutral-200/90 border border-neutral-300'
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onDoubleClick={() => setDepth(0.0)}
                onKeyDown={e => {
                  const step = e.shiftKey ? 0.1 : 0.01;
                  let next = depth;
                  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next += step;
                  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next -= step;
                  else if (e.key === 'Home') next = -1;
                  else if (e.key === 'End') next = 1;
                  else return;
                  e.preventDefault();
                  setDepth(Math.max(-1, Math.min(1, Math.round(next * 100) / 100)));
                }}
                title="垂直拖动调强度，双击归零"
              >
                {/* Center Zero Horizon Guide Line */}
                <div className={`absolute top-1/2 left-0 right-0 h-[1.5px] z-0 pointer-events-none ${
                  isDark ? 'bg-neutral-600' : 'bg-neutral-400'
                }`} />

                {/* Vertical Fill Level from Center 0% */}
                {depth > 0 && (
                  <div
                    className="absolute left-1.5 right-1.5 bg-gradient-to-t from-indigo-500/70 to-sky-400/90 rounded-t-sm pointer-events-none"
                    style={{
                      bottom: '50%',
                      height: `${(depth / 1.0) * 50}%`
                    }}
                  />
                )}
                {depth < 0 && (
                  <div
                    className="absolute left-1.5 right-1.5 bg-gradient-to-b from-indigo-500/70 to-rose-500/90 rounded-b-sm pointer-events-none"
                    style={{
                      top: '50%',
                      height: `${(Math.abs(depth) / 1.0) * 50}%`
                    }}
                  />
                )}

                {/* Fader Handle Thumb */}
                <div
                  className={`absolute left-0.5 right-0.5 h-3.5 rounded border shadow-md flex items-center justify-center pointer-events-none transition-transform duration-75 ${
                    isDark ? 'bg-neutral-800 border-neutral-400/80' : 'bg-white border-neutral-400'
                  }`}
                  style={{
                    top: `calc(${((1.0 - depth) / 2.0) * 100}% - 7px)`
                  }}
                >
                  <div className={`w-3.5 h-[1.5px] rounded-full ${isDark ? 'bg-neutral-300' : 'bg-neutral-600'}`} />
                </div>
              </div>

              {/* Fader Vertical Scale Ticks & Labels */}
              <div className="flex flex-col justify-between h-36 text-[8.5px] font-mono select-none">
                <button
                  type="button"
                  onClick={() => setDepth(1.0)}
                  className="text-sky-500 hover:text-sky-400 transition-colors text-left"
                  title="设为 +100%"
                >
                  +100%
                </button>
                <button
                  type="button"
                  onClick={() => setDepth(0.5)}
                  className={`${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-neutral-500 hover:text-neutral-700'} transition-colors text-left`}
                  title="设为 +50%"
                >
                  +50%
                </button>
                <button
                  type="button"
                  onClick={() => setDepth(0.0)}
                  className={`font-semibold transition-colors text-left ${
                    Math.abs(depth) < 0.005
                      ? 'text-sky-400 font-bold underline'
                      : (isDark ? 'text-slate-300 hover:text-sky-400' : 'text-neutral-700 hover:text-sky-600')
                  }`}
                  title="点击归零 (0%)"
                >
                  0%
                </button>
                <button
                  type="button"
                  onClick={() => setDepth(-0.5)}
                  className={`${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-neutral-500 hover:text-neutral-700'} transition-colors text-left`}
                  title="设为 -50%"
                >
                  -50%
                </button>
                <button
                  type="button"
                  onClick={() => setDepth(-1.0)}
                  className={`${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'} transition-colors text-left`}
                  title="设为 -100%"
                >
                  -100%
                </button>
              </div>

              {/* Accessible Form Input for Screen Readers & Automated Tests */}
              <input
                type="range"
                min={-1.0}
                max={1.0}
                step={0.01}
                value={depth}
                onChange={e => setDepth(parseFloat(e.target.value))}
                aria-label="Modulation Depth"
                className="sr-only"
              />
            </div>
          </div>

          {selectedSource === 'stageProgress' && (
            <div className={`mt-3 p-2 rounded-lg border text-[9.5px] leading-relaxed ${
              isDark ? 'bg-neutral-950/70 border-neutral-800 text-slate-300' : 'bg-white border-neutral-200 text-neutral-700 shadow-sm'
            }`}>
              <div className="flex items-center gap-1.5 font-mono text-sky-500 font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span>作用机制</span>
              </div>
              <p className={`${isDark ? 'text-slate-400' : 'text-neutral-600'} mb-1`}>
                包络定各阶段形态，推子定峰值强度；负值反相，0% 静音。
              </p>
              <div className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                isDark ? 'text-sky-300/90 bg-neutral-900 border-neutral-800/60' : 'text-sky-700 bg-sky-50 border-sky-200'
              }`}>
                实际偏移 = 阶段包络值 × 垂直调制强度 × 旋钮量程
              </div>
            </div>
          )}
        </div>

        {/* 4. Live Data Dynamic Indicator & Mode Toggle */}
        <div className={`rounded-lg border p-3 mb-4 ${
          isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase tracking-wider font-medium ${
              isDark ? 'text-slate-400' : 'text-neutral-500'
            }`}>
              极性模式 · Polarity Mode
            </span>
            <button
              type="button"
              onClick={() => setIsBipolar(!isBipolar)}
              className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                isBipolar
                  ? (isDark
                      ? 'border-violet-500/80 bg-violet-950/60 text-violet-200'
                      : 'border-violet-300 bg-violet-100 text-violet-900 font-medium')
                  : (isDark
                      ? 'border-neutral-800 bg-neutral-900 text-slate-400'
                      : 'border-neutral-300 bg-white text-neutral-600')
              }`}
            >
              {isBipolar ? '双向' : '单向'}
            </button>
          </div>

          {/* Live Calculation Indicator Bar */}
          <div className={`text-[10px] font-mono flex items-center justify-between mt-2 pt-2 border-t ${
            isDark ? 'border-neutral-800/80 text-slate-400' : 'border-neutral-200 text-neutral-600'
          }`}>
            <span>参数影响范围:</span>
            <span className={isDark ? "text-violet-300" : "text-violet-700 font-medium"}>
              {formattedRange}
            </span>
          </div>
        </div>
      </div>
    </div>

        {/* 5. Actions Footer */}
        <div className={`flex items-center justify-between gap-2 pt-2 border-t ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          {route ? (
            <button
              type="button"
              onClick={handleClear}
              className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border transition-colors ${
                isDark
                  ? 'text-red-400 hover:text-red-300 border-neutral-800 hover:border-red-900/60'
                  : 'text-red-600 hover:text-red-700 border-neutral-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <Trash2 size={13} strokeWidth={1.5} />
              <span>取消分配</span>
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`text-xs py-1.5 px-3 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 border-neutral-800 hover:border-neutral-700'
                  : 'text-neutral-600 hover:text-neutral-900 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-950 bg-violet-400 hover:bg-violet-300 py-1.5 px-4 rounded-lg shadow-sm transition-colors"
            >
              <Check size={14} strokeWidth={2} />
              <span>分配</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
