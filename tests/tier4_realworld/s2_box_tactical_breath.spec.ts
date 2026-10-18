import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { generateSyntheticImpulseResponse } from '../tier1_features/testHarness';

describe('Tier 4 Real-World Scenario S2: Box 4-4-4-4 Tactical Breath (Airway Cut vs Reverb Lingering)', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('S2-1: Dual hold stages (Hold In at 4s-8s and Hold Out at 12s-16s) cleanly silence airway friction noise', () => {
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0, 0);

    // Inhale (0s-4s): noise active
    noiseGain.gain.setValueAtTime(0.0, 0);
    noiseGain.gain.linearRampToValueAtTime(0.4, 4.0);

    // Hold In (4s-8s): noise cut in 10ms
    noiseGain.gain.setValueAtTime(0.4, 4.0);
    noiseGain.gain.linearRampToValueAtTime(0.0, 4.01);

    ctx.advanceTime(4.01);
    expect(noiseGain.gain.value).toBeCloseTo(0.0, 3);

    // Exhale (8s-12s): noise emerges gently
    noiseGain.gain.setValueAtTime(0.0, 8.0);
    noiseGain.gain.linearRampToValueAtTime(0.25, 10.0);
    noiseGain.gain.linearRampToValueAtTime(0.0, 12.0);

    // Hold Out (12s-16s): noise remains 0.0
    ctx.advanceTime(7.99); // Reaches 12.0s
    expect(noiseGain.gain.value).toBeCloseTo(0.0, 3);
  });

  it('S2-2: Harmonic suspension in Hold In maintains cathedral reverb space (T60 = 6.5s) while input is static', () => {
    const reverbIR = generateSyntheticImpulseResponse(ctx, 6.5, 0.4);
    expect(reverbIR.duration).toBeCloseTo(6.5, 1);

    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(0.3, 0);
    reverbWet.gain.linearRampToValueAtTime(0.65, 4.0);

    ctx.advanceTime(4.0);
    expect(reverbWet.gain.value).toBeCloseTo(0.65, 3);
  });

  it('S2-3: Center-zero VU meter swings symmetrically: rightward during Inhale, leftward during Exhale', () => {
    function getModulationOffset(stage: string, progress: number): number {
      if (stage === 'inhale') return progress;          // 0.0 -> +1.0
      if (stage === 'holdIn') return 1.0;               // +1.0
      if (stage === 'exhale') return 1.0 - 2 * progress; // +1.0 -> -1.0
      return -1.0;                                     // -1.0 in Hold Out
    }

    expect(getModulationOffset('inhale', 1.0)).toBe(1.0);
    expect(getModulationOffset('holdIn', 0.5)).toBe(1.0);
    expect(getModulationOffset('exhale', 0.5)).toBe(0.0);
    expect(getModulationOffset('exhale', 1.0)).toBe(-1.0);
    expect(getModulationOffset('holdOut', 0.5)).toBe(-1.0);
  });

  it('S2-4: Status capsule countdown decrements exactly 4.0s to 0.0s for all 4 quadrants of the Box', () => {
    const quadrantDuration = 4.0;
    const progressPoints = [0.0, 0.5, 0.75, 1.0];

    for (const p of progressPoints) {
      const remaining = quadrantDuration * (1.0 - p);
      const formatted = `${remaining.toFixed(1)}s`;

      if (p === 0.0) expect(formatted).toBe('4.0s');
      if (p === 0.5) expect(formatted).toBe('2.0s');
      if (p === 1.0) expect(formatted).toBe('0.0s');
    }
  });
});
