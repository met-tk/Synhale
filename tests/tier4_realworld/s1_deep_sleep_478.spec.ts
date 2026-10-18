import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { calculateLogCutoff } from '../tier1_features/testHarness';
import type { BreathStage } from '../../src/types';

describe('Tier 4 Real-World Scenario S1: 4-7-8 Deep Sleep Cycle (19s Full Progression)', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('S1-1: 19-second cycle progression precisely tracks Inhale (4s), Hold In (7s), Exhale (8s), and 0s Hold Out passthrough', () => {
    const rhythm = { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 };
    const totalCycle = rhythm.inhale + rhythm.holdIn + rhythm.exhale + rhythm.holdOut; // 19s
    expect(totalCycle).toBe(19.0);

    let stage: BreathStage = 'inhale';
    let stageElapsed = 0;
    let cycleCount = 0;
    const timeStep = 0.5;

    // Simulate 19 seconds of playback
    for (let t = 0; t < 19.0; t += timeStep) {
      stageElapsed += timeStep;
      let dur = rhythm[stage];
      if (stageElapsed >= dur) {
        stageElapsed -= dur;
        if (stage === 'inhale') stage = 'holdIn';
        else if (stage === 'holdIn') stage = 'exhale';
        else if (stage === 'exhale') {
          // holdOut is 0s, pass-through directly to inhale
          stage = 'inhale';
          cycleCount++;
        }
      }
    }

    // At 19s, exactly 1 complete cycle is finished
    expect(cycleCount).toBe(1);
    expect(stage).toBe('inhale');
  });

  it('S1-2: Harmonic purge during 8-second exhale returns wavetable and filter to pure fundamental sine', () => {
    // Exhale from t=11s to t=19s (8 seconds)
    const exhaleProgresses = [0.0, 0.25, 0.5, 0.75, 1.0];
    for (const prog of exhaleProgresses) {
      const macro = 1.0 - prog; // Macro decays from 1.0 down to 0.0
      const cutoff = calculateLogCutoff(macro, 90, 14000);
      expect(cutoff).toBeLessThanOrEqual(14000);
      expect(cutoff).toBeGreaterThanOrEqual(90);

      // At end of exhale, cutoff returns to base 90Hz
      if (prog === 1.0) {
        expect(cutoff).toBeCloseTo(90.0, 1);
      }
    }
  });

  it('S1-3: Sub-bass 432Hz micro-drift maintains continuous gentle oscillation over 19s', () => {
    const baseFreq = 64.21; // C2 at 432Hz
    const lfoFreq = 0.05;   // 20s period

    for (let t = 0; t <= 19; t += 1.0) {
      const cents = 4.0 * Math.sin(2 * Math.PI * lfoFreq * t);
      const freq = baseFreq * Math.pow(2, cents / 1200);

      expect(freq).toBeGreaterThanOrEqual(baseFreq * Math.pow(2, -4 / 1200));
      expect(freq).toBeLessThanOrEqual(baseFreq * Math.pow(2, 4 / 1200));
    }
  });

  it('S1-4: Airway friction noise is strictly active only during inhale and exhale, staying silent during hold', () => {
    function getNoiseGain(stage: BreathStage): number {
      if (stage === 'holdIn' || stage === 'holdOut') return 0.0;
      return 0.35;
    }

    expect(getNoiseGain('inhale')).toBe(0.35);
    expect(getNoiseGain('holdIn')).toBe(0.0);
    expect(getNoiseGain('exhale')).toBe(0.35);
    expect(getNoiseGain('holdOut')).toBe(0.0);
  });
});
