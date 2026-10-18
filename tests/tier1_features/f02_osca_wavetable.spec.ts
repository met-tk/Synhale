import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import {
  WAVETABLE_DEFINITIONS,
  createWavetablePeriodicWaves,
  getWavetableHarmonics
} from '../../src/audio/dsp/wavetableData';
import { equalPowerCrossfade } from './testHarness';

describe('Feature F02: OSC A Wavetable & Equal-Power Slur', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext();
  });

  it('F02-1: WAVETABLE_DEFINITIONS contains exactly 24 curated slices divided into 4 sound therapy categories', () => {
    expect(WAVETABLE_DEFINITIONS).toHaveLength(24);

    const categories = WAVETABLE_DEFINITIONS.map(w => w.category);
    const pureRoots = categories.filter(c => c === 'Pure Roots');
    const singingBowls = categories.filter(c => c === 'Singing Bowls');
    const vocalFormants = categories.filter(c => c === 'Vocal Formants');
    const spectralExp = categories.filter(c => c === 'Spectral Expansion');

    expect(pureRoots).toHaveLength(4);
    expect(singingBowls).toHaveLength(4);
    expect(vocalFormants).toHaveLength(4);
    expect(spectralExp).toHaveLength(12);

    for (let i = 0; i < 24; i++) {
      expect(WAVETABLE_DEFINITIONS[i].id).toBe(i);
      expect(typeof WAVETABLE_DEFINITIONS[i].name).toBe('string');
      expect(WAVETABLE_DEFINITIONS[i].name.length).toBeGreaterThan(0);
    }
  });

  it('F02-2: Every wavetable slice has 0 DC offset and normalized harmonic energy', () => {
    for (const slice of WAVETABLE_DEFINITIONS) {
      expect(slice.real[0]).toBe(0);
      expect(slice.imag[0]).toBe(0);

      let sumSquares = 0;
      for (let i = 1; i < slice.imag.length; i++) {
        sumSquares += slice.imag[i] * slice.imag[i];
      }
      expect(sumSquares).toBeCloseTo(1.0, 4);
    }
  });

  it('F02-3: createWavetablePeriodicWaves creates 24 valid PeriodicWave instances in AudioContext', () => {
    const waves = createWavetablePeriodicWaves(ctx);
    expect(waves).toHaveLength(24);

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(waves[0]);
    expect(osc.type).toBe('custom');
    expect(osc.periodicWave).toBe(waves[0]);
  });

  it('F02-4: getWavetableHarmonics clamps out-of-bounds indices and returns isolated copies', () => {
    const slice0 = getWavetableHarmonics(-5);
    expect(slice0.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[0].imag[1], 4);

    const slice23 = getWavetableHarmonics(999);
    expect(slice23.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[23].imag[1], 4);

    slice0.imag[1] = 999;
    expect(WAVETABLE_DEFINITIONS[0].imag[1]).not.toBe(999);
  });

  it('F02-5: Dual oscillator equal-power crossfade guarantees constant acoustic power G1^2 + G2^2 = 1.0', () => {
    const testAlphas = [0.0, 0.15, 0.33, 0.5, 0.67, 0.85, 1.0];
    for (const alpha of testAlphas) {
      const { g1, g2 } = equalPowerCrossfade(alpha);
      const totalPower = g1 * g1 + g2 * g2;
      expect(totalPower).toBeCloseTo(1.0, 5);

      if (alpha === 0.0) {
        expect(g1).toBeCloseTo(1.0, 5);
        expect(g2).toBeCloseTo(0.0, 5);
      } else if (alpha === 1.0) {
        expect(g1).toBeCloseTo(0.0, 5);
        expect(g2).toBeCloseTo(1.0, 5);
      } else if (alpha === 0.5) {
        expect(g1).toBeCloseTo(Math.SQRT1_2, 5);
        expect(g2).toBeCloseTo(Math.SQRT1_2, 5);
      }
    }
  });
});
