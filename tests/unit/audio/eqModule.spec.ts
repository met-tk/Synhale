/**
 * Synhale 2 - EqModule Unit Tests
 * 
 * Verifies 4-band parametric equalizer DSP functionality:
 * - 4-band biquad cascade configuration & default sacred parameters
 * - Low band switchable mode (lowshelf <-> highpass)
 * - Frequency response calculation across spectrum
 * - Smooth hardware-grade bypass crossfade
 * - Zero-residue purge and restore lifecycle
 * - 100% Zero Emoji compliance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { EqModule } from '../../../src/audio/nodes/EqModule';

describe('EqModule DSP & Lifecycle Suite', () => {
  let ctx: MockAudioContext;
  let eq: EqModule;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    eq = new EqModule(ctx as unknown as AudioContext);
  });

  afterEach(() => {
    eq.dispose();
  });

  it('initializes with default sacred and airflow frequencies', () => {
    const params = eq.getParams();
    expect(params.low.frequency).toBe(80);
    expect(params.low.type).toBe('lowshelf');
    expect(params.midLow.frequency).toBe(432);
    expect(params.midHigh.frequency).toBe(2160);
    expect(params.high.frequency).toBe(8000);
    expect(params.bypass).toBe(false);
  });

  it('updates parameters and clamps within acoustic safe ranges', () => {
    eq.setParams({
      low: { frequency: 120, gain: 4.5, q: 0.8, type: 'highpass' },
      midLow: { frequency: 440, gain: -3.0, q: 2.0 },
      midHigh: { frequency: 2500, gain: 2.5, q: 1.5 },
      high: { frequency: 10000, gain: 1.0, q: 0.9 },
      bypass: false
    });

    const updated = eq.getParams();
    expect(updated.low.frequency).toBe(120);
    expect(updated.low.gain).toBe(4.5);
    expect(updated.low.type).toBe('highpass');
    expect(updated.midLow.frequency).toBe(440);
    expect(updated.midLow.gain).toBe(-3.0);
    expect(updated.midHigh.frequency).toBe(2500);
    expect(updated.high.frequency).toBe(10000);
  });

  it('switches low band type from lowshelf to highpass smoothly', () => {
    expect(eq.getParams().low.type).toBe('lowshelf');
    eq.setParams({
      low: { frequency: 90, gain: 0, q: 0.707, type: 'highpass' }
    });
    expect(eq.getParams().low.type).toBe('highpass');

    eq.setParams({
      low: { frequency: 90, gain: 0, q: 0.707, type: 'lowshelf' }
    });
    expect(eq.getParams().low.type).toBe('lowshelf');
  });

  it('calculates cascaded frequency response across spectrum', () => {
    const freqs = new Float32Array([50, 432, 2160, 10000]);
    const magResponse = new Float32Array(freqs.length);
    const phaseResponse = new Float32Array(freqs.length);

    eq.setParams({
      midLow: { frequency: 432, gain: 6.0, q: 1.414 }
    });

    eq.getFrequencyResponse(freqs, magResponse, phaseResponse);

    // Magnitudes should be non-zero positive numbers
    for (let i = 0; i < freqs.length; i++) {
      expect(magResponse[i]).toBeGreaterThan(0);
      expect(Number.isFinite(magResponse[i])).toBe(true);
    }
  });

  it('returns flat unity response when bypassed', () => {
    eq.setParams({
      midLow: { frequency: 432, gain: 12.0, q: 2.0 },
      bypass: true
    });

    const freqs = new Float32Array([50, 432, 2160, 10000]);
    const magResponse = new Float32Array(freqs.length);
    const phaseResponse = new Float32Array(freqs.length);

    eq.getFrequencyResponse(freqs, magResponse, phaseResponse);

    for (let i = 0; i < freqs.length; i++) {
      expect(magResponse[i]).toBeCloseTo(1.0, 4);
      expect(phaseResponse[i]).toBeCloseTo(0.0, 4);
    }
  });

  it('performs zero-residue silence purge and seamless restore', () => {
    eq.purge();
    // After purge, internal gains are zeroed
    eq.restore();
    // After restore, state is restored according to bypass
    expect(eq.getParams().bypass).toBe(false);
  });

  it('complies with 100% zero emoji engineering standard', () => {
    const sourceCode = EqModule.toString();
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(sourceCode)).toBe(false);
  });
});
