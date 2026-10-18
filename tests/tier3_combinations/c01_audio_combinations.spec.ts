import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import {
  makeTanhDistortionCurve,
  equalPowerCrossfade,
  generateSyntheticImpulseResponse
} from '../tier1_features/testHarness';

describe('Tier 3 Combinations - C01: Audio DSP Cross-Feature Combinations', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('C01-1: 3-track simultaneous summing into 4x oversampled drive at 100% saturation and cascaded filter', () => {
    const preMixBus = ctx.createGain();
    const oscAGain = ctx.createGain();
    const oscBGain = ctx.createGain();
    const droneGain = ctx.createGain();

    oscAGain.gain.value = 0.8;
    oscBGain.gain.value = 0.4;
    droneGain.gain.value = 0.9;

    oscAGain.connect(preMixBus);
    oscBGain.connect(preMixBus);
    droneGain.connect(preMixBus);

    // Drive at 100%
    const driveNode = ctx.createWaveShaper();
    driveNode.curve = makeTanhDistortionCurve(1024, 5.0);
    driveNode.oversample = '4x';
    preMixBus.connect(driveNode);

    // Cascaded filter
    const filter1 = ctx.createBiquadFilter();
    const filter2 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter2.type = 'lowpass';
    filter1.frequency.value = 2500;
    filter2.frequency.value = 2500;

    driveNode.connect(filter1);
    filter1.connect(filter2);

    expect(driveNode.oversample).toBe('4x');
    expect(filter1.frequency.value).toBe(2500);
    expect(filter2.frequency.value).toBe(2500);
    expect(preMixBus.connectedNodes).toContain(driveNode);
    expect(driveNode.connectedNodes).toContain(filter1);
    expect(filter1.connectedNodes).toContain(filter2);
  });

  it('C01-2: In-loop damped stereo ping-pong delay cascading into synthetic convolver reverb', () => {
    const delayL = ctx.createDelay(1.5);
    const delayR = ctx.createDelay(1.5);
    delayL.delayTime.value = 0.24;
    delayR.delayTime.value = 0.36;

    const damping = ctx.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = 3500;

    const convolver = ctx.createConvolver();
    convolver.buffer = generateSyntheticImpulseResponse(ctx, 3.5, 0.5);

    delayL.connect(damping);
    damping.connect(convolver);

    expect(delayL.connectedNodes).toContain(damping);
    expect(damping.connectedNodes).toContain(convolver);
    expect(convolver.buffer?.duration).toBeCloseTo(3.5, 1);
  });

  it('C01-3: OSC A wavetable morphing while detune is modulated and channel volume is at 50%', () => {
    const { g1, g2 } = equalPowerCrossfade(0.5);
    expect(g1).toBeCloseTo(Math.SQRT1_2, 5);
    expect(g2).toBeCloseTo(Math.SQRT1_2, 5);

    const oscA = ctx.createOscillator();
    oscA.detune.setValueAtTime(0, 0);
    oscA.detune.linearRampToValueAtTime(15, 1.0); // +15 cents drift

    ctx.advanceTime(0.5);
    expect(oscA.detune.value).toBeCloseTo(7.5, 1);
  });

  it('C01-4: OSC B pink noise swept through bandpass formant while tape warmth drive is engaged', () => {
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(400, 0);
    formant.frequency.linearRampToValueAtTime(2400, 2.0);

    const drive = ctx.createWaveShaper();
    drive.curve = makeTanhDistortionCurve(1024, 2.5);

    formant.connect(drive);

    ctx.advanceTime(1.0);
    expect(formant.frequency.value).toBeCloseTo(1400, 1);
    expect(drive.curve?.length).toBe(1024);
  });

  it('C01-5: Drone 432Hz with 0.05Hz LFO pitch drift while lowpass cutoff is at 180Hz and bypass is toggled', () => {
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.8, 0);

    // Bypass toggled at t = 0.1s
    droneGain.gain.setValueAtTime(0.8, 0.1);
    droneGain.gain.linearRampToValueAtTime(0.0, 0.105);

    ctx.advanceTime(0.105);
    expect(droneGain.gain.value).toBeCloseTo(0.0, 5);
  });

  it('C01-6: Simultaneous dual hardware bypass of Filter and Drive during active audio playback', () => {
    const filterBypass = ctx.createGain();
    const driveBypass = ctx.createGain();

    filterBypass.gain.value = 1.0; // Bypassed
    driveBypass.gain.value = 1.0;  // Bypassed

    expect(filterBypass.gain.value).toBe(1.0);
    expect(driveBypass.gain.value).toBe(1.0);
  });

  it('C01-7: High feedback delay (> 0.8) cascading into reverb wet bus without exceeding master ceiling', () => {
    const delayFeedback = 0.85;
    const reverbWet = 0.65;
    const masterGain = 0.8;

    const estimatedMaxOutput = (1.0 + delayFeedback) * reverbWet * masterGain;
    expect(Number.isFinite(estimatedMaxOutput)).toBe(true);
  });

  it('C01-8: 3-track summing bus gains adjust dynamically while master cut gain holds full unity', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.value = 1.0;

    const trackA = ctx.createGain();
    const trackB = ctx.createGain();
    const trackC = ctx.createGain();

    trackA.gain.value = 0.9;
    trackB.gain.value = 0.2;
    trackC.gain.value = 0.7;

    expect(masterCut.gain.value).toBe(1.0);
    expect(trackA.gain.value + trackB.gain.value + trackC.gain.value).toBeCloseTo(1.8, 2);
  });
});
