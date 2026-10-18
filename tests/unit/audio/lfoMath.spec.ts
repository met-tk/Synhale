import { describe, it, expect } from 'vitest';
import { evaluateLfoWaveform, computeLfoLiveValue } from '../../../src/audio/dsp/lfoMath';

describe('LFO Mathematics & Waveform Generation Suite', () => {
  it('evaluates sine waveform symmetrically around 0', () => {
    expect(evaluateLfoWaveform('sine', 0)).toBeCloseTo(0, 5);
    expect(evaluateLfoWaveform('sine', 0.25)).toBeCloseTo(1.0, 5);
    expect(evaluateLfoWaveform('sine', 0.5)).toBeCloseTo(0, 5);
    expect(evaluateLfoWaveform('sine', 0.75)).toBeCloseTo(-1.0, 5);
  });

  it('evaluates triangle waveform with linear ramps', () => {
    expect(evaluateLfoWaveform('triangle', 0.25)).toBeCloseTo(1.0, 5);
    expect(evaluateLfoWaveform('triangle', 0.75)).toBeCloseTo(-1.0, 5);
    expect(evaluateLfoWaveform('triangle', 0.0)).toBeCloseTo(0.0, 5);
    expect(evaluateLfoWaveform('triangle', 0.5)).toBeCloseTo(0.0, 5);
  });

  it('evaluates sawtooth waveform from +1 down to -1', () => {
    expect(evaluateLfoWaveform('sawtooth', 0.0)).toBeCloseTo(1.0, 5);
    expect(evaluateLfoWaveform('sawtooth', 0.5)).toBeCloseTo(0.0, 5);
    expect(evaluateLfoWaveform('sawtooth', 0.99)).toBeCloseTo(-0.98, 2);
  });

  it('evaluates square waveform with bipolar levels', () => {
    expect(evaluateLfoWaveform('square', 0.1)).toBe(1.0);
    expect(evaluateLfoWaveform('square', 0.49)).toBe(1.0);
    expect(evaluateLfoWaveform('square', 0.51)).toBe(-1.0);
    expect(evaluateLfoWaveform('square', 0.9)).toBe(-1.0);
  });

  it('computes live modulation values with depth scaling and bypass handling', () => {
    // Peak sine at 0.25s for 1Hz
    const val = computeLfoLiveValue(1.0, 0.6, 'sine', false, 0.25);
    expect(val).toBeCloseTo(0.6, 4);

    // Bypass returns exactly 0.0
    const bypassed = computeLfoLiveValue(1.0, 0.6, 'sine', true, 0.25);
    expect(bypassed).toBe(0.0);

    // Depth 0 returns 0.0
    const zeroDepth = computeLfoLiveValue(1.0, 0.0, 'sine', false, 0.25);
    expect(zeroDepth).toBe(0.0);
  });
});
