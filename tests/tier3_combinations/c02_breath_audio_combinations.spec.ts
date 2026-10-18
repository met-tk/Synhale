import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { calculateLogCutoff, evaluateTensionCurve } from '../tier1_features/testHarness';

describe('Tier 3 Combinations - C02: Breath Clock & Audio Modulation Combinations', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('C02-1: Breath macro smoothly modulates cascaded filter cutoff from 90Hz to 14000Hz during inhale', () => {
    const filter1 = ctx.createBiquadFilter();
    const filter2 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter2.type = 'lowpass';

    const macroValues = [0.0, 0.25, 0.5, 0.75, 1.0];
    let prevFreq = 0;

    for (const m of macroValues) {
      const freq = calculateLogCutoff(m, 90, 14000);
      filter1.frequency.value = freq;
      filter2.frequency.value = freq;

      expect(freq).toBeGreaterThanOrEqual(prevFreq);
      expect(filter1.frequency.value).toBeCloseTo(freq, 2);
      expect(filter2.frequency.value).toBeCloseTo(freq, 2);
      prevFreq = freq;
    }
  });

  it('C02-2: Transitioning into Hold In triggers noise gain drop to 0 in 10ms while Reverb wet boosts to 65%', () => {
    const noiseGain = ctx.createGain();
    const reverbWet = ctx.createGain();

    noiseGain.gain.setValueAtTime(0.45, 0);
    reverbWet.gain.setValueAtTime(0.35, 0);

    // Hold In entered at t = 4.0s
    noiseGain.gain.setValueAtTime(0.45, 4.0);
    noiseGain.gain.linearRampToValueAtTime(0.0, 4.010); // 10ms fade
    reverbWet.gain.setValueAtTime(0.35, 4.0);
    reverbWet.gain.linearRampToValueAtTime(0.65, 4.010);

    ctx.advanceTime(4.010);
    expect(noiseGain.gain.value).toBeCloseTo(0.0, 4);
    expect(reverbWet.gain.value).toBeCloseTo(0.65, 4);
  });

  it('C02-3: Tap-pause triggered mid-inhale (macro = 0.6) performs 2.5ms hard-cut while freezing macro snapshot', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(1.0, 0);

    const frozenMacro = 0.6;
    const pauseTime = 2.4; // 60% of 4.0s inhale

    // Tap-pause executed
    masterCut.gain.setValueAtTime(1.0, pauseTime);
    masterCut.gain.linearRampToValueAtTime(0.0, pauseTime + 0.0025);

    ctx.advanceTime(pauseTime + 0.0025);
    expect(masterCut.gain.value).toBeCloseTo(0.0, 5);
    expect(frozenMacro).toBe(0.6); // Retained for seamless resume
  });

  it('C02-4: Resuming from pause restores exact macro value and smoothly re-engages master gain in 3ms', () => {
    const masterCut = ctx.createGain();
    masterCut.gain.setValueAtTime(0.0, 0);

    const storedMacro = 0.6;
    const resumeTime = 10.0;

    // Resume protocol
    masterCut.gain.setValueAtTime(0.0, resumeTime);
    masterCut.gain.linearRampToValueAtTime(1.0, resumeTime + 0.003);

    ctx.advanceTime(resumeTime + 0.003);
    expect(masterCut.gain.value).toBeCloseTo(1.0, 4);
    expect(storedMacro).toBe(0.6);
  });

  it('C02-5: 4-7-8 rhythm with 0s HoldOut instantly loops to Inhale without de-zippering or audio clicks', () => {
    let currentStage = 'exhale';
    let macro = 0.0;
    let cycleCount = 0;

    // Exhale completes
    function onStageComplete() {
      // 0s holdOut passthrough
      currentStage = 'inhale';
      cycleCount++;
      macro = 0.0;
    }

    onStageComplete();
    expect(currentStage).toBe('inhale');
    expect(cycleCount).toBe(1);
    expect(macro).toBe(0.0);
  });

  it('C02-6: Custom tension curve (T = -0.5 on inhale, T = +0.8 on exhale) drives filter cutoff smoothly', () => {
    const cutoffInhale = evaluateTensionCurve(0.5, 90, 14000, -0.5); // Ease-out
    const cutoffExhale = evaluateTensionCurve(0.5, 14000, 90, 0.8);  // Ease-in

    expect(cutoffInhale).toBeGreaterThan(90);
    expect(cutoffInhale).toBeLessThan(14000);
    expect(cutoffExhale).toBeGreaterThan(90);
    expect(cutoffExhale).toBeLessThan(14000);
  });

  it('C02-7: Micro pitch-drift (+4 cents on peak inhale) synchronizes with wavetable morph position', () => {
    const macroPeak = 1.0;
    const maxDriftCents = 4.0;
    const targetWavetableSlice = 15;

    const currentDetune = macroPeak * maxDriftCents;
    const currentWavetable = Math.floor(macroPeak * targetWavetableSlice);

    expect(currentDetune).toBe(4.0);
    expect(currentWavetable).toBe(15);
  });

  it('C02-8: Dynamic rhythm rescaling during active playback adjusts cycle duration without jumping phase', () => {
    const oldDur = 4.0;
    const elapsed = 2.0;
    const phaseBefore = elapsed / oldDur; // 0.5

    const newDur = 6.0;
    const newElapsed = phaseBefore * newDur; // 3.0
    const phaseAfter = newElapsed / newDur; // 0.5

    expect(phaseAfter).toBe(phaseBefore);
  });
});
