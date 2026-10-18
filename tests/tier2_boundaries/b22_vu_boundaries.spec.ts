import { describe, it, expect } from 'vitest';
import { applyMagneticCenterDetent } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B22: Bipolar VU & Magnetic Detent Boundaries', () => {
  it('B22-1: Value at positive detent threshold +0.029 clamps to exact 0.0', () => {
    expect(applyMagneticCenterDetent(0.029)).toBe(0.0);
  });

  it('B22-2: Value immediately outside positive detent +0.031 retains exact value', () => {
    expect(applyMagneticCenterDetent(0.031)).toBe(0.031);
  });

  it('B22-3: Value at negative detent threshold -0.029 clamps to exact 0.0', () => {
    expect(applyMagneticCenterDetent(-0.029)).toBe(0.0);
  });

  it('B22-4: Value immediately outside negative detent -0.031 retains exact value', () => {
    expect(applyMagneticCenterDetent(-0.031)).toBe(-0.031);
  });

  it('B22-5: Out-of-range fader inputs (+100.0 and -100.0) are clamped strictly to [-1.0, 1.0]', () => {
    expect(applyMagneticCenterDetent(100.0)).toBe(1.0);
    expect(applyMagneticCenterDetent(-100.0)).toBe(-1.0);
  });
});
