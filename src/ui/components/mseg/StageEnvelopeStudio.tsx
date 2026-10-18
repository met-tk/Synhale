import React, { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Sliders,
  Layers,
  Trash2,
  Check,
  Plus,
  Save,
  Edit2,
  ChevronDown
} from 'lucide-react';
import { ThemeContext } from '../../theme/ThemeProvider';
import type {
  CurveControlPoint,
  SingleStageCurve,
  FullBreathCurveData,
  CurvePreset,
  BreathStage
} from '../../../types';
import {
  generateStageSvgPath,
  evaluateSingleStageCurve,
  createDefaultBreathCurveData
} from '../../../audio/dsp/curveMath';
import {
  getAllCurvePresets,
  saveUserCurvePreset,
  updateUserCurvePreset,
  renameUserCurvePreset,
  deleteUserCurvePreset
} from '../../../audio/storage/curvePresets';

export interface StageEnvelopeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  curveData?: FullBreathCurveData;
  initialCurveData?: FullBreathCurveData;
  currentStage?: BreathStage;
  stageProgress?: number;
  targetLabel?: string;
  isPlaying?: boolean;
  onChange?: (newCurveData: FullBreathCurveData) => void;
  onSave?: (newCurveData: FullBreathCurveData) => void;
}

const STAGES: {
  key: BreathStage;
  label: string;
  enLabel: string;
  accentColor: string;
}[] = [
  {
    key: 'inhale',
    label: '吸气',
    enLabel: 'Inhale',
    accentColor: '#38bdf8' // Sky 400
  },
  {
    key: 'holdIn',
    label: '屏息',
    enLabel: 'Hold In',
    accentColor: '#0284c7' // Sky 600
  },
  {
    key: 'exhale',
    label: '呼气',
    enLabel: 'Exhale',
    accentColor: '#60a5fa' // Blue 400
  },
  {
    key: 'holdOut',
    label: '静息',
    enLabel: 'Hold Out',
    accentColor: '#94a3b8' // Slate 400
  }
];

export const StageEnvelopeStudio: React.FC<StageEnvelopeStudioProps> = ({
  isOpen,
  onClose,
  isDark: propIsDark,
  curveData: propCurveData,
  initialCurveData,
  currentStage = 'inhale',
  stageProgress = 0,
  targetLabel = 'Master Fader / Stage Envelope',
  onChange,
  onSave
}) => {
  const [curveData, setCurveData] = useState<FullBreathCurveData>(() => {
    return propCurveData ?? initialCurveData ?? createDefaultBreathCurveData();
  });

  const prevIsOpenRef = useRef(false);
  const prevTargetLabelRef = useRef(targetLabel);
  const isDraggingRef = useRef(false);

  const [activeStage, setActiveStage] = useState<BreathStage>(currentStage);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [draggingTensionIdx, setDraggingTensionIdx] = useState<number | null>(null);
  const [hoveredTensionIdx, setHoveredTensionIdx] = useState<number | null>(null);

  // Live dragging coordinates for floating tooltip HUD
  const [dragTooltip, setDragTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Preset management
  const [presets, setPresets] = useState<CurvePreset[]>(() => getAllCurvePresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavingNew, setIsSavingNew] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameValue, setRenameValue] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Single-gate initialization: only run when studio opens or target explicitly changes
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const targetChanged = isOpen && targetLabel !== prevTargetLabelRef.current;

    if (justOpened || targetChanged) {
      const initial = propCurveData ?? initialCurveData ?? createDefaultBreathCurveData();
      setCurveData(JSON.parse(JSON.stringify(initial)));
      setSelectedPointId(null);
      setDraggingPointId(null);
      setDraggingTensionIdx(null);
      setDragTooltip(null);
      isDraggingRef.current = false;
      setActiveStage(currentStage);
      setPresets(getAllCurvePresets());
    } else if (isOpen && propCurveData && !isDraggingRef.current) {
      setCurveData(propCurveData);
    }

    prevIsOpenRef.current = isOpen;
    prevTargetLabelRef.current = targetLabel;
  }, [isOpen, targetLabel, propCurveData, initialCurveData, currentStage]);

  // Keyboard shortcut: Delete or Backspace to remove selected point
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointId) {
        handleDeleteSelectedPoint();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPointId, activeStage, curveData]);

  // Current stage curve
  const currentStageCurve: SingleStageCurve = useMemo(() => {
    return (
      curveData[activeStage] ?? {
        stage: activeStage,
        points: [
          { id: `${activeStage}-start`, time: 0, value: 0.1, tension: 0 },
          { id: `${activeStage}-end`, time: 1, value: 0.9, tension: 0 }
        ]
      }
    );
  }, [curveData, activeStage]);

  const sortedPoints = useMemo(() => {
    return [...currentStageCurve.points].sort((a, b) => a.time - b.time);
  }, [currentStageCurve]);

  // SVG Dimension Constants for Focused View
  const SVG_W = 760;
  const SVG_H = 240;
  const PAD_X = 36;
  const PAD_Y = 24;
  const PLOT_W = SVG_W - PAD_X * 2; // 688px
  const PLOT_H = SVG_H - PAD_Y * 2; // 192px

  const toSvgX = useCallback(
    (t: number) => PAD_X + Math.max(0, Math.min(1, t)) * PLOT_W,
    [PAD_X, PLOT_W]
  );
  const toSvgY = useCallback(
    (v: number) => PAD_Y + (1 - Math.max(0, Math.min(1, v))) * PLOT_H,
    [PAD_Y, PLOT_H]
  );

  const fromSvgX = useCallback(
    (x: number) => Math.max(0, Math.min(1, (x - PAD_X) / PLOT_W)),
    [PAD_X, PLOT_W]
  );
  const fromSvgY = useCallback(
    (y: number) => Math.max(0, Math.min(1, 1 - (y - PAD_Y) / PLOT_H)),
    [PAD_Y, PLOT_H]
  );

  // Update current stage points and broadcast
  const updateCurrentStagePoints = useCallback(
    (newPoints: CurveControlPoint[]) => {
      setCurveData(prev => {
        const updated: FullBreathCurveData = {
          ...prev,
          [activeStage]: {
            stage: activeStage,
            points: newPoints
          }
        };
        queueMicrotask(() => {
          onChange?.(updated);
        });
        return updated;
      });
    },
    [activeStage, onChange]
  );

  // Delete selected control point
  const handleDeleteSelectedPoint = useCallback(() => {
    if (!selectedPointId) return;
    // Don't delete endpoints
    const idx = sortedPoints.findIndex(p => p.id === selectedPointId);
    if (idx <= 0 || idx >= sortedPoints.length - 1) return;

    const remaining = sortedPoints.filter(p => p.id !== selectedPointId);
    updateCurrentStagePoints(remaining);
    setSelectedPointId(null);
    setDragTooltip(null);
  }, [selectedPointId, sortedPoints, updateCurrentStagePoints]);

  // Add new control point on double-click
  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const mouseY = ((e.clientY - rect.top) / rect.height) * SVG_H;

    const time = fromSvgX(mouseX);
    const value = fromSvgY(mouseY);

    // Keep narrow margin from endpoints
    if (time <= 0.015 || time >= 0.985) return;

    const newPoint: CurveControlPoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: Math.round(time * 1000) / 1000,
      value: Math.round(value * 1000) / 1000,
      tension: 0
    };

    const newPoints = [...sortedPoints, newPoint].sort((a, b) => a.time - b.time);
    updateCurrentStagePoints(newPoints);
    setSelectedPointId(newPoint.id);
  };

  // Pointer Down on Point
  const handlePointerDownPoint = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setDraggingPointId(id);
    setSelectedPointId(id);

    const pt = sortedPoints.find(p => p.id === id);
    if (pt) {
      setDragTooltip({
        x: toSvgX(pt.time),
        y: toSvgY(pt.value) - 16,
        text: `时间: ${(pt.time * 100).toFixed(1)}% | 电平: ${(pt.value * 100).toFixed(1)}%`
      });
    }
  };

  // Pointer Down on Tension Handle
  const handlePointerDownTension = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setDraggingTensionIdx(idx);

    const p1 = sortedPoints[idx];
    const p2 = sortedPoints[idx + 1];
    if (p1 && p2) {
      const midT = (p1.time + p2.time) / 2;
      const midVal = (p1.value + p2.value) / 2;
      setDragTooltip({
        x: toSvgX(midT),
        y: toSvgY(midVal) - 16,
        text: `曲率张力: ${(p1.tension ?? 0).toFixed(2)}`
      });
    }
  };

  // Pointer Move on SVG
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || !isDraggingRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const mouseY = ((e.clientY - rect.top) / rect.height) * SVG_H;

    // 1. Dragging Control Point
    if (draggingPointId) {
      const idx = sortedPoints.findIndex(p => p.id === draggingPointId);
      if (idx === -1) return;
      const isStart = idx === 0;
      const isEnd = idx === sortedPoints.length - 1;

      let newTime = sortedPoints[idx].time;
      if (!isStart && !isEnd) {
        const prevT = sortedPoints[idx - 1].time + 0.01;
        const nextT = sortedPoints[idx + 1].time - 0.01;
        const rawT = fromSvgX(mouseX);
        newTime = Math.max(prevT, Math.min(nextT, rawT));
      }

      const rawVal = fromSvgY(mouseY);
      const newValue = Math.max(0, Math.min(1, rawVal));

      const updated = sortedPoints.map((p, i) => {
        if (i === idx) {
          return {
            ...p,
            time: Math.round(newTime * 1000) / 1000,
            value: Math.round(newValue * 1000) / 1000
          };
        }
        return p;
      });

      updateCurrentStagePoints(updated);
      setDragTooltip({
        x: toSvgX(newTime),
        y: toSvgY(newValue) - 18,
        text: `时间: ${(newTime * 100).toFixed(1)}% | 电平: ${(newValue * 100).toFixed(1)}%`
      });
    }

    // 2. Dragging Tension Handle
    if (draggingTensionIdx !== null) {
      const p1 = sortedPoints[draggingTensionIdx];
      const p2 = sortedPoints[draggingTensionIdx + 1];
      if (!p1 || !p2) return;

      const midY = (toSvgY(p1.value) + toSvgY(p2.value)) / 2;
      const deltaY = midY - mouseY; // positive = dragged upward
      const rawTension = Math.max(-1, Math.min(1, deltaY / 48));

      const updated = sortedPoints.map((p, i) => {
        if (i === draggingTensionIdx) {
          return { ...p, tension: Math.round(rawTension * 100) / 100 };
        }
        return p;
      });

      updateCurrentStagePoints(updated);

      const midT = (p1.time + p2.time) / 2;
      const curVal = evaluateSingleStageCurve(currentStageCurve, midT);
      const styleDesc =
        rawTension > 0.05 ? '指数下潜' : rawTension < -0.05 ? '对数凸起' : '线性直达';
      setDragTooltip({
        x: toSvgX(midT),
        y: toSvgY(curVal) - 18,
        text: `张力: ${rawTension >= 0 ? '+' : ''}${rawTension.toFixed(2)} (${styleDesc})`
      });
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setDraggingPointId(null);
    setDraggingTensionIdx(null);
    setDragTooltip(null);
  };

  // Preset Handlers
  const handleSelectPreset = (id: string) => {
    setSelectedPointId(null);
    setDraggingPointId(null);
    setDraggingTensionIdx(null);
    setDragTooltip(null);
    setShowDeleteConfirm(false);
    setIsRenaming(false);
    if (!id) {
      setSelectedPresetId('');
      return;
    }
    const p = presets.find(
      item => item.id === id || item.id === `factory-${id}` || item.id.replace('factory-', '') === id
    );
    if (p) {
      setSelectedPresetId(p.id);
      const cloned: FullBreathCurveData = JSON.parse(JSON.stringify(p.curveData));
      setCurveData(cloned);
      onChange?.(cloned);
      setActionNotice(`已载入预设: ${p.name}`);
      setTimeout(() => setActionNotice(null), 2500);
    } else {
      setSelectedPresetId(id);
    }
  };

  const handleSaveAndClose = () => {
    onSave?.(curveData);
    onClose();
  };

  const handleSaveNewPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    const created = saveUserCurvePreset(trimmed, curveData);
    setPresets(getAllCurvePresets());
    setSelectedPresetId(created.id);
    setIsSavingNew(false);
    setNewPresetName('');
    setActionNotice(`新预设已保存: ${created.name}`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleUpdateCurrentPreset = () => {
    if (!selectedPresetId) return;
    const p = presets.find(item => item.id === selectedPresetId);
    if (!p || p.category !== 'user') return;
    const ok = updateUserCurvePreset(p.id, curveData);
    if (ok) {
      setPresets(getAllCurvePresets());
      setActionNotice(`已覆盖更新预设: ${p.name}`);
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  const handleStartRename = () => {
    const p = presets.find(item => item.id === selectedPresetId);
    if (!p || p.category !== 'user') return;
    setRenameValue(p.name);
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    const p = presets.find(item => item.id === selectedPresetId);
    if (!p || p.category !== 'user') return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setIsRenaming(false);
      return;
    }
    const ok = renameUserCurvePreset(p.id, trimmed);
    if (ok) {
      setPresets(getAllCurvePresets());
      setIsRenaming(false);
      setActionNotice(`已重命名为: ${trimmed}`);
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  const handleDeletePreset = () => {
    const p = presets.find(item => item.id === selectedPresetId);
    if (!p || p.category !== 'user') return;
    deleteUserCurvePreset(p.id);
    setPresets(getAllCurvePresets());
    setSelectedPresetId('');
    setShowDeleteConfirm(false);
    setActionNotice('预设已删除');
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Reset stage points to straight baseline
  const handleResetStage = () => {
    const defaultPoints: CurveControlPoint[] = [
      { id: `${activeStage}-start`, time: 0, value: 0.1, tension: 0 },
      { id: `${activeStage}-end`, time: 1, value: 0.9, tension: 0 }
    ];
    updateCurrentStagePoints(defaultPoints);
    setSelectedPointId(null);
  };

  // SVG Paths with exact PAD_Y vertical alignment
  const stageSvgPath = useMemo(() => {
    return generateStageSvgPath(currentStageCurve, PLOT_W, PLOT_H, PAD_X, 48, PAD_Y);
  }, [currentStageCurve, PLOT_W, PLOT_H, PAD_X, PAD_Y]);

  // Live playhead in focused mode
  const isCurrentActiveStage = currentStage === activeStage;
  const playheadX = toSvgX(stageProgress);
  const liveVal = evaluateSingleStageCurve(currentStageCurve, stageProgress);
  const playheadY = toSvgY(liveVal);

  const activeMeta = STAGES.find(s => s.key === activeStage) ?? STAGES[0];
  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const isUserPreset = selectedPreset?.category === 'user' || selectedPresetId.startsWith('user-curve-');

  const themeContext = useContext(ThemeContext);
  const isDark = propIsDark !== undefined ? propIsDark : (themeContext ? themeContext.isDark : true);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md select-none overflow-y-auto"
      role="dialog"
      aria-label="Stage Envelope Studio Workspace"
    >
      <div className={`relative w-full max-w-4xl rounded-2xl border p-5 shadow-2xl flex flex-col gap-4 my-auto transition-colors ${
        isDark
          ? 'border-neutral-800 bg-[#09090b] text-slate-100'
          : 'border-neutral-200 bg-white text-neutral-900 shadow-2xl'
      }`}>
        {/* Top Header Bar */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isDark
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-600'
            }`}>
              <Sliders size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-semibold tracking-wider uppercase font-mono ${
                  isDark ? 'text-slate-100' : 'text-neutral-900'
                }`}>
                  STAGE ENVELOPE STUDIO
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                    : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}>
                  4-STAGE MSEG
                </span>
              </div>
              <span className={`text-xs ${
                isDark ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                目标联动: {targetLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Studio"
              className={`transition-colors p-1.5 rounded-lg border border-transparent ${
                isDark
                  ? 'text-slate-400 hover:text-slate-100 hover:border-neutral-800 hover:bg-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 hover:border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Toolbar: Presets & Stage Tools */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border ${
          isDark
            ? 'bg-neutral-900/60 border-neutral-800/80'
            : 'bg-neutral-50 border-neutral-200'
        }`}>
          {/* Preset Management */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-mono uppercase font-medium ${
              isDark ? 'text-slate-400' : 'text-neutral-500'
            }`}>
              包络预设
            </span>

            {/* Hidden native select for full test automation & a11y compatibility */}
            <select
              role="combobox"
              aria-label="包络预设"
              value={selectedPresetId}
              onChange={e => handleSelectPreset(e.target.value)}
              className="sr-only"
            >
              <option value="">-- 选择曲线预设 --</option>
              <optgroup label="出厂预设 · Factory">
                {presets
                  .filter(p => p.category === 'factory')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
              {presets.some(p => p.category === 'user') && (
                <optgroup label="用户预设 · User">
                  {presets
                    .filter(p => p.category === 'user')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {/* Modern High-End Custom Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                aria-expanded={isDropdownOpen}
                className={`h-7 px-3 text-xs font-mono rounded-lg flex items-center justify-between gap-2 border transition-all ${
                  isDark
                    ? 'bg-neutral-950/90 border-neutral-700/80 text-slate-200 hover:border-sky-500/50 hover:bg-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-800 hover:border-sky-400 shadow-xs'
                }`}
              >
                <span className="truncate max-w-[140px]">
                  {selectedPreset ? selectedPreset.name : '-- 选择曲线预设 --'}
                </span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 shrink-0 text-slate-400 ${
                    isDropdownOpen ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div
                  className={`absolute left-0 top-full mt-1.5 w-64 z-50 rounded-xl border p-1 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto ${
                    isDark
                      ? 'bg-neutral-950/95 border-neutral-800 text-slate-200 shadow-black/80'
                      : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-xl'
                  }`}
                >
                  {(['factory', 'user'] as const).map(cat => {
                    const items = presets.filter(p => p.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <React.Fragment key={cat}>
                        <div className={`px-2 py-1 ${cat === 'user' ? 'mt-1 border-t' : ''} text-[10px] font-mono tracking-wider text-slate-400 font-semibold border-b border-neutral-800/40 uppercase`}>
                          {cat === 'factory' ? '出厂预设 · Factory' : '用户预设 · User'}
                        </div>
                        {items.map(p => {
                          const isItemActive = selectedPresetId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleSelectPreset(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                                isItemActive
                                  ? isDark
                                    ? 'bg-sky-500/20 text-sky-300 font-medium'
                                    : 'bg-sky-50 text-sky-700 font-medium'
                                  : isDark
                                    ? 'text-slate-300 hover:bg-neutral-800/70 hover:text-slate-100'
                                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                              }`}
                            >
                              <span className="truncate">{p.name}</span>
                              {isItemActive && <Check size={12} className="text-sky-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Preset Operations: Overwrite, Rename, Delete */}
            {isUserPreset && (
              <div className="flex items-center gap-1">
                {isRenaming ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      placeholder="新名称..."
                      className={`h-7 px-2 text-xs w-28 rounded-lg focus:outline-none focus:border-sky-500 ${
                        isDark
                          ? 'bg-neutral-950 border border-neutral-700 text-slate-100'
                          : 'bg-white border border-neutral-300 text-neutral-800'
                      }`}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRename();
                        if (e.key === 'Escape') setIsRenaming(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleConfirmRename}
                      className="h-7 px-2 text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 flex items-center gap-1"
                      title="确认重命名"
                    >
                      <Check size={12} strokeWidth={2} />
                      <span>确认</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(false)}
                      className={`h-7 px-1.5 text-xs ${
                        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateCurrentPreset}
                      className={`h-7 px-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1 border ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-sky-300 border-sky-500/30'
                          : 'bg-white hover:bg-neutral-100 text-sky-700 border-sky-300 shadow-xs'
                      }`}
                      title="覆盖保存当前修改至此预设"
                    >
                      <Save size={11} strokeWidth={1.5} />
                      <span>覆盖保存</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className={`h-7 px-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1 border ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-slate-300 border-neutral-700'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300 shadow-xs'
                      }`}
                      title="重命名当前预设"
                    >
                      <Edit2 size={11} strokeWidth={1.5} />
                      <span>重命名</span>
                    </button>
                  </>
                )}

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-950/40 p-0.5 rounded-lg border border-rose-900/50">
                    <span className="text-[10px] text-rose-300 px-1 font-mono">确认删除?</span>
                    <button
                      type="button"
                      onClick={handleDeletePreset}
                      className="h-6 px-1.5 text-[10px] font-mono bg-rose-600 text-white rounded hover:bg-rose-500"
                    >
                      删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className={`h-6 px-1.5 text-[10px] font-mono ${
                        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-7 px-2 text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-900/40 bg-rose-950/20 rounded-lg hover:bg-rose-950/40 flex items-center gap-1 transition-colors"
                    title="删除当前预设"
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}

            {/* Save As New Preset */}
            {isSavingNew ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="预设名称..."
                  className={`h-7 px-2 text-xs w-28 rounded-lg focus:outline-none focus:border-sky-500 ${
                    isDark
                      ? 'bg-neutral-950 border border-neutral-700 text-slate-100'
                      : 'bg-white border border-neutral-300 text-neutral-800'
                  }`}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNewPreset();
                    if (e.key === 'Escape') setIsSavingNew(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveNewPreset}
                  className={`h-7 px-2.5 text-xs font-mono rounded-lg flex items-center gap-1 border ${
                    isDark
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 hover:bg-sky-500/30'
                      : 'bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200'
                  }`}
                >
                  <Check size={12} strokeWidth={2} />
                  <span>保存</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSavingNew(false);
                    setNewPresetName('');
                  }}
                  className={`h-7 px-2 text-xs ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSavingNew(true)}
                className={`h-7 px-2.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1 border ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-slate-300 border-neutral-700'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300 shadow-xs'
                }`}
                title="存为新预设"
              >
                <Plus size={12} strokeWidth={1.5} />
                <span>存为新预设</span>
              </button>
            )}

            {/* Live Action Notice */}
            {actionNotice && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                {actionNotice}
              </span>
            )}
          </div>

          {/* Current Stage Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetStage}
              title="重置当前阶段为斜坡基线"
              className={`h-7 px-2.5 text-xs font-mono rounded-lg flex items-center gap-1 transition-colors border ${
                isDark
                  ? 'bg-neutral-950 text-slate-300 hover:text-slate-100 border-neutral-800 hover:border-neutral-700'
                  : 'bg-white text-neutral-700 hover:text-neutral-900 border-neutral-300 hover:border-neutral-400 shadow-xs'
              }`}
            >
              <RotateCcw size={11} strokeWidth={1.5} />
              <span>重置本阶段</span>
            </button>
            {selectedPointId && (
              <button
                type="button"
                onClick={handleDeleteSelectedPoint}
                title="删除选中的控制节点"
                className="h-7 px-2 text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-900/50 bg-rose-950/20 rounded-lg hover:bg-rose-950/40 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} strokeWidth={1.5} />
                <span>删除节点</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. TOP DECK: Continuous 4-Stage Panorama (Primary Stage Selector) */}
        {/* ======================================================== */}
        <div className={`relative rounded-xl border p-2.5 overflow-hidden shadow-inner flex flex-col gap-1.5 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/80'
            : 'border-neutral-200 bg-neutral-50/80'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-mono px-1">
            <span className="flex items-center gap-1.5 text-sky-400 font-semibold tracking-wider uppercase">
              <Layers size={13} strokeWidth={1.5} />
              <span>全周期全景视窗 (4-Stage Panorama)</span>
            </span>
            <span className={`text-[10px] ${
              isDark ? 'text-slate-500' : 'text-neutral-500'
            }`}>
              点击卡片切换微操阶段 · Click stage card to edit
            </span>
          </div>

          {/* 4 Connected Stages Cards acting as Primary Stage Selector */}
          <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="呼吸阶段选择">
            {STAGES.map(s => {
              const isSelected = activeStage === s.key;
              const isPlayingThis = currentStage === s.key;
              const stageCurve = curveData[s.key];
              const miniPath = generateStageSvgPath(stageCurve, 160, 48, 4, 24);

              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`切换到${s.label} · ${s.enLabel}`}
                  onClick={() => {
                    setActiveStage(s.key);
                    setSelectedPointId(null);
                  }}
                  className={`cursor-pointer text-left rounded-lg border p-1.5 flex flex-col gap-1 transition-colors duration-150 select-none focus:outline-none ${
                    isSelected
                      ? isDark
                        ? 'border-sky-500 bg-neutral-900/90 shadow-sm ring-1 ring-sky-500/50'
                        : 'border-sky-500 bg-white shadow-xs ring-1 ring-sky-400'
                      : isDark
                        ? 'border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/60'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between h-5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.accentColor }}
                      />
                      <span className={`text-xs font-mono font-medium truncate ${
                        isSelected
                          ? isDark ? 'text-sky-300 font-semibold' : 'text-sky-700 font-semibold'
                          : isDark ? 'text-slate-300' : 'text-neutral-800'
                      }`}>
                        {s.label} · {s.enLabel}
                      </span>
                    </div>
                  </div>

                  <div className={`w-full h-12 rounded border overflow-hidden relative flex items-center justify-center ${
                    isDark ? 'bg-neutral-950/80 border-neutral-800/60' : 'bg-neutral-100 border-neutral-200'
                  }`}>
                    <svg viewBox="0 0 168 52" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d={`${miniPath} L 164 52 L 4 52 Z`}
                        fill={s.accentColor}
                        fillOpacity={0.12}
                      />
                      <path
                        d={miniPath}
                        fill="none"
                        stroke={s.accentColor}
                        strokeWidth={1.6}
                      />

                      {/* Moving Playhead Dot across mini stage curve */}
                      {isPlayingThis && (() => {
                        const clampedProgress = Math.max(0, Math.min(1, stageProgress));
                        const dotNormVal = evaluateSingleStageCurve(stageCurve, clampedProgress);
                        const dotX = 4 + clampedProgress * 160;
                        const dotY = 48 - dotNormVal * 44;
                        return (
                          <g className="transition-all duration-75">
                            <circle
                              cx={dotX}
                              cy={dotY}
                              r={6}
                              fill={s.accentColor}
                              fillOpacity={0.25}
                              className="animate-ping"
                            />
                            <circle
                              cx={dotX}
                              cy={dotY}
                              r={3.8}
                              fill={s.accentColor}
                              fillOpacity={0.7}
                            />
                            <circle
                              cx={dotX}
                              cy={dotY}
                              r={2}
                              fill="#ffffff"
                              stroke={s.accentColor}
                              strokeWidth={0.8}
                            />
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. BOTTOM DECK: Focused Stage Editor Viewport (Always Visible) */}
        {/* ======================================================== */}
        <div className={`relative rounded-xl border p-2 overflow-hidden shadow-inner ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/90'
            : 'border-neutral-200 bg-neutral-50/90'
        }`}>
          {/* Stage Info Header Overlay */}
          <div className="absolute top-4 left-5 z-10 flex items-center gap-2 pointer-events-none">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeMeta.accentColor }}
            />
            <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${
              isDark ? 'text-slate-200' : 'text-neutral-800'
            }`}>
              {activeMeta.label} · {activeMeta.enLabel}
            </span>
          </div>

          <div className={`w-full h-64 rounded-lg overflow-hidden border ${
            isDark ? 'border-neutral-800/80 bg-[#06080d]' : 'border-neutral-200 bg-[#f8fafc]'
          }`}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-64 overflow-visible cursor-crosshair"
              onDoubleClick={handleSvgDoubleClick}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <defs>
                {/* Stage Gradient Area Fill */}
                <linearGradient
                  id={`stage-grad-${activeStage}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={activeMeta.accentColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={activeMeta.accentColor} stopOpacity="0.0" />
                </linearGradient>

                {/* Glow Filter for Curves and Handles */}
                <filter id="studio-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Reference Level Grid Lines (0dB, -6dB, -12dB, -inf) */}
              {[1.0, 0.75, 0.5, 0.25, 0.0].map(v => {
                const y = toSvgY(v);
                return (
                  <g key={`grid-y-${v}`}>
                    <line
                      x1={PAD_X}
                      y1={y}
                      x2={SVG_W - PAD_X}
                      y2={y}
                      stroke="#262626"
                      strokeWidth={1}
                      strokeDasharray={v === 0 || v === 1 ? 'none' : '3,3'}
                    />
                    <text
                      x={PAD_X - 6}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#737373"
                    >
                      {Math.round(v * 100)}%
                    </text>
                  </g>
                );
              })}

              {/* Vertical Time Division Grid Lines (0%, 25%, 50%, 75%, 100%) */}
              {[0.0, 0.25, 0.5, 0.75, 1.0].map(t => {
                const x = toSvgX(t);
                return (
                  <g key={`grid-x-${t}`}>
                    <line
                      x1={x}
                      y1={PAD_Y}
                      x2={x}
                      y2={SVG_H - PAD_Y}
                      stroke="#262626"
                      strokeWidth={1}
                      strokeDasharray={t === 0 || t === 1 ? 'none' : '3,3'}
                    />
                    <text
                      x={x}
                      y={SVG_H - PAD_Y + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#737373"
                    >
                      {Math.round(t * 100)}%
                    </text>
                  </g>
                );
              })}

              {/* Curve Area Semi-transparent Fill */}
              {stageSvgPath && (
                <path
                  d={`${stageSvgPath} L ${toSvgX(1.0)} ${toSvgY(0)} L ${toSvgX(0.0)} ${toSvgY(0)} Z`}
                  fill={`url(#stage-grad-${activeStage})`}
                />
              )}

              {/* Main Envelope Interpolated Curve Stroke */}
              {stageSvgPath && (
                <path
                  d={stageSvgPath}
                  fill="none"
                  stroke={activeMeta.accentColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#studio-glow)"
                />
              )}

              {/* Tension Handles (Curvature Handles) between points */}
              {sortedPoints.map((p1, idx) => {
                if (idx >= sortedPoints.length - 1) return null;
                const p2 = sortedPoints[idx + 1];
                const midT = (p1.time + p2.time) / 2;
                const midVal = evaluateSingleStageCurve(currentStageCurve, midT);
                const hX = toSvgX(midT);
                const hY = toSvgY(midVal);
                const isHovered = hoveredTensionIdx === idx;
                const isDragging = draggingTensionIdx === idx;

                return (
                  <g key={`tension-${p1.id}`}>
                    {/* Vertical Tension Guide Rail on Hover/Drag */}
                    {(isHovered || isDragging) && (
                      <line
                        x1={hX}
                        y1={hY - 24}
                        x2={hX}
                        y2={hY + 24}
                        stroke="#38bdf8"
                        strokeWidth={1}
                        strokeDasharray="2,2"
                        strokeOpacity={0.7}
                      />
                    )}

                    {/* Invisible Hit Area */}
                    <circle
                      cx={hX}
                      cy={hY}
                      r={14}
                      fill="transparent"
                      className="cursor-ns-resize"
                      onPointerDown={e => handlePointerDownTension(e, idx)}
                      onMouseEnter={() => setHoveredTensionIdx(idx)}
                      onMouseLeave={() => setHoveredTensionIdx(null)}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        // Reset tension to 0 (linear)
                        const updated = sortedPoints.map((pt, i) =>
                          i === idx ? { ...pt, tension: 0 } : pt
                        );
                        updateCurrentStagePoints(updated);
                      }}
                    />

                    {/* Visible Diamond Tension Handle */}
                    <rect
                      x={hX - 4}
                      y={hY - 4}
                      width={8}
                      height={8}
                      transform={`rotate(45 ${hX} ${hY})`}
                      fill={isDragging ? '#38bdf8' : (isDark ? '#171717' : '#ffffff')}
                      stroke={isDragging || isHovered ? '#38bdf8' : (isDark ? '#737373' : '#94a3b8')}
                      strokeWidth={1.5}
                      className="cursor-ns-resize pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Control Point Handles */}
              {sortedPoints.map((p, idx) => {
                const cx = toSvgX(p.time);
                const cy = toSvgY(p.value);
                const isSelected = selectedPointId === p.id;
                const isDragging = draggingPointId === p.id;
                const isEndpoint = idx === 0 || idx === sortedPoints.length - 1;

                return (
                  <g key={p.id}>
                    {/* Selection / Dragging Outer Glow Ring */}
                    {(isSelected || isDragging) && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill="none"
                        stroke={activeMeta.accentColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.8}
                        className="animate-pulse"
                      />
                    )}

                    {/* Large Invisible Hit Target for effortless clicking */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={16}
                      fill="transparent"
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={e => handlePointerDownPoint(e, p.id)}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        if (!isEndpoint) {
                          handleDeleteSelectedPoint();
                        }
                      }}
                    />

                    {/* Visible Control Node Anchor Ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5.5}
                      fill={isDragging || isSelected ? '#ffffff' : (isDark ? '#0a0a0a' : '#ffffff')}
                      stroke={activeMeta.accentColor}
                      strokeWidth={2}
                      className="pointer-events-none shadow-md"
                    />
                  </g>
                );
              })}

              {/* Live Laser Playhead (if audio is actively playing this stage) */}
              {isCurrentActiveStage && (
                <g>
                  {/* Vertical Laser Scanline */}
                  <line
                    x1={playheadX}
                    y1={PAD_Y}
                    x2={playheadX}
                    y2={SVG_H - PAD_Y}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="3,2"
                    strokeOpacity={0.7}
                  />
                  {/* Playhead Dot */}
                  <circle
                    cx={playheadX}
                    cy={playheadY}
                    r={5}
                    fill="#10b981"
                    filter="url(#studio-glow)"
                  />
                  <circle cx={playheadX} cy={playheadY} r={2} fill="#ffffff" />
                </g>
              )}

              {/* Floating Tooltip HUD while dragging */}
              {dragTooltip && (
                <g transform={`translate(${dragTooltip.x}, ${dragTooltip.y})`}>
                  <rect
                    x={-70}
                    y={-18}
                    width={140}
                    height={20}
                    rx={4}
                    fill="#0a0a0a"
                    stroke="#404040"
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={-4.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fill="#f5f5f5"
                  >
                    {dragTooltip.text}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Bottom Status & Close Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 border-t pt-3 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md border ${
            isDark
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>实时声学调制已连接 · Modulation Active</span>
          </div>

          <div className={`hidden sm:block text-[11px] font-mono ${
            isDark ? 'text-slate-500' : 'text-neutral-500'
          }`}>
            双击新增节点 · 垂直拖动手柄调节曲率 · Delete键删除节点
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className={`px-5 py-1.5 text-xs rounded-lg transition-all font-sans flex items-center gap-1.5 ${
                isDark
                  ? 'bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                  : 'bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm border border-sky-600'
              }`}
            >
              <span>保存生效 · Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
