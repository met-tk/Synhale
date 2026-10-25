import React from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  Settings,
  X,
  Sun,
  Moon,
  Volume2,
  Bell,
  RotateCcw,
  Check,
  Info,
  Sliders,
  EllipsisVertical,
  ExternalLink
} from 'lucide-react';
import {
  BreathCueSettings,
  BreathTransitionNode,
  BreathCuePresetId,
  CUE_PRESETS,
  CUE_PRESET_LIST,
  DEFAULT_CUE_SETTINGS
} from '../../../audio/cue/breathCueConfig';
import { playCueSoundAsync } from '../../../audio/cue/breathCuePlayer';
import {
  DEFAULT_INDICATOR_OPACITY,
  DEFAULT_INDICATOR_PRECISION,
  type IndicatorPrecision
} from '../../../visuals/indicatorConfig';
import {
  CYCLE_CAPACITY_MAX,
  CYCLE_CAPACITY_MIN,
  DEFAULT_CYCLE_TRACKER_SETTINGS,
  type CycleTrackerSettings
} from '../../../visuals/cycleTrackerConfig';
import { getPalettesByMode, type ThemeId } from '../../theme/tokens';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  themeId?: ThemeId;
  onThemeIdChange?: (id: ThemeId) => void;
  cueSettings: BreathCueSettings;
  onCueSettingsChange: (settings: BreathCueSettings) => void;
  indicatorOpacity?: number;
  onIndicatorOpacityChange?: (opacity: number) => void;
  indicatorPrecision?: IndicatorPrecision;
  onIndicatorPrecisionChange?: (precision: IndicatorPrecision) => void;
  cycleTrackerSettings?: CycleTrackerSettings;
  onCycleTrackerSettingsChange?: (settings: CycleTrackerSettings) => void;
  audioContext?: BaseAudioContext | null;
}

interface TransitionNodeOption {
  key: BreathTransitionNode;
  title: string;
  subtitle: string;
  badge?: string;
}

const TRANSITION_NODE_OPTIONS: TransitionNodeOption[] = [
  {
    key: 'exhale_to_inhale',
    title: '呼气结束 · 开始吸气',
    subtitle: '新循环开启',
    badge: '推荐'
  },
  {
    key: 'inhale_to_holdIn',
    title: '吸气结束 · 开始屏息',
    subtitle: '饱满留驻'
  },
  {
    key: 'holdIn_to_exhale',
    title: '屏息结束 · 开始呼气',
    subtitle: '舒缓释放'
  },
  {
    key: 'exhale_to_holdOut',
    title: '呼气结束 · 空肺静息',
    subtitle: '彻底放空'
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
  themeId,
  onThemeIdChange,
  cueSettings,
  onCueSettingsChange,
  indicatorOpacity = DEFAULT_INDICATOR_OPACITY,
  onIndicatorOpacityChange,
  indicatorPrecision = DEFAULT_INDICATOR_PRECISION,
  onIndicatorPrecisionChange,
  cycleTrackerSettings = DEFAULT_CYCLE_TRACKER_SETTINGS,
  onCycleTrackerSettingsChange,
  audioContext
}) => {
  const dialogRef = useModalDialog(isOpen, onClose);
  if (!isOpen) return null;

  const handleAudition = (presetId: BreathCuePresetId) => {
    // Wait for the natural sample to load before playing so the first
    // preview click already hears the authentic recording instead of the
    // synthetic fallback tone.
    void playCueSoundAsync(presetId, cueSettings.volume, audioContext);
  };

  const handleToggleNode = (nodeKey: BreathTransitionNode) => {
    const nextNodes = {
      ...cueSettings.nodes,
      [nodeKey]: !cueSettings.nodes[nodeKey]
    };
    onCueSettingsChange({
      ...cueSettings,
      nodes: nextNodes
    });
  };

  const handleResetDefaults = () => {
    onCueSettingsChange(DEFAULT_CUE_SETTINGS);
    onCycleTrackerSettingsChange?.(DEFAULT_CYCLE_TRACKER_SETTINGS);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="设置 · Settings"
        className={`relative w-full max-w-lg rounded-2xl border p-6 max-md:p-4 shadow-2xl flex flex-col max-h-[90vh] max-md:max-h-[calc(100dvh-2rem)] overflow-hidden transition-colors ${
          isDark
            ? 'border-neutral-800 bg-[#09090b] text-slate-100'
            : 'border-neutral-200 bg-white text-neutral-900 shadow-2xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between border-b pb-3.5 mb-4 shrink-0 ${
          isDark ? 'border-neutral-800/80' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${
              isDark
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-600'
            }`}>
              <Settings size={16} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${
                isDark ? 'text-slate-100' : 'text-neutral-900'
              }`}>
                设置 · Settings
              </h2>
              
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings Dialog"
            className={`p-1.5 rounded-lg border border-transparent transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:border-neutral-800 hover:bg-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900 hover:border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 font-sans">
          {/* Section 1: Appearance Theme */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
            isDark
              ? 'border-neutral-800/80 bg-neutral-900/40'
              : 'border-neutral-200 bg-neutral-50/80'
          }`}>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-200' : 'text-neutral-800'
                }`}>
                  色彩模式 · Theme
                </span>
                
              </div>

              {/* Theme Segment Buttons */}
              <div className={`flex shrink-0 items-center gap-1 whitespace-nowrap p-1 rounded-lg border ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-white border-neutral-300 shadow-xs'
              }`}>
                <button
                  type="button"
                  aria-label="深色模式"
                  onClick={() => {
                    if (!isDark) onToggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    isDark
                      ? 'bg-neutral-800 text-sky-400 font-semibold shadow-sm border border-neutral-700'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Moon size={12} strokeWidth={1.8} />
                  <span>深色</span>
                </button>
                <button
                  type="button"
                  aria-label="浅色模式"
                  onClick={() => {
                    if (isDark) onToggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    !isDark
                      ? 'bg-neutral-100 text-sky-600 font-semibold shadow-sm border border-neutral-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun size={12} strokeWidth={1.8} />
                  <span>浅色</span>
                </button>
              </div>
            </div>

            {/* Soft Palette Picker: gentle low-saturation tints per contrast mode */}
            <div className={`pt-3 border-t space-y-2 ${
              isDark ? 'border-neutral-800/60' : 'border-neutral-200'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase font-semibold tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-neutral-500'
                }`}>
                  柔和色调 · Soft Palette
                </span>
                
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {getPalettesByMode(isDark ? 'dark' : 'light').map(p => {
                  const isSelected = themeId === p.id;
                  const swatchBorder = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-label={`主题色调: ${p.nameZh}`}
                      aria-pressed={isSelected}
                      onClick={() => onThemeIdChange?.(p.id)}
                      className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? isDark
                            ? 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_8px_rgba(56,189,248,0.12)]'
                            : 'border-sky-400 bg-sky-50 shadow-xs'
                          : isDark
                            ? 'border-neutral-800/80 bg-neutral-950/60 hover:border-neutral-700'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      <span className="relative flex items-center justify-center w-9 h-9">
                        <span
                          className="w-7 h-7 rounded-full border"
                          style={{ backgroundColor: p.swatch[0], borderColor: swatchBorder }}
                        />
                        <span
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border"
                          style={{ backgroundColor: p.swatch[1], borderColor: swatchBorder }}
                        />
                      </span>
                      <span className={`text-[11px] font-medium font-sans leading-none ${
                        isSelected
                          ? isDark ? 'text-sky-300' : 'text-sky-800'
                          : isDark ? 'text-slate-200' : 'text-neutral-800'
                      }`}>
                        {p.nameZh}
                      </span>
                      <span className={`text-[8px] font-mono leading-none ${
                        isDark ? 'text-slate-500' : 'text-neutral-400'
                      }`}>
                        {p.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Center Breath Indicator Opacity (0..100) & Precision (Strictly Monochrome) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
            isDark
              ? 'border-neutral-800/80 bg-neutral-900/40'
              : 'border-neutral-200 bg-neutral-50/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded border mt-0.5 ${
                  isDark
                    ? 'bg-neutral-800 text-zinc-200 border-neutral-700'
                    : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                }`}>
                  <Sliders size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-neutral-800'
                  }`}>
                    指示器透明度 · Opacity
                  </span>
                  
                </div>
              </div>

              {/* Current Value Pill */}
              <div className={`shrink-0 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-zinc-100'
                  : 'bg-white border-neutral-300 text-neutral-900 shadow-xs'
              }`}>
                {indicatorOpacity}%
              </div>
            </div>

            {/* Slider Control */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-neutral-400'}`}>0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={indicatorOpacity}
                  onChange={(e) => onIndicatorOpacityChange?.(Number(e.target.value))}
                  aria-label="透明度滑块"
                  className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isDark
                      ? 'bg-neutral-800 accent-zinc-200'
                      : 'bg-neutral-200 accent-neutral-800'
                  }`}
                />
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-neutral-400'}`}>100%</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 sm:flex sm:items-center">
                {[
                  { label: '0% 隐藏', val: 0 },
                  { label: '20% 最柔', val: 20 },
                  { label: '50% 适中', val: 50 },
                  { label: '100% 饱满', val: 100 }
                ].map((item) => {
                  const isSelected = indicatorOpacity === item.val;
                  return (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onIndicatorOpacityChange?.(item.val)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-xs font-semibold'
                            : 'bg-neutral-200 text-neutral-950 border-neutral-400 shadow-xs font-semibold'
                          : isDark
                            ? 'bg-neutral-950/60 text-slate-400 border-neutral-800 hover:text-slate-200'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precision Selector Sub-row */}
            <div className={`pt-2.5 mt-1 border-t flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between ${
              isDark ? 'border-neutral-800/60' : 'border-neutral-200'
            }`}>
              <div>
                <span className={`text-[11px] font-semibold tracking-wider font-mono uppercase ${
                  isDark ? 'text-slate-300' : 'text-neutral-700'
                }`}>
                  显示精度 · Precision
                </span>
                
              </div>

              <div className={`flex shrink-0 items-center gap-1 whitespace-nowrap p-0.5 rounded-lg border ${
                isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-300 shadow-xs'
              }`}>
                <button
                  type="button"
                  onClick={() => onIndicatorPrecisionChange?.('decimal')}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                    indicatorPrecision === 'decimal'
                      ? isDark
                        ? 'bg-neutral-800 text-zinc-100 font-semibold shadow-sm border border-neutral-700'
                        : 'bg-neutral-200 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  一位小数 · 4.2
                </button>
                <button
                  type="button"
                  onClick={() => onIndicatorPrecisionChange?.('integer')}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                    indicatorPrecision === 'integer'
                      ? isDark
                        ? 'bg-neutral-800 text-zinc-100 font-semibold shadow-sm border border-neutral-700'
                        : 'bg-neutral-200 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  单个数字 · 4
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Breath Transition Cue Sound */}
          <div className={`p-4 rounded-xl border flex flex-col gap-4 ${
            isDark
              ? 'border-neutral-800/80 bg-neutral-900/40'
              : 'border-neutral-200 bg-neutral-50/80'
          }`}>
            {/* Toggle Switch Row */}
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-neutral-800/60' : 'border-neutral-200'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded border mt-0.5 ${
                  isDark
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-sky-50 text-sky-600 border-sky-200'
                }`}>
                  <Bell size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-neutral-800'
                  }`}>
                    转换提示音 · Cues
                  </span>
                  
                </div>
              </div>

              {/* Master Switch */}
              <button
                type="button"
                role="switch"
                aria-label="提示音总开关"
                aria-checked={cueSettings.enabled}
                onClick={() => onCueSettingsChange({ ...cueSettings, enabled: !cueSettings.enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  cueSettings.enabled
                    ? 'bg-sky-500'
                    : isDark
                      ? 'bg-neutral-800'
                      : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    cueSettings.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {cueSettings.enabled && (
              <div className="space-y-4 pt-1">
                {/* 1. Preset Selector & Audition */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono uppercase font-semibold tracking-wider ${
                      isDark ? 'text-slate-400' : 'text-neutral-500'
                    }`}>
                      提示音色
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAudition(cueSettings.preset)}
                      aria-label={`试听当前提示音: ${CUE_PRESETS[cueSettings.preset]?.name || ''}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono border transition-colors ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-sky-300 border-neutral-700'
                          : 'bg-white hover:bg-neutral-100 text-sky-700 border-neutral-300 shadow-xs'
                      }`}
                      title="试听当前提示音"
                    >
                      <Volume2 size={11} strokeWidth={1.8} />
                      <span>试听</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CUE_PRESET_LIST.map(p => {
                      const isSelected = cueSettings.preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-label={`选择预置: ${p.name}`}
                          onClick={() => {
                            onCueSettingsChange({ ...cueSettings, preset: p.id });
                            handleAudition(p.id);
                          }}
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? isDark
                                ? 'border-sky-500/80 bg-sky-500/10 text-slate-100 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                                : 'border-sky-500 bg-sky-50 text-neutral-900 shadow-xs'
                              : isDark
                                ? 'border-neutral-800/80 bg-neutral-950/60 text-slate-400 hover:text-slate-200 hover:border-neutral-700'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-medium font-sans ${
                              isSelected
                                ? isDark ? 'text-sky-300' : 'text-sky-800'
                                : isDark ? 'text-slate-200' : 'text-neutral-800'
                            }`}>
                              {p.name}
                            </span>
                            <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                              isSelected
                                ? isDark
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                  : 'bg-sky-100 text-sky-700 border-sky-300'
                                : isDark
                                  ? 'bg-neutral-900 text-slate-400 border-neutral-800'
                                  : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                            }`}>
                              {p.tag}
                            </span>
                          </div>
                          <span className={`text-[9px] font-mono mt-1 line-clamp-1 ${
                            isDark ? 'text-slate-400' : 'text-neutral-500'
                          }`}>
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Volume Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono uppercase font-semibold tracking-wider ${
                      isDark ? 'text-slate-400' : 'text-neutral-500'
                    }`}>
                      音量
                    </label>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold">
                      {Math.round(cueSettings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.01}
                    value={cueSettings.volume}
                    onChange={e => onCueSettingsChange({ ...cueSettings, volume: parseFloat(e.target.value) })}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-sky-400 ${
                      isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                    }`}
                  />
                </div>

                {/* 3. Transition Trigger Nodes Checklist */}
                <div className="space-y-2 pt-1">
                  <label className={`text-[10px] font-mono uppercase font-semibold tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-neutral-500'
                  }`}>
                    触发节点
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TRANSITION_NODE_OPTIONS.map(node => {
                      const isChecked = cueSettings.nodes[node.key];
                      return (
                        <button
                          key={node.key}
                          type="button"
                          aria-label={`节点切换: ${node.title}`}
                          onClick={() => handleToggleNode(node.key)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                            isChecked
                              ? isDark
                                ? 'border-sky-500/70 bg-sky-500/10 text-slate-200'
                                : 'border-sky-400 bg-sky-50/70 text-neutral-900 shadow-xs'
                              : isDark
                                ? 'border-neutral-800/80 bg-neutral-950/60 text-slate-500 hover:text-slate-300'
                                : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 shadow-xs'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium font-sans ${
                                isChecked
                                  ? isDark ? 'text-sky-300' : 'text-sky-900'
                                  : isDark ? 'text-slate-300' : 'text-neutral-700'
                              }`}>
                                {node.title}
                              </span>
                              {node.badge && (
                                <span className={`text-[8px] font-mono px-1 py-0.2 rounded border ${
                                  isDark
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                    : 'bg-sky-100 text-sky-700 border-sky-300'
                                }`}>
                                  {node.badge}
                                </span>
                              )}
                            </div>
                            <span className={`text-[9px] font-mono truncate mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-neutral-500'
                            }`}>
                              {node.subtitle}
                            </span>
                          </div>

                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'border-sky-400 bg-sky-500 text-neutral-950'
                                : isDark
                                  ? 'border-neutral-700 bg-neutral-900 text-transparent'
                                  : 'border-neutral-300 bg-neutral-100 text-transparent'
                            }`}
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Breath Cycle Bead Strand (ambient number-free cycle counter) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-4 ${
            isDark
              ? 'border-neutral-800/80 bg-neutral-900/40'
              : 'border-neutral-200 bg-neutral-50/80'
          }`}>
            {/* Toggle Switch Row */}
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-neutral-800/60' : 'border-neutral-200'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded border mt-0.5 ${
                  isDark
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-sky-50 text-sky-600 border-sky-200'
                }`}>
                  <EllipsisVertical size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-neutral-800'
                  }`}>
                    周期念珠 · Beads
                  </span>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-neutral-500'
                  }`}>
                    完成一息点亮一珠，光带即进度
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <button
                type="button"
                role="switch"
                aria-label="周期念珠显示开关"
                aria-checked={cycleTrackerSettings.visible}
                onClick={() => onCycleTrackerSettingsChange?.({ ...cycleTrackerSettings, visible: !cycleTrackerSettings.visible })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  cycleTrackerSettings.visible
                    ? 'bg-sky-500'
                    : isDark
                      ? 'bg-neutral-800'
                      : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    cycleTrackerSettings.visible ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {cycleTrackerSettings.visible && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase font-semibold tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-neutral-500'
                  }`}>
                    念珠容量
                  </label>
                  <span className={`text-[10px] font-mono font-semibold ${
                    isDark ? 'text-sky-300' : 'text-sky-700'
                  }`}>
                    {cycleTrackerSettings.capacity} 周期
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-neutral-400'}`}>{CYCLE_CAPACITY_MIN}</span>
                  <input
                    type="range"
                    min={CYCLE_CAPACITY_MIN}
                    max={CYCLE_CAPACITY_MAX}
                    step={1}
                    value={cycleTrackerSettings.capacity}
                    onChange={(e) => onCycleTrackerSettingsChange?.({ ...cycleTrackerSettings, capacity: Number(e.target.value) })}
                    aria-label="念珠容量滑块"
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 accent-sky-400'
                        : 'bg-neutral-200 accent-sky-600'
                    }`}
                  />
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-neutral-400'}`}>{CYCLE_CAPACITY_MAX}</span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: '8 短息', val: 8 },
                    { label: '12 默认', val: 12 },
                    { label: '21 深入', val: 21 },
                    { label: '36 长修', val: 36 }
                  ].map((item) => {
                    const isSelected = cycleTrackerSettings.capacity === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => onCycleTrackerSettingsChange?.({ ...cycleTrackerSettings, capacity: item.val })}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                          isSelected
                            ? isDark
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/50 shadow-xs font-semibold'
                              : 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs font-semibold'
                            : isDark
                              ? 'bg-neutral-950/60 text-slate-400 border-neutral-800 hover:text-slate-200'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <p className={`text-[9px] font-mono pt-0.5 ${
                  isDark ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  存满自动收束，再播开启新一轮
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Software Info & Credits */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
            isDark
              ? 'border-neutral-800/80 bg-neutral-900/40'
              : 'border-neutral-200 bg-neutral-50/80'
          }`}>
            <div className={`flex items-center gap-2.5 border-b pb-2.5 ${
              isDark ? 'border-neutral-800/60' : 'border-neutral-200'
            }`}>
              <div className={`p-1 rounded border ${
                isDark
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  : 'bg-sky-50 text-sky-600 border-sky-200'
              }`}>
                <Info size={14} strokeWidth={1.8} />
              </div>
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-200' : 'text-neutral-800'
                }`}>
                  关于
                </span>
                <p className={`text-[10px] mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-neutral-500'
                }`}>
                  半模块化数字呼吸合成器与沉浸式声疗系统
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200 bg-white shadow-xs'
              }`}>
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                  isDark ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  版本
                </span>
                <span className={`text-xs font-mono font-medium mt-1 inline-block ${
                  isDark ? 'text-sky-300' : 'text-sky-700'
                }`}>
                  1.0.0
                </span>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200 bg-white shadow-xs'
              }`}>
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                  isDark ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  制作人
                </span>
                <a
                  href="https://space.bilibili.com/24340298"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="访问制作人主页"
                  title="访问制作人主页"
                  className={`flex items-center gap-1 text-xs font-mono font-medium mt-1 inline-flex underline-offset-2 hover:underline transition-colors ${
                    isDark ? 'text-sky-300 hover:text-sky-200' : 'text-sky-700 hover:text-sky-600'
                  }`}
                >
                  AI-driven by taketo
                  <ExternalLink size={11} strokeWidth={1.8} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between border-t pt-4 mt-4 shrink-0 ${
          isDark ? 'border-neutral-800/80' : 'border-neutral-200'
        }`}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <RotateCcw size={12} strokeWidth={1.8} />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs font-semibold shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all font-sans"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
