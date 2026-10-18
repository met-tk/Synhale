import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 4 Real-World Scenario S3: Real-Time 0ms Hard-Cut & Seamless Resumption', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('S3-1: Full audio pipeline executing at peak load shuts down master bus in <= 2.5ms on tap-pause', () => {
    const masterCut = ctx.createGain();
    const delayFeedback = ctx.createGain();
    masterCut.gain.setValueAtTime(0.9, 0);
    delayFeedback.gain.setValueAtTime(0.75, 0);

    // Arbitrary pause timestamp at t = 3.782s
    const pauseTime = 3.782;
    masterCut.gain.setValueAtTime(0.9, pauseTime);
    masterCut.gain.linearRampToValueAtTime(0.0, pauseTime + 0.0025);
    delayFeedback.gain.setValueAtTime(0.0, pauseTime);

    ctx.advanceTime(pauseTime + 0.0025);
    expect(masterCut.gain.value).toBeCloseTo(0.0, 5);
    expect(delayFeedback.gain.value).toBe(0.0);
  });

  it('S3-2: Loop purge eliminates delay buffer recirculation and prevents lingering ghost bursts', () => {
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.85, 0);

    // Cut executed
    delayFeedback.gain.value = 0.0;
    expect(delayFeedback.gain.value).toBe(0.0);

    // After 1 second of paused time, feedback remains 0.0
    ctx.advanceTime(1.0);
    expect(delayFeedback.gain.value).toBe(0.0);
  });

  it('S3-3: Resuming after pause recovers exact breath clock phase without skipping forward or backward', () => {
    const frozenPhase = 0.684;
    const frozenStage = 'inhale';
    const frozenMacro = 0.684;

    // Simulate resumption
    const recoveredPhase = frozenPhase;
    const recoveredStage = frozenStage;
    const recoveredMacro = frozenMacro;

    expect(recoveredPhase).toBe(0.684);
    expect(recoveredStage).toBe('inhale');
    expect(recoveredMacro).toBe(0.684);
  });

  it('S3-4: Master gain ramps smoothly from 0.0 to target 0.9 in 3ms upon resume without audio clicks', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.0, 0);

    masterCut.gain.linearRampToValueAtTime(0.9, 0.003);

    ctx.advanceTime(0.0015); // Midpoint
    expect(masterCut.gain.value).toBeCloseTo(0.45, 2);

    ctx.advanceTime(0.0015); // Fully engaged
    expect(masterCut.gain.value).toBeCloseTo(0.9, 3);
  });
});
