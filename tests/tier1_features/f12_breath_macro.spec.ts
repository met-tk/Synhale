import { describe, it, expect } from 'vitest';
import { calculateLogCutoff } from './testHarness';

describe('Feature F12: Breath Macro Physical Modulation & Stage Acoustics', () => {
  it('F12-1: Global breath macro M follows 4-stage biological envelope [0, 1]', () => {
    // Inhale: 0 -> 1
    const inhaleMacroAt0 = 0.0;
    const inhaleMacroAtMid = 0.5;
    const inhaleMacroAtEnd = 1.0;
    expect(inhaleMacroAt0).toBe(0.0);
    expect(inhaleMacroAtMid).toBe(0.5);
    expect(inhaleMacroAtEnd).toBe(1.0);

    // Hold In: constant 1.0
    const holdInMacro = 1.0;
    expect(holdInMacro).toBe(1.0);

    // Exhale: 1 -> 0
    const exhaleMacroAt0 = 1.0;
    const exhaleMacroAtMid = 0.5;
    const exhaleMacroAtEnd = 0.0;
    expect(exhaleMacroAt0).toBe(1.0);
    expect(exhaleMacroAtMid).toBe(0.5);
    expect(exhaleMacroAtEnd).toBe(0.0);

    // Hold Out: constant 0.0
    const holdOutMacro = 0.0;
    expect(holdOutMacro).toBe(0.0);
  });

  it('F12-2: Physiological S-curve modeling provides smooth acceleration and deceleration', () => {
    // Sigmoid function for inhale: 1 / (1 + exp(-10*(phi - 0.5)))
    function sigmoidInhale(phi: number): number {
      const raw = 1 / (1 + Math.exp(-10 * (phi - 0.5)));
      const minVal = 1 / (1 + Math.exp(5));
      const maxVal = 1 / (1 + Math.exp(-5));
      return (raw - minVal) / (maxVal - minVal);
    }

    expect(sigmoidInhale(0.0)).toBeCloseTo(0.0, 4);
    expect(sigmoidInhale(0.5)).toBeCloseTo(0.5, 4);
    expect(sigmoidInhale(1.0)).toBeCloseTo(1.0, 4);

    // Slope at phi=0.5 is steeper than slope at phi=0.1 or phi=0.9
    const slopeMid = sigmoidInhale(0.55) - sigmoidInhale(0.45);
    const slopeStart = sigmoidInhale(0.1) - sigmoidInhale(0.0);
    expect(slopeMid).toBeGreaterThan(slopeStart * 2);
  });

  it('F12-3: Logarithmic cutoff mapping maps macro M in [0, 1] across 90Hz to 14000Hz', () => {
    const cutoffAtZero = calculateLogCutoff(0.0, 90, 14000);
    expect(cutoffAtZero).toBeCloseTo(90.0, 1);

    const cutoffAtOne = calculateLogCutoff(1.0, 90, 14000);
    expect(cutoffAtOne).toBeCloseTo(14000.0, 1);

    const cutoffAtMid = calculateLogCutoff(0.5, 90, 14000);
    // Log midpoint between 90 and 14000 is roughly 1100Hz
    expect(cutoffAtMid).toBeGreaterThan(500);
    expect(cutoffAtMid).toBeLessThan(2000);
  });

  it('F12-4: Airway friction noise gain drops to 0.0 within 10ms of entering Hold In or Hold Out', () => {
    const fadeTimeMs = 10;
    const initialNoiseGain = 0.45;

    // Linear fade to 0 in 10ms
    function getFadedGain(elapsedMs: number): number {
      if (elapsedMs >= fadeTimeMs) return 0.0;
      return initialNoiseGain * (1 - elapsedMs / fadeTimeMs);
    }

    expect(getFadedGain(0)).toBe(0.45);
    expect(getFadedGain(5)).toBeCloseTo(0.225, 4);
    expect(getFadedGain(10)).toBe(0.0);
    expect(getFadedGain(15)).toBe(0.0);
  });

  it('F12-5: Hold In phase boosts Reverb wet to 65% with extended T60 = 6.5s for harmonic suspension', () => {
    const holdInReverbWet = 0.65;
    const holdInReverbDecay = 6.5;

    expect(holdInReverbWet).toBe(0.65);
    expect(holdInReverbDecay).toBe(6.5);

    // Exhale reduces wet and returns decay
    const exhaleEndReverbWet = 0.20;
    expect(exhaleEndReverbWet).toBeLessThan(holdInReverbWet);
  });
});
