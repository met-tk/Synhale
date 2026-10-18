import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import {
  WAVETABLE_DEFINITIONS,
  getWavetableHarmonics
} from '../../src/audio/dsp/wavetableData';
import { equalPowerCrossfade } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B02: OSC A Wavetable Boundaries & Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext();
  });

  it('B02-1: Extreme wavetable slice indices (-99999 to +99999) are safely clamped to [0, 23]', () => {
    const sliceMin = getWavetableHarmonics(-99999);
    expect(sliceMin.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[0].imag[1], 4);

    const sliceMax = getWavetableHarmonics(99999);
    expect(sliceMax.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[23].imag[1], 4);
  });

  it('B02-2: Crossfade alpha parameters outside [0, 1] are clamped without energy deviation', () => {
    const underflow = equalPowerCrossfade(-1.5);
    expect(underflow.g1).toBeCloseTo(1.0, 5);
    expect(underflow.g2).toBeCloseTo(0.0, 5);

    const overflow = equalPowerCrossfade(2.5);
    expect(overflow.g1).toBeCloseTo(0.0, 5);
    expect(overflow.g2).toBeCloseTo(1.0, 5);
  });

  it('B02-3: Single harmonic profile normalizes to exact unit amplitude', () => {
    const def = WAVETABLE_DEFINITIONS[0]; // Pure Sinusoid [1.0]
    expect(def.imag[1]).toBeCloseTo(1.0, 5);
    for (let i = 2; i < def.imag.length; i++) {
      expect(def.imag[i]).toBe(0);
    }
  });

  it('B02-4: Oscillator extreme detune values (-153600 to +153600 cents) remain finite', () => {
    const osc = ctx.createOscillator();
    osc.detune.value = -153600;
    expect(osc.detune.value).toBe(-153600);

    osc.detune.value = 153600;
    expect(osc.detune.value).toBe(153600);
  });

  it('B02-5: All wavetable slice real coefficient arrays contain strictly 0.0 (odd harmonic sine waves)', () => {
    for (const slice of WAVETABLE_DEFINITIONS) {
      for (let i = 0; i < slice.real.length; i++) {
        expect(slice.real[i]).toBe(0);
      }
    }
  });
});
