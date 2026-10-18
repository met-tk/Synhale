import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { evaluateTensionCurve } from '../tier1_features/testHarness';

describe('Tier 4 Real-World Scenario S4: Custom Timeline Curve Execution & Anti-Zipper Scheduling', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('S4-1: Custom aggressive inhale curve (Tension = +0.75) and gentle exhale (Tension = -0.6) evaluate cleanly', () => {
    // Custom user curves
    const customInhaleCurve = (phi: number) => evaluateTensionCurve(phi, 0.1, 0.95, 0.75);
    const customExhaleCurve = (phi: number) => evaluateTensionCurve(phi, 0.95, 0.15, -0.60);

    expect(customInhaleCurve(0.0)).toBeCloseTo(0.1, 3);
    expect(customInhaleCurve(1.0)).toBeCloseTo(0.95, 3);

    expect(customExhaleCurve(0.0)).toBeCloseTo(0.95, 3);
    expect(customExhaleCurve(1.0)).toBeCloseTo(0.15, 3);
  });

  it('S4-2: 15ms de-zippering scheduling via setTargetAtTime smooths parameter jumps', () => {
    const filter = ctx.createBiquadFilter();
    filter.frequency.setValueAtTime(500, 0);

    // Sudden user modulation from 500Hz to 4000Hz smoothed with tau = 15ms
    filter.frequency.setTargetAtTime(4000, 0, 0.015);

    // After 5ms, partial transition without instantaneous step
    ctx.advanceTime(0.005);
    expect(filter.frequency.value).toBeGreaterThan(500);
    expect(filter.frequency.value).toBeLessThan(4000);

    // After 60ms (4 tau), settles at ~98% of target
    ctx.advanceTime(0.055);
    expect(filter.frequency.value).toBeGreaterThan(3900);
  });

  it('S4-3: Successive curve evaluations at 60fps (16.6ms intervals) produce bounded delta without clicks', () => {
    const tension = 0.5;
    let prevVal = evaluateTensionCurve(0.0, 100, 10000, tension);
    const numFrames = 60; // 1 second at 60fps

    for (let frame = 1; frame <= numFrames; frame++) {
      const phi = frame / numFrames;
      const currentVal = evaluateTensionCurve(phi, 100, 10000, tension);
      const delta = currentVal - prevVal;

      // Delta between frames should be smooth and bounded
      expect(delta).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThan(1000); // No massive 1-frame spikes
      prevVal = currentVal;
    }
  });

  it('S4-4: Boundary between stages snaps seamlessly without discontinuity step', () => {
    const inhaleEnd = evaluateTensionCurve(1.0, 0.2, 0.9, 0.4);
    const holdInStart = evaluateTensionCurve(0.0, 0.9, 0.9, 0.0);

    expect(inhaleEnd).toBeCloseTo(0.9, 4);
    expect(holdInStart).toBeCloseTo(0.9, 4);
    expect(Math.abs(inhaleEnd - holdInStart)).toBeLessThan(0.001);
  });
});
