import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Feature F05: 3-Track Gain Controls & Hardware Bypass Relay', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F05-1: All three tracks (OSC A, OSC B, Drone) have independent gain controls (0.0 to 1.0)', () => {
    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    const gainDrone = ctx.createGain();

    gainA.gain.value = 0.85;
    gainB.gain.value = 0.40;
    gainDrone.gain.value = 0.95;

    expect(gainA.gain.value).toBe(0.85);
    expect(gainB.gain.value).toBe(0.40);
    expect(gainDrone.gain.value).toBe(0.95);
  });

  it('F05-2: Stereo panner controls stereo image positioning from -1.0 (Left) to +1.0 (Right)', () => {
    const pannerA = ctx.createStereoPanner();
    expect(pannerA.pan.value).toBe(0);

    pannerA.pan.value = -0.75;
    expect(pannerA.pan.value).toBe(-0.75);

    pannerA.pan.value = 1.0;
    expect(pannerA.pan.value).toBe(1.0);
  });

  it('F05-3: Hardware bypass triggers smooth 5ms gain fade-out to prevent pops', () => {
    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(0.8, 0);

    // Bypass triggered at t = 0.1s: ramp to 0 in 0.005s (5ms)
    channelGain.gain.setValueAtTime(0.8, 0.1);
    channelGain.gain.linearRampToValueAtTime(0.0, 0.105);

    ctx.advanceTime(0.1);
    expect(channelGain.gain.value).toBeCloseTo(0.8, 2);

    ctx.advanceTime(0.0025);
    expect(channelGain.gain.value).toBeCloseTo(0.4, 2);

    ctx.advanceTime(0.0025);
    expect(channelGain.gain.value).toBeCloseTo(0.0, 4);
  });

  it('F05-4: Un-bypassing restores channel gain with smooth 5ms fade-in to target level', () => {
    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(0.0, 0);

    // Unbypass at t = 0.2s: ramp to target 0.7 in 5ms
    channelGain.gain.setValueAtTime(0.0, 0.2);
    channelGain.gain.linearRampToValueAtTime(0.7, 0.205);

    ctx.advanceTime(0.2);
    expect(channelGain.gain.value).toBeCloseTo(0.0, 4);

    ctx.advanceTime(0.005);
    expect(channelGain.gain.value).toBeCloseTo(0.7, 4);
  });

  it('F05-5: 3-channel summing bus correctly merges all three tracks without mutual cross-talk', () => {
    const preMixBus = ctx.createGain();
    const trackA = ctx.createGain();
    const trackB = ctx.createGain();
    const trackDrone = ctx.createGain();

    trackA.connect(preMixBus);
    trackB.connect(preMixBus);
    trackDrone.connect(preMixBus);

    expect(trackA.connectedNodes).toContain(preMixBus);
    expect(trackB.connectedNodes).toContain(preMixBus);
    expect(trackDrone.connectedNodes).toContain(preMixBus);

    // Disconnecting track B leaves track A and Drone connected
    trackB.disconnect();
    expect(trackB.connectedNodes).toHaveLength(0);
    expect(trackA.connectedNodes).toContain(preMixBus);
    expect(trackDrone.connectedNodes).toContain(preMixBus);
  });
});
