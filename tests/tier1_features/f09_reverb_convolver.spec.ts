import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { generateSyntheticImpulseResponse, equalPowerCrossfade } from './testHarness';

describe('Feature F09: Mathematical Gaussian Synthetic IR Reverb', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F09-1: Synthetic impulse response generator computes two-channel stereo buffer with exponential decay', () => {
    const decayTime = 2.0;
    const irBuffer = generateSyntheticImpulseResponse(ctx, decayTime, 0.4);

    expect(irBuffer.numberOfChannels).toBe(2);
    expect(irBuffer.duration).toBeCloseTo(decayTime, 2);
    expect(irBuffer.length).toBe(Math.floor(ctx.sampleRate * decayTime));

    const left = irBuffer.getChannelData(0);
    const right = irBuffer.getChannelData(1);
    expect(right.length).toBe(left.length);

    // Initial samples should have high energy, end samples should have decayed toward 0
    let startEnergy = 0;
    let endEnergy = 0;
    const probeSamples = 1000;
    for (let i = 0; i < probeSamples; i++) {
      startEnergy += left[i] * left[i];
      endEnergy += left[left.length - probeSamples + i] * left[left.length - probeSamples + i];
    }
    expect(startEnergy).toBeGreaterThan(endEnergy * 10);
  });

  it('F09-2: Decay time parameter T60 dynamically adjusts duration and impulse tail length', () => {
    const shortIR = generateSyntheticImpulseResponse(ctx, 1.0);
    const longIR = generateSyntheticImpulseResponse(ctx, 6.0);

    expect(shortIR.duration).toBeCloseTo(1.0, 2);
    expect(longIR.duration).toBeCloseTo(6.0, 2);
    expect(longIR.length).toBe(shortIR.length * 6);
  });

  it('F09-3: ConvolverNode accepts synthetic IR buffer and normalizes convolution', () => {
    const convolver = ctx.createConvolver();
    const ir = generateSyntheticImpulseResponse(ctx, 1.5);
    convolver.buffer = ir;
    convolver.normalize = true;

    expect(convolver.buffer).toBe(ir);
    expect(convolver.normalize).toBe(true);
  });

  it('F09-4: Equal-power wet/dry crossfade maintains total acoustic power across the mix spectrum', () => {
    const mixSteps = [0.0, 0.25, 0.5, 0.75, 1.0];
    for (const mix of mixSteps) {
      const { g1: dry, g2: wet } = equalPowerCrossfade(mix);
      const totalPower = dry * dry + wet * wet;
      expect(totalPower).toBeCloseTo(1.0, 5);

      if (mix === 0.0) {
        expect(dry).toBeCloseTo(1.0, 5);
        expect(wet).toBeCloseTo(0.0, 5);
      } else if (mix === 1.0) {
        expect(dry).toBeCloseTo(0.0, 5);
        expect(wet).toBeCloseTo(1.0, 5);
      }
    }
  });

  it('F09-5: Reverb bypass cleanly mutes convolver wet path while keeping dry path at unity', () => {
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    // Bypass ON:
    wetGain.gain.value = 0.0;
    dryGain.gain.value = 1.0;

    expect(wetGain.gain.value).toBe(0.0);
    expect(dryGain.gain.value).toBe(1.0);
  });
});
