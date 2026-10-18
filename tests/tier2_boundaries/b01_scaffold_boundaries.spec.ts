import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B01: Scaffold & Environment Boundaries', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('B01-1: Negative virtual time advance throws error to maintain unidirectional causality', () => {
    expect(() => ctx.advanceTime(-0.0001)).toThrow('Cannot advance time backwards');
    expect(() => ctx.advanceTime(-10)).toThrow('Cannot advance time backwards');
  });

  it('B01-2: Zero-time advance (0 seconds) does not alter currentTime and updates params safely', () => {
    const start = ctx.currentTime;
    ctx.advanceTime(0);
    expect(ctx.currentTime).toBe(start);

    const gain = ctx.createGain();
    gain.gain.value = 0.75;
    ctx.advanceTime(0);
    expect(gain.gain.value).toBe(0.75);
  });

  it('B01-3: Non-standard sample rates (8000Hz telephony to 192000Hz studio master) initialize properly', () => {
    const lowCtx = new MockAudioContext({ sampleRate: 8000 });
    expect(lowCtx.sampleRate).toBe(8000);

    const highCtx = new MockAudioContext({ sampleRate: 192000 });
    expect(highCtx.sampleRate).toBe(192000);
  });

  it('B01-4: Rapid idempotent resume and suspend state transitions resolve cleanly', async () => {
    expect(ctx.state).toBe('suspended');
    await ctx.resume();
    expect(ctx.state).toBe('running');
    await ctx.resume(); // Idempotent
    expect(ctx.state).toBe('running');

    await ctx.suspend();
    expect(ctx.state).toBe('suspended');
    await ctx.suspend(); // Idempotent
    expect(ctx.state).toBe('suspended');
  });

  it('B01-5: Closing AudioContext permanently transitions state to closed', async () => {
    await ctx.close();
    expect(ctx.state).toBe('closed');
  });
});
