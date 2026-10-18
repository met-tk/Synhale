import React, { useEffect, useRef, useState, useContext } from 'react';
import { X, Check, Edit2, Trash2, Volume2 } from 'lucide-react';
import { ThemeContext } from '../../theme/ThemeProvider';

export function shouldDismissDrawer(startY: number, currentY: number): boolean {
  const deltaY = currentY - startY;
  return deltaY > 60;
}

export interface DrawerItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  previewSvgPath?: string;
  onEdit?: (id: string, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onPreviewAudio?: (id: string, e: React.MouseEvent) => void;
}

export interface BottomSheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subTitle?: string;
  items: DrawerItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
  isDark?: boolean;
  headerAction?: React.ReactNode;
  columns?: 1 | 2;
  hideDescription?: boolean;
}

export const BottomSheetDrawer: React.FC<BottomSheetDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subTitle,
  items,
  selectedId,
  onSelect,
  className = '',
  isDark: propIsDark,
  headerAction,
  columns = 1,
  hideDescription = false
}) => {
  const themeCtx = useContext(ThemeContext);
  const isDark = propIsDark ?? themeCtx?.isDark ?? true;
  const touchStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.clientY;
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore in environments without pointer capture support
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    const dy = e.clientY - touchStartYRef.current;
    if (dy > 0) {
      setDragOffset(dy);
    } else {
      setDragOffset(0);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchStartYRef.current !== null) {
      if (shouldDismissDrawer(touchStartYRef.current, e.clientY)) {
        onClose();
      }
    }
    touchStartYRef.current = null;
    setDragOffset(0);
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore release capture errors
      }
    }
  };

  const handleItemClick = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : 'none'
        }}
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t p-6 shadow-2xl ${
          columns === 2 ? 'max-w-2xl' : 'max-w-xl'
        } mx-auto w-full transition-transform duration-100 ease-out max-h-[85vh] flex flex-col ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-slate-100'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-2xl'
        } ${className}`}
      >
        {/* Top Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-grab active:cursor-grabbing w-full py-2 -mt-4 mb-2 flex items-center justify-center touch-none"
        >
          <div className={`w-8 h-1 rounded-full ${isDark ? 'bg-neutral-600' : 'bg-neutral-300'}`} />
        </div>

        {/* Drawer Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-sm font-semibold tracking-wider uppercase ${
              isDark ? 'text-slate-200' : 'text-neutral-900'
            }`}>
              {title}
            </h2>
            {subTitle && (
              <span className={`text-xs font-normal ${
                isDark ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                {subTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className={`p-1 rounded transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-100' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className={`overflow-y-auto flex-1 pr-1 ${
          columns === 2
            ? 'grid grid-cols-2 gap-2 auto-rows-max'
            : `divide-y ${isDark ? 'divide-neutral-800/60' : 'divide-neutral-100'}`
        }`}>
          {items.length === 0 ? (
            <div className={`py-8 text-center text-xs ${
              isDark ? 'text-slate-400' : 'text-neutral-400'
            }`}>
              No items available
            </div>
          ) : (
            items.map(item => {
              const isSelected = item.id === selectedId;
              const isGrid = columns === 2;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`min-h-[48px] px-3 py-2 flex items-center justify-between text-left rounded transition-colors ${
                    isGrid
                      ? isDark
                        ? isSelected
                          ? 'bg-sky-950/40 border border-sky-500/70 text-sky-300 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                          : 'bg-neutral-900/60 border border-neutral-800/90 text-slate-300 hover:border-slate-700 hover:bg-neutral-800/60'
                        : isSelected
                          ? 'bg-sky-50 border border-sky-500 text-sky-800 font-semibold'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                      : isDark
                        ? isSelected
                          ? 'w-full bg-neutral-800 text-sky-400 font-medium'
                          : 'w-full text-slate-300 hover:bg-neutral-800/50'
                        : isSelected
                          ? 'w-full bg-sky-50 text-sky-700 font-medium'
                          : 'w-full text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex flex-col flex-1 mr-2 min-w-0">
                    <span className="text-xs truncate">{item.label}</span>
                    {!hideDescription && item.description && (
                      <span className={`text-[11px] truncate ${
                        isDark ? 'text-slate-400' : 'text-neutral-500'
                      }`}>
                        {item.description}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Visual Waveform Preview */}
                    {item.previewSvgPath && (
                      <div className={`w-[68px] h-[28px] rounded border flex items-center justify-center overflow-hidden px-1 py-0.5 ${
                        isDark ? 'bg-neutral-950/80 border-neutral-800/90' : 'bg-neutral-50 border-neutral-200'
                      }`}>
                        <svg viewBox="0 0 64 28" className="w-full h-full">
                          <line x1="0" y1="14" x2="64" y2="14" stroke={isDark ? "#404040" : "#cbd5e1"} strokeWidth="0.8" strokeDasharray="2,2" />
                          <path
                            d={item.previewSvgPath}
                            fill="none"
                            stroke={isSelected ? '#38bdf8' : (isDark ? '#64748b' : '#94a3b8')}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Audio Preview Audition Button */}
                    {item.onPreviewAudio && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => {
                          e.stopPropagation();
                          item.onPreviewAudio?.(item.id, e);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            item.onPreviewAudio?.(item.id, e as any);
                          }
                        }}
                        aria-label="Preview waveform audio"
                        title="试听波形"
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:text-sky-400 hover:bg-neutral-700/60'
                            : 'text-neutral-500 hover:text-sky-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Volume2 size={13} strokeWidth={1.8} />
                      </span>
                    )}

                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        isDark ? 'bg-neutral-800 text-slate-400 border-neutral-700' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Edit Action Button */}
                    {item.onEdit && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => {
                          e.stopPropagation();
                          item.onEdit?.(item.id, e);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            item.onEdit?.(item.id, e as any);
                          }
                        }}
                        aria-label="Edit preset"
                        title="重命名预设"
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:text-sky-300 hover:bg-neutral-700/60'
                            : 'text-neutral-500 hover:text-sky-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Edit2 size={12} strokeWidth={1.6} />
                      </span>
                    )}

                    {/* Delete Action Button */}
                    {item.onDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => {
                          e.stopPropagation();
                          item.onDelete?.(item.id, e);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            item.onDelete?.(item.id, e as any);
                          }
                        }}
                        aria-label="Delete preset"
                        title="删除预设"
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-neutral-700/60'
                            : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 size={12} strokeWidth={1.6} />
                      </span>
                    )}

                    {isSelected && <Check size={14} strokeWidth={2} className="text-sky-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
