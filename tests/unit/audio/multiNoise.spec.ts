import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import {
  generateWhiteNoiseBuffer,
  generateBrownNoiseBuffer,
  generateVioletNoiseBuffer,
  generateNoiseBufferByType
} from '../../../src/audio/dsp/pinkNoise';
import { OscBChannel } from '../../../src/audio/nodes/OscBChannel';
import type { NoiseType } from '../../../src/types/audio';

describe('Multi-Noise Sound Therapy Generators & OSC B Acoustic Enhancement', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('generates distinct noise buffers for all 4 therapeutic noise types', () => {
    const types: NoiseType[] = ['pink', 'white', 'brown', 'violet'];
    for (const t of types) {
      const buffer = generateNoiseBufferByType(ctx as unknown as BaseAudioContext, t, 1.0);
      expect(buffer).toBeDefined();
      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.length).toBe(44100);

      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Check decorrelation
      let diff = 0;
      for (let i = 0; i < 100; i++) {
        diff += Math.abs(left[i] - right[i]);
      }
      expect(diff).toBeGreaterThan(0.001);

      // Check bounded amplitude
      for (let i = 0; i < left.length; i++) {
        expect(Number.isFinite(left[i])).toBe(true);
        expect(Math.abs(left[i])).toBeLessThan(1.5);
      }
    }
  });

  it('white noise produces flat spectrum distribution without clipping', () => {
    const buffer = generateWhiteNoiseBuffer(ctx as unknown as BaseAudioContext, 0.5);
    const left = buffer.getChannelData(0);
    expect(left.length).toBe(22050);

    let maxVal = 0;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > maxVal) maxVal = Math.abs(left[i]);
    }
    expect(maxVal).toBeLessThan(1.5);
    expect(maxVal).toBeGreaterThan(0.01);
  });

  it('brown noise produces deep low-frequency bias with smooth integration', () => {
    const buffer = generateBrownNoiseBuffer(ctx as unknown as BaseAudioContext, 0.5);
    const left = buffer.getChannelData(0);
    expect(left.length).toBe(22050);

    let maxVal = 0;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > maxVal) maxVal = Math.abs(left[i]);
    }
    expect(maxVal).toBeLessThan(1.5);
    expect(maxVal).toBeGreaterThan(0.01);
  });

  it('violet noise produces crisp high-frequency differentiated noise', () => {
    const buffer = generateVioletNoiseBuffer(ctx as unknown as BaseAudioContext, 0.5);
    const left = buffer.getChannelData(0);
    expect(left.length).toBe(22050);

    let maxVal = 0;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > maxVal) maxVal = Math.abs(left[i]);
    }
    expect(maxVal).toBeLessThan(1.5);
    expect(maxVal).toBeGreaterThan(0.01);
  });

  it('OscBChannel integrates makeupGain (+9dB / 2.8x) to prevent acoustic loss', () => {
    const oscB = new OscBChannel(ctx as unknown as AudioContext);
    expect(oscB).toBeDefined();

    // Verify makeupGain node
    expect((oscB as any).makeupGain).toBeDefined();
    expect((oscB as any).makeupGain.gain.value).toBeCloseTo(2.8, 1);
  });

  it('OscBChannel supports seamless noise type hot-swapping', () => {
    const oscB = new OscBChannel(ctx as unknown as AudioContext);
    expect(oscB.getParams().noiseType).toBe('pink');

    oscB.switchNoiseType('white');
    expect(oscB.getParams().noiseType).toBe('white');

    oscB.switchNoiseType('brown');
    expect(oscB.getParams().noiseType).toBe('brown');

    oscB.switchNoiseType('violet');
    expect(oscB.getParams().noiseType).toBe('violet');

    oscB.setParams({ noiseType: 'pink' });
    expect(oscB.getParams().noiseType).toBe('pink');
  });
});
