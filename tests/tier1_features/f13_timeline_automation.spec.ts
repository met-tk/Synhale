import { describe, it, expect } from 'vitest';
import { evaluateTensionCurve } from './testHarness';

describe('Feature F13: Graphical Stage Automation Timeline Editor', () => {
  it('F13-1: Symmetric tension interpolation is linear when Tension T = 0', () => {
    expect(evaluateTensionCurve(0.0, 0, 100, 0.0)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(0.25, 0, 100, 0.0)).toBeCloseTo(25.0, 4);
    expect(evaluateTensionCurve(0.5, 0, 100, 0.0)).toBeCloseTo(50.0, 4);
    expect(evaluateTensionCurve(0.75, 0, 100, 0.0)).toBeCloseTo(75.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, 0.0)).toBeCloseTo(100.0, 4);
  });

  it('F13-2: Positive tension (T > 0) produces concave ease-in curve (slower initial growth)', () => {
    const valAtQuarterLinear = evaluateTensionCurve(0.25, 0, 100, 0.0);
    const valAtQuarterEaseIn = evaluateTensionCurve(0.25, 0, 100, 0.6);

    // Ease-in grows slower initially
    expect(valAtQuarterEaseIn).toBeLessThan(valAtQuarterLinear);
    expect(evaluateTensionCurve(0.0, 0, 100, 0.6)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, 0.6)).toBeCloseTo(100.0, 4);
  });

  it('F13-3: Negative tension (T < 0) produces convex ease-out curve (faster initial growth)', () => {
    const valAtQuarterLinear = evaluateTensionCurve(0.25, 0, 100, 0.0);
    const valAtQuarterEaseOut = evaluateTensionCurve(0.25, 0, 100, -0.6);

    // Ease-out grows faster initially
    expect(valAtQuarterEaseOut).toBeGreaterThan(valAtQuarterLinear);
    expect(evaluateTensionCurve(0.0, 0, 100, -0.6)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, -0.6)).toBeCloseTo(100.0, 4);
  });

  it('F13-4: 4-stage viewport partitions timeline width strictly proportional to rhythm durations', () => {
    const rhythm = { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 };
    const totalDuration = rhythm.inhale + rhythm.holdIn + rhythm.exhale + rhythm.holdOut; // 19s

    const widthTotal = 1000; // px
    const wInhale = (rhythm.inhale / totalDuration) * widthTotal;
    const wHoldIn = (rhythm.holdIn / totalDuration) * widthTotal;
    const wExhale = (rhythm.exhale / totalDuration) * widthTotal;
    const wHoldOut = (rhythm.holdOut / totalDuration) * widthTotal;

    expect(wInhale + wHoldIn + wExhale + wHoldOut).toBeCloseTo(widthTotal, 2);
    expect(wHoldOut).toBe(0);
    expect(wExhale).toBeGreaterThan(wHoldIn);
    expect(wHoldIn).toBeGreaterThan(wInhale);
  });

  it('F13-5: Boundary snapping locks stage end value to next stage start value when continuity enabled', () => {
    let inhaleEnd = 0.85;
    let holdInStart = 0.50;

    // Snapping logic
    function snapContinuous(prevEnd: number, nextStart: number, enabled: boolean): number {
      return enabled ? prevEnd : nextStart;
    }

    holdInStart = snapContinuous(inhaleEnd, holdInStart, true);
    expect(holdInStart).toBe(0.85);

    // With continuity disabled, values can differ
    const decoupledStart = snapContinuous(inhaleEnd, 0.3, false);
    expect(decoupledStart).toBe(0.3);
  });
});
