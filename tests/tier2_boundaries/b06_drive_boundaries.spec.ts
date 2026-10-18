import { describe, it, expect } from 'vitest';
import {
  makeTanhDistortionCurve,
  calculateDriveAutoMakeupGain
} from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B06: Drive Saturation Boundaries', () => {
  it('B06-1: Drive k = 0.001 (near zero) approaches linear transfer function', () => {
    const nearLinearCurve = makeTanhDistortionCurve(1024, 0.001);
    // At near-zero k, tanh(kx)/tanh(k) ~= x
    const xMid = 0.5;
    const idx = Math.floor(((xMid + 1) / 2) * 1023);
    expect(nearLinearCurve[idx]).toBeCloseTo(xMid, 2);
  });

  it('B06-2: Extreme drive k = 100.0 (brickwall saturation) remains strictly bounded within [-1, 1]', () => {
    const brickwallCurve = makeTanhDistortionCurve(1024, 100.0);
    for (let i = 0; i < brickwallCurve.length; i++) {
      expect(brickwallCurve[i]).toBeGreaterThanOrEqual(-1.0);
      expect(brickwallCurve[i]).toBeLessThanOrEqual(1.0);
    }
  });

  it('B06-3: Minimal curve buffer length of 2 samples defines valid two-point slope', () => {
    const minCurve = makeTanhDistortionCurve(2, 2.0);
    expect(minCurve.length).toBe(2);
    expect(minCurve[0]).toBeCloseTo(-1.0, 4);
    expect(minCurve[1]).toBeCloseTo(1.0, 4);
  });

  it('B06-4: Auto-makeup gain at drive = 0.0 yields exactly unity (1.0)', () => {
    expect(calculateDriveAutoMakeupGain(0.0)).toBe(1.0);
    expect(calculateDriveAutoMakeupGain(-1.0)).toBe(1.0);
  });

  it('B06-5: Auto-makeup gain at extreme drive = 1000.0 remains strictly positive and non-zero', () => {
    const extremeComp = calculateDriveAutoMakeupGain(1000.0);
    expect(extremeComp).toBeGreaterThan(0.0);
    expect(Number.isFinite(extremeComp)).toBe(true);
    // 1 / sqrt(1 + 0.6 * 999) ~= 1 / sqrt(600.4) ~= 0.0408
    expect(extremeComp).toBeCloseTo(0.0408, 3);
  });
});
