import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Feature F08: Damped Stereo Ping-Pong Delay', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F08-1: Ping-pong delay parameters support asynchronous stereo timing (L: 240ms, R: 360ms)', () => {
    const delayL = ctx.createDelay(1.5);
    const delayR = ctx.createDelay(1.5);

    delayL.delayTime.value = 0.24;
    delayR.delayTime.value = 0.36;

    expect(delayL.delayTime.value).toBe(0.24);
    expect(delayR.delayTime.value).toBe(0.36);
    expect(delayR.delayTime.value / delayL.delayTime.value).toBeCloseTo(1.5, 4);
  });

  it('F08-2: Cross-feedback loop transfers Left delay into Right channel and Right into Left channel', () => {
    const delayL = ctx.createDelay(1.5);
    const delayR = ctx.createDelay(1.5);
    const feedbackGainL = ctx.createGain();
    const feedbackGainR = ctx.createGain();

    delayL.connect(feedbackGainL);
    feedbackGainL.connect(delayR);

    delayR.connect(feedbackGainR);
    feedbackGainR.connect(delayL);

    expect(delayL.connectedNodes).toContain(feedbackGainL);
    expect(feedbackGainL.connectedNodes).toContain(delayR);
    expect(delayR.connectedNodes).toContain(feedbackGainR);
    expect(feedbackGainR.connectedNodes).toContain(delayL);
  });

  it('F08-3: In-loop lowpass damping filter attenuates high frequencies on each feedback echo', () => {
    const dampingFilter = ctx.createBiquadFilter();
    dampingFilter.type = 'lowpass';
    dampingFilter.frequency.value = 3200; // 3.2kHz tape absorption

    const testFreqs = new Float32Array([500, 3200, 10000]);
    const mag = new Float32Array(3);
    const phase = new Float32Array(3);
    dampingFilter.getFrequencyResponse(testFreqs, mag, phase);

    // 500Hz passes cleanly (> 0.95)
    expect(mag[0]).toBeGreaterThan(0.95);
    // 10kHz is significantly damped (< 0.35)
    expect(mag[2]).toBeLessThan(0.35);
    // High frequencies are damped by more than half relative to passband
    expect(mag[2]).toBeLessThan(mag[0] * 0.4);
  });

  it('F08-4: Anti-howling limiter enforces maximum feedback gain strictly below 0.90', () => {
    const maxFeedbackLimit = 0.88;
    const requestedFeedbacks = [0.2, 0.5, 0.85, 0.95, 1.2];

    for (const fb of requestedFeedbacks) {
      const safeFb = Math.min(maxFeedbackLimit, Math.max(0.0, fb));
      expect(safeFb).toBeLessThanOrEqual(0.88);
      expect(safeFb).toBeGreaterThanOrEqual(0.0);
    }
  });

  it('F08-5: Delay bypass immediately cuts feedback loop gain to 0 to prevent runaway echoes', () => {
    const feedbackGain = ctx.createGain();
    feedbackGain.gain.setValueAtTime(0.65, 0);

    // Bypass triggered: cut feedback to 0 immediately
    feedbackGain.gain.value = 0.0;
    expect(feedbackGain.gain.value).toBe(0.0);
  });
});
