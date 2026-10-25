import React, { useState, useEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { Wind, X, Plus, Minus, RotateCcw, Activity, Clock, Check } from 'lucide-react';
import { UserRhythmConfig, saveUserRhythm } from '../../../breath/storage';
import { useModalDialog } from '../../hooks/useModalDialog';

export interface CustomRhythmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rhythm: UserRhythmConfig) => void;
  initialRhythm?: UserRhythmConfig | null;
  isDark?: boolean;
}

interface TemplatePreset {
  name: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  label: string;
}

const TEMPLATES: TemplatePreset[] = [
  { name: '四方平衡', inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0, label: '4-4-4-4' },
  { name: '助眠松弛', inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0, label: '4-7-8' },
  { name: '心率共振', inhale: 5.5, holdIn: 0.0, exhale: 5.5, holdOut: 0.0, label: '5.5s' },
  { name: '舒缓深潜', inhale: 4.0, holdIn: 2.0, exhale: 6.0, holdOut: 2.0, label: '4-2-6-2' },
  { name: '充氧唤醒', inhale: 4.0, holdIn: 4.0, exhale: 2.0, holdOut: 0.0, label: '4-4-2-0' },
  { name: '深度长呼', inhale: 4.0, holdIn: 0.0, exhale: 8.0, holdOut: 0.0, label: '4-0-8-0' }
];

export const CustomRhythmModal: React.FC<CustomRhythmModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRhythm,
  isDark = true
}) => {
  const [name, setName] = useState<string>('');
  const [inhale, setInhale] = useState<number>(4.0);
  const [holdIn, setHoldIn] = useState<number>(4.0);
  const [exhale, setExhale] = useState<number>(4.0);
  const [holdOut, setHoldOut] = useState<number>(4.0);

  const dialogRef = useModalDialog(isOpen, onClose);
  const nameId = useId();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize or reset values when opened / rhythm changed
  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      if (initialRhythm) {
        const safeNum = (v: unknown, fallback: number, min: number) =>
          typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(30, Number(v.toFixed(1)))) : fallback;
        setName(typeof initialRhythm.name === 'string' ? initialRhythm.name : '');
        setInhale(safeNum(initialRhythm.inhale, 4.0, 0.5));
        setHoldIn(safeNum(initialRhythm.holdIn, 4.0, 0));
        setExhale(safeNum(initialRhythm.exhale, 4.0, 0.5));
        setHoldOut(safeNum(initialRhythm.holdOut, 4.0, 0));
      } else {
        setName('');
        setInhale(4.0);
        setHoldIn(4.0);
        setExhale(4.0);
        setHoldOut(4.0);
      }
    }
  }, [isOpen, initialRhythm]);

  const totalDuration = useMemo(() => {
    return Number((inhale + holdIn + exhale + holdOut).toFixed(1));
  }, [inhale, holdIn, exhale, holdOut]);

  const breathsPerMinute = useMemo(() => {
    if (totalDuration <= 0) return '0.0';
    return (60.0 / totalDuration).toFixed(1);
  }, [totalDuration]);

  const handleStep = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min: number,
    max: number
  ) => {
    setter(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(min, Math.min(max, next));
    });
  };

  const handleApplyTemplate = (tmpl: TemplatePreset) => {
    setInhale(tmpl.inhale);
    setHoldIn(tmpl.holdIn);
    setExhale(tmpl.exhale);
    setHoldOut(tmpl.holdOut);
    if (!name.trim()) {
      setName(`${tmpl.name} (自定)`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `自定节律 · ${inhale}-${holdIn}-${exhale}-${holdOut}`;
    let saved: UserRhythmConfig;
    try {
      saved = saveUserRhythm({ id: initialRhythm?.id, name: finalName, inhale, holdIn, exhale, holdOut });
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试。');
      return;
    }
    onSave(saved);
    onClose();
  };

  // Generate smooth SVG breath curve path
  const curvePaths = useMemo(() => {
    const W = 380;
    const H = 76;
    const padTop = 14;
    const padBottom = 16;
    const yTop = padTop;
    const yBottom = H - padBottom;
    const total = Math.max(0.1, inhale + holdIn + exhale + holdOut);

    const wIn = (inhale / total) * W;
    const wHoldIn = (holdIn / total) * W;
    const wEx = (exhale / total) * W;

    const x0 = 0;
    const x1 = wIn;
    const x2 = wIn + wHoldIn;
    const x3 = wIn + wHoldIn + wEx;
    const x4 = W;

    // Smooth Inhale Bezier from (0, yBottom) to (x1, yTop)
    const dInhale = `M ${x0} ${yBottom} C ${x0 + wIn * 0.45} ${yBottom}, ${x1 - wIn * 0.45} ${yTop}, ${x1} ${yTop}`;
    // Plateau Hold In
    const dHoldIn = `L ${x2} ${yTop}`;
    // Smooth Exhale Bezier from (x2, yTop) to (x3, yBottom)
    const dExhale = `C ${x2 + wEx * 0.45} ${yTop}, ${x3 - wEx * 0.45} ${yBottom}, ${x3} ${yBottom}`;
    // Plateau Hold Out
    const dHoldOut = `L ${x4} ${yBottom}`;

    const strokePath = `${dInhale} ${dHoldIn} ${dExhale} ${dHoldOut}`;
    const fillPath = `${strokePath} L ${W} ${H} L 0 ${H} Z`;

    return { strokePath, fillPath, x1, x2, x3, W, H, yBottom, yTop };
  }, [inhale, holdIn, exhale, holdOut]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="自定义呼吸节律"
        className={`relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
          isDark
            ? 'border-neutral-800 bg-neutral-950 text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
            : 'border-neutral-200 bg-white text-neutral-900 shadow-2xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
          isDark ? 'border-neutral-800/80' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Wind size={16} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                {initialRhythm ? '编辑节律' : '新增节律'}
              </h2>
              <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-neutral-500'}`}>
                CUSTOM RESPIRATION PATTERN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-neutral-900' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Baseline Template Pills */}
          <div>
            <div className={`text-[10px] uppercase font-mono tracking-wider mb-1.5 flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-neutral-500'
            }`}>
              <span>快速载入模板</span>
              <span className="text-[10px] lowercase font-normal opacity-70">点击载入对应秒数</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`py-1 px-1.5 rounded border text-[11px] font-mono text-center transition-all ${
                    isDark
                      ? 'border-neutral-800/80 bg-neutral-900/70 text-slate-300 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                  }`}
                  title={`${tmpl.name} (${tmpl.label})`}
                >
                  <span className="block truncate font-medium">{tmpl.name}</span>
                  <span className="text-[9px] opacity-70">{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor={nameId} className={`text-[10px] uppercase font-mono tracking-wider block mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-neutral-600'
            }`}>
              节律名称
            </label>
            <input
              id={nameId}
              type="text"
              placeholder={`自定节律 · ${inhale}-${holdIn}-${exhale}-${holdOut}`}
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs max-md:text-base focus:outline-none focus:border-sky-400 transition-colors ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/90 text-slate-100 placeholder:text-slate-600'
                  : 'border-neutral-300 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400'
              }`}
            />
          </div>

          {/* 4-Stage Stepper Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Stage 1: Inhale */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-neutral-900/60 border-neutral-800/90' : 'bg-neutral-50/80 border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-sky-400">吸气</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Inhale</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStep(setInhale, -0.5, 0.5, 30.0)}
                  aria-label="减少吸气时长"
                  disabled={inhale <= 0.5}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <div className="flex-1 text-center font-mono text-sm font-semibold text-sky-300">
                  {inhale.toFixed(1)}<span className="text-[10px] ml-0.5 font-normal text-slate-400">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep(setInhale, 0.5, 0.5, 30.0)}
                  aria-label="增加吸气时长"
                  disabled={inhale >= 30.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Stage 2: Hold In */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-neutral-900/60 border-neutral-800/90' : 'bg-neutral-50/80 border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-indigo-300">吸气屏息</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Hold</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStep(setHoldIn, -0.5, 0.0, 30.0)}
                  aria-label="减少吸气屏息时长"
                  disabled={holdIn <= 0.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <div className="flex-1 text-center font-mono text-sm font-semibold text-indigo-300">
                  {holdIn.toFixed(1)}<span className="text-[10px] ml-0.5 font-normal text-slate-400">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep(setHoldIn, 0.5, 0.0, 30.0)}
                  aria-label="增加吸气屏息时长"
                  disabled={holdIn >= 30.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Stage 3: Exhale */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-neutral-900/60 border-neutral-800/90' : 'bg-neutral-50/80 border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-teal-400">呼气</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Exhale</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStep(setExhale, -0.5, 0.5, 30.0)}
                  aria-label="减少呼气时长"
                  disabled={exhale <= 0.5}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <div className="flex-1 text-center font-mono text-sm font-semibold text-teal-300">
                  {exhale.toFixed(1)}<span className="text-[10px] ml-0.5 font-normal text-slate-400">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep(setExhale, 0.5, 0.5, 30.0)}
                  aria-label="增加呼气时长"
                  disabled={exhale >= 30.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Stage 4: Hold Out */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-neutral-900/60 border-neutral-800/90' : 'bg-neutral-50/80 border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">呼气屏息</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Hold</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStep(setHoldOut, -0.5, 0.0, 30.0)}
                  aria-label="减少呼气屏息时长"
                  disabled={holdOut <= 0.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <div className="flex-1 text-center font-mono text-sm font-semibold text-slate-300">
                  {holdOut.toFixed(1)}<span className="text-[10px] ml-0.5 font-normal text-slate-400">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep(setHoldOut, 0.5, 0.0, 30.0)}
                  aria-label="增加呼气屏息时长"
                  disabled={holdOut >= 30.0}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30 ${
                    isDark ? 'border-neutral-700 bg-neutral-800 text-slate-200 hover:bg-neutral-700' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Live Breath Curve Preview */}
          <div className={`p-3 rounded-xl border relative overflow-hidden ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                周期预览
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  吸 {inhale}s
                </span>
                {holdIn > 0 && (
                  <span className="flex items-center gap-1 text-indigo-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                    屏 {holdIn}s
                  </span>
                )}
                <span className="flex items-center gap-1 text-teal-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  呼 {exhale}s
                </span>
                {holdOut > 0 && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    停 {holdOut}s
                  </span>
                )}
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="w-full h-20 sm:h-24">
              <svg viewBox={`0 0 ${curvePaths.W} ${curvePaths.H}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="breathCurveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="40%" stopColor="#22d3ee" />
                    <stop offset="70%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <linearGradient id="breathCurveArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Baseline and ceiling guides */}
                <line x1="0" y1={curvePaths.yBottom} x2={curvePaths.W} y2={curvePaths.yBottom} stroke={isDark ? "#262626" : "#e2e8f0"} strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1={curvePaths.yTop} x2={curvePaths.W} y2={curvePaths.yTop} stroke={isDark ? "#262626" : "#e2e8f0"} strokeWidth="1" strokeDasharray="3,3" />

                {/* Stage Division Vertical Dashed Lines */}
                <line x1={curvePaths.x1} y1="0" x2={curvePaths.x1} y2={curvePaths.H} stroke={isDark ? "#38bdf8" : "#0284c7"} strokeWidth="0.8" strokeDasharray="2,2" strokeOpacity="0.35" />
                <line x1={curvePaths.x2} y1="0" x2={curvePaths.x2} y2={curvePaths.H} stroke={isDark ? "#818cf8" : "#6366f1"} strokeWidth="0.8" strokeDasharray="2,2" strokeOpacity="0.35" />
                <line x1={curvePaths.x3} y1="0" x2={curvePaths.x3} y2={curvePaths.H} stroke={isDark ? "#2dd4bf" : "#0d9488"} strokeWidth="0.8" strokeDasharray="2,2" strokeOpacity="0.35" />

                {/* Filled Area */}
                <path d={curvePaths.fillPath} fill="url(#breathCurveArea)" />

                {/* Smooth Respiration Curve */}
                <path
                  d={curvePaths.strokePath}
                  fill="none"
                  stroke="url(#breathCurveStroke)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Cycle Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded-lg border text-center font-mono ${
              isDark ? 'bg-neutral-900/40 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Clock size={11} />
                单圈周期
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                {totalDuration.toFixed(1)}s
              </div>
            </div>

            <div className={`p-2 rounded-lg border text-center font-mono ${
              isDark ? 'bg-neutral-900/40 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Activity size={11} />
                呼吸频率
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                {breathsPerMinute} <span className="text-[10px] font-normal text-slate-400">bpm</span>
              </div>
            </div>

            <div className={`p-2 rounded-lg border text-center font-mono ${
              isDark ? 'bg-neutral-900/40 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <RotateCcw size={11} />
                吸呼比
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                1 : {(exhale / Math.max(0.1, inhale)).toFixed(1)}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {saveError && <p role="alert" className="text-xs text-rose-500">{saveError}</p>}
          <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
            isDark ? 'border-neutral-800/80' : 'border-neutral-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isDark
                  ? 'border-neutral-800 text-slate-400 hover:text-slate-200 hover:bg-neutral-900'
                  : 'border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-neutral-950 text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all"
            >
              <Check size={14} strokeWidth={2.2} />
              {initialRhythm ? '保存并应用' : '保存并应用'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
