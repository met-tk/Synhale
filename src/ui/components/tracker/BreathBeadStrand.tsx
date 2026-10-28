import React, { useId, useMemo } from 'react';

export interface BreathBeadStrandProps {
  capacity: number;      // total bead slots (storable cycle count)
  cycleCount: number;    // completed breath cycles
  cycleProgress: number; // 0..1 progress within the current cycle
  isPlaying: boolean;
  isDarkTheme?: boolean;
  /** 'left': vertical mala on the left edge; 'top': horizontal strand across the top. */
  position?: 'left' | 'top';
}

/**
 * BreathBeadStrand:
 * Ambient, number-free breath cycle counter threaded along the left edge of the
 * playback stage — a vertical mala of beads on a fine cord (or a horizontal
 * strand across the top on touch-first layouts).
 * - Completed cycle: one softly glowing bead, accumulating bottom-up / left-to-right.
 * - Current cycle: a ghost bead filling from its base with cycleProgress.
 * - Strand full: the whole mala breathes once (collective dim & glow), then the
 *   session concludes (playback pauses; pressing play begins a fresh strand).
 * Pure monochrome, theme-driven: luminous white pearls on the dark stage, ink
 * black pearls on the light stage — zero color tint, mirroring the central
 * indicator's monochrome discipline. Zero numerals, zero letters, zero word
 * tags on the stage; the lit length of the cord is the progress.
 * Screen readers still receive exact counts via aria.
 */
export const BreathBeadStrand: React.FC<BreathBeadStrandProps> = ({
  capacity,
  cycleCount,
  cycleProgress,
  isPlaying,
  isDarkTheme = true,
  position = 'left'
}) => {
  const clipId = useId();
  const horizontal = position === 'top';

  const safeCapacity = Math.max(1, Math.min(48, Number.isFinite(capacity) ? capacity : 1));
  const completed = Math.max(0, Math.min(safeCapacity, Number.isFinite(cycleCount) ? Math.floor(cycleCount) : 0));
  const progress = Number.isFinite(cycleProgress) ? Math.max(0, Math.min(1, cycleProgress)) : 0;
  const isFull = completed >= safeCapacity;
  const activeIndex = isFull ? -1 : completed;

  const layout = useMemo(() => {
    // Fixed cord length in viewBox units; beads string out evenly regardless of capacity.
    const cordLength = 520;
    const pad = 24;
    const usable = cordLength - pad * 2;
    const spacing = safeCapacity > 1 ? usable / (safeCapacity - 1) : 0;
    const radius = Math.max(3, Math.min(7, spacing * 0.3));
    // Vertical grows bottom-up; horizontal grows left-to-right (reading direction).
    const slot = (i: number) =>
      horizontal ? pad + i * spacing : cordLength - pad - i * spacing;
    return { cordLength, spacing, radius, slot, overhang: Math.min(14, spacing * 0.5 + 6), horizontal };
  }, [safeCapacity, horizontal]);

  // Monochrome palette driven by theme: white pearls on dark, ink pearls on light.
  const palette = useMemo(() => {
    return isDarkTheme
      ? {
          beadFill: '#f4f4f5', // zinc-100 luminous pearl
          activeFill: '#f4f4f5',
          glow: 'drop-shadow(0 0 3px rgba(244, 244, 245, 0.35))'
        }
      : {
          beadFill: '#18181b', // zinc-900 crisp ink pearl
          activeFill: '#18181b',
          glow: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.28))'
        };
  }, [isDarkTheme]);

  const cordStroke = isDarkTheme ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.14)';
  const pendingStroke = isDarkTheme ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)';
  const activeStroke = isDarkTheme ? 'rgba(255, 255, 255, 0.34)' : 'rgba(0, 0, 0, 0.34)';

  const lastLitBead = completed - 1;
  const activeSlot = activeIndex >= 0 ? layout.slot(activeIndex) : 0;
  const fillLength = layout.radius * 2 * progress;

  return (
    <div
      data-testid="breath-bead-strand"
      role="img"
      aria-label={`呼吸念珠：已完成 ${completed} / ${safeCapacity} 个呼吸周期`}
      className={
        horizontal
          ? 'absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none'
          : 'absolute left-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none select-none'
      }
      style={{ opacity: isPlaying ? 1 : 0.45, transition: 'opacity 300ms ease' }}
    >
      <svg
        width={horizontal ? layout.cordLength : 28}
        height={horizontal ? 28 : layout.cordLength}
        viewBox={
          horizontal
            ? `0 0 ${layout.cordLength} 28`
            : `0 0 28 ${layout.cordLength}`
        }
        style={
          horizontal
            ? { width: 'min(78vw, 520px)', height: 'auto', overflow: 'visible' }
            : { height: 'min(68vh, 520px)', width: 'auto', overflow: 'visible' }
        }
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            {/* Rising fill window inside the active bead, anchored to its base */}
            {horizontal ? (
              <rect
                x={activeSlot - layout.radius - 1}
                y={14 - layout.radius - 1}
                width={fillLength}
                height={layout.radius * 2 + 2}
              />
            ) : (
              <rect
                x={14 - layout.radius - 1}
                y={activeSlot + layout.radius - fillLength}
                width={layout.radius * 2 + 2}
                height={fillLength}
              />
            )}
          </clipPath>
        </defs>

        <g className={isFull ? 'synhale-strand-breathe' : undefined}>
          {/* The cord */}
          {horizontal ? (
            <line
              x1={layout.slot(safeCapacity - 1) - layout.overhang}
              y1={14}
              x2={layout.slot(0) + layout.overhang}
              y2={14}
              stroke={cordStroke}
              strokeWidth={1}
            />
          ) : (
            <line
              x1={14}
              y1={layout.slot(safeCapacity - 1) - layout.overhang}
              x2={14}
              y2={layout.slot(0) + layout.overhang}
              stroke={cordStroke}
              strokeWidth={1}
            />
          )}

          {Array.from({ length: safeCapacity }, (_, i) => {
            const cordPos = layout.slot(i);
            const isCompleted = i < completed;
            const isActive = i === activeIndex;
            const cx = horizontal ? cordPos : 14;
            const cy = horizontal ? 14 : cordPos;
            return (
              <g key={i}>
                {isCompleted && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={layout.radius}
                    fill={palette.beadFill}
                    opacity={0.85}
                    style={{ filter: palette.glow }}
                    className={i === lastLitBead ? 'synhale-bead-pulse' : undefined}
                  />
                )}
                {isActive && (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={layout.radius}
                      fill="none"
                      stroke={activeStroke}
                      strokeWidth={1}
                    />
                    {progress > 0.001 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={layout.radius}
                        fill={palette.activeFill}
                        opacity={0.9}
                        clipPath={`url(#${clipId})`}
                      />
                    )}
                  </>
                )}
                {!isCompleted && !isActive && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={layout.radius}
                    fill="none"
                    stroke={pendingStroke}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
