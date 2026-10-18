/**
 * Status Capsule Utilities (F18)
 * Pure stage mapping, countdown formatting, LED glow formula, zero emoji enforcement.
 */

import type { BreathStage } from '../types';

export const STAGE_BADGE_TEXT: Record<BreathStage, string> = {
  inhale: 'INHALE',
  holdIn: 'HOLD IN',
  exhale: 'EXHALE',
  holdOut: 'HOLD OUT'
};

/**
 * Returns uppercase badge text for a breath stage with zero emojis.
 */
export function getStageBadgeText(stage: BreathStage): string {
  return STAGE_BADGE_TEXT[stage] || 'STANDBY';
}

/**
 * Formats countdown seconds to fixed 1 decimal place (e.g. 4.2s, 0.0s).
 * Clamps negative numbers to 0.0s.
 */
export function formatCountdown(sec: number): string {
  const safeSec = Number.isFinite(sec) ? sec : 0;
  const clamped = Math.max(0, safeSec);
  return `${clamped.toFixed(1)}s`;
}

/**
 * Calculates LED breathing dot glow opacity based on breath stage and progress.
 * Values are strictly bounded between 0.15 and 1.0.
 */
export function getLedGlow(stage: BreathStage, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  let glow = 0.15;

  switch (stage) {
    case 'inhale':
      glow = 0.2 + 0.8 * p; // 0.2 -> 1.0
      break;
    case 'holdIn':
      glow = 1.0;          // steady peak
      break;
    case 'exhale':
      glow = 1.0 - 0.75 * p; // 1.0 -> 0.25
      break;
    case 'holdOut':
      glow = 0.15;         // standby
      break;
  }

  return Math.max(0.15, Math.min(1.0, glow));
}
