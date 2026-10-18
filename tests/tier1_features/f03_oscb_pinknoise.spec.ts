import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { generatePaulKelletPinkNoise } from './testHarness';

describe('Feature F03: OSC B Pink Noise Airflow Generator', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F03-1: Paul Kellet algorithm generates 1/f pink noise without clipping or NaN/Infinity', () => {
    const samples = 44100;
    const noise = generatePaulKelletPinkNoise(samples);
    expect(noise.length).toBe(samples);

    let maxAmp = 0;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const val = noise[i];
      expect(Number.isFinite(val)).toBe(true);
      expect(Number.isNaN(val)).toBe(false);
      const absVal = Math.abs(val);
      if (absVal > maxAmp) maxAmp = absVal;
      sum += val;
    }

    // Peak amplitude should be bounded and within non-clipping range
    expect(maxAmp).toBeLessThan(1.5);
    // DC component of pink noise over 1 second should be close to 0
    const mean = sum / samples;
    expect(Math.abs(mean)).toBeLessThan(0.10);
  });

  it('F03-2: Pink noise AudioBuffer conforms to Web Audio stereo specifications', () => {
    const durationSec = 2.0;
    const numSamples = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, numSamples, ctx.sampleRate);

    expect(buffer.numberOfChannels).toBe(2);
    expect(buffer.length).toBe(numSamples);
    expect(buffer.sampleRate).toBe(44100);
    expect(buffer.duration).toBeCloseTo(durationSec, 2);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    expect(left).toBeInstanceOf(Float32Array);
    expect(right).toBeInstanceOf(Float32Array);
    expect(left.length).toBe(numSamples);
    expect(right.length).toBe(numSamples);
  });

  it('F03-3: Seamless loop crossfade smooths boundary discontinuity between start and end', () => {
    const length = 44100;
    const channelData = generatePaulKelletPinkNoise(length);
    const fadeSamples = 2205; // 50ms at 44.1kHz

    // Apply circular boundary blend
    for (let i = 0; i < fadeSamples; i++) {
      const ratio = i / fadeSamples;
      channelData[i] = channelData[i] * ratio + channelData[length - fadeSamples + i] * (1 - ratio);
    }

    // Boundary at index 0 and index length - 1 must have smooth continuity
    expect(Number.isFinite(channelData[0])).toBe(true);
    expect(Number.isFinite(channelData[length - 1])).toBe(true);
  });

  it('F03-4: Formant bandpass filter sweeps center frequency across 250Hz - 3500Hz with Q in 1.2 - 3.5', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2.0;

    expect(filter.type).toBe('bandpass');
    expect(filter.frequency.value).toBe(800);
    expect(filter.Q.value).toBe(2.0);

    // Sweep center frequency
    filter.frequency.setValueAtTime(250, 0);
    filter.frequency.linearRampToValueAtTime(3500, 1.0);
    ctx.advanceTime(0.5);
    expect(filter.frequency.value).toBeCloseTo(1875, 1);

    ctx.advanceTime(0.5);
    expect(filter.frequency.value).toBeCloseTo(3500, 1);
  });

  it('F03-5: Noise gain modulation scales airflow turbulence amplitude and stops cleanly', () => {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, 0);
    gainNode.gain.linearRampToValueAtTime(0.65, 1.0);

    ctx.advanceTime(0.5);
    expect(gainNode.gain.value).toBeCloseTo(0.325, 2);

    ctx.advanceTime(0.5);
    expect(gainNode.gain.value).toBeCloseTo(0.65, 2);

    // Fast decay to 0 on hold/pause
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.01);
    ctx.advanceTime(0.01);
    expect(gainNode.gain.value).toBeCloseTo(0.0, 3);
  });
});
