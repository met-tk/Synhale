import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BreathStateMachine } from '../../src/breath/stateMachine';
import {
  sigmoidInhale,
  passiveExhale,
  calculateBreathMacro,
  calculateLogCutoff,
  calculateAcousticParameters,
  AcousticModulationParams
} from '../../src/breath/macro';
import {
  hashIntToBipolar,
  resolveEffectiveLfoRate,
  evaluateLfoWaveform,
  computeLfoLiveValue
} from '../../src/audio/dsp/lfoMath';
import { DualLfoModule } from '../../src/audio/nodes/DualLfoModule';
import { MockAudioContext } from '../mocks/webAudioMock';
import type { BreathStage, BreathRhythmConfig } from '../../src/types';
import type { LfoShape, LfoSyncConfig } from '../../src/types/audio';

describe('Milestone 3 (D19-D26) Adversarial Stress & Empirical Verification Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  // =========================================================================
  // D19: Dynamic setRhythm stageElapsed Reset & Multi-Stage Cascades
  // =========================================================================
  describe('D19 Adversarial: setRhythm stageElapsed Reset & Cascade Immunity', () => {
    it('D19-ADV-1: Active stage shrunk from 10s to 0s resets stageElapsed and avoids leftover time pollution', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 10.0, holdIn: 5.0, exhale: 5.0, holdOut: 5.0 },
        autoStart: true
      });

      // Tick 8.5 seconds into inhale (85% progress)
      sm.tick(8.5);
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.85, 4);

      // Reconfigure inhale to 0.0s dynamically
      sm.setRhythm({ inhale: 0.0, holdIn: 5.0, exhale: 5.0, holdOut: 5.0 });

      // Must immediately advance to holdIn
      expect(sm.getCurrentStage()).toBe('holdIn');

      // Invariant: holdIn must start with stageElapsed = 0, remaining = 5.0, cycleCount = 0
      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBe(0.0);
      expect(snap.stageRemainingSeconds).toBe(5.0);
      expect(sm.getCycleCount()).toBe(0);

      // Ticking 2.5s must be exactly 50% into holdIn
      sm.tick(2.5);
      expect(sm.getCurrentStage()).toBe('holdIn');
      expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.5, 4);
      expect(sm.getSnapshot().stageRemainingSeconds).toBeCloseTo(2.5, 4);
      expect(sm.getCycleCount()).toBe(0);
    });

    it('D19-ADV-2: Multi-stage consecutive 0s cascade under dynamic rhythm reconfiguration', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 8.0, holdIn: 6.0, exhale: 8.0, holdOut: 4.0 },
        autoStart: true
      });

      // Run 4 seconds into inhale
      sm.tick(4.0);

      // Reconfigure: both inhale AND holdIn become 0s, exhale is 7s
      sm.setRhythm({ inhale: 0.0, holdIn: 0.0, exhale: 7.0, holdOut: 3.0 });

      // State machine must skip inhale and holdIn, landing directly on exhale
      expect(sm.getCurrentStage()).toBe('exhale');
      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBe(0.0);
      expect(snap.stageRemainingSeconds).toBe(7.0);
      expect(snap.cycleCount).toBe(0);

      // Advance 7.0s to finish exhale -> holdOut (3s)
      sm.tick(7.0);
      expect(sm.getCurrentStage()).toBe('holdOut');
      expect(sm.getCycleCount()).toBe(0);

      // Advance 3.0s to finish holdOut -> full cycle complete!
      // Inhale & holdIn are 0s, so it must loop back to exhale with cycleCount = 1!
      sm.tick(3.0);
      expect(sm.getCurrentStage()).toBe('exhale');
      expect(sm.getCycleCount()).toBe(1);
    });

    it('D19-ADV-3: 100 rapid random rhythm mutations during active playback preserve monotonic progress invariants', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      let prevCycleCount = 0;
      for (let i = 0; i < 100; i++) {
        // Randomly assign durations between 0.0s and 6.0s
        const r: BreathRhythmConfig = {
          inhale: (i % 5 === 0) ? 0.0 : ((i * 13) % 60) / 10 + 0.1,
          holdIn: (i % 7 === 0) ? 0.0 : ((i * 17) % 50) / 10 + 0.1,
          exhale: (i % 3 === 0) ? 0.0 : ((i * 19) % 60) / 10 + 0.1,
          holdOut: (i % 11 === 0) ? 0.0 : ((i * 23) % 40) / 10
        };

        sm.setRhythm(r);
        const snap = sm.tick(0.05);

        // Core Invariants:
        expect(Number.isFinite(snap.stageProgress)).toBe(true);
        expect(snap.stageProgress).toBeGreaterThanOrEqual(0.0);
        expect(snap.stageProgress).toBeLessThanOrEqual(1.0);

        expect(Number.isFinite(snap.cycleProgress)).toBe(true);
        expect(snap.cycleProgress).toBeGreaterThanOrEqual(0.0);
        expect(snap.cycleProgress).toBeLessThanOrEqual(1.0);

        expect(Number.isFinite(snap.breathMacro)).toBe(true);
        expect(snap.breathMacro).toBeGreaterThanOrEqual(0.0);
        expect(snap.breathMacro).toBeLessThanOrEqual(1.0);

        expect(Number.isFinite(snap.stageRemainingSeconds)).toBe(true);
        expect(snap.stageRemainingSeconds).toBeGreaterThanOrEqual(0.0);

        expect(snap.cycleCount).toBeGreaterThanOrEqual(prevCycleCount);
        prevCycleCount = snap.cycleCount;
      }
    });
  });

  // =========================================================================
  // D20: Degenerate All-Zero Rhythm Total Cycle Duration Guard
  // =========================================================================
  describe('D20 Adversarial: Degenerate All-Zero & Near-Zero Rhythm Guards', () => {
    it('D20-ADV-1: 1,000 rapid ticks under all-0s rhythm cause 0 cycle inflation and execute instantaneously', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 0.0, holdIn: 0.0, exhale: 0.0, holdOut: 0.0 },
        autoStart: true
      });

      expect(sm.getTotalCycleDuration()).toBe(0.0);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const delta = (i % 10) * 0.1 + 0.01;
        const snap = sm.tick(delta);
        expect(snap.cycleCount).toBe(0);
        expect(snap.stageProgress).toBe(1.0);
        expect(snap.stageRemainingSeconds).toBe(0.0);
        expect(snap.cycleProgress).toBe(0.0);
        expect(Number.isFinite(snap.breathMacro)).toBe(true);
      }
      const elapsedMs = performance.now() - startTime;

      // Must execute within 200ms without spin loop stalls
      expect(elapsedMs).toBeLessThan(200);
      expect(sm.getCycleCount()).toBe(0);
    });

    it('D20-ADV-2: Sub-millisecond degenerate rhythm (sum <= 0.001) triggered guard', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 0.0002, holdIn: 0.0002, exhale: 0.0002, holdOut: 0.0002 },
        autoStart: true
      });

      // Total duration is 0.0008 <= 0.001
      expect(sm.getTotalCycleDuration()).toBeLessThanOrEqual(0.001);

      // Ticking should hit the degenerate guard and not hang
      for (let i = 0; i < 50; i++) {
        const snap = sm.tick(0.016);
        expect(snap.cycleCount).toBe(0);
      }
      expect(sm.getCycleCount()).toBe(0);
    });

    it('D20-ADV-3: Malformed rhythm configs (negative numbers, NaN, non-numeric) handled cleanly', () => {
      const sm = new BreathStateMachine({
        rhythm: {
          inhale: -5.0,
          holdIn: NaN,
          exhale: -0.0001,
          holdOut: 'corrupted' as unknown as number
        },
        autoStart: true
      });

      expect(sm.getTotalCycleDuration()).toBe(0.0);
      const snap = sm.tick(1.0);
      expect(snap.cycleCount).toBe(0);
      expect(Number.isNaN(snap.stageProgress)).toBe(false);
      expect(Number.isNaN(snap.breathMacro)).toBe(false);
    });

    it('D20-ADV-4: O(1) Leap optimization handles massive delta leap (100,000s) on single active stage', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 0.0, exhale: 0.0, holdOut: 0.0 },
        autoStart: true
      });

      // Advance by 100,000 seconds in a single tick
      const snap = sm.tick(100000.0);

      // 100,000 / 4.0 = 25,000 cycles
      expect(snap.cycleCount).toBe(25000);
      expect(snap.currentStage).toBe('inhale');
      expect(snap.stageProgress).toBe(0.0);
    });
  });

  // =========================================================================
  // D21: Manual setStage Isolation from cycleCount
  // =========================================================================
  describe('D21 Adversarial: setStage Isolation & Cycle Invariants', () => {
    it('D21-ADV-1: 500 consecutive manual setStage jumps never increment cycleCount', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      for (let i = 0; i < 500; i++) {
        const targetStage = stages[i % 4];
        sm.setStage(targetStage);
        expect(sm.getCurrentStage()).toBe(targetStage);
        expect(sm.getCycleCount()).toBe(0);
      }
    });

    it('D21-ADV-2: Repeated setStage to 0-duration holdOut in 4-7-8 rhythm never bumps cycleCount', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 },
        autoStart: false
      });

      // Target the 0-duration stage repeatedly
      for (let i = 0; i < 100; i++) {
        sm.setStage('holdOut');
        expect(sm.getCurrentStage()).toBe('inhale'); // Passes through to inhale
        expect(sm.getCycleCount()).toBe(0);          // Strictly 0!
      }
    });

    it('D21-ADV-3: Interleaving manual jumps with natural time ticks accurately preserves true cycle count', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 2.0, holdIn: 2.0, exhale: 2.0, holdOut: 2.0 },
        autoStart: true
      });

      // Complete 1 full cycle naturally (8s total)
      sm.tick(8.0);
      expect(sm.getCycleCount()).toBe(1);

      // Manual jumps back and forth
      sm.setStage('holdIn');
      sm.setStage('holdOut');
      sm.setStage('inhale');
      expect(sm.getCycleCount()).toBe(1); // Still 1!

      // Complete another natural cycle from inhale (8s)
      sm.tick(8.0);
      expect(sm.getCycleCount()).toBe(2); // Exactly 2!
    });
  });

  // =========================================================================
  // D22: NaN Immunity & Adversarial Input Fuzzing
  // =========================================================================
  describe('D22 Adversarial: Exhaustive NaN & IEEE 754 Extreme Value Fuzzing', () => {
    const adversarialInputs = [
      NaN,
      +Infinity,
      -Infinity,
      -0,
      +0,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
      Number.EPSILON,
      1e-300,
      1e300,
      -1e300,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      'undefined' as unknown as number,
      null as unknown as number,
      undefined as unknown as number
    ];

    it('D22-ADV-1: sigmoidInhale returns strictly finite values in [0, 1] for all adversarial inputs', () => {
      for (const val of adversarialInputs) {
        const out = sigmoidInhale(val);
        expect(Number.isFinite(out)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(0.0);
        expect(out).toBeLessThanOrEqual(1.0);
      }
    });

    it('D22-ADV-2: passiveExhale returns strictly finite values in [0, 1] for all adversarial inputs', () => {
      for (const val of adversarialInputs) {
        const out = passiveExhale(val);
        expect(Number.isFinite(out)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(0.0);
        expect(out).toBeLessThanOrEqual(1.0);
      }
    });

    it('D22-ADV-3: calculateBreathMacro returns strictly finite values in [0, 1] across all stages', () => {
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      for (const stage of stages) {
        for (const val of adversarialInputs) {
          for (const phys of [false, true]) {
            const out = calculateBreathMacro(stage, val, phys);
            expect(Number.isFinite(out)).toBe(true);
            expect(out).toBeGreaterThanOrEqual(0.0);
            expect(out).toBeLessThanOrEqual(1.0);
          }
        }
      }
    });

    it('D22-ADV-4: calculateLogCutoff returns strictly finite Hz in [10, 20000] for all adversarial inputs', () => {
      for (const val of adversarialInputs) {
        const out = calculateLogCutoff(val);
        expect(Number.isFinite(out)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(10.0);
        expect(out).toBeLessThanOrEqual(20000.0);
      }
    });

    it('D22-ADV-5: calculateAcousticParameters returns all 12 valid finite params under corrupt inputs', () => {
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      for (const stage of stages) {
        for (const val of adversarialInputs) {
          const params = calculateAcousticParameters(val, stage, val);

          expect(Number.isFinite(params.filterCutoff)).toBe(true);
          expect(params.filterCutoff).toBeGreaterThanOrEqual(90);
          expect(params.filterCutoff).toBeLessThanOrEqual(14000);

          expect(Number.isFinite(params.filterResonance)).toBe(true);
          expect(params.filterResonance).toBeGreaterThanOrEqual(0.7);
          expect(params.filterResonance).toBeLessThanOrEqual(3.5);

          expect(Number.isFinite(params.noiseGain)).toBe(true);
          expect(params.noiseGain).toBeGreaterThanOrEqual(0.0);
          expect(params.noiseGain).toBeLessThanOrEqual(0.45);

          expect(Number.isFinite(params.noiseColor)).toBe(true);
          expect(params.noiseColor).toBeGreaterThanOrEqual(0.0);
          expect(params.noiseColor).toBeLessThanOrEqual(1.0);

          expect(Number.isFinite(params.noiseFriction)).toBe(true);
          expect(params.noiseFriction).toBeGreaterThanOrEqual(0.0);
          expect(params.noiseFriction).toBeLessThanOrEqual(1.0);

          expect(Number.isFinite(params.reverbWet)).toBe(true);
          expect(params.reverbWet).toBeGreaterThanOrEqual(0.0);
          expect(params.reverbWet).toBeLessThanOrEqual(1.0);

          expect(Number.isFinite(params.reverbDecay)).toBe(true);
          expect(params.reverbDecay).toBeGreaterThanOrEqual(1.0);
          expect(params.reverbDecay).toBeLessThanOrEqual(8.0);

          expect(Number.isFinite(params.delayWet)).toBe(true);
          expect(params.delayWet).toBeGreaterThanOrEqual(0.0);
          expect(params.delayWet).toBeLessThanOrEqual(1.0);

          expect(Number.isFinite(params.oscAWavetable)).toBe(true);
          expect(params.oscAWavetable).toBeGreaterThanOrEqual(0.0);
          expect(params.oscAWavetable).toBeLessThanOrEqual(23.0);

          expect(Number.isFinite(params.oscAHarmonics)).toBe(true);
          expect(params.oscAHarmonics).toBeGreaterThanOrEqual(0.0);
          expect(params.oscAHarmonics).toBeLessThanOrEqual(1.0);

          expect(Number.isFinite(params.droneGainBoost)).toBe(true);
          expect(params.droneGainBoost).toBeGreaterThanOrEqual(0.5);
          expect(params.droneGainBoost).toBeLessThanOrEqual(2.0);
        }
      }
    });

    it('D22-ADV-BUG-1: BreathStateMachine.tick(NaN) poisons stageElapsed and permanently freezes state machine', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Pass NaN to tick (e.g. from an undefined or corrupted time calculation)
      sm.tick(NaN);
      const snap1 = sm.getSnapshot();
      expect(Number.isNaN(snap1.stageProgress)).toBe(false);
      expect(Number.isNaN(snap1.breathMacro)).toBe(false);

      // Subsequent valid tick MUST advance clock normally, NOT remain poisoned
      const snap2 = sm.tick(1.0);
      expect(Number.isNaN(snap2.stageProgress)).toBe(false);
      expect(snap2.stageProgress).toBeCloseTo(0.25, 2);
    });

    it('D22-ADV-BUG-2: BreathStateMachine.tick(Infinity) sets cycleCount to Infinity and poisons stageElapsed via modulo', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Pass Infinity to tick (e.g. tab returned from prolonged background sleep)
      sm.tick(Infinity);
      const snap1 = sm.getSnapshot();
      expect(Number.isFinite(snap1.cycleCount)).toBe(true);

      // Subsequent valid tick MUST be safe and finite
      const snap2 = sm.tick(1.0);
      expect(Number.isNaN(snap2.stageProgress)).toBe(false);
    });

    it('D22-ADV-BUG-3: resolveEffectiveLfoRate and computeLfoLiveValue must return finite numbers when rate or depth is NaN', () => {
      // Math.max(0.001, NaN) returns NaN in free mode
      const rate = resolveEffectiveLfoRate(NaN);
      expect(Number.isFinite(rate)).toBe(true);
      expect(rate).toBeGreaterThanOrEqual(0.001);

      // computeLfoLiveValue with NaN rate or depth propagates NaN
      const liveValRate = computeLfoLiveValue(NaN, 0.5, 'sine', false, 1.0);
      expect(Number.isFinite(liveValRate)).toBe(true);

      const liveValDepth = computeLfoLiveValue(1.0, NaN, 'sine', false, 1.0);
      expect(Number.isFinite(liveValDepth)).toBe(true);
    });
  });

  // =========================================================================
  // D24: LFO Tempo Division & Breath Cycle Locking Math
  // =========================================================================
  describe('D24 Adversarial: BPM Divisions & Breath Locking Rate Equations', () => {
    it('D24-ADV-1: Exact mathematical frequency ratios across all BPM tempo subdivisions', () => {
      const testBpms = [40, 60, 96, 120, 144, 180, 240];

      for (const bpm of testBpms) {
        const r16 = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '1/16' });
        const r8  = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '1/8' });
        const r4  = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '1/4' });
        const r2  = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '1/2' });
        const r1  = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '1/1' });
        const r2_1 = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm, division: '2/1' });

        // Mathematical scaling invariants:
        expect(r16).toBeCloseTo(r8 * 2.0, 5);
        expect(r8).toBeCloseTo(r4 * 2.0, 5);
        expect(r4).toBeCloseTo(r2 * 2.0, 5);
        expect(r2).toBeCloseTo(r1 * 2.0, 5);
        expect(r1).toBeCloseTo(r2_1 * 2.0, 5);

        // Explicit beat rate check: at BPM B, 1/4 rate is B / 60 Hz
        expect(r4).toBeCloseTo(bpm / 60.0, 5);
      }
    });

    it('D24-ADV-2: Degenerate BPM inputs fallback gracefully to standard 120 BPM', () => {
      const badBpms = [0, -60, NaN, Infinity, -Infinity];
      for (const badBpm of badBpms) {
        const rate = resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: badBpm, division: '1/4' });
        // Standard 120 BPM -> 120 / 60 = 2.0 Hz
        expect(rate).toBeCloseTo(2.0, 4);
      }
    });

    it('D24-ADV-3: Breath cycle phase-locking across standard and extreme durations', () => {
      // 16s cycle -> 1/16 = 0.0625 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'breath', totalCycleDuration: 16.0 })).toBeCloseTo(0.0625, 6);
      // 30s cycle -> 1/30 ≈ 0.03333 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'breath', totalCycleDuration: 30.0 })).toBeCloseTo(1 / 30, 6);
      // 4s rapid cycle -> 0.25 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'breath', totalCycleDuration: 4.0 })).toBeCloseTo(0.25, 6);

      // Degenerate breath cycle duration (<= 0.001s, 0, NaN) fallbacks to baseRate (clamped >= 0.001)
      expect(resolveEffectiveLfoRate(0.5, { mode: 'breath', totalCycleDuration: 0.0 })).toBe(0.5);
      expect(resolveEffectiveLfoRate(0.5, { mode: 'breath', totalCycleDuration: -5.0 })).toBe(0.5);
      expect(resolveEffectiveLfoRate(0.5, { mode: 'breath', totalCycleDuration: NaN })).toBe(0.5);
    });

    it('D24-ADV-4: computeLfoLiveValue accurately respects sync and unipolar/bipolar mapping', () => {
      // 120 BPM, 1/4 note (2 Hz), sine wave, bipolar, depth = 0.5
      // Peak at phase = 0.25 -> t = 0.125s
      const syncConfig: LfoSyncConfig = { mode: 'bpm', bpm: 120, division: '1/4' };
      const peakVal = computeLfoLiveValue(1.0, 0.5, 'sine', false, 0.125, 'bipolar', syncConfig);
      expect(peakVal).toBeCloseTo(0.5, 3);

      // Trough at phase = 0.75 -> t = 0.375s
      const troughVal = computeLfoLiveValue(1.0, 0.5, 'sine', false, 0.375, 'bipolar', syncConfig);
      expect(troughVal).toBeCloseTo(-0.5, 3);

      // Unipolar mapping: [-1, 1] mapped to [0, depth]
      const uniPeak = computeLfoLiveValue(1.0, 0.5, 'sine', false, 0.125, 'unipolar', syncConfig);
      expect(uniPeak).toBeCloseTo(0.5, 3);

      const uniTrough = computeLfoLiveValue(1.0, 0.5, 'sine', false, 0.375, 'unipolar', syncConfig);
      expect(uniTrough).toBeCloseTo(0.0, 3);
    });
  });

  // =========================================================================
  // D25: Deterministic Hash PRNG Sample & Hold Waveform Invariants
  // =========================================================================
  describe('D25 Adversarial: Sample & Hold PRNG Mathematical Invariants', () => {
    it('D25-ADV-1: hashIntToBipolar bounds and statistical uniformity over 20,000 seeds', () => {
      let sum = 0;
      let sumSq = 0;
      const N = 20000;
      let minVal = 1.0;
      let maxVal = -1.0;

      for (let i = 0; i < N; i++) {
        const val = hashIntToBipolar(i);
        expect(val).toBeGreaterThanOrEqual(-1.0);
        expect(val).toBeLessThanOrEqual(1.0);

        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
        sum += val;
        sumSq += val * val;
      }

      const mean = sum / N;
      const variance = (sumSq / N) - (mean * mean);

      // Uniform distribution on [-1, 1] has mean = 0, variance = (b - a)^2 / 12 = 4/12 = 0.3333
      expect(Math.abs(mean)).toBeLessThan(0.03); // Mean within ±0.03 of 0
      expect(variance).toBeGreaterThan(0.30);   // Variance close to 0.333
      expect(variance).toBeLessThan(0.36);
      expect(minVal).toBeLessThan(-0.95);
      expect(maxVal).toBeGreaterThan(0.95);
    });

    it('D25-ADV-2: Strict Sample & Hold zero-jitter intra-cycle latching across 1,000 cycles', () => {
      for (let cycle = 0; cycle < 1000; cycle++) {
        // Latch base value at phase 0
        const baseVal = evaluateLfoWaveform('random', 0.0, cycle);

        // Sample 20 random phases within [0.0, 0.999999]
        for (let s = 0; s < 20; s++) {
          const phase = (s * 0.047 + 0.01) % 1.0;
          const sampleVal = evaluateLfoWaveform('random', phase, cycle);
          // Zero jitter allowed within the same cycle!
          expect(sampleVal).toBe(baseVal);
        }
      }
    });

    it('D25-ADV-3: Cycle transition diversity across 500 consecutive cycles', () => {
      let identicalConsecutiveCount = 0;
      let prevVal = evaluateLfoWaveform('random', 0.5, 0);

      for (let cycle = 1; cycle < 500; cycle++) {
        const currentVal = evaluateLfoWaveform('random', 0.5, cycle);
        if (currentVal === prevVal) {
          identicalConsecutiveCount++;
        }
        prevVal = currentVal;
      }

      // In a 32-bit PRNG, consecutive identical outputs should be extremely rare (< 1 in 500)
      expect(identicalConsecutiveCount).toBeLessThan(2);
    });

    it('D25-ADV-4: Phase wrap-around robustness with arbitrary phase values', () => {
      const cycle = 77;
      const expected = evaluateLfoWaveform('random', 0.3, cycle);
      // Phase wrapped by integers should return same value
      expect(evaluateLfoWaveform('random', 10.3, cycle)).toBe(expected);
      expect(evaluateLfoWaveform('random', -5.7, cycle)).toBe(expected);
    });
  });

  // =========================================================================
  // D26: Four-Stage C0 Hermite Parameter Continuity (<= 1e-4 delta)
  // =========================================================================
  describe('D26 Adversarial: Strict C0 Continuity <= 1e-4 Delta Across All Stage Boundaries', () => {
    const paramKeys: (keyof AcousticModulationParams)[] = [
      'filterCutoff',
      'filterResonance',
      'noiseGain',
      'noiseColor',
      'noiseFriction',
      'reverbWet',
      'reverbDecay',
      'delayWet',
      'oscAWavetable',
      'oscAHarmonics',
      'pitchDriftCents',
      'droneGainBoost'
    ];

    it('D26-ADV-1: Boundary 1 (Inhale end -> HoldIn start) delta <= 1e-4 across all 12 parameters', () => {
      const inhaleEnd = calculateAcousticParameters(1.0, 'inhale', 1.0);
      const holdInStart = calculateAcousticParameters(1.0, 'holdIn', 0.0);

      for (const key of paramKeys) {
        const delta = Math.abs(inhaleEnd[key] - holdInStart[key]);
        expect(delta).toBeLessThanOrEqual(1e-4);
      }
    });

    it('D26-ADV-2: Boundary 2 (HoldIn end -> Exhale start) delta <= 1e-4 across all 12 parameters', () => {
      const holdInEnd = calculateAcousticParameters(1.0, 'holdIn', 1.0);
      const exhaleStart = calculateAcousticParameters(1.0, 'exhale', 0.0);

      for (const key of paramKeys) {
        const delta = Math.abs(holdInEnd[key] - exhaleStart[key]);
        expect(delta).toBeLessThanOrEqual(1e-4);
      }
    });

    it('D26-ADV-3: Boundary 3 (Exhale end -> HoldOut start) delta <= 1e-4 across all 12 parameters', () => {
      const exhaleEnd = calculateAcousticParameters(0.0, 'exhale', 1.0);
      const holdOutStart = calculateAcousticParameters(0.0, 'holdOut', 0.0);

      for (const key of paramKeys) {
        const delta = Math.abs(exhaleEnd[key] - holdOutStart[key]);
        expect(delta).toBeLessThanOrEqual(1e-4);
      }
    });

    it('D26-ADV-4: Boundary 4 (HoldOut end -> Inhale start) delta <= 1e-4 across all 12 parameters', () => {
      const holdOutEnd = calculateAcousticParameters(0.0, 'holdOut', 1.0);
      const inhaleStart = calculateAcousticParameters(0.0, 'inhale', 0.0);

      for (const key of paramKeys) {
        const delta = Math.abs(holdOutEnd[key] - inhaleStart[key]);
        expect(delta).toBeLessThanOrEqual(1e-4);
      }
    });

    it('D26-ADV-5: Epsilon-neighborhood continuity (relative delta <= 1e-4 at p = 1 - 1e-6 and p = 1e-6)', () => {
      const eps = 1e-6;
      // Boundary 1
      const p1A = calculateAcousticParameters(1.0, 'inhale', 1.0 - eps);
      const p1B = calculateAcousticParameters(1.0, 'holdIn', eps);
      for (const key of paramKeys) {
        if (key === 'filterCutoff') {
          expect(Math.abs(p1A[key] - p1B[key]) / p1A[key]).toBeLessThan(1e-4);
        } else {
          expect(Math.abs(p1A[key] - p1B[key])).toBeLessThan(1e-4);
        }
      }

      // Boundary 2
      const p2A = calculateAcousticParameters(1.0, 'holdIn', 1.0 - eps);
      const p2B = calculateAcousticParameters(1.0, 'exhale', eps);
      for (const key of paramKeys) {
        if (key === 'filterCutoff') {
          expect(Math.abs(p2A[key] - p2B[key]) / p2A[key]).toBeLessThan(1e-4);
        } else {
          expect(Math.abs(p2A[key] - p2B[key])).toBeLessThan(1e-4);
        }
      }

      // Boundary 3
      const p3A = calculateAcousticParameters(0.0, 'exhale', 1.0 - eps);
      const p3B = calculateAcousticParameters(0.0, 'holdOut', eps);
      for (const key of paramKeys) {
        if (key === 'filterCutoff') {
          expect(Math.abs(p3A[key] - p3B[key]) / p3A[key]).toBeLessThan(1e-4);
        } else {
          expect(Math.abs(p3A[key] - p3B[key])).toBeLessThan(1e-4);
        }
      }

      // Boundary 4
      const p4A = calculateAcousticParameters(0.0, 'holdOut', 1.0 - eps);
      const p4B = calculateAcousticParameters(0.0, 'inhale', eps);
      for (const key of paramKeys) {
        if (key === 'filterCutoff') {
          expect(Math.abs(p4A[key] - p4B[key]) / p4A[key]).toBeLessThan(1e-4);
        } else {
          expect(Math.abs(p4A[key] - p4B[key])).toBeLessThan(1e-4);
        }
      }
    });

    it('D26-ADV-6: 10,000-point trajectory sweep reveals NO step jumps across full cycle', () => {
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      const pointsPerStage = 2500;

      let prevParams: AcousticModulationParams | null = null;
      let maxCutoffStep = 0;
      let maxGainStep = 0;

      for (const stage of stages) {
        for (let i = 0; i <= pointsPerStage; i++) {
          const p = i / pointsPerStage;
          const macro = calculateBreathMacro(stage, p, false);
          const currentParams = calculateAcousticParameters(macro, stage, p);

          if (prevParams) {
            const cutoffDiff = Math.abs(currentParams.filterCutoff - prevParams.filterCutoff);
            const gainDiff = Math.abs(currentParams.noiseGain - prevParams.noiseGain);
            if (cutoffDiff > maxCutoffStep) maxCutoffStep = cutoffDiff;
            if (gainDiff > maxGainStep) maxGainStep = gainDiff;
          }
          prevParams = currentParams;
        }
      }

      // In a 10,000-point sweep over the 14000 Hz range, max discrete step between adjacent points
      // matches the continuous derivative (< 50 Hz per 0.0004 step) with zero vertical jumps
      expect(maxCutoffStep).toBeLessThan(50.0);
      // Max noise gain step should be tiny (< 0.005)
      expect(maxGainStep).toBeLessThan(0.005);
    });
  });

  // =========================================================================
  // D23 & DualLfoModule Web Audio Lifecycle & Stress
  // =========================================================================
  describe('D23 Adversarial: DualLfoModule Lifecycle, Purge & Routing Stress', () => {
    it('D23-ADV-1: Full multi-param routing, purge zeroing, and restore ramp verification', () => {
      const dualLfo = new DualLfoModule(ctx as unknown as AudioContext);
      dualLfo.start(0);

      const mockDetune = { value: 0, setTargetAtTime: () => {} } as unknown as AudioParam;
      const mockFilter = { value: 1000, setTargetAtTime: () => {} } as unknown as AudioParam;
      const mockPan = { value: 0, setTargetAtTime: () => {} } as unknown as AudioParam;
      const mockTremolo = { value: 1.0, setTargetAtTime: () => {} } as unknown as AudioParam;

      dualLfo.connectDetune(mockDetune);
      dualLfo.connectFilter(mockFilter);
      dualLfo.connectPan(mockPan);
      dualLfo.connectTremolo(mockTremolo);

      expect(dualLfo.hasActiveConnections()).toBe(true);

      // Verify Purge zeros out mod output gains via scheduled timeline
      dualLfo.purge();
      const now = ctx.currentTime;
      expect((dualLfo.detuneModOut.gain as any).getValueAtTime(now)).toBe(0.0);
      expect((dualLfo.filterModOut.gain as any).getValueAtTime(now)).toBe(0.0);
      expect((dualLfo.panModOut.gain as any).getValueAtTime(now)).toBe(0.0);
      expect((dualLfo.tremoloModOut.gain as any).getValueAtTime(now)).toBe(0.0);

      // Verify Restore schedules ramp back to 1.0 at now + 0.005
      dualLfo.restore();
      expect((dualLfo.detuneModOut.gain as any).getValueAtTime(now + 0.005)).toBeCloseTo(1.0, 3);
      expect((dualLfo.filterModOut.gain as any).getValueAtTime(now + 0.005)).toBeCloseTo(1.0, 3);
      expect((dualLfo.panModOut.gain as any).getValueAtTime(now + 0.005)).toBeCloseTo(1.0, 3);
      expect((dualLfo.tremoloModOut.gain as any).getValueAtTime(now + 0.005)).toBeCloseTo(1.0, 3);

      dualLfo.disconnectAll();
      expect(dualLfo.hasActiveConnections()).toBe(false);

      dualLfo.dispose();
    });

    it('D23-ADV-2: 50 rapid parameter mutations and bypass toggles during running context', () => {
      const dualLfo = new DualLfoModule(ctx as unknown as AudioContext);
      dualLfo.start(0);

      const shapes: LfoShape[] = ['sine', 'triangle', 'sawtooth', 'square', 'random'];

      for (let i = 0; i < 50; i++) {
        dualLfo.setLfo1Params({
          rate: (i % 10) * 0.5 + 0.1,
          depth: (i % 5) * 0.2,
          shape: shapes[i % shapes.length],
          bypass: i % 4 === 0,
          polarity: i % 2 === 0 ? 'bipolar' : 'unipolar'
        });

        dualLfo.setLfo2Params({
          rate: (i % 8) * 0.3 + 0.05,
          depth: (i % 5) * 0.2,
          filterMod: (i % 3) * 0.3,
          panMod: (i % 4) * 0.25,
          tremoloMod: (i % 2) * 0.1,
          shape: shapes[(i + 1) % shapes.length],
          bypass: i % 3 === 0
        });

        const v1 = dualLfo.computeLiveLfo1(i * 0.1);
        const v2 = dualLfo.computeLiveLfo2(i * 0.1);

        expect(Number.isFinite(v1)).toBe(true);
        expect(Number.isFinite(v2)).toBe(true);
      }

      dualLfo.dispose();
    });

    it('D23-ADV-3: Idempotent disposal and safe no-op on redundant calls', () => {
      const dualLfo = new DualLfoModule(ctx as unknown as AudioContext);
      dualLfo.dispose();
      // Redundant dispose must not throw
      expect(() => dualLfo.dispose()).not.toThrow();
      // Setting params after dispose must be safe no-op
      expect(() => dualLfo.setLfo1Params({ rate: 5.0 })).not.toThrow();
      expect(() => dualLfo.setLfo2Params({ rate: 5.0 })).not.toThrow();
    });
  });
});
