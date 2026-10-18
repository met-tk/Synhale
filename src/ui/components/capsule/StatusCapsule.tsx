import React from 'react';
import { Play, Pause } from 'lucide-react';
import type { BreathStage } from '../../../types';
import { getStageBadgeText, formatCountdown, getLedGlow } from '../../../visuals/statusCapsule';

export interface StatusCapsuleProps {
  stage: BreathStage;
  stageProgress: number;
  remainingSeconds: number;
  isPlaying: boolean;
  isDarkTheme?: boolean;
  onTogglePlay?: () => void;
  className?: string;
}

const STAGE_ZH_MAP: Record<BreathStage, string> = {
  inhale: '吸气',
  holdIn: '屏气',
  exhale: '呼气',
  holdOut: '空定'
};

export const StatusCapsule: React.FC<StatusCapsuleProps> = ({
  stage,
  stageProgress,
  remainingSeconds,
  isPlaying,
  isDarkTheme = true,
  onTogglePlay,
  className = ''
}) => {
  const badgeText = getStageBadgeText(stage);
  const countdownText = formatCountdown(remainingSeconds);
  const ledGlow = getLedGlow(stage, stageProgress);
  const stageZh = STAGE_ZH_MAP[stage] || '待机';

  const themeClasses = isDarkTheme
    ? 'border-neutral-800 bg-neutral-950/70 text-neutral-200 hover:border-neutral-700'
    : 'border-neutral-300 bg-white/80 text-neutral-800 shadow-sm hover:border-neutral-400';

  const ledColorClass = isDarkTheme
    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
    : 'bg-cyan-600 shadow-[0_0_6px_rgba(2,132,199,0.5)]';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTogglePlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTogglePlay?.();
        }
      }}
      aria-label={`Breath state: ${badgeText}, time remaining: ${countdownText}`}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 backdrop-blur-md border z-20 select-none cursor-pointer flex items-center gap-3 transition-colors duration-200 ${themeClasses} ${className}`}
    >
      {/* 1. Breathing LED Dot */}
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full transition-opacity duration-150 ${ledColorClass}`}
        style={{ opacity: ledGlow }}
      />

      {/* 2. Stage Badge */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium tracking-wider uppercase font-sans">
          {badgeText}
        </span>
        <span className="text-xs font-medium tracking-wide text-neutral-400 font-sans">
          · {stageZh}
        </span>
      </div>

      {/* 3. Countdown Timer */}
      <span className="font-mono tabular-nums text-xs text-neutral-400">
        {countdownText}
      </span>

      {/* 4. Subtle Play/Pause Icon */}
      <span aria-hidden="true" className="text-neutral-400 flex items-center justify-center">
        {isPlaying ? (
          <Pause size={12} strokeWidth={1.5} />
        ) : (
          <Play size={12} strokeWidth={1.5} />
        )}
      </span>
    </div>
  );
};
