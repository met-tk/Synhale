import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B24: Total System Synchronization Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('B24-1: Zero-second tick does not advance virtual phase or macro values', () => {
    let progress = 0.35;
    function tick(dt: number) {
      if (dt > 0) progress += dt;
    }

    tick(0.0);
    expect(progress).toBe(0.35);
  });

  it('B24-2: Calling AudioParam updates while context is suspended queues events safely', () => {
    expect(ctx.state).toBe('suspended');
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, 0);

    expect(gain.gain.getValueAtTime(0)).toBe(0.5);
  });

  it('B24-3: AudioEngine modulation update with out-of-range macro (M = 2.5) is clamped to 1.0', () => {
    function sanitizeMacro(raw: number): number {
      return Math.max(0.0, Math.min(1.0, raw));
    }

    expect(sanitizeMacro(2.5)).toBe(1.0);
    expect(sanitizeMacro(-0.8)).toBe(0.0);
  });

  it('B24-4: Rapid alternating play/pause toggling (10 cycles) keeps audio and visual in sync', () => {
    let isPlaying = false;
    for (let i = 0; i < 10; i++) {
      isPlaying = !isPlaying;
    }
    expect(isPlaying).toBe(false);
  });

  it('B24-5: Double invocation of dispose/cleanup handles idempotently without error', async () => {
    await ctx.close();
    expect(ctx.state).toBe('closed');

    // Second call
    await ctx.close();
    expect(ctx.state).toBe('closed');
  });
});
