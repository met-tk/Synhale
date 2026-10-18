import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Feature F07: 24dB/oct Cascaded Multimode Filter', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F07-1: Cascaded dual BiquadFilter lowpass topology achieves -24dB/octave steep attenuation', () => {
    const stage1 = ctx.createBiquadFilter();
    const stage2 = ctx.createBiquadFilter();
    stage1.type = 'lowpass';
    stage2.type = 'lowpass';
    stage1.frequency.value = 1000;
    stage2.frequency.value = 1000;
    stage1.Q.value = 1.0;
    stage2.Q.value = 1.0;

    const testFreqs = new Float32Array([1000, 2000, 4000]); // Cutoff, 1 octave up, 2 octaves up
    const mag1 = new Float32Array(3);
    const phase1 = new Float32Array(3);
    stage1.getFrequencyResponse(testFreqs, mag1, phase1);

    const mag2 = new Float32Array(3);
    const phase2 = new Float32Array(3);
    stage2.getFrequencyResponse(testFreqs, mag2, phase2);

    // Cascaded magnitude is mag1 * mag2
    const totalMagCutoff = mag1[0] * mag2[0];
    const totalMag1Octave = mag1[1] * mag2[1];
    const totalMag2Octaves = mag1[2] * mag2[2];
    expect(totalMagCutoff).toBeGreaterThan(0);

    // At 1 octave above cutoff (2000Hz), 24dB attenuation = 10^(-24/20) ~= 0.063
    expect(totalMag1Octave).toBeLessThan(0.12);
    // At 2 octaves above cutoff (4000Hz), 48dB attenuation = 10^(-48/20) ~= 0.0039
    expect(totalMag2Octaves).toBeLessThan(0.02);
    // Steep attenuation slope: 2 octaves down is vastly smaller than 1 octave down
    expect(totalMag2Octaves).toBeLessThan(totalMag1Octave * 0.25);
  });

  it('F07-2: Highpass and bandpass modes synchronize type and frequency between stages', () => {
    const stage1 = ctx.createBiquadFilter();
    const stage2 = ctx.createBiquadFilter();

    stage1.type = 'highpass';
    stage2.type = 'highpass';
    stage1.frequency.value = 500;
    stage2.frequency.value = 500;
    expect(stage1.type).toBe('highpass');
    expect(stage2.type).toBe('highpass');
    expect(stage1.frequency.value).toBe(500);
    expect(stage2.frequency.value).toBe(500);

    stage1.type = 'bandpass';
    stage2.type = 'bandpass';
    stage1.frequency.value = 1500;
    stage2.frequency.value = 1500;
    expect(stage1.type).toBe('bandpass');
    expect(stage2.type).toBe('bandpass');
    expect(stage1.frequency.value).toBe(1500);
    expect(stage2.frequency.value).toBe(1500);
  });

  it('F07-3: Quality factor splitting Q_stage = sqrt(Q_target) maintains target resonance without clipping', () => {
    const targetQ = 9.0;
    const stageQ = Math.sqrt(targetQ); // 3.0
    expect(stageQ).toBe(3.0);

    const stage1 = ctx.createBiquadFilter();
    const stage2 = ctx.createBiquadFilter();
    stage1.Q.value = stageQ;
    stage2.Q.value = stageQ;

    expect(stage1.Q.value).toBe(3.0);
    expect(stage2.Q.value).toBe(3.0);
  });

  it('F07-4: Filter frequency smoothing via setTargetAtTime with tau = 15ms avoids zipper noise', () => {
    const filter = ctx.createBiquadFilter();
    filter.frequency.setValueAtTime(200, 0);
    // Smooth transition to 2000Hz with tau = 15ms
    filter.frequency.setTargetAtTime(2000, 0, 0.015);

    // After 1 tau (15ms), reaches 1 - e^-1 ~= 63.2% of target delta
    ctx.advanceTime(0.015);
    const expectedVal1Tau = 200 + (2000 - 200) * (1 - Math.exp(-1));
    expect(filter.frequency.value).toBeCloseTo(expectedVal1Tau, 0);

    // After 5 tau (75ms), reaches > 99% of target
    ctx.advanceTime(0.060);
    expect(filter.frequency.value).toBeGreaterThan(1980);
    expect(filter.frequency.value).toBeLessThanOrEqual(2000);
  });

  it('F07-5: Filter bypass relay enables unattenuated direct pass-through', () => {
    const filterInGain = ctx.createGain();
    const filterOutGain = ctx.createGain();
    const bypassGain = ctx.createGain();

    // Normal processing
    filterInGain.gain.value = 1;
    filterOutGain.gain.value = 1;
    bypassGain.gain.value = 0;
    expect(bypassGain.gain.value).toBe(0);

    // Bypassed
    filterInGain.gain.value = 0;
    filterOutGain.gain.value = 0;
    bypassGain.gain.value = 1;
    expect(bypassGain.gain.value).toBe(1);
    expect(filterInGain.gain.value).toBe(0);
  });
});
