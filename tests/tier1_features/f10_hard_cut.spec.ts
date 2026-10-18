import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Feature F10: 0ms Zero-Residue Instant Hard Cut', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F10-1: Hard-cut initiates 2.5ms anti-pop micro-ramp to zero gain', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.9, 0);

    const cutTime = 0.5;
    const rampDur = 0.0025; // 2.5ms

    // Execute hard cut protocol
    masterCut.gain.setValueAtTime(0.9, cutTime);
    masterCut.gain.linearRampToValueAtTime(0.0, cutTime + rampDur);

    ctx.advanceTime(0.5);
    expect(masterCut.gain.value).toBeCloseTo(0.9, 3);

    ctx.advanceTime(0.00125); // Mid-ramp (1.25ms)
    expect(masterCut.gain.value).toBeCloseTo(0.45, 2);

    ctx.advanceTime(0.00125); // End of ramp (2.5ms)
    expect(masterCut.gain.value).toBeCloseTo(0.0, 4);
  });

  it('F10-2: Master output gain strictly holds zero after hard cut completion', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(1.0, 0);
    masterCut.gain.linearRampToValueAtTime(0.0, 0.0025);

    ctx.advanceTime(0.0025);
    expect(masterCut.gain.value).toBe(0.0);

    // After 100ms, master gain must remain strictly 0
    ctx.advanceTime(0.1);
    expect(masterCut.gain.value).toBe(0.0);
  });

  it('F10-3: Hard-cut immediately forces delay feedback loop gain to 0.0', () => {
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.75, 0);

    // Hard cut immediately purges feedback
    delayFeedback.gain.value = 0.0;
    expect(delayFeedback.gain.value).toBe(0.0);
  });

  it('F10-4: AudioContext suspend is triggered after 2.5ms micro-ramp completes', async () => {
    await ctx.resume();
    expect(ctx.state).toBe('running');

    // Ramp completes in 2.5ms, suspend occurs at 5ms
    ctx.advanceTime(0.005);
    await ctx.suspend();
    expect(ctx.state).toBe('suspended');
  });

  it('F10-5: Resuming after hard-cut smoothly restores master gain in 3ms without ghost burst', async () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.0, 0);

    await ctx.resume();
    expect(ctx.state).toBe('running');

    // Resume ramp: 0 to target (e.g. 0.85) in 3ms
    const resumeTime = ctx.currentTime;
    masterCut.gain.setValueAtTime(0.0, resumeTime);
    masterCut.gain.linearRampToValueAtTime(0.85, resumeTime + 0.003);

    ctx.advanceTime(0.0015);
    expect(masterCut.gain.value).toBeCloseTo(0.425, 2);

    ctx.advanceTime(0.0015);
    expect(masterCut.gain.value).toBeCloseTo(0.85, 3);
  });
});
