import { describe, it, expect } from 'vitest';
import { BreathStateMachine } from '../../src/breath/stateMachine';
import { BreathEngine } from '../../src/breath/engine';
import {
  calculateBreathMacro,
  sigmoidInhale,
  passiveExhale,
  calculateLogCutoff,
  calculateAcousticParameters
} from '../../src/breath/macro';
import {
  evaluateTensionCurve,
  calculateTimelineStageWidths,
  mapNormalizedToPhysical
} from '../../src/breath/timeline';
import { FACTORY_RHYTHMS } from '../../src/breath/storage';
import type { BreathRhythmConfig } from '../../src/types';

describe('Tier 5 Adversarial: Milestone M2 Breath State Machine & Engine Stress Tests', () => {

  // =========================================================================
  // 1. STRESS-TEST: 0-Duration Passthrough & Degenerate Configurations
  // =========================================================================
  describe('1. 0-Duration Passthrough & Degenerate Rhythm Stress', () => {
    it('1.1: 4-7-8 Relaxation Rhythm (HoldOut = 0s) over 100 continuous cycles', () => {
      const rhythm: BreathRhythmConfig = {
        inhale: 4.0,
        holdIn: 7.0,
        exhale: 8.0,
        holdOut: 0.0
      };
      const cycleDuration = 19.0;
      const sm = new BreathStateMachine({ rhythm, autoStart: true });

      // Simulate 100 complete cycles with 50ms ticks
      const dt = 0.05;
      const totalSeconds = 100 * cycleDuration;
      const steps = Math.round(totalSeconds / dt);

      let holdOutEncountered = 0;
      for (let i = 0; i < steps; i++) {
        const snap = sm.tick(dt);
        if (snap.currentStage === 'holdOut') {
          holdOutEncountered++;
        }
        // Assert no NaN in any snapshot metric
        expect(Number.isNaN(snap.stageProgress)).toBe(false);
        expect(Number.isNaN(snap.cycleProgress)).toBe(false);
        expect(Number.isNaN(snap.breathMacro)).toBe(false);
        expect(Number.isNaN(snap.stageRemainingSeconds)).toBe(false);
        expect(snap.stageProgress).toBeGreaterThanOrEqual(0.0);
        expect(snap.stageProgress).toBeLessThanOrEqual(1.0);
        expect(snap.breathMacro).toBeGreaterThanOrEqual(0.0);
        expect(snap.breathMacro).toBeLessThanOrEqual(1.0);
      }

      // HoldOut must never linger as an active running stage
      expect(holdOutEncountered).toBe(0);
      const endSnap = sm.getSnapshot();
      // Due to binary float accumulation (dt = 0.05), after 38000 steps we are at 99.9999999999% of cycle 100
      expect(endSnap.cycleProgress).toBeCloseTo(1.0, 4);
      expect(sm.getCycleCount()).toBeGreaterThanOrEqual(99);
      // One tiny tick of 1ms pushes past the 4-picosecond remainder into cycle 100
      sm.tick(0.001);
      expect(sm.getCycleCount()).toBe(100);
      expect(sm.getCurrentStage()).toBe('inhale');
    });

    it('1.2: Box Breathing (4-4-4-4) baseline over 50 cycles with exact transition order', () => {
      const rhythm: BreathRhythmConfig = {
        inhale: 4.0,
        holdIn: 4.0,
        exhale: 4.0,
        holdOut: 4.0
      };
      const sm = new BreathStateMachine({ rhythm, autoStart: true });

      const stageSequence: string[] = [];
      let lastStage = sm.getCurrentStage();
      stageSequence.push(lastStage);

      // Step across 50 full cycles (800 seconds) in 1-second chunks
      for (let sec = 0; sec < 800; sec++) {
        const snap = sm.tick(1.0);
        if (snap.currentStage !== lastStage) {
          stageSequence.push(snap.currentStage);
          lastStage = snap.currentStage;
        }
      }

      expect(sm.getCycleCount()).toBe(50);
      // Verify cyclic pattern strictly: inhale -> holdIn -> exhale -> holdOut
      for (let i = 0; i < stageSequence.length - 1; i++) {
        const curr = stageSequence[i];
        const next = stageSequence[i + 1];
        if (curr === 'inhale') expect(next).toBe('holdIn');
        else if (curr === 'holdIn') expect(next).toBe('exhale');
        else if (curr === 'exhale') expect(next).toBe('holdOut');
        else if (curr === 'holdOut') expect(next).toBe('inhale');
      }
    });

    it('1.3: Two-stage alternating breathing (Inhale=4s, HoldIn=0s, Exhale=4s, HoldOut=0s)', () => {
      const rhythm: BreathRhythmConfig = {
        inhale: 4.0,
        holdIn: 0.0,
        exhale: 4.0,
        holdOut: 0.0
      };
      const sm = new BreathStateMachine({ rhythm, autoStart: true });

      expect(sm.getCurrentStage()).toBe('inhale');

      // Inhale 4s
      sm.tick(4.0);
      // Must have skipped HoldIn and landed directly on Exhale
      expect(sm.getCurrentStage()).toBe('exhale');
      expect(sm.getCycleCount()).toBe(0);

      // Exhale 4s
      sm.tick(4.0);
      // Must have skipped HoldOut and returned to Inhale, completing cycle 1
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(1);

      // Run 20 cycles with small steps (0.016s)
      for (let i = 0; i < 20 * 8 * 60; i++) {
        const snap = sm.tick(1 / 60);
        expect(snap.currentStage === 'inhale' || snap.currentStage === 'exhale').toBe(true);
        expect(snap.currentStage !== 'holdIn' && snap.currentStage !== 'holdOut').toBe(true);
      }
      // With 1/60 floating point truncation, we have completed 20 cycles and are at 99.99999% of cycle 21
      expect(sm.getCycleCount()).toBeGreaterThanOrEqual(20);
      sm.tick(0.001);
      expect(sm.getCycleCount()).toBe(21);
    });

    it('1.4: Extreme 3-zero-stage configurations (Single active stage)', () => {
      // 1.4.1: Only Inhale has duration (Inhale=4s, others=0s)
      {
        const sm = new BreathStateMachine({
          rhythm: { inhale: 4.0, holdIn: 0.0, exhale: 0.0, holdOut: 0.0 },
          autoStart: true
        });
        expect(sm.getCurrentStage()).toBe('inhale');

        sm.tick(2.0);
        expect(sm.getCurrentStage()).toBe('inhale');
        expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.5, 3);

        sm.tick(2.0); // Total 4.0s elapsed -> advances past holdIn, exhale, holdOut back to inhale
        expect(sm.getCurrentStage()).toBe('inhale');
        expect(sm.getCycleCount()).toBe(1);
        expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.0, 3);
      }

      // 1.4.2: Only HoldIn has duration (HoldIn=4s, others=0s)
      {
        const sm = new BreathStateMachine({
          rhythm: { inhale: 0.0, holdIn: 4.0, exhale: 0.0, holdOut: 0.0 },
          autoStart: true
        });
        // On start(), inhale=0s passes through immediately to holdIn
        expect(sm.getCurrentStage()).toBe('holdIn');

        sm.tick(4.0);
        expect(sm.getCurrentStage()).toBe('holdIn');
        expect(sm.getCycleCount()).toBe(1);
      }

      // 1.4.3: Only Exhale has duration (Exhale=4s, others=0s)
      {
        const sm = new BreathStateMachine({
          rhythm: { inhale: 0.0, holdIn: 0.0, exhale: 4.0, holdOut: 0.0 },
          autoStart: true
        });
        // Inhale(0) -> HoldIn(0) -> Exhale
        expect(sm.getCurrentStage()).toBe('exhale');

        sm.tick(4.0);
        expect(sm.getCurrentStage()).toBe('exhale');
        expect(sm.getCycleCount()).toBe(1);
      }

      // 1.4.4: Only HoldOut has duration (HoldOut=4s, others=0s)
      {
        const sm = new BreathStateMachine({
          rhythm: { inhale: 0.0, holdIn: 0.0, exhale: 0.0, holdOut: 4.0 },
          autoStart: true
        });
        // Inhale(0) -> HoldIn(0) -> Exhale(0) -> HoldOut
        expect(sm.getCurrentStage()).toBe('holdOut');

        sm.tick(4.0);
        expect(sm.getCurrentStage()).toBe('holdOut');
        expect(sm.getCycleCount()).toBe(1);
      }
    });

    it('1.5: Extreme Degenerate All-Zero (Inhale=0, HoldIn=0, Exhale=0, HoldOut=0) does not hang or produce NaN', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 0.0, holdIn: 0.0, exhale: 0.0, holdOut: 0.0 },
        autoStart: true
      });

      // Ticking must terminate safely within MAX_TRANSITIONS bounds without freeze
      const snap = sm.tick(1.0);
      expect(Number.isNaN(snap.stageProgress)).toBe(false);
      expect(Number.isNaN(snap.cycleProgress)).toBe(false);
      expect(Number.isNaN(snap.breathMacro)).toBe(false);
      expect(snap.cycleProgress).toBe(0.0);
      expect(snap.stageRemainingSeconds).toBe(0.0);
    });

    it('1.6: Sub-millisecond non-zero durations (< 0.001s) treated as 0-duration passthrough', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 0.0005, exhale: 4.0, holdOut: 0.0008 },
        autoStart: true
      });

      // Advance 4.0s (past Inhale)
      sm.tick(4.0);
      // HoldIn is 0.0005s <= 0.001s, must pass through directly to Exhale
      expect(sm.getCurrentStage()).toBe('exhale');

      // Advance 4.0s (past Exhale)
      sm.tick(4.0);
      // HoldOut is 0.0008s <= 0.001s, must pass through to Inhale
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(1);
    });

    it('1.7: Dirty/Negative/NaN durations are sanitized to 0 without crashing', () => {
      const sm = new BreathStateMachine({
        rhythm: {
          inhale: 4.0,
          holdIn: -2.0 as unknown as number,
          exhale: NaN as unknown as number,
          holdOut: 0.0
        },
        autoStart: true
      });

      expect(sm.getStageDuration('holdIn')).toBe(0);
      expect(sm.getStageDuration('exhale')).toBe(0);

      // Run clock forward
      sm.tick(4.0);
      // holdIn(-2 -> 0), exhale(NaN -> 0), holdOut(0) -> loops through back to inhale
      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(1);
    });

    it('1.8: setStage("holdOut") with 0-duration holdOut stage does not falsely increment cycleCount (D21)', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 },
        autoStart: false
      });

      // Initial state: cycleCount is 0
      expect(sm.getCycleCount()).toBe(0);

      // Calling setStage with 'holdOut' (which has 0 duration):
      // Passive zero-duration passthrough transitions holdOut -> inhale without incrementing cycleCount
      sm.setStage('holdOut');

      expect(sm.getCurrentStage()).toBe('inhale');
      expect(sm.getCycleCount()).toBe(0);
    });
  });

  // =========================================================================
  // 2. STRESS-TEST: Rapid Control Operations & High-Frequency Stress
  // =========================================================================
  describe('2. Rapid Control Operations & High-Frequency Switching', () => {
    it('2.1: 10,000 rapid toggles between play/pause at microsecond intervals', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: false
      });

      let simulatedTimeMs = 1000.0;
      for (let i = 0; i < 10000; i++) {
        sm.toggle();
        simulatedTimeMs += (i % 5) * 0.1; // 0.0ms to 0.4ms micro-intervals
        sm.updateTimestamp(simulatedTimeMs);
      }

      const snap = sm.getSnapshot();
      expect(Number.isNaN(snap.stageProgress)).toBe(false);
      expect(Number.isNaN(snap.cycleCount)).toBe(false);
      expect(snap.stageProgress).toBeGreaterThanOrEqual(0.0);
      expect(snap.stageProgress).toBeLessThanOrEqual(1.0);
      expect(snap.cycleCount).toBeGreaterThanOrEqual(0);
    });

    it('2.2: Zero-delta and micro-delta stepping stability', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // 1000 zero-delta ticks
      for (let i = 0; i < 1000; i++) {
        const snap = sm.tick(0.0);
        expect(snap.stageProgress).toBe(0.0);
        expect(snap.cycleCount).toBe(0);
      }

      // 10,000 micro-delta (1 microsecond = 0.000001s) ticks
      for (let i = 0; i < 10000; i++) {
        sm.tick(0.000001);
      }
      // Total elapsed = 0.01s (10ms)
      const snap = sm.getSnapshot();
      expect(snap.stageRemainingSeconds).toBeCloseTo(3.99, 2);
      expect(snap.currentStage).toBe('inhale');
    });

    it('2.3: Rapid concurrent start/pause/resume/stop bursts on BreathEngine without timer leak', () => {
      const engine = new BreathEngine({
        rhythm: FACTORY_RHYTHMS.box,
        autoStart: false
      });

      // Perform 500 interleaved control commands
      for (let i = 0; i < 500; i++) {
        switch (i % 5) {
          case 0:
            engine.start();
            break;
          case 1:
            engine.pause();
            break;
          case 2:
            engine.resume();
            break;
          case 3:
            engine.toggle();
            break;
          case 4:
            engine.stop();
            break;
        }
      }

      // Final clean stop
      engine.stop();
      const snap = engine.getSnapshot();
      expect(snap.isPlaying).toBe(false);
      expect(snap.currentStage).toBe('inhale');
      expect(snap.cycleCount).toBe(0);
      expect(snap.stageProgress).toBe(0.0);

      engine.dispose();
    });

    it('2.4: Subscriber error isolation: failing subscriber does not disrupt other subscribers or engine', () => {
      const engine = new BreathEngine({
        rhythm: FACTORY_RHYTHMS.box,
        autoStart: false
      });

      let goodSubscriberCalls = 0;
      let stageChangeCalls = 0;

      // Bad subscriber throwing error
      engine.onTick(() => {
        throw new Error('Adversarial subscriber fault');
      });

      // Good subscriber
      engine.onTick(() => {
        goodSubscriberCalls++;
      });

      engine.onStageChange(() => {
        stageChangeCalls++;
      });

      engine.start();

      // Tick manually
      for (let i = 0; i < 10; i++) {
        engine.tick(0.5);
      }

      expect(goodSubscriberCalls).toBeGreaterThanOrEqual(10);
      expect(stageChangeCalls).toBeGreaterThanOrEqual(1);

      engine.dispose();
    });
  });

  // =========================================================================
  // 3. STRESS-TEST: Hot-Rescaling During Active Playback
  // =========================================================================
  describe('3. Hot-Rescaling During Active Playback Stress', () => {
    it('3.1: Mid-phase scaling upward (4s -> 8s) preserves exact normalized phase 0.5', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Tick 2s into Inhale (phase = 0.5)
      sm.tick(2.0);
      expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.5, 3);
      expect(sm.getSnapshot().stageRemainingSeconds).toBeCloseTo(2.0, 3);

      // Hot-rescale Inhale to 8.0s
      sm.setRhythm({ inhale: 8.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });

      // Normalized phase must remain exactly 0.5 without jump
      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBeCloseTo(0.5, 3);
      expect(snap.stageRemainingSeconds).toBeCloseTo(4.0, 3);
      expect(snap.breathMacro).toBeCloseTo(0.5, 3);
    });

    it('3.2: Mid-phase scaling downward (8s -> 2s) preserves exact normalized phase 0.5', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 8.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Tick 4s into Inhale (phase = 0.5)
      sm.tick(4.0);
      expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.5, 3);

      // Hot-rescale Inhale to 2.0s
      sm.setRhythm({ inhale: 2.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });

      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBeCloseTo(0.5, 3);
      expect(snap.stageRemainingSeconds).toBeCloseTo(1.0, 3);
    });

    it('3.3: Active stage hot-collapsed to 0 duration: checks state continuity and passthrough', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // Advance 2s into Inhale
      sm.tick(2.0);
      expect(sm.getCurrentStage()).toBe('inhale');

      // User dynamically zeroes out Inhale while running
      sm.setRhythm({ inhale: 0.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });

      // Current stage should immediately passthrough to holdIn
      expect(sm.getCurrentStage()).toBe('holdIn');

      // Advance remaining 4.0s of holdIn
      sm.tick(4.0);
      // State machine must remain valid and advance to Exhale
      expect(sm.getCurrentStage()).toBe('exhale');
    });

    it('3.4: 100 continuous dynamic parameter mutations during active 60fps ticking', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      for (let i = 0; i < 100; i++) {
        // Ticking 16.6ms
        sm.tick(0.0166);

        // Randomly perturb rhythm durations every step
        const inh = 2.0 + (i % 7) * 0.5;
        const hIn = (i % 3 === 0) ? 0.0 : 2.0;
        const exh = 3.0 + (i % 5) * 0.4;
        const hOut = (i % 2 === 0) ? 0.0 : 1.5;

        sm.setRhythm({ inhale: inh, holdIn: hIn, exhale: exh, holdOut: hOut });

        const snap = sm.getSnapshot();
        expect(Number.isNaN(snap.stageProgress)).toBe(false);
        expect(Number.isNaN(snap.cycleProgress)).toBe(false);
        expect(Number.isNaN(snap.breathMacro)).toBe(false);
        expect(snap.stageProgress).toBeGreaterThanOrEqual(0.0);
        expect(snap.stageProgress).toBeLessThanOrEqual(1.0);
        expect(snap.cycleProgress).toBeGreaterThanOrEqual(0.0);
        expect(snap.cycleProgress).toBeLessThanOrEqual(1.0);
      }
    });

    it('3.5: hot-rescaling active stage to 0 duration cleans stageElapsed to prevent cascade (D19)', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 10.0, holdIn: 2.0, exhale: 2.0, holdOut: 2.0 },
        autoStart: true
      });

      // Advance 8s into Inhale (stageElapsed = 8.0s)
      sm.tick(8.0);
      expect(sm.getCurrentStage()).toBe('inhale');

      // Now hot-swap Inhale to 0.0s
      sm.setRhythm({ inhale: 0.0, holdIn: 2.0, exhale: 2.0, holdOut: 2.0 });

      // State machine immediately passes through to holdIn
      expect(sm.getCurrentStage()).toBe('holdIn');

      // D19: setRhythm zeroes out stageElapsed on 0-duration transition
      // holdIn starts cleanly with stageElapsed = 0s
      const snap = sm.getSnapshot();
      expect(snap.stageProgress).toBe(0.0);
      expect(snap.stageRemainingSeconds).toBe(2.0);

      // On the subsequent tick of just 16ms, it simply advances 16ms into holdIn without cascading
      sm.tick(0.016);
      expect(sm.getCurrentStage()).toBe('holdIn');
      expect(sm.getCycleCount()).toBe(0);
    });
  });

  // =========================================================================
  // 4. STRESS-TEST: Long-Duration Time Jumps & Big-Step Precision
  // =========================================================================
  describe('4. Long-Duration Time Jumps & Big-Step Leap Precision', () => {
    it('4.1: Stepping 3600 seconds (1 hour jump) in 1 step matches accumulated steps', () => {
      // 1. Single massive step
      const smFast = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });
      // 16s cycle -> 3600 / 16 = 225 cycles exactly
      const snapFast = smFast.tick(3600.0);

      // 2. Progressive accumulation with 1-second steps
      const smSlow = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });
      for (let i = 0; i < 3600; i++) {
        smSlow.tick(1.0);
      }
      const snapSlow = smSlow.getSnapshot();

      expect(snapFast.cycleCount).toBe(225);
      expect(snapSlow.cycleCount).toBe(225);
      expect(snapFast.currentStage).toBe(snapSlow.currentStage);
      expect(snapFast.stageProgress).toBeCloseTo(snapSlow.stageProgress, 4);
      expect(snapFast.cycleProgress).toBeCloseTo(snapSlow.cycleProgress, 4);
      expect(snapFast.breathMacro).toBeCloseTo(snapSlow.breathMacro, 4);
    });

    it('4.2: Stepping 86,400 seconds (24 hours jump) with non-integer remainder', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // 86,405 seconds = 5400 full cycles (86400s) + 5 seconds
      // 5s = 4s Inhale + 1s HoldIn (phase = 1/4 = 0.25)
      const snap = sm.tick(86405.0);

      expect(snap.cycleCount).toBe(5400);
      expect(snap.currentStage).toBe('holdIn');
      expect(snap.stageProgress).toBeCloseTo(0.25, 4);
      expect(snap.breathMacro).toBe(1.0);
    });

    it('4.3: Extreme leap jump (10,000,000 seconds ~ 115 days)', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
        autoStart: true
      });

      // 10,000,000 / 16 = 625,000 cycles exactly
      const snap = sm.tick(10000000.0);

      expect(snap.cycleCount).toBe(625000);
      expect(snap.currentStage).toBe('inhale');
      expect(snap.stageProgress).toBeCloseTo(0.0, 4);
      expect(Number.isFinite(snap.cycleCount)).toBe(true);
      expect(Number.isNaN(snap.cycleProgress)).toBe(false);
    });

    it('4.4: Leap jump with non-integer rhythm (Coherent 5.5s + 0 + 5.5s + 0 = 11.0s total)', () => {
      const sm = new BreathStateMachine({
        rhythm: { inhale: 5.5, holdIn: 0.0, exhale: 5.5, holdOut: 0.0 },
        autoStart: true
      });

      // Jump 3600 seconds: 3600 / 11 = 327 cycles (3597s) + 3.0s into Inhale
      const snap = sm.tick(3600.0);

      expect(snap.cycleCount).toBe(327);
      expect(snap.currentStage).toBe('inhale');
      expect(snap.stageProgress).toBeCloseTo(3.0 / 5.5, 4);
      expect(snap.stageRemainingSeconds).toBeCloseTo(2.5, 4);
    });
  });

  // =========================================================================
  // 5. STRESS-TEST: Mathematical Invariants & Physical Acoustic Bounds
  // =========================================================================
  describe('5. Mathematical Invariants & Physical Acoustic Rules Stress', () => {
    it('5.1: Sigmoid and Passive Exhale curves remain strictly bounded in [0, 1] across out-of-range numbers', () => {
      const testPhis = [-100.0, -1.0, -0.001, 0.0, 0.25, 0.5, 0.75, 1.0, 1.001, 2.0, 100.0, Infinity, -Infinity];

      for (const phi of testPhis) {
        const sig = sigmoidInhale(phi);
        const pEx = passiveExhale(phi);

        expect(Number.isNaN(sig)).toBe(false);
        expect(Number.isNaN(pEx)).toBe(false);
        expect(sig).toBeGreaterThanOrEqual(0.0);
        expect(sig).toBeLessThanOrEqual(1.0);
        expect(pEx).toBeGreaterThanOrEqual(0.0);
        expect(pEx).toBeLessThanOrEqual(1.0);
      }

      // Check boundary convergence
      expect(sigmoidInhale(0.0)).toBeCloseTo(0.0, 4);
      expect(sigmoidInhale(1.0)).toBeCloseTo(1.0, 4);
      expect(passiveExhale(0.0)).toBeCloseTo(1.0, 4);
      expect(passiveExhale(1.0)).toBeCloseTo(0.0, 4);
    });

    it('5.1b: NaN vulnerability defense: verifies sigmoidInhale and passiveExhale sanitize NaN (D22)', () => {
      // In JS IEEE 754, Math.max(0, Math.min(1, NaN)) returns NaN without Number.isFinite check.
      // D22 introduces Number.isFinite guard to sanitize NaN to 0.0:
      const sigNaN = sigmoidInhale(NaN);
      const pExNaN = passiveExhale(NaN);

      // Demonstrates that raw sigmoidInhale and passiveExhale safely guard against NaN:
      expect(Number.isNaN(sigNaN)).toBe(false);
      expect(Number.isNaN(pExNaN)).toBe(false);
      expect(sigNaN).toBeCloseTo(0.0, 4);
      expect(pExNaN).toBeCloseTo(1.0, 4);

      // Verify that the higher-level calculateAcousticParameters DOES sanitize NaN:
      const acousticParams = calculateAcousticParameters(NaN, 'inhale', NaN);
      for (const val of Object.values(acousticParams)) {
        expect(Number.isNaN(val)).toBe(false);
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('5.2: calculateLogCutoff is strictly monotonic and bounded across macro M in [0, 1]', () => {
      let prevCutoff = -1;
      for (let m = 0; m <= 1.0; m += 0.01) {
        const cutoff = calculateLogCutoff(m, 90, 14000);
        expect(cutoff).toBeGreaterThanOrEqual(90);
        expect(cutoff).toBeLessThanOrEqual(14000);
        if (prevCutoff !== -1) {
          expect(cutoff).toBeGreaterThanOrEqual(prevCutoff);
        }
        prevCutoff = cutoff;
      }

      // Test extreme inputs
      expect(calculateLogCutoff(NaN)).toBeCloseTo(90, 1);
      expect(calculateLogCutoff(-5)).toBeCloseTo(90, 1);
      expect(calculateLogCutoff(100)).toBeCloseTo(14000, 1);
    });

    it('5.3: evaluateTensionCurve robustness over 5,000 randomized tension/progress pairs', () => {
      for (let i = 0; i < 5000; i++) {
        const phi = Math.random();
        const tension = Math.random() * 2.0 - 1.0; // [-1.0, 1.0]
        const startVal = Math.random();
        const endVal = Math.random();

        const result = evaluateTensionCurve(phi, startVal, endVal, tension);

        expect(Number.isNaN(result)).toBe(false);
        expect(Number.isFinite(result)).toBe(true);

        const minExpected = Math.min(startVal, endVal);
        const maxExpected = Math.max(startVal, endVal);
        expect(result).toBeGreaterThanOrEqual(minExpected - 1e-6);
        expect(result).toBeLessThanOrEqual(maxExpected + 1e-6);
      }
    });

    it('5.4: calculateAcousticParameters across all 4 stages generates valid physical ranges without NaN', () => {
      const stages: Array<'inhale' | 'holdIn' | 'exhale' | 'holdOut'> = ['inhale', 'holdIn', 'exhale', 'holdOut'];

      for (const stage of stages) {
        for (let p = 0; p <= 1.0; p += 0.1) {
          const macro = calculateBreathMacro(stage, p);
          const params = calculateAcousticParameters(macro, stage, p);

          expect(params.filterCutoff).toBeGreaterThanOrEqual(90);
          expect(params.filterCutoff).toBeLessThanOrEqual(14000);
          expect(params.filterResonance).toBeGreaterThanOrEqual(0.7);
          expect(params.filterResonance).toBeLessThanOrEqual(4.0);
          expect(params.noiseGain).toBeGreaterThanOrEqual(0.0);
          expect(params.noiseGain).toBeLessThanOrEqual(0.5);
          expect(params.reverbWet).toBeGreaterThanOrEqual(0.0);
          expect(params.reverbWet).toBeLessThanOrEqual(1.0);
          expect(params.delayWet).toBeGreaterThanOrEqual(0.0);
          expect(params.delayWet).toBeLessThanOrEqual(1.0);
          expect(params.oscAWavetable).toBeGreaterThanOrEqual(0.0);
          expect(params.oscAWavetable).toBeLessThanOrEqual(23.0);
          expect(Math.abs(params.pitchDriftCents)).toBeLessThanOrEqual(5.0);

          for (const val of Object.values(params)) {
            expect(Number.isNaN(val)).toBe(false);
            expect(Number.isFinite(val)).toBe(true);
          }
        }
      }
    });

    it('5.5: calculateTimelineStageWidths total always sums to totalWidth without NaN even with 0 durations', () => {
      const totalW = 800;

      // Normal
      const w1 = calculateTimelineStageWidths({ inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, totalW);
      const sum1 = w1.inhale + w1.holdIn + w1.exhale + w1.holdOut;
      expect(sum1).toBeCloseTo(totalW, 4);
      expect(w1.holdOut).toBe(0);

      // All zero fallback (equal split)
      const wZero = calculateTimelineStageWidths({ inhale: 0, holdIn: 0, exhale: 0, holdOut: 0 }, totalW);
      const sumZero = wZero.inhale + wZero.holdIn + wZero.exhale + wZero.holdOut;
      expect(sumZero).toBeCloseTo(totalW, 4);
      expect(wZero.inhale).toBe(totalW * 0.25);
    });

    it('5.6: mapNormalizedToPhysical across linear, logarithmic, and exponential mappings', () => {
      const testNorms = [0.0, 0.25, 0.5, 0.75, 1.0];

      for (const norm of testNorms) {
        const lin = mapNormalizedToPhysical(norm, 100, 1000, 'linear');
        const log = mapNormalizedToPhysical(norm, 100, 1000, 'logarithmic');
        const exp = mapNormalizedToPhysical(norm, 100, 1000, 'exponential');

        expect(lin).toBeGreaterThanOrEqual(100);
        expect(lin).toBeLessThanOrEqual(1000);
        expect(log).toBeGreaterThanOrEqual(100);
        expect(log).toBeLessThanOrEqual(1000);
        expect(exp).toBeGreaterThanOrEqual(100);
        expect(exp).toBeLessThanOrEqual(1000);
      }
    });
  });
});
