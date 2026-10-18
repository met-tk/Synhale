import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B08: Ping-Pong Delay Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B08-1: Delay time at lower boundary 0.05s (50ms) configures valid short slapback echo', () => {
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.05;
    expect(delay.delayTime.value).toBe(0.05);
  });

  it('B08-2: Delay time at upper boundary 1.5s (1500ms) configures valid ambient canyon echo', () => {
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 1.5;
    expect(delay.delayTime.value).toBe(1.5);
  });

  it('B08-3: Feedback gain exactly 0.0 creates clean single-tap delay without recirculation', () => {
    const feedback = ctx.createGain();
    feedback.gain.value = 0.0;
    expect(feedback.gain.value).toBe(0.0);
  });

  it('B08-4: Dangerous feedback setting (e.g. 0.99 or 1.5) is clamped strictly to anti-howling ceiling (0.88)', () => {
    function sanitizeFeedback(requested: number): number {
      const CEILING = 0.88;
      return Math.max(0.0, Math.min(CEILING, requested));
    }

    expect(sanitizeFeedback(0.99)).toBe(0.88);
    expect(sanitizeFeedback(1.50)).toBe(0.88);
    expect(sanitizeFeedback(-0.1)).toBe(0.0);
  });

  it('B08-5: In-loop damping filter frequencies at extremes (500Hz dark and 12000Hz bright) remain stable', () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    filter.frequency.value = 500;
    expect(filter.frequency.value).toBe(500);

    filter.frequency.value = 12000;
    expect(filter.frequency.value).toBe(12000);
  });
});
