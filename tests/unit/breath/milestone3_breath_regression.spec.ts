import { describe, it, expect } from 'vitest';
import { BreathStateMachine } from '../../../src/breath/stateMachine';
import {
  sigmoidInhale,
  passiveExhale,
  calculateBreathMacro,
  calculateAcousticParameters
} from '../../../src/breath/macro';
import {
  evaluateLfoWaveform,
  computeLfoLiveValue,
  resolveEffectiveLfoRate,
  hashIntToBipolar
} from '../../../src/audio/dsp/lfoMath';
import { DualLfoModule } from '../../../src/audio/nodes/DualLfoModule';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Milestone 3 Regression Suite: Biological Rhythm & Modulation Bus Symbiosis (D19-D26)', () => {

  // =========================================================================
  // D19: setRhythm stageElapsed Reset on 0-Duration Active Stage Transition
  // =========================================================================
  describe('D19: setRhythm stageElapsed Reset on 0s Stage Transition', () => {
    it('resets stageElapsed to 0 when active stage is dynamically set to 0s, preventing cascade', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 10.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Advance 7 seconds into inhale
      sm.tick(7.0);
      expect(sm.getCurrentStage()).toBe('inhale');

      // Dynamically reconfigure inhale to 0.0s (e.g. switching to sleep/tactical rhythm)
      sm.setRhythm({ inhale: 0.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });

      // State machine immediately passes through to holdIn
      expect(sm.getCurrentStage()).toBe('holdIn');

      // D19 Guard: stageElapsed must be reset to 0 so holdIn does not inherit 7s leftover time
      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBe(0.0);
      expect(snap.stageRemainingSeconds).toBe(4.0);
      expect(sm.getCycleCount()).toBe(0);

      // Subsequent 1s tick advances smoothly within holdIn (not skipping through holdIn/exhale/holdOut)
      sm.tick(1.0);
      expect(sm.getCurrentStage()).toBe('holdIn');
      expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.25, 3);
      expect(sm.getCycleCount()).toBe(0);
    });
  });

  // =========================================================================
  // D20: All 0-Duration Degenerate Rhythm Guard
  // =========================================================================
  describe('D20: Degenerate All-Zero Rhythm Total Cycle Duration Guard', () => {
    it('guards against infinite while-loop spinning and rapid cycleCount inflation on all-0s rhythm', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 0.0, holdIn: 0.0, exhale: 0.0, holdOut: 0.0 },
        autoStart: true
      });

      expect(sm.getTotalCycleDuration()).toBe(0.0);

      // Perform 100 ticks of 16ms simulation
      for (let i = 0; i < 100; i++) {
        const snap = sm.tick(0.016);
        expect(snap.cycleCount).toBe(0);
        expect(Number.isNaN(snap.stageProgress)).toBe(false);
        expect(Number.isNaN(snap.breathMacro)).toBe(false);
      }

      // cycleCount must remain 0 and not inflate
      expect(sm.getCycleCount()).toBe(0);
    });
  });

  // =========================================================================
  // D21: setStage Passthrough Does Not Increment cycleCount
  // =========================================================================
  describe('D21: Manual setStage Passthrough cycleCount Isolation', () => {
    it('does not increment cycleCount when setStage targets a 0-duration holdOut stage', () => {
      // 4-7-8 relaxation pattern: holdOut is 0.0s
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 },
        autoStart: false
      });

      expect(sm.getCycleCount()).toBe(0);

      // Manually set stage to holdOut (0s)
      sm.setStage('holdOut');

      // Passes through to inhale, but cycleCount must remain 0 because it was not a completed cycle
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(0);

      // Ticking naturally through a full 19s cycle still properly increments cycleCount
      sm.start();
      sm.tick(4.0); // inhale -> holdIn
      sm.tick(7.0); // holdIn -> exhale
      sm.tick(8.0); // exhale -> holdOut(0s) -> inhale: 1 cycle complete!
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(1);
    });
  });

  // =========================================================================
  // D22: Number.isFinite NaN Guards in Breath Macro Curves
  // =========================================================================
  describe('D22: Robust NaN Defense in sigmoidInhale, passiveExhale & calculateBreathMacro', () => {
    it('sigmoidInhale sanitizes NaN and Infinity to safe finite outputs', () => {
      const nanRes = sigmoidInhale(NaN);
      expect(Number.isFinite(nanRes)).toBe(true);
      expect(nanRes).toBeCloseTo(0.0, 4);

      const infRes = sigmoidInhale(Infinity);
      expect(Number.isFinite(infRes)).toBe(true);
      expect(infRes).toBeCloseTo(0.0, 4);

      const negInfRes = sigmoidInhale(-Infinity);
      expect(Number.isFinite(negInfRes)).toBe(true);
      expect(negInfRes).toBeCloseTo(0.0, 4);
    });

    it('passiveExhale sanitizes NaN and Infinity to safe finite outputs', () => {
      const nanRes = passiveExhale(NaN);
      expect(Number.isFinite(nanRes)).toBe(true);
      expect(nanRes).toBeCloseTo(1.0, 4);

      const infRes = passiveExhale(Infinity);
      expect(Number.isFinite(infRes)).toBe(true);
      expect(infRes).toBeCloseTo(1.0, 4);
    });

    it('calculateBreathMacro sanitizes NaN across all stages', () => {
      expect(calculateBreathMacro('inhale', NaN)).toBe(0.0);
      expect(calculateBreathMacro('holdIn', NaN)).toBe(1.0);
      expect(calculateBreathMacro('exhale', NaN)).toBe(1.0);
      expect(calculateBreathMacro('holdOut', NaN)).toBe(0.0);

      expect(calculateBreathMacro('inhale', NaN, true)).toBeCloseTo(0.0, 4);
      expect(calculateBreathMacro('exhale', NaN, true)).toBeCloseTo(1.0, 4);
    });
  });

  // =========================================================================
  // D23: DualLfoModule Architecture Alignment & Idle Node Cleanup
  // =========================================================================
  describe('D23: DualLfoModule Architecture Integration & Connection Tracking', () => {
    it('supports direct AudioParam modulation routing and connection lifecycle', () => {
      const ctx = new MockAudioContext();
      const dualLfo = new DualLfoModule(ctx as unknown as AudioContext);

      expect(dualLfo.hasActiveConnections()).toBe(false);

      const mockParam = {
        value: 0,
        setTargetAtTime: () => {}
      } as unknown as AudioParam;

      dualLfo.connectDetune(mockParam);
      expect(dualLfo.hasActiveConnections()).toBe(true);

      dualLfo.disconnectAll();
      expect(dualLfo.hasActiveConnections()).toBe(false);

      // Verify disposal cleans up without errors
      expect(() => dualLfo.dispose()).not.toThrow();
    });

    it('provides software modulation live compute helpers for LFO1 and LFO2', () => {
      const ctx = new MockAudioContext();
      const dualLfo = new DualLfoModule(ctx as unknown as AudioContext);

      dualLfo.setLfo1Params({ rate: 1.0, depth: 0.8, shape: 'sine', bypass: false });
      dualLfo.setLfo2Params({ rate: 0.5, depth: 0.5, shape: 'triangle', bypass: false });

      // Peak of 1Hz sine is at t = 0.25s
      const lfo1Val = dualLfo.computeLiveLfo1(0.25);
      expect(lfo1Val).toBeCloseTo(0.8, 3);

      // Peak of 0.5Hz triangle is at t = 0.5s (phase = 0.25)
      const lfo2Val = dualLfo.computeLiveLfo2(0.5);
      expect(lfo2Val).toBeCloseTo(0.5, 3);

      // Bypass check
      dualLfo.setLfo1Params({ bypass: true });
      expect(dualLfo.computeLiveLfo1(0.25)).toBe(0.0);
    });

    it('computes live LFO values directly via computeLfoLiveValue with depth clamping and bypass', () => {
      // Direct validation of pure DSP computeLfoLiveValue helper
      const valSine = computeLfoLiveValue(1.0, 0.8, 'sine', false, 0.25);
      expect(valSine).toBeCloseTo(0.8, 3);

      const valBypassed = computeLfoLiveValue(1.0, 0.8, 'sine', true, 0.25);
      expect(valBypassed).toBe(0.0);

      const valUnipolar = computeLfoLiveValue(1.0, 1.0, 'sine', false, 0.25, 'unipolar');
      expect(valUnipolar).toBeCloseTo(1.0, 3);
    });
  });

  // =========================================================================
  // D24: LfoSyncConfig BPM Divisions & Breath Cycle Lock-In
  // =========================================================================
  describe('D24: LfoSyncConfig Tempo Division & Breath Cycle Locking', () => {
    it('resolves BPM tempo subdivisions accurately across standard time signatures', () => {
      // At 120 BPM: quarter note (1/4) = 2.0 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '1/4' })).toBeCloseTo(2.0, 4);
      // Eighth note (1/8) = 4.0 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '1/8' })).toBeCloseTo(4.0, 4);
      // Sixteenth note (1/16) = 8.0 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '1/16' })).toBeCloseTo(8.0, 4);
      // Half note (1/2) = 1.0 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '1/2' })).toBeCloseTo(1.0, 4);
      // Whole note (1/1) = 0.5 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '1/1' })).toBeCloseTo(0.5, 4);
      // Double whole note (2/1) = 0.25 Hz
      expect(resolveEffectiveLfoRate(1.0, { mode: 'bpm', bpm: 120, division: '2/1' })).toBeCloseTo(0.25, 4);
    });

    it('locks LFO frequency to total breath cycle duration in breath-cycle sync mode', () => {
      // 16s Box breathing cycle -> 1/16 = 0.0625 Hz
      const rate16s = resolveEffectiveLfoRate(1.0, { mode: 'breath', totalCycleDuration: 16.0 });
      expect(rate16s).toBeCloseTo(0.0625, 5);

      // 19s 4-7-8 relaxation cycle -> 1/19 ≈ 0.05263 Hz
      const rate19s = resolveEffectiveLfoRate(1.0, { mode: 'breath', totalCycleDuration: 19.0 });
      expect(rate19s).toBeCloseTo(1.0 / 19.0, 5);
    });

    it('falls back safely to baseRate when mode is free or config is omitted', () => {
      expect(resolveEffectiveLfoRate(3.14, undefined)).toBe(3.14);
      expect(resolveEffectiveLfoRate(2.5, { mode: 'free' })).toBe(2.5);
    });
  });

  // =========================================================================
  // D25: Deterministic Hash PRNG Sample & Hold Random Waveform
  // =========================================================================
  describe('D25: Deterministic Hash PRNG Sample & Hold Random Waveform', () => {
    it('strictly holds the sampled random value constant across entire normalized phase [0, 1)', () => {
      const cycleIdx = 42;
      const valStart = evaluateLfoWaveform('random', 0.0, cycleIdx);
      const valMid1 = evaluateLfoWaveform('random', 0.25, cycleIdx);
      const valMid2 = evaluateLfoWaveform('random', 0.5, cycleIdx);
      const valEnd = evaluateLfoWaveform('random', 0.99, cycleIdx);

      expect(valMid1).toBe(valStart);
      expect(valMid2).toBe(valStart);
      expect(valEnd).toBe(valStart);
    });

    it('generates distinct pseudo-random numbers across consecutive cycles instead of fixed 4-step sequence', () => {
      const values = new Set<number>();
      for (let cycle = 0; cycle < 32; cycle++) {
        const val = evaluateLfoWaveform('random', 0.0, cycle);
        expect(val).toBeGreaterThanOrEqual(-1.0);
        expect(val).toBeLessThanOrEqual(1.0);
        values.add(val);
      }

      // 32 distinct cycles should produce at least 25 unique values (not 4 hardcoded steps!)
      expect(values.size).toBeGreaterThan(25);
    });

    it('hashIntToBipolar is deterministic and reproducible', () => {
      const h1 = hashIntToBipolar(12345);
      const h2 = hashIntToBipolar(12345);
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThanOrEqual(-1.0);
      expect(h1).toBeLessThanOrEqual(1.0);
    });
  });

  // =========================================================================
  // D26: Four-Stage C0 Parameter Continuity across Stage Boundaries
  // =========================================================================
  describe('D26: C0 Boundary Continuity across All 4 Breath Stages', () => {
    it('ensures C0 continuity at Boundary 1: inhale(1.0) == holdIn(0.0)', () => {
      const inhaleEnd = calculateAcousticParameters(1.0, 'inhale', 1.0);
      const holdInStart = calculateAcousticParameters(1.0, 'holdIn', 0.0);

      expect(holdInStart.filterCutoff).toBeCloseTo(inhaleEnd.filterCutoff, 1);
      expect(holdInStart.filterResonance).toBeCloseTo(inhaleEnd.filterResonance, 2);
      expect(holdInStart.noiseGain).toBeCloseTo(inhaleEnd.noiseGain, 2);
      expect(holdInStart.noiseColor).toBeCloseTo(inhaleEnd.noiseColor, 2);
      expect(holdInStart.noiseFriction).toBeCloseTo(inhaleEnd.noiseFriction, 2);
      expect(holdInStart.reverbWet).toBeCloseTo(inhaleEnd.reverbWet, 2);
      expect(holdInStart.reverbDecay).toBeCloseTo(inhaleEnd.reverbDecay, 2);
      expect(holdInStart.delayWet).toBeCloseTo(inhaleEnd.delayWet, 2);
      expect(holdInStart.oscAWavetable).toBeCloseTo(inhaleEnd.oscAWavetable, 2);
      expect(holdInStart.oscAHarmonics).toBeCloseTo(inhaleEnd.oscAHarmonics, 2);
      expect(holdInStart.pitchDriftCents).toBeCloseTo(inhaleEnd.pitchDriftCents, 2);
      expect(holdInStart.droneGainBoost).toBeCloseTo(inhaleEnd.droneGainBoost, 2);
    });

    it('ensures C0 continuity at Boundary 2: holdIn(1.0) == exhale(0.0)', () => {
      const holdInEnd = calculateAcousticParameters(1.0, 'holdIn', 1.0);
      const exhaleStart = calculateAcousticParameters(1.0, 'exhale', 0.0);

      expect(holdInEnd.filterCutoff).toBeCloseTo(exhaleStart.filterCutoff, 1);
      expect(holdInEnd.filterResonance).toBeCloseTo(exhaleStart.filterResonance, 2);
      expect(holdInEnd.noiseGain).toBeCloseTo(exhaleStart.noiseGain, 2);
      expect(holdInEnd.noiseColor).toBeCloseTo(exhaleStart.noiseColor, 2);
      expect(holdInEnd.noiseFriction).toBeCloseTo(exhaleStart.noiseFriction, 2);
      expect(holdInEnd.reverbWet).toBeCloseTo(exhaleStart.reverbWet, 2);
      expect(holdInEnd.reverbDecay).toBeCloseTo(exhaleStart.reverbDecay, 2);
      expect(holdInEnd.delayWet).toBeCloseTo(exhaleStart.delayWet, 2);
      expect(holdInEnd.oscAWavetable).toBeCloseTo(exhaleStart.oscAWavetable, 2);
      expect(holdInEnd.oscAHarmonics).toBeCloseTo(exhaleStart.oscAHarmonics, 2);
      expect(holdInEnd.pitchDriftCents).toBeCloseTo(exhaleStart.pitchDriftCents, 2);
      expect(holdInEnd.droneGainBoost).toBeCloseTo(exhaleStart.droneGainBoost, 2);
    });

    it('ensures C0 continuity at Boundary 3: exhale(1.0) == holdOut(0.0)', () => {
      const exhaleEnd = calculateAcousticParameters(0.0, 'exhale', 1.0);
      const holdOutStart = calculateAcousticParameters(0.0, 'holdOut', 0.0);

      expect(holdOutStart.filterCutoff).toBeCloseTo(exhaleEnd.filterCutoff, 1);
      expect(holdOutStart.filterResonance).toBeCloseTo(exhaleEnd.filterResonance, 2);
      expect(holdOutStart.noiseGain).toBeCloseTo(exhaleEnd.noiseGain, 2);
      expect(holdOutStart.noiseColor).toBeCloseTo(exhaleEnd.noiseColor, 2);
      expect(holdOutStart.noiseFriction).toBeCloseTo(exhaleEnd.noiseFriction, 2);
      expect(holdOutStart.reverbWet).toBeCloseTo(exhaleEnd.reverbWet, 2);
      expect(holdOutStart.reverbDecay).toBeCloseTo(exhaleEnd.reverbDecay, 2);
      expect(holdOutStart.delayWet).toBeCloseTo(exhaleEnd.delayWet, 2);
      expect(holdOutStart.oscAWavetable).toBeCloseTo(exhaleEnd.oscAWavetable, 2);
      expect(holdOutStart.oscAHarmonics).toBeCloseTo(exhaleEnd.oscAHarmonics, 2);
      expect(holdOutStart.pitchDriftCents).toBeCloseTo(exhaleEnd.pitchDriftCents, 2);
      expect(holdOutStart.droneGainBoost).toBeCloseTo(exhaleEnd.droneGainBoost, 2);
    });

    it('ensures C0 continuity at Boundary 4: holdOut(1.0) == inhale(0.0)', () => {
      const holdOutEnd = calculateAcousticParameters(0.0, 'holdOut', 1.0);
      const inhaleStart = calculateAcousticParameters(0.0, 'inhale', 0.0);

      expect(holdOutEnd.filterCutoff).toBeCloseTo(inhaleStart.filterCutoff, 1);
      expect(holdOutEnd.filterResonance).toBeCloseTo(inhaleStart.filterResonance, 2);
      expect(holdOutEnd.noiseGain).toBeCloseTo(inhaleStart.noiseGain, 2);
      expect(holdOutEnd.noiseColor).toBeCloseTo(inhaleStart.noiseColor, 2);
      expect(holdOutEnd.noiseFriction).toBeCloseTo(inhaleStart.noiseFriction, 2);
      expect(holdOutEnd.reverbWet).toBeCloseTo(inhaleStart.reverbWet, 2);
      expect(holdOutEnd.reverbDecay).toBeCloseTo(inhaleStart.reverbDecay, 2);
      expect(holdOutEnd.delayWet).toBeCloseTo(inhaleStart.delayWet, 2);
      expect(holdOutEnd.oscAWavetable).toBeCloseTo(inhaleStart.oscAWavetable, 2);
      expect(holdOutEnd.oscAHarmonics).toBeCloseTo(inhaleStart.oscAHarmonics, 2);
      expect(holdOutEnd.pitchDriftCents).toBeCloseTo(inhaleStart.pitchDriftCents, 2);
      expect(holdOutEnd.droneGainBoost).toBeCloseTo(inhaleStart.droneGainBoost, 2);
    });

    it('preserves canonical plateau parameters at mid-stage (p = 0.5) for holdIn and holdOut', () => {
      const holdInMid = calculateAcousticParameters(1.0, 'holdIn', 0.5);
      expect(holdInMid.filterCutoff).toBe(12500);
      expect(holdInMid.filterResonance).toBe(2.8);
      expect(holdInMid.noiseGain).toBe(0.0);
      expect(holdInMid.reverbWet).toBe(0.65);
      expect(holdInMid.reverbDecay).toBe(6.5);
      expect(holdInMid.delayWet).toBe(0.30);

      const holdOutMid = calculateAcousticParameters(0.0, 'holdOut', 0.5);
      expect(holdOutMid.filterCutoff).toBe(140);
      expect(holdOutMid.filterResonance).toBe(0.7);
      expect(holdOutMid.noiseGain).toBe(0.0);
      expect(holdOutMid.reverbWet).toBe(0.10);
      expect(holdOutMid.reverbDecay).toBe(2.0);
      expect(holdOutMid.delayWet).toBe(0.0);
    });
  });
});
