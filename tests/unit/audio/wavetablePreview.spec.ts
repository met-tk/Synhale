import { describe, it, expect } from 'vitest';
import {
  WAVETABLE_DEFINITIONS,
  generateWavetablePreviewSvgPath,
  computeWavetableTimeDomain
} from '../../../src/audio/dsp/wavetableData';

describe('Wavetable Waveform Preview System', () => {
  it('places basic waveforms at the forefront (Sinusoid, Triangle, Square, Sawtooth)', () => {
    expect(WAVETABLE_DEFINITIONS[0].name).toBe('Pure Sinusoid');
    expect(WAVETABLE_DEFINITIONS[1].name).toBe('Pure Triangle');
    expect(WAVETABLE_DEFINITIONS[2].name).toBe('Pure Square');
    expect(WAVETABLE_DEFINITIONS[3].name).toBe('Pure Sawtooth');

    expect(WAVETABLE_DEFINITIONS[0].category).toBe('Pure Roots');
    expect(WAVETABLE_DEFINITIONS[1].category).toBe('Pure Roots');
    expect(WAVETABLE_DEFINITIONS[2].category).toBe('Pure Roots');
    expect(WAVETABLE_DEFINITIONS[3].category).toBe('Pure Roots');
  });

  it('computes normalized time domain points for wavetable slice', () => {
    const points = computeWavetableTimeDomain(0, 0, 1.0, 32);
    expect(points).toHaveLength(32);

    let maxVal = 0;
    for (const p of points) {
      if (Math.abs(p) > maxVal) maxVal = Math.abs(p);
    }
    // Normalization ensures peak within [0.9, 0.96]
    expect(maxVal).toBeLessThanOrEqual(0.96);
    expect(maxVal).toBeGreaterThan(0.8);
  });

  it('generates valid SVG path data string for compact preview oscilloscopes', () => {
    for (let i = 0; i < 4; i++) {
      const path = generateWavetablePreviewSvgPath(i, 64, 28, 2);
      expect(typeof path).toBe('string');
      expect(path.startsWith('M ')).toBe(true);
      expect(path.includes(' L ')).toBe(true);
    }
  });

  it('gracefully handles out-of-bounds slice indices', () => {
    const pathNegative = generateWavetablePreviewSvgPath(-1);
    expect(pathNegative.startsWith('M ')).toBe(true);

    const pathHuge = generateWavetablePreviewSvgPath(999);
    expect(pathHuge.startsWith('M ')).toBe(true);
  });
});
