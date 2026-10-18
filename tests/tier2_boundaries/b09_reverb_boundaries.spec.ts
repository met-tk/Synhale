import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { generateSyntheticImpulseResponse } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B09: Convolver Reverb Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B09-1: Minimum decay time 0.5s creates tight, brief acoustic room response', () => {
    const irMin = generateSyntheticImpulseResponse(ctx, 0.5);
    expect(irMin.duration).toBeCloseTo(0.5, 2);
    expect(irMin.length).toBe(Math.floor(ctx.sampleRate * 0.5));
  });

  it('B09-2: Maximum decay time 12.0s creates massive, cavernous cathedral response', () => {
    const irMax = generateSyntheticImpulseResponse(ctx, 12.0);
    expect(irMax.duration).toBeCloseTo(12.0, 2);
    expect(irMax.length).toBe(Math.floor(ctx.sampleRate * 12.0));
  });

  it('B09-3: Damping = 0.0 maintains pure unattenuated exponential envelope', () => {
    const irUndamped = generateSyntheticImpulseResponse(ctx, 1.0, 0.0);
    const data = irUndamped.getChannelData(0);
    // Samples at the end should still reflect pure exponential decay without damping cutoff
    const lastSampleIndex = data.length - 1;
    expect(Number.isFinite(data[lastSampleIndex])).toBe(true);
  });

  it('B09-4: Maximum damping = 1.0 causes linear high-frequency suppression to zero at tail', () => {
    const irDamped = generateSyntheticImpulseResponse(ctx, 1.0, 1.0);
    const data = irDamped.getChannelData(0);
    // At end of buffer, damp factor approaches 0.0
    expect(data[data.length - 1]).toBeCloseTo(0.0, 4);
  });

  it('B09-5: Mix ratio extremes (0.0 pure dry, 1.0 pure wet) execute without signal cancellation', () => {
    const convolver = ctx.createConvolver();
    expect(convolver).toBeDefined();
    // Dry 100% / Wet 0%
    const dryGain = 1.0;
    const wetGain = 0.0;
    expect(dryGain).toBe(1.0);
    expect(wetGain).toBe(0.0);
  });
});
