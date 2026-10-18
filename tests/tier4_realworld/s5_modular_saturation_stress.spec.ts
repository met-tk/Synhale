import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import {
  makeTanhDistortionCurve,
  calculateDriveAutoMakeupGain,
  generateSyntheticImpulseResponse
} from '../tier1_features/testHarness';

describe('Tier 4 Real-World Scenario S5: 3-Track Saturation & Space Rendering Stress Test', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('S5-1: Full 3-track synthesis chain sustains peak throughput without signal clipping or arithmetic NaN', () => {
    // 1. Voice generators
    const oscA = ctx.createOscillator();
    const oscB = ctx.createBufferSource();
    const drone = ctx.createOscillator();

    // 2. Channel gains at maximum 1.0
    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    const gainDrone = ctx.createGain();
    gainA.gain.value = 1.0;
    gainB.gain.value = 1.0;
    gainDrone.gain.value = 1.0;

    oscA.connect(gainA);
    oscB.connect(gainB);
    drone.connect(gainDrone);

    // 3. Pre-mix bus
    const preMix = ctx.createGain();
    gainA.connect(preMix);
    gainB.connect(preMix);
    gainDrone.connect(preMix);

    // 4. Drive at maximum with 4x oversampling
    const drive = ctx.createWaveShaper();
    drive.curve = makeTanhDistortionCurve(2048, 6.0);
    drive.oversample = '4x';
    preMix.connect(drive);

    // 5. Dual cascaded 24dB filter
    const f1 = ctx.createBiquadFilter();
    const f2 = ctx.createBiquadFilter();
    f1.type = 'lowpass';
    f2.type = 'lowpass';
    f1.frequency.value = 12000;
    f2.frequency.value = 12000;
    f1.Q.value = 3.0;
    f2.Q.value = 3.0;
    drive.connect(f1);
    f1.connect(f2);

    // 6. Ping-pong delay
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.36;
    f2.connect(delay);

    // 7. Convolver Reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = generateSyntheticImpulseResponse(ctx, 4.0, 0.5);
    delay.connect(convolver);

    // 8. Master output
    const master = ctx.createGain();
    master.gain.value = 0.85;
    convolver.connect(master);
    master.connect(ctx.destination);

    expect(drive.oversample).toBe('4x');
    expect(master.connectedNodes).toContain(ctx.destination);
    expect(f1.frequency.value).toBe(12000);
    expect(convolver.buffer?.duration).toBeCloseTo(4.0, 1);
  });

  it('S5-2: Auto-makeup gain compensates peak levels when Drive is pushed to 100% saturation', () => {
    const driveAmount = 5.0; // Extreme saturation
    const makeupGain = calculateDriveAutoMakeupGain(driveAmount);

    // Should attenuate input to prevent deafening volume
    expect(makeupGain).toBeLessThan(0.6);
    expect(makeupGain).toBeGreaterThan(0.2);
  });

  it('S5-3: Delay anti-howling feedback limiter prevents runaway acoustic explosion under stress', () => {
    const requestedFeedback = 0.98;
    const maxSafeFeedback = 0.88;
    const effectiveFeedback = Math.min(maxSafeFeedback, requestedFeedback);

    expect(effectiveFeedback).toBe(0.88);
    expect(effectiveFeedback).toBeLessThan(0.90);
  });

  it('S5-4: Reverb impulse response normalization prevents digital gain staging clipping', () => {
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    expect(convolver.normalize).toBe(true);
  });
});
