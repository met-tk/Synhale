import { CurveControlPoint, SingleStageCurve, FullBreathCurveData, BreathStage } from '../../types';

/**
 * Evaluates tension-adjusted interpolation between two control points
 * @param p1 Starting control point (time, value, tension)
 * @param p2 Ending control point (time, value)
 * @param t Current normalized time within the segment [p1.time, p2.time]
 * @returns Interpolated value [0..1]
 */
export function evaluateSegment(
  p1: CurveControlPoint,
  p2: CurveControlPoint,
  t: number
): number {
  if (!p1 || !p2) return 0.5;
  const p1Time = Number.isFinite(p1.time) ? p1.time : 0;
  const p2Time = Number.isFinite(p2.time) ? p2.time : 1;
  const p1Val = Number.isFinite(p1.value) ? p1.value : 0;
  const p2Val = Number.isFinite(p2.value) ? p2.value : 1;

  const dt = p2Time - p1Time;
  if (dt <= 0.00001) return p1Val;

  const safeT = Number.isFinite(t) ? t : 0;
  const u = Math.max(0, Math.min(1, (safeT - p1Time) / dt));
  const rawTension = p1.tension ?? 0;
  const tension = Number.isFinite(rawTension) ? Math.max(-1, Math.min(1, rawTension)) : 0;

  let curvedU = u;
  if (Math.abs(tension) > 0.001) {
    if (tension > 0) {
      // Exponential curve (concave, slow start, rapid finish)
      const k = 1 + tension * 4.0;
      curvedU = Math.pow(u, k);
    } else {
      // Logarithmic curve (convex, rapid onset, gentle plateau)
      const k = 1 - tension * 4.0;
      curvedU = 1 - Math.pow(1 - u, k);
    }
  }

  return p1Val + (p2Val - p1Val) * curvedU;
}

function arePointsValidAndSorted(points: CurveControlPoint[]): boolean {
  let prevTime = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p || !Number.isFinite(p.time) || !Number.isFinite(p.value) || p.time < prevTime) {
      return false;
    }
    prevTime = p.time;
  }
  return true;
}

/**
 * Evaluates a single stage curve at a given progress [0..1]
 */
export function evaluateSingleStageCurve(
  curve: SingleStageCurve,
  progress: number
): number {
  if (!curve || !Array.isArray(curve.points) || curve.points.length === 0) return 0.5;

  const pts = arePointsValidAndSorted(curve.points)
    ? curve.points
    : [...curve.points]
        .filter(p => p && Number.isFinite(p.time) && Number.isFinite(p.value))
        .sort((a, b) => a.time - b.time);

  if (pts.length === 0) return 0.5;
  if (pts.length === 1) return pts[0].value;

  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (t <= pts[0].time) return pts[0].value;
  if (t >= pts[pts.length - 1].time) return pts[pts.length - 1].value;

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (t >= p1.time && t <= p2.time) {
      return evaluateSegment(p1, p2, t);
    }
  }

  return pts[pts.length - 1].value;
}

/**
 * Evaluates full breath curve at current stage & progress
 */
export function evaluateFullBreathCurve(
  curveData: FullBreathCurveData,
  stage: BreathStage,
  stageProgress: number
): number {
  const stageCurve = curveData[stage];
  if (!stageCurve) return 0.5;
  return evaluateSingleStageCurve(stageCurve, stageProgress);
}

/**
 * Creates default smooth organic breath curve data
 */
export function createDefaultBreathCurveData(): FullBreathCurveData {
  return {
    inhale: {
      stage: 'inhale',
      points: [
        { id: 'inhale-start', time: 0.0, value: 0.05, tension: -0.4 }, // Gentle smooth swell
        { id: 'inhale-mid', time: 0.5, value: 0.65, tension: 0.2 },
        { id: 'inhale-end', time: 1.0, value: 1.0, tension: 0.0 }
      ]
    },
    holdIn: {
      stage: 'holdIn',
      points: [
        { id: 'holdIn-start', time: 0.0, value: 1.0, tension: 0.0 },
        { id: 'holdIn-end', time: 1.0, value: 0.88, tension: 0.0 } // Gentle serene plateau
      ]
    },
    exhale: {
      stage: 'exhale',
      points: [
        { id: 'exhale-start', time: 0.0, value: 0.88, tension: 0.4 }, // Exponential release
        { id: 'exhale-mid', time: 0.6, value: 0.35, tension: -0.2 },
        { id: 'exhale-end', time: 1.0, value: 0.05, tension: 0.0 }
      ]
    },
    holdOut: {
      stage: 'holdOut',
      points: [
        { id: 'holdOut-start', time: 0.0, value: 0.05, tension: 0.0 },
        { id: 'holdOut-end', time: 1.0, value: 0.02, tension: 0.0 } // Calm still baseline
      ]
    }
  };
}

/**
 * Generates an SVG path string for a single stage curve within given width and height
 */
export function generateStageSvgPath(
  curve: SingleStageCurve,
  width: number,
  height: number,
  offsetX = 0,
  steps = 32,
  offsetY = 0
): string {
  if (width <= 0 || height <= 0) return '';
  let d = '';

  for (let s = 0; s <= steps; s++) {
    const normT = s / steps;
    const normVal = evaluateSingleStageCurve(curve, normT);
    const x = offsetX + normT * width;
    const y = offsetY + (height - normVal * height); // Invert for SVG coordinates
    if (s === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return d;
}

/**
 * Creates FullBreathCurveData dynamically from stage multipliers
 */
export function createCurveDataFromMultipliers(mults: {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  curve?: 'smooth' | 'linear' | 'step';
}): FullBreathCurveData {
  const inh = Number.isFinite(mults.inhale) ? Math.max(0, Math.min(1, mults.inhale)) : 1.0;
  const holdIn = Number.isFinite(mults.holdIn) ? Math.max(0, Math.min(1, mults.holdIn)) : 0.85;
  const exh = Number.isFinite(mults.exhale) ? Math.max(0, Math.min(1, mults.exhale)) : 0.3;
  const holdOut = Number.isFinite(mults.holdOut) ? Math.max(0, Math.min(1, mults.holdOut)) : 0.0;

  return {
    inhale: {
      stage: 'inhale',
      points: [
        { id: 'inhale-start', time: 0.0, value: holdOut, tension: 0.0 },
        { id: 'inhale-end', time: 1.0, value: inh, tension: mults.curve === 'smooth' ? -0.2 : 0.0 }
      ]
    },
    holdIn: {
      stage: 'holdIn',
      points: [
        { id: 'holdIn-start', time: 0.0, value: inh, tension: 0.0 },
        { id: 'holdIn-end', time: 1.0, value: holdIn, tension: 0.0 }
      ]
    },
    exhale: {
      stage: 'exhale',
      points: [
        { id: 'exhale-start', time: 0.0, value: holdIn, tension: mults.curve === 'smooth' ? 0.3 : 0.0 },
        { id: 'exhale-end', time: 1.0, value: exh, tension: 0.0 }
      ]
    },
    holdOut: {
      stage: 'holdOut',
      points: [
        { id: 'holdOut-start', time: 0.0, value: exh, tension: 0.0 },
        { id: 'holdOut-end', time: 1.0, value: holdOut, tension: 0.0 }
      ]
    }
  };
}

/**
 * Extracts characteristic stage multipliers from FullBreathCurveData
 */
export function extractStageMultipliersFromCurve(curveData: FullBreathCurveData): {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  curve: 'smooth';
} {
  const getStageTarget = (curve: SingleStageCurve, fallback: number) => {
    if (!curve?.points || curve.points.length === 0) return fallback;
    const sorted = [...curve.points].sort((a, b) => a.time - b.time);
    const last = sorted[sorted.length - 1];
    return Number.isFinite(last?.value) ? Math.round(last.value * 100) / 100 : fallback;
  };

  return {
    inhale: getStageTarget(curveData.inhale, 1.0),
    holdIn: getStageTarget(curveData.holdIn, 0.85),
    exhale: getStageTarget(curveData.exhale, 0.30),
    holdOut: getStageTarget(curveData.holdOut, 0.0),
    curve: 'smooth'
  };
}

