import React, { useMemo } from 'react';
import type { BreathStage } from '../../../types';
import type { IndicatorPrecision } from '../../../visuals/indicatorConfig';

export interface CenterBreathIndicatorProps {
  stage?: BreathStage;
  stageProgress?: number;      // 0..1
  remainingSeconds: number;    // seconds left in current stage
  breathMacro: number;         // 0..1 continuous breath expansion depth
  isPlaying: boolean;
  opacityPercent: number;      // 0..100
  precision?: IndicatorPrecision; // 'decimal' (4.2) | 'integer' (4)
  isDarkTheme?: boolean;
  onTogglePlay?: () => void;
  className?: string;
}

/**
 * CenterBreathIndicator:
 * Pure Arabic numeral countdown positioned at the exact visual center of the sacred geometry canvas.
 * Seamlessly expands and contracts with breathMacro (0.0 .. 1.0) across breath stages.
 * Suggestion 1:
 * - Hold In (吸气屏息): Full solid typography with soft ambient aurora glow (饱满充盈能量).
 * - Hold Out (呼气屏息): Transparent wireframe outline stroke typography with zero glow (彻底放空虚境).
 * - Inhale / Exhale: Smooth solid scaling typography.
 * Zero emojis, zero letters, zero Chinese/English word tags per user specification.
 */
export const CenterBreathIndicator: React.FC<CenterBreathIndicatorProps> = ({
  stage,
  remainingSeconds,
  breathMacro,
  isPlaying,
  opacityPercent,
  precision = 'decimal',
  isDarkTheme = true,
  onTogglePlay,
  className = ''
}) => {
  // Pure Arabic numeral formatted as 1-decimal place (4.2) or single integer (4)
  const displayNumber = useMemo(() => {
    const safeSec = Number.isFinite(remainingSeconds) ? Math.max(0, remainingSeconds) : 0;
    if (precision === 'integer') {
      return Math.ceil(safeSec).toString();
    }
    return safeSec.toFixed(1);
  }, [remainingSeconds, precision]);

  // Stage differentiation per Suggestion 1:
  const isHoldIn = stage === 'holdIn';
  const isHoldOut = stage === 'holdOut';

  // Dynamic scale calculation: smoothly expands with inhale/holdIn and contracts with exhale/holdOut
  // Base scale is 0.82 (contracted), expanding to 1.48 (fully expanded)
  const safeMacro = Number.isFinite(breathMacro) ? Math.max(0, Math.min(1, breathMacro)) : 0;
  const scale = 0.82 + 0.66 * safeMacro;

  // Opacity factor (0.0 .. 1.0)
  const alpha = Number.isFinite(opacityPercent) ? Math.max(0, Math.min(1, opacityPercent / 100)) : 0.2;

  // Suggestion 1 Typography & Outline Styles:
  // Hold Out: Transparent hollow wireframe outline stroke
  const textStrokeStyle: React.CSSProperties = isHoldOut
    ? {
        WebkitTextStroke: isDarkTheme ? '1.5px rgba(244, 244, 245, 0.9)' : '1.5px rgba(24, 24, 27, 0.9)',
        color: 'transparent',
        filter: 'none'
      }
    : {};

  // Theme & Stage glow classes (100% Pure Monochrome, Zero Color Tint)
  const appearanceClasses = useMemo(() => {
    if (isHoldOut) {
      // Hollow, quiet, void state with zero glow
      return 'text-transparent hover:opacity-90';
    }

    if (isHoldIn) {
      // Hold In: Pure monochrome solid text with organic heartbeat pulse animation
      return isDarkTheme
        ? 'text-white hover:text-white'
        : 'text-neutral-950 hover:text-black';
    }

    // Normal Inhale / Exhale / Idle: pure monochrome soft light
    return isDarkTheme
      ? 'text-zinc-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.18)] hover:text-white'
      : 'text-neutral-900 drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] hover:text-neutral-950';
  }, [isHoldIn, isHoldOut, isDarkTheme]);

  // Keep hooks in a stable order when the visibility preference changes.
  if (alpha <= 0) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none ${className}`}
      aria-live="off"
    >
      <style>{`
        @keyframes synhaleHoldInHeartbeat {
          0% {
            transform: scale(1);
          }
          15% {
            transform: scale(1.09);
          }
          30% {
            transform: scale(0.96);
          }
          45% {
            transform: scale(1.02);
          }
          60%, 100% {
            transform: scale(1);
          }
        }
        @keyframes synhaleHoldInRipple {
          0% {
            transform: scale(0.75);
            opacity: 0.75;
          }
          70%, 100% {
            transform: scale(1.9);
            opacity: 0;
          }
        }
        .animate-hold-in-heartbeat {
          animation: synhaleHoldInHeartbeat 1.0s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        .animate-hold-in-ripple {
          animation: synhaleHoldInRipple 1.0s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
      `}</style>

      <button
        type="button"
        onClick={onTogglePlay}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!event.repeat) onTogglePlay?.();
          }
        }}
        aria-label={`呼吸倒计时: ${displayNumber}`}
        aria-pressed={isPlaying}
        title={isPlaying ? '轻触暂停呼吸' : '轻触开始呼吸'}
        style={{
          transform: `scale(${scale.toFixed(3)})`,
          opacity: alpha,
          transition: 'transform 120ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease'
        }}
        className={`relative pointer-events-auto cursor-pointer flex flex-col items-center justify-center rounded-full p-6 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-zinc-400/40 ${appearanceClasses}`}
      >
        {/* Hold In: Monochromatic Outward Wave Ripple Emitted on Each 1.0s Beat (Strict 1:1 Perfect Circle) */}
        {isHoldIn && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              data-testid="hold-in-ripple"
              className={`w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-full border pointer-events-none animate-hold-in-ripple ${
                isDarkTheme
                  ? 'border-white/60'
                  : 'border-neutral-900/50'
              }`}
            />
          </div>
        )}

        {/* Pure Arabic Numeral Countdown: 1.0s Heartbeat Pulse for Hold In, Hollow Stroke for Hold Out */}
        <span
          data-testid="breath-indicator-number"
          style={textStrokeStyle}
          className={`font-mono text-4xl sm:text-5xl md:text-6xl tabular-nums leading-none transition-all duration-300 ${
            isHoldIn
              ? 'animate-hold-in-heartbeat font-medium tracking-normal'
              : isHoldOut
                ? 'font-extralight tracking-tight'
                : 'font-light tracking-tight'
          }`}
        >
          {displayNumber}
        </span>
      </button>
    </div>
  );
};
