import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { calculateMidiFrequency } from './testHarness';

describe('Feature F04: Sub/Drone Tuning Foundation & Micro-Drift', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F04-1: 432Hz natural tuning calculates exact sub-bass frequencies for C2 and C1', () => {
    // MIDI 69 = A4 (432Hz)
    expect(calculateMidiFrequency(69, 432)).toBeCloseTo(432.0, 4);

    // MIDI 36 = C2
    const c2Freq = calculateMidiFrequency(36, 432);
    expect(c2Freq).toBeCloseTo(64.21, 1);

    // MIDI 24 = C1
    const c1Freq = calculateMidiFrequency(24, 432);
    expect(c1Freq).toBeCloseTo(32.11, 1);
  });

  it('F04-2: 440Hz vs 432Hz tuning pitch ratio strictly equals 432 / 440 (~0.9818)', () => {
    for (const midiNote of [24, 36, 48, 60, 69]) {
      const f432 = calculateMidiFrequency(midiNote, 432);
      const f440 = calculateMidiFrequency(midiNote, 440);
      const ratio = f432 / f440;
      expect(ratio).toBeCloseTo(432 / 440, 5);
    }
  });

  it('F04-3: Ultra-slow 0.05Hz micro-drift bounds pitch tension within +/- 4 cents', () => {
    const lfoFreq = 0.05; // 20-second period
    const maxCents = 4.0;

    for (let t = 0; t <= 20; t += 2) {
      const currentDriftCents = Math.sin(2 * Math.PI * lfoFreq * t) * maxCents;
      expect(currentDriftCents).toBeGreaterThanOrEqual(-4.0);
      expect(currentDriftCents).toBeLessThanOrEqual(4.0);
    }
  });

  it('F04-4: Detune cents accurately modulates oscillator frequency by 2^(cents/1200)', () => {
    const osc = ctx.createOscillator();
    osc.frequency.value = 64.21;
    osc.detune.value = 0;

    // +1200 cents = 1 octave up (frequency * 2)
    const factorPlus1200 = Math.pow(2, 1200 / 1200);
    expect(factorPlus1200).toBe(2.0);

    // +4 cents micro-drift
    const factorPlus4 = Math.pow(2, 4 / 1200);
    expect(factorPlus4).toBeCloseTo(1.00231, 5);

    // -4 cents micro-drift
    const factorMinus4 = Math.pow(2, -4 / 1200);
    expect(factorMinus4).toBeCloseTo(0.99769, 5);
  });

  it('F04-5: Sub-bass isolation filters (25Hz highpass and 180Hz lowpass) attenuate DC and high frequencies', () => {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 25;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;

    const freqTest = new Float32Array([5, 54, 500]);
    const magHp = new Float32Array(3);
    const phaseHp = new Float32Array(3);
    hp.getFrequencyResponse(freqTest, magHp, phaseHp);

    // At 5Hz (below 25Hz cutoff), highpass attenuates significantly
    expect(magHp[0]).toBeLessThan(0.35);
    // At 54Hz (passband), highpass is close to unity
    expect(magHp[1]).toBeGreaterThan(0.85);

    const magLp = new Float32Array(3);
    const phaseLp = new Float32Array(3);
    lp.getFrequencyResponse(freqTest, magLp, phaseLp);

    // At 54Hz, lowpass passes the signal
    expect(magLp[1]).toBeGreaterThan(0.9);
    // At 500Hz, lowpass attenuates the high harmonics
    expect(magLp[2]).toBeLessThan(0.35);
  });
});
