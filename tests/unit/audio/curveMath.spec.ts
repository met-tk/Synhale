import { describe, it, expect } from 'vitest';
import {
  evaluateSegment,
  evaluateSingleStageCurve,
  evaluateFullBreathCurve,
  generateStageSvgPath,
  createDefaultBreathCurveData
} from '../../../src/audio/dsp/curveMath';
import type { CurveControlPoint, SingleStageCurve } from '../../../src/types/ui';

describe('Curve Math DSP & Interpolation Algorithms', () => {
  describe('evaluateSegment', () => {
    it('computes exact linear interpolation when tension is 0', () => {
      const p1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: 0 };
      const p2: CurveControlPoint = { id: 'p2', time: 1, value: 10, tension: 0 };

      expect(evaluateSegment(p1, p2, 0)).toBe(0);
      expect(evaluateSegment(p1, p2, 1)).toBe(10);
      expect(evaluateSegment(p1, p2, 0.5)).toBeCloseTo(5.0, 5);
      expect(evaluateSegment(p1, p2, 0.25)).toBeCloseTo(2.5, 5);
    });

    it('bends curve downward (concave up) when tension is positive', () => {
      const pLinear1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: 0 };
      const pLinear2: CurveControlPoint = { id: 'p2', time: 1, value: 1, tension: 0 };
      const linearMid = evaluateSegment(pLinear1, pLinear2, 0.5); // 0.5

      const pExp1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: 0.8 };
      const pExp2: CurveControlPoint = { id: 'p2', time: 1, value: 1, tension: 0 };
      const curvedMid = evaluateSegment(pExp1, pExp2, 0.5); // exponential ramp

      expect(curvedMid).toBeLessThan(linearMid);
      expect(curvedMid).toBeGreaterThan(0);
    });

    it('bends curve upward (concave down) when tension is negative', () => {
      const pLinear1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: 0 };
      const pLinear2: CurveControlPoint = { id: 'p2', time: 1, value: 1, tension: 0 };
      const linearMid = evaluateSegment(pLinear1, pLinear2, 0.5); // 0.5

      const pLog1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: -0.8 };
      const pLog2: CurveControlPoint = { id: 'p2', time: 1, value: 1, tension: 0 };
      const curvedMid = evaluateSegment(pLog1, pLog2, 0.5); // logarithmic fast rise

      expect(curvedMid).toBeGreaterThan(linearMid);
      expect(curvedMid).toBeLessThan(1);
    });

    it('clamps t to range [0, 1]', () => {
      const p1: CurveControlPoint = { id: 'p1', time: 0, value: 0, tension: 0 };
      const p2: CurveControlPoint = { id: 'p2', time: 1, value: 10, tension: 0 };
      expect(evaluateSegment(p1, p2, -0.5)).toBe(0);
      expect(evaluateSegment(p1, p2, 1.5)).toBe(10);
    });
  });

  describe('evaluateSingleStageCurve', () => {
    it('evaluates single stage curve across multiple control points', () => {
      const stageCurve: SingleStageCurve = {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.0, tension: 0 },
          { id: 'p2', time: 0.5, value: 0.8, tension: 0 },
          { id: 'p3', time: 1.0, value: 0.4, tension: 0 }
        ]
      };

      expect(evaluateSingleStageCurve(stageCurve, 0.0)).toBeCloseTo(0.0, 5);
      expect(evaluateSingleStageCurve(stageCurve, 0.5)).toBeCloseTo(0.8, 5);
      expect(evaluateSingleStageCurve(stageCurve, 1.0)).toBeCloseTo(0.4, 5);
      expect(evaluateSingleStageCurve(stageCurve, 0.25)).toBeCloseTo(0.4, 5);
      expect(evaluateSingleStageCurve(stageCurve, 0.75)).toBeCloseTo(0.6, 5);
    });

    it('safely handles empty or single-point curves', () => {
      const emptyCurve: SingleStageCurve = { stage: 'inhale', points: [] };
      expect(evaluateSingleStageCurve(emptyCurve, 0.5)).toBe(0.5);

      const singlePointCurve: SingleStageCurve = {
        stage: 'inhale',
        points: [{ id: 'p1', time: 0.5, value: 0.75, tension: 0 }]
      };
      expect(evaluateSingleStageCurve(singlePointCurve, 0.1)).toBe(0.75);
      expect(evaluateSingleStageCurve(singlePointCurve, 0.9)).toBe(0.75);
    });
  });

  describe('evaluateFullBreathCurve', () => {
    it('evaluates stage-specific curves for each breath stage', () => {
      const fullCurve = createDefaultBreathCurveData();

      const inh0 = evaluateFullBreathCurve(fullCurve, 'inhale', 0.0);
      const inh1 = evaluateFullBreathCurve(fullCurve, 'inhale', 1.0);
      expect(inh0).toBeCloseTo(0.05, 2);
      expect(inh1).toBeCloseTo(1.0, 2);

      const holdInMid = evaluateFullBreathCurve(fullCurve, 'holdIn', 0.5);
      expect(holdInMid).toBeGreaterThanOrEqual(0.8);

      const exh0 = evaluateFullBreathCurve(fullCurve, 'exhale', 0.0);
      const exh1 = evaluateFullBreathCurve(fullCurve, 'exhale', 1.0);
      expect(exh0).toBeGreaterThan(exh1);

      const holdOutVal = evaluateFullBreathCurve(fullCurve, 'holdOut', 0.5);
      expect(holdOutVal).toBeLessThanOrEqual(0.1);
    });
  });

  describe('generateStageSvgPath', () => {
    it('generates valid SVG path commands with M and L points', () => {
      const stageCurve: SingleStageCurve = {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.0, tension: 0.5 },
          { id: 'p2', time: 1.0, value: 1.0, tension: 0 }
        ]
      };

      const pathD = generateStageSvgPath(stageCurve, 200, 100, 10, 10);
      expect(pathD.startsWith('M')).toBe(true);
      expect(pathD).toContain('L');
    });

    it('returns empty string if width or height is zero or negative', () => {
      const stageCurve: SingleStageCurve = {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.0, tension: 0 },
          { id: 'p2', time: 1.0, value: 1.0, tension: 0 }
        ]
      };
      expect(generateStageSvgPath(stageCurve, 0, 100)).toBe('');
      expect(generateStageSvgPath(stageCurve, 200, -10)).toBe('');
    });

    it('applies offsetY correctly when specified for vertical alignment', () => {
      const stageCurve: SingleStageCurve = {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 1.0, tension: 0 },
          { id: 'p2', time: 1.0, value: 0.0, tension: 0 }
        ]
      };
      const pathD = generateStageSvgPath(stageCurve, 100, 100, 0, 2, 24);
      // at value = 1.0, y = 24 + (100 - 1.0 * 100) = 24.0
      expect(pathD.startsWith('M 0.0 24.0')).toBe(true);
      // at value = 0.0, y = 24 + (100 - 0.0 * 100) = 124.0
      expect(pathD.endsWith('100.0 124.0')).toBe(true);
    });
  });

  describe('createDefaultBreathCurveData', () => {
    it('creates all 4 stages with initial anchor endpoints', () => {
      const data = createDefaultBreathCurveData();
      expect(data.inhale.points.length).toBeGreaterThanOrEqual(2);
      expect(data.holdIn.points.length).toBeGreaterThanOrEqual(2);
      expect(data.exhale.points.length).toBeGreaterThanOrEqual(2);
      expect(data.holdOut.points.length).toBeGreaterThanOrEqual(2);
    });
  });
});
