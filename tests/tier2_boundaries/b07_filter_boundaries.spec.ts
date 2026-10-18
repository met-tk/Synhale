import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B07: Cascaded Multimode Filter Boundaries', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B07-1: Filter cutoff at lowest audio boundary 20Hz evaluates valid non-zero response', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20;

    const freqs = new Float32Array([10, 20, 100]);
    const mag = new Float32Array(3);
    const phase = new Float32Array(3);
    filter.getFrequencyResponse(freqs, mag, phase);

    expect(Number.isFinite(mag[0])).toBe(true);
    expect(Number.isFinite(mag[1])).toBe(true);
    expect(mag[2]).toBeLessThan(mag[0]);
  });

  it('B07-2: Filter cutoff at Nyquist boundary 20000Hz evaluates without arithmetic overflow', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20000;

    const freqs = new Float32Array([1000, 10000, 20000]);
    const mag = new Float32Array(3);
    const phase = new Float32Array(3);
    filter.getFrequencyResponse(freqs, mag, phase);

    expect(Number.isFinite(mag[2])).toBe(true);
    expect(mag[0]).toBeGreaterThan(0.9);
  });

  it('B07-3: Ultra-low resonance Q = 0.0001 produces flat, critically damped response without oscillation', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.0001;

    const freqs = new Float32Array([1000]);
    const mag = new Float32Array(1);
    const phase = new Float32Array(1);
    filter.getFrequencyResponse(freqs, mag, phase);

    // No resonant peak
    expect(mag[0]).toBeLessThanOrEqual(1.0);
  });

  it('B07-4: Maximum resonance Q = 18.0 remains numerically stable without generating NaN', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 18.0;

    const freqs = new Float32Array([1000]);
    const mag = new Float32Array(1);
    const phase = new Float32Array(1);
    filter.getFrequencyResponse(freqs, mag, phase);

    expect(Number.isFinite(mag[0])).toBe(true);
    expect(Number.isNaN(mag[0])).toBe(false);
  });

  it('B07-5: Near-zero time constant (tau = 0.0001s) in setTargetAtTime handles near-instant cutoff jump', () => {
    const filter = ctx.createBiquadFilter();
    filter.frequency.setValueAtTime(200, 0);
    filter.frequency.setTargetAtTime(8000, 0, 0.0001);

    ctx.advanceTime(0.001); // 10 time constants
    expect(filter.frequency.value).toBeGreaterThan(7990);
  });
});
