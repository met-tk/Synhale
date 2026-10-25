import type { FullBreathCurveData, CurveControlPoint } from '../../types';
import { createDefaultBreathCurveData } from '../dsp/curveMath';
import { isRecord } from './safeStorage';

export const BREATH_STAGES = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const;
export const MAX_CURVE_POINTS = 512;

/** Copies only the curve schema and repairs malformed stages before UI/DSP use. */
export function sanitizeBreathCurveData(raw: unknown): FullBreathCurveData {
  const result = createDefaultBreathCurveData();
  if (!isRecord(raw)) return result;
  for (const stage of BREATH_STAGES) {
    const curve = raw[stage];
    if (!isRecord(curve) || !Array.isArray(curve.points) || curve.points.length > MAX_CURVE_POINTS) continue;
    const ids = new Set<string>();
    const uniqueId = (base: string): string => {
      let id = base;
      let suffix = 0;
      while (ids.has(id)) id = `${base}-${++suffix}`;
      ids.add(id);
      return id;
    };
    const points: CurveControlPoint[] = [];
    for (const [index, point] of curve.points.entries()) {
      if (!isRecord(point) || typeof point.time !== 'number' || !Number.isFinite(point.time)
        || typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;
      const id = uniqueId(typeof point.id === 'string' && point.id.trim() ? point.id.slice(0, 64) : `${stage}-${index}`);
      points.push({
        id,
        time: Math.max(0, Math.min(1, point.time)),
        value: Math.max(0, Math.min(1, point.value)),
        tension: typeof point.tension === 'number' && Number.isFinite(point.tension)
          ? Math.max(-1, Math.min(1, point.tension)) : 0
      });
    }
    points.sort((a, b) => a.time - b.time);
    if (points.length < 2) continue;
    // The editor requires explicit endpoints; keep their values intact.
    if (points[0].time > 0) points.unshift({ ...points[0], id: uniqueId(`${stage}-start`), time: 0 });
    if (points[points.length - 1].time < 1) points.push({ ...points[points.length - 1], id: uniqueId(`${stage}-end`), time: 1 });
    result[stage] = { stage, points };
  }
  return result;
}
