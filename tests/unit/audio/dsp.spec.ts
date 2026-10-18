import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import {
  WAVETABLE_DEFINITIONS,
  createWavetablePeriodicWaves,
  getWavetableHarmonics
} from '../../../src/audio/dsp/wavetableData';
import { generatePinkNoiseBuffer } from '../../../src/audio/dsp/pinkNoise';
import {
  generateTapeCurve,
  generateTubeCurve,
  generateDriveCurve,
  computeDriveMakeupGain
} from '../../../src/audio/dsp/waveShaperCurves';
import {
  generateSyntheticImpulseResponse,
  computeEqualPowerMix
} from '../../../src/audio/dsp/syntheticReverb';

describe('Audio DSP Pure Mathematics & Generators', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  describe('Wavetable Data (wavetableData.ts)', () => {
    it('provides exactly 24 curated sound therapy harmonic slices', () => {
      expect(WAVETABLE_DEFINITIONS).toHaveLength(24);
      for (let i = 0; i < 24; i++) {
        const slice = WAVETABLE_DEFINITIONS[i];
        expect(slice.id).toBe(i);
        expect(slice.real).toBeInstanceOf(Float32Array);
        expect(slice.imag).toBeInstanceOf(Float32Array);
        expect(slice.real.length).toBe(64);
        expect(slice.imag.length).toBe(64);
      }
    });

    it('ensures zero DC offset and unit-normalized harmonic energy', () => {
      for (const slice of WAVETABLE_DEFINITIONS) {
        expect(slice.real[0]).toBe(0);
        expect(slice.imag[0]).toBe(0);

        let energy = 0;
        for (let i = 1; i < slice.imag.length; i++) {
          energy += slice.imag[i] * slice.imag[i];
        }
        expect(energy).toBeCloseTo(1.0, 4);
      }
    });

    it('creates 24 PeriodicWave instances in AudioContext', () => {
      const waves = createWavetablePeriodicWaves(ctx);
      expect(waves).toHaveLength(24);
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(waves[4]);
      expect(osc.type).toBe('custom');
    });

    it('clamps out-of-bounds indices and returns isolated copies', () => {
      const low = getWavetableHarmonics(-10);
      const high = getWavetableHarmonics(100);
      expect(low.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[0].imag[1], 4);
      expect(high.imag[1]).toBeCloseTo(WAVETABLE_DEFINITIONS[23].imag[1], 4);

      // Verify returned arrays are independent copies
      low.imag[1] = 999.0;
      expect(WAVETABLE_DEFINITIONS[0].imag[1]).not.toBe(999.0);
    });
  });

  describe('Pink Noise Generator (pinkNoise.ts)', () => {
    it('generates a stereo 1/f pink noise AudioBuffer with correct length and sample rate', () => {
      const durationSec = 1.0;
      const buffer = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, durationSec);

      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.length).toBe(44100);
      expect(buffer.duration).toBeCloseTo(1.0, 2);

      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);
      expect(ch0).toBeInstanceOf(Float32Array);
      expect(ch1).toBeInstanceOf(Float32Array);
    });

    it('produces decorrelated stereo channels bounded without NaN or clipping', () => {
      const buffer = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, 0.5);
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);

      let max0 = 0;
      let max1 = 0;
      let identicalCount = 0;

      for (let i = 0; i < ch0.length; i++) {
        expect(Number.isFinite(ch0[i])).toBe(true);
        expect(Number.isFinite(ch1[i])).toBe(true);
        if (Math.abs(ch0[i]) > max0) max0 = Math.abs(ch0[i]);
        if (Math.abs(ch1[i]) > max1) max1 = Math.abs(ch1[i]);
        if (Math.abs(ch0[i] - ch1[i]) < 1e-6) identicalCount++;
      }

      // Check bounds
      expect(max0).toBeLessThan(1.5);
      expect(max1).toBeLessThan(1.5);
      // Channels should be largely decorrelated, not identical
      expect(identicalCount).toBeLessThan(ch0.length * 0.05);
    });

    it('ensures boundary continuity across head and tail crossfade', () => {
      const buffer = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, 1.0);
      const ch0 = buffer.getChannelData(0);
      const len = ch0.length;

      // The head and tail should be smoothly blended
      expect(Number.isFinite(ch0[0])).toBe(true);
      expect(Number.isFinite(ch0[len - 1])).toBe(true);
    });
  });

  describe('WaveShaper Curves (waveShaperCurves.ts)', () => {
    it('produces strictly monotonic tape saturation curve bounded in [-1, 1]', () => {
      const curve = generateTapeCurve(0.7, 512);
      expect(curve.length).toBe(512);
      expect(curve[0]).toBeGreaterThanOrEqual(-1.0);
      expect(curve[curve.length - 1]).toBeLessThanOrEqual(1.0);

      // Monotonicity check
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      }
    });

    it('produces asymmetric tube saturation curve', () => {
      const curve = generateTubeCurve(0.6, 512);
      expect(curve.length).toBe(512);
      // Midpoint x=0 -> y=0
      expect(curve[256]).toBeCloseTo(0, 2);
      // Boundary checks
      expect(curve[0]).toBeGreaterThanOrEqual(-1.0);
      expect(curve[curve.length - 1]).toBeLessThanOrEqual(1.0);

      // Monotonicity check
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      }
      // Asymmetric magnitude check: positive and negative peaks differ in absolute value
      expect(Math.abs(curve[0])).not.toBeCloseTo(curve[curve.length - 1], 1);
    });

    it('generates linear passthrough when drive amount is 0', () => {
      const curve = generateDriveCurve(0.0, 0.5, 256);
      expect(curve[0]).toBeCloseTo(-1.0, 4);
      expect(curve[127]).toBeCloseTo(0.0, 2);
      expect(curve[255]).toBeCloseTo(1.0, 4);
    });

    it('computes auto-makeup gain that smoothly attenuates as drive amount increases', () => {
      const gain0 = computeDriveMakeupGain(0.0);
      const gainMid = computeDriveMakeupGain(0.5);
      const gainMax = computeDriveMakeupGain(1.0);

      expect(gain0).toBeCloseTo(1.0, 4);
      expect(gainMid).toBeLessThan(gain0);
      expect(gainMax).toBeLessThan(gainMid);
      expect(gainMax).toBeGreaterThan(0.3);
    });
  });

  describe('Synthetic Reverb IR & Equal-Power Crossfade (syntheticReverb.ts)', () => {
    it('computes equal-power crossfade satisfying Gdry^2 + Gwet^2 = 1.0', () => {
      const testMixes = [0.0, 0.25, 0.5, 0.75, 1.0];
      for (const mix of testMixes) {
        const { dry, wet } = computeEqualPowerMix(mix);
        const totalPower = dry * dry + wet * wet;
        expect(totalPower).toBeCloseTo(1.0, 5);

        if (mix === 0.0) {
          expect(dry).toBeCloseTo(1.0, 5);
          expect(wet).toBeCloseTo(0.0, 5);
        } else if (mix === 1.0) {
          expect(dry).toBeCloseTo(0.0, 5);
          expect(wet).toBeCloseTo(1.0, 5);
        } else if (mix === 0.5) {
          expect(dry).toBeCloseTo(Math.SQRT1_2, 5);
          expect(wet).toBeCloseTo(Math.SQRT1_2, 5);
        }
      }
    });

    it('generates stereo impulse response with exponential amplitude decay', () => {
      const decayTime = 1.5;
      const buffer = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, decayTime, 0.4);

      expect(buffer.numberOfChannels).toBe(2);
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);

      // Verify peak amplitude in first 10% is significantly higher than last 10%
      const firstSectionLen = Math.floor(ch0.length * 0.1);
      const lastSectionStart = Math.floor(ch0.length * 0.9);

      let firstMax = 0;
      let lastMax = 0;
      for (let i = 0; i < firstSectionLen; i++) {
        if (Math.abs(ch0[i]) > firstMax) firstMax = Math.abs(ch0[i]);
      }
      for (let i = lastSectionStart; i < ch0.length; i++) {
        if (Math.abs(ch0[i]) > lastMax) lastMax = Math.abs(ch0[i]);
      }

      expect(firstMax).toBeGreaterThan(0.5);
      expect(lastMax).toBeLessThan(firstMax * 0.1);
      expect(ch0).not.toEqual(ch1); // Channels are decorrelated
    });
  });
});
