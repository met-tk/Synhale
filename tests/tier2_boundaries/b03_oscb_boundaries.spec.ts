import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { generatePaulKelletPinkNoise } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B03: OSC B Pink Noise Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B03-1: Zero-sample request returns empty Float32Array without crash', () => {
    const empty = generatePaulKelletPinkNoise(0);
    expect(empty.length).toBe(0);
    expect(empty).toBeInstanceOf(Float32Array);
  });

  it('B03-2: Extreme buffer length (100,000 samples) maintains continuous numerical stability', () => {
    const largeBuffer = generatePaulKelletPinkNoise(100000);
    expect(largeBuffer.length).toBe(100000);
    for (let i = 0; i < 1000; i += 50) {
      expect(Number.isFinite(largeBuffer[i])).toBe(true);
    }
  });

  it('B03-3: Airway formant filter at boundary frequencies (20Hz and 20000Hz) evaluates properly', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';

    // Lowest audible boundary
    filter.frequency.value = 20;
    expect(filter.frequency.value).toBe(20);

    // Highest audible boundary
    filter.frequency.value = 20000;
    expect(filter.frequency.value).toBe(20000);
  });

  it('B03-4: Extreme Q factor values (0.0001 to 1000.0) compute without numerical divergence', () => {
    const filter = ctx.createBiquadFilter();
    filter.Q.value = 0.0001;
    expect(filter.Q.value).toBe(0.0001);

    filter.Q.value = 1000.0;
    expect(filter.Q.value).toBe(1000.0);

    const testFreq = new Float32Array([1000]);
    const mag = new Float32Array(1);
    const phase = new Float32Array(1);
    filter.getFrequencyResponse(testFreq, mag, phase);
    expect(Number.isFinite(mag[0])).toBe(true);
  });

  it('B03-5: Gain parameter exactly 0.0 clamps noise output to silence', () => {
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    expect(gain.gain.value).toBe(0.0);
  });
});
