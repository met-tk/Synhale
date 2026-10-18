import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B10: 0ms Hard Cut Timing & State Boundaries', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B10-1: Executing hard cut when already at 0.0 gain executes safely without NaN or inversion', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.0, 0);

    // Call hard cut
    masterCut.gain.setValueAtTime(0.0, ctx.currentTime);
    masterCut.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.0025);

    ctx.advanceTime(0.0025);
    expect(masterCut.gain.value).toBe(0.0);
    expect(Number.isNaN(masterCut.gain.value)).toBe(false);
  });

  it('B10-2: Hard cut micro-ramp completes strictly within 2.5ms window', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(1.0, 0);
    masterCut.gain.linearRampToValueAtTime(0.0, 0.0025);

    ctx.advanceTime(0.0024);
    expect(masterCut.gain.value).toBeGreaterThan(0.0);

    ctx.advanceTime(0.0001); // Reaches 2.5ms
    expect(masterCut.gain.value).toBeCloseTo(0.0, 5);
  });

  it('B10-3: Consecutive hard cut calls in rapid succession (double-tap) are idempotent', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(1.0, 0);

    // First hard cut
    masterCut.gain.cancelScheduledValues(0.1);
    masterCut.gain.linearRampToValueAtTime(0.0, 0.1025);

    // Second redundant hard cut immediately after
    masterCut.gain.cancelScheduledValues(0.101);
    masterCut.gain.linearRampToValueAtTime(0.0, 0.1025);

    ctx.advanceTime(0.1025);
    expect(masterCut.gain.value).toBe(0.0);
  });

  it('B10-4: Hard cut cancels ongoing parameter ramps and forces immediate descent', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.1, 0);
    masterCut.gain.linearRampToValueAtTime(1.0, 1.0); // 1-second slow fade-in

    // Interrupted at 0.2s by hard cut
    ctx.advanceTime(0.2);
    const interruptedVal = masterCut.gain.value;
    expect(interruptedVal).toBeCloseTo(0.28, 1);

    masterCut.gain.cancelScheduledValues(ctx.currentTime);
    masterCut.gain.setValueAtTime(interruptedVal, ctx.currentTime);
    masterCut.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.0025);

    ctx.advanceTime(0.0025);
    expect(masterCut.gain.value).toBe(0.0);
  });

  it('B10-5: Immediate resume after hard-cut avoids race condition in audio state', async () => {
    await ctx.resume();
    expect(ctx.state).toBe('running');

    // Hard cut
    await ctx.suspend();
    expect(ctx.state).toBe('suspended');

    // Immediate re-trigger
    await ctx.resume();
    expect(ctx.state).toBe('running');
  });
});
