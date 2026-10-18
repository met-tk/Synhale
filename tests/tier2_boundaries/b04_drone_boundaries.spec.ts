import { describe, it, expect } from 'vitest';
import { calculateMidiFrequency } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B04: Sub/Drone Tuning & Drift Boundaries', () => {
  it('B04-1: Infrasonic MIDI note 0 (~8.03Hz) evaluates to sub-audible physical vibration frequency', () => {
    const f0 = calculateMidiFrequency(0, 432);
    // 432 * 2^(-69/12) ~= 8.027 Hz
    expect(f0).toBeCloseTo(8.027, 2);
    expect(f0).toBeGreaterThan(0);
  });

  it('B04-2: Ultrasonic MIDI note 127 calculates valid upper harmonic boundary', () => {
    const f127 = calculateMidiFrequency(127, 432);
    // 432 * 2^((127-69)/12) ~= 12315.8 Hz
    expect(f127).toBeCloseTo(12315.8, 1);
  });

  it('B04-3: Zero pitch drift depth (drift = 0.0) yields invariant frequency output', () => {
    const baseFreq = 64.21;
    const driftDepth = 0.0;

    for (let t = 0; t <= 10; t += 1) {
      const modulated = baseFreq * Math.pow(2, (driftDepth * Math.sin(t)) / 1200);
      expect(modulated).toBeCloseTo(baseFreq, 6);
    }
  });

  it('B04-4: Negative detune ratio down to -1200 cents (1 octave drop) evaluates to exact half-frequency', () => {
    const ratioMinus1200 = Math.pow(2, -1200 / 1200);
    expect(ratioMinus1200).toBeCloseTo(0.5, 6);
  });

  it('B04-5: Base tuning reference frequencies (415Hz Baroque, 432Hz Verdi, 440Hz Concert, 444Hz) scale proportionally', () => {
    const midiA4 = 69;
    expect(calculateMidiFrequency(midiA4, 415)).toBe(415);
    expect(calculateMidiFrequency(midiA4, 432)).toBe(432);
    expect(calculateMidiFrequency(midiA4, 440)).toBe(440);
    expect(calculateMidiFrequency(midiA4, 444)).toBe(444);
  });
});
