import type { BreathStage, BreathRhythmConfig, StageAutomationCurve, ParameterAutomationConfig } from '../types';

/**
 * Symmetric Exponential Tension Interpolation Formula
 * For phi in [0, 1], Tension T in [-1, 1]
 * - T = 0: linear
 * - T < 0: convex ease-out (faster initial growth), k = 6 * |T|
 * - T > 0: concave ease-in (slower initial growth), k = 6 * T
 */
export function evaluateTensionCurve(
  phi: number,
  startVal: number,
  endVal: number,
  tension: number
): number {
  if (startVal === endVal) {
    return startVal;
  }

  const p = Math.max(0.0, Math.min(1.0, Number.isFinite(phi) ? phi : 0.0));
  const t = Math.max(-1.0, Math.min(1.0, Number.isFinite(tension) ? tension : 0.0));

  let y = p;
  if (Math.abs(t) >= 0.001) {
    const k = 6.0 * Math.abs(t);
    if (t < 0) {
      // Convex Ease-out
      y = (1.0 - Math.exp(-k * p)) / (1.0 - Math.exp(-k));
    } else {
      // Concave Ease-in
      y = (Math.exp(k * p) - 1.0) / (Math.exp(k) - 1.0);
    }
  }

  // Ensure bounds safety
  y = Math.max(0.0, Math.min(1.0, y));
  return startVal + (endVal - startVal) * y;
}

/**
 * Evaluates a single StageAutomationCurve at a given progress [0, 1]
 */
export function evaluateStageCurve(curve: StageAutomationCurve, progress: number): number {
  if (!curve) return 0.0;
  return evaluateTensionCurve(progress, curve.startVal, curve.endVal, curve.tension);
}

/**
 * Evaluates a single ParameterAutomationConfig for the specified stage and progress
 */
export function evaluateParameterAutomation(
  config: ParameterAutomationConfig,
  stage: BreathStage,
  stageProgress: number
): number {
  if (!config) return 0.0;
  const curve = config[stage];
  return evaluateStageCurve(curve, stageProgress);
}

/**
 * Evaluates multiple ParameterAutomationConfig definitions and returns a map of targetParam -> evaluated value
 */
export function evaluateAutomationMap(
  configs: ParameterAutomationConfig[],
  stage: BreathStage,
  stageProgress: number
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!Array.isArray(configs)) return result;

  for (const config of configs) {
    if (config && config.targetParam) {
      result[config.targetParam] = evaluateParameterAutomation(config, stage, stageProgress);
    }
  }

  return result;
}

/**
 * Continuous boundary snapping helper:
 * When continuity is enabled, locks the next stage's start value to previous stage's end value
 */
export function snapContinuousBoundary(
  previousEndVal: number,
  nextStartVal: number,
  enabled: boolean
): number {
  return enabled ? previousEndVal : nextStartVal;
}

/**
 * Calculates proportional pixel/percentage widths for each stage based on rhythm durations
 */
export function calculateTimelineStageWidths(
  rhythm: BreathRhythmConfig,
  totalWidth: number
): Record<BreathStage, number> {
  const totalDuration =
    (rhythm.inhale || 0) +
    (rhythm.holdIn || 0) +
    (rhythm.exhale || 0) +
    (rhythm.holdOut || 0);

  if (totalDuration <= 0.001 || totalWidth <= 0) {
    return {
      inhale: totalWidth * 0.25,
      holdIn: totalWidth * 0.25,
      exhale: totalWidth * 0.25,
      holdOut: totalWidth * 0.25
    };
  }

  return {
    inhale: (rhythm.inhale / totalDuration) * totalWidth,
    holdIn: (rhythm.holdIn / totalDuration) * totalWidth,
    exhale: (rhythm.exhale / totalDuration) * totalWidth,
    holdOut: (rhythm.holdOut / totalDuration) * totalWidth
  };
}

/**
 * Converts a normalized [0, 1] automation scalar to a physical acoustic unit
 */
export function mapNormalizedToPhysical(
  normalized: number,
  minPhysical: number,
  maxPhysical: number,
  mapping: 'linear' | 'logarithmic' | 'exponential' = 'linear'
): number {
  const v = Math.max(0.0, Math.min(1.0, normalized));

  switch (mapping) {
    case 'logarithmic': {
      const min = Math.max(1e-5, minPhysical);
      const max = Math.max(min, maxPhysical);
      return min * Math.pow(max / min, v);
    }
    case 'exponential': {
      return minPhysical + (maxPhysical - minPhysical) * (v * v);
    }
    case 'linear':
    default:
      return minPhysical + (maxPhysical - minPhysical) * v;
  }
}
