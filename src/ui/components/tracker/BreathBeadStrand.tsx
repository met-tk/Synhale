import React, { useId, useMemo } from 'react';

export interface BreathBeadStrandProps {
  capacity: number;      // total bead slots (storable cycle count)
  cycleCount: number;    // completed breath cycles
  cycleProgress: number; // 0..1 progress within the current cycle
  isPlaying: boolean;
  isDarkTheme?: boolean;
}

/**
 * BreathBeadStrand:
 * Ambient, number-free breath cycle counter threaded along the left edge of the
 * playback stage — a vertical mala of beads on a fine cord.
 * - Completed cycle: one softly glowing bead, accumulating bottom-up.
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
  isDarkTheme = true
}) => {
  const clipId = useId();

  const safeCapacity = Math.max(1, Math.min(48, Math.round(Number.isFinite(capacity) ? capacity : 1)));
  const completed = Math.max(0, Math.min(safeCapacity, Number.isFinite(cycleCount) ? Math.floor(cycleCount) : 0));
  const progress = Number.isFinite(cycleProgress) ? Math.max(0, Math.min(1, cycleProgress)) : 0;
  const isFull = completed >= safeCapacity;
  const activeIndex = isFull ? -1 : completed;

  const layout = useMemo(() => {
    // Fixed cord length in viewBox units; beads string out evenly regardless of capacity.
    const strandHeight = 520;
    const pad = 24;
    const usable = strandHeight - pad * 2;
    const spacing = safeCapacity > 1 ? usable / (safeCapacity - 1) : 0;
    const radius = Math.max(3, Math.min(7, spacing * 0.3));
    const cordX = 14;
    const slotY = (i: number) => strandHeight - pad - i * spacing; // bottom-up growth
    return { strandHeight, spacing, radius, cordX, slotY, overhang: Math.min(14, spacing * 0.5 + 6) };
  }, [safeCapacity]);

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
  const activeCy = activeIndex >= 0 ? layout.slotY(activeIndex) : 0;
  const fillHeight = layout.radius * 2 * progress;

  return (
    <div
      data-testid="breath-bead-strand"
      role="img"
      aria-label={`呼吸念珠：已完成 ${completed} / ${safeCapacity} 个呼吸周期`}
      className="absolute left-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none select-none"
      style={{ opacity: isPlaying ? 1 : 0.45, transition: 'opacity 300ms ease' }}
    >
      <svg
        width={28}
        height={layout.strandHeight}
        viewBox={`0 0 28 ${layout.strandHeight}`}
        style={{ height: 'min(68vh, 520px)', width: 'auto', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            {/* Rising fill window inside the active bead, anchored to its base */}
            <rect
              x={layout.cordX - layout.radius - 1}
              y={activeCy + layout.radius - fillHeight}
              width={layout.radius * 2 + 2}
              height={fillHeight}
            />
          </clipPath>
        </defs>

        <g className={isFull ? 'synhale-strand-breathe' : undefined}>
          {/* The cord */}
          <line
            x1={layout.cordX}
            y1={layout.slotY(safeCapacity - 1) - layout.overhang}
            x2={layout.cordX}
            y2={layout.slotY(0) + layout.overhang}
            stroke={cordStroke}
            strokeWidth={1}
          />

          {Array.from({ length: safeCapacity }, (_, i) => {
            const cy = layout.slotY(i);
            const isCompleted = i < completed;
            const isActive = i === activeIndex;
            return (
              <g key={i}>
                {isCompleted && (
                  <circle
                    cx={layout.cordX}
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
                      cx={layout.cordX}
                      cy={cy}
                      r={layout.radius}
                      fill="none"
                      stroke={activeStroke}
                      strokeWidth={1}
                    />
                    {progress > 0.001 && (
                      <circle
                        cx={layout.cordX}
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
                    cx={layout.cordX}
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
