import { describe, it, expect } from 'vitest';
import { evaluateTensionCurve } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B13: Timeline Tension Curves & Boundary Extremes', () => {
  it('B13-1: Extreme convex tension T = -1.0 strictly preserves output bounds [0, 1]', () => {
    for (let p = 0; p <= 1.0; p += 0.1) {
      const val = evaluateTensionCurve(p, 0, 1, -1.0);
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it('B13-2: Extreme concave tension T = +1.0 strictly preserves output bounds [0, 1]', () => {
    for (let p = 0; p <= 1.0; p += 0.1) {
      const val = evaluateTensionCurve(p, 0, 1, 1.0);
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it('B13-3: Inverted descent curves (startVal = 1.0, endVal = 0.0) calculate strictly monotonic decrease', () => {
    let prev = 1.0;
    for (let p = 0.1; p <= 1.0; p += 0.1) {
      const current = evaluateTensionCurve(p, 1.0, 0.0, 0.4);
      expect(current).toBeLessThanOrEqual(prev);
      prev = current;
    }
    expect(evaluateTensionCurve(1.0, 1.0, 0.0, 0.4)).toBeCloseTo(0.0, 4);
  });

  it('B13-4: Identical start and end values (startVal = 0.5, endVal = 0.5) remain constant for any tension', () => {
    for (const tension of [-1.0, -0.5, 0.0, 0.5, 1.0]) {
      const val = evaluateTensionCurve(0.42, 0.5, 0.5, tension);
      expect(val).toBeCloseTo(0.5, 5);
    }
  });

  it('B13-5: Out-of-bounds phase phi (< 0 or > 1) is safely clamped to [0.0, 1.0]', () => {
    const under = evaluateTensionCurve(-0.5, 0, 100, 0.2);
    expect(under).toBeCloseTo(0.0, 4);

    const over = evaluateTensionCurve(1.5, 0, 100, 0.2);
    expect(over).toBeCloseTo(100.0, 4);
  });
});
