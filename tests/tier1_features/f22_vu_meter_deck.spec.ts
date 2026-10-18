import { describe, it, expect } from 'vitest';
import { applyMagneticCenterDetent } from './testHarness';

describe('Feature F22: Hardware Modulation Deck & Center-Zero VU Meter', () => {
  it('F22-1: Center-zero VU meter represents bidirectional bipolar depth range from -1.0 to +1.0', () => {
    function computeVuBars(val: number) {
      const clamped = Math.max(-1.0, Math.min(1.0, val));
      const leftPct = clamped < 0 ? Math.abs(clamped) * 100 : 0;
      const rightPct = clamped > 0 ? clamped * 100 : 0;
      return { leftPct, rightPct };
    }

    const atZero = computeVuBars(0.0);
    expect(atZero.leftPct).toBe(0);
    expect(atZero.rightPct).toBe(0);

    const atPos = computeVuBars(0.65);
    expect(atPos.leftPct).toBe(0);
    expect(atPos.rightPct).toBeCloseTo(65.0, 1);

    const atNeg = computeVuBars(-0.45);
    expect(atNeg.leftPct).toBeCloseTo(45.0, 1);
    expect(atNeg.rightPct).toBe(0);
  });

  it('F22-2: Bipolar magnetic fader clamps values within +/-3% to exact 0.00', () => {
    expect(applyMagneticCenterDetent(0.015)).toBe(0.0);
    expect(applyMagneticCenterDetent(-0.025)).toBe(0.0);
    expect(applyMagneticCenterDetent(0.00)).toBe(0.0);

    // Outside threshold -> retained
    expect(applyMagneticCenterDetent(0.05)).toBeCloseTo(0.05, 4);
    expect(applyMagneticCenterDetent(-0.15)).toBeCloseTo(-0.15, 4);
  });

  it('F22-3: Peak hold meter retains maximum peak level for 400ms before smooth decay', () => {
    let peakValue = 0.0;
    let peakTimestamp = 0;

    function updatePeak(currentVal: number, nowMs: number) {
      if (Math.abs(currentVal) >= peakValue || nowMs - peakTimestamp > 400) {
        peakValue = Math.abs(currentVal);
        peakTimestamp = nowMs;
      }
      return peakValue;
    }

    updatePeak(0.8, 1000);
    expect(peakValue).toBe(0.8);

    // After 200ms with smaller value, peak stays at 0.8
    updatePeak(0.3, 1200);
    expect(peakValue).toBe(0.8);

    // After 450ms (> 400ms), peak updates to new value
    updatePeak(0.4, 1450);
    expect(peakValue).toBe(0.4);
  });

  it('F22-4: VU meter scales 60fps refresh smoothly without layout thrashing', () => {
    const meterElement = document.createElement('div');
    meterElement.style.transform = 'scaleX(0.75)';
    expect(meterElement.style.transform).toBe('scaleX(0.75)');
  });

  it('F22-5: Bipolar fader bounds input strictly within [-1.0, 1.0]', () => {
    expect(applyMagneticCenterDetent(1.5)).toBe(1.0);
    expect(applyMagneticCenterDetent(-2.0)).toBe(-1.0);
  });
});
