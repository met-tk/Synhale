import { describe, it, expect, beforeEach } from 'vitest';
import { BreathStateMachine } from '../../../src/breath/stateMachine';

describe('BreathStateMachine Unit Tests', () => {
  let sm: BreathStateMachine;

  beforeEach(() => {
    sm = new BreathStateMachine({
      rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 }
    });
  });

  it('cycles sequentially through Inhale -> Hold In -> Exhale -> Hold Out -> Inhale', () => {
    sm.start();
    expect(sm.getCurrentStage()).toBe('inhale');

    sm.tick(4.0);
    expect(sm.getCurrentStage()).toBe('holdIn');

    sm.tick(4.0);
    expect(sm.getCurrentStage()).toBe('exhale');

    sm.tick(4.0);
    expect(sm.getCurrentStage()).toBe('holdOut');

    sm.tick(4.0);
    expect(sm.getCurrentStage()).toBe('inhale');
    expect(sm.getCycleCount()).toBe(1);
  });

  it('increments cycle counter accurately on each completed cycle', () => {
    const customSm = new BreathStateMachine({
      rhythm: { inhale: 2.0, holdIn: 2.0, exhale: 2.0, holdOut: 2.0 }
    });
    customSm.start();
    expect(customSm.getCycleCount()).toBe(0);

    customSm.tick(8.0); // 1 full cycle
    expect(customSm.getCycleCount()).toBe(1);

    customSm.tick(16.0); // 2 more cycles
    expect(customSm.getCycleCount()).toBe(3);
  });

  it('handles zero-duration stage (4-7-8 HoldOut = 0s) instantaneously without stalling or NaN', () => {
    const sleepSm = new BreathStateMachine({
      rhythm: { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 }
    });
    sleepSm.start();

    sleepSm.tick(4.0);
    expect(sleepSm.getCurrentStage()).toBe('holdIn');

    sleepSm.tick(7.0);
    expect(sleepSm.getCurrentStage()).toBe('exhale');

    // Exhale completes: holdOut is 0s, so it should immediately pass through to inhale and increment cycleCount
    sleepSm.tick(8.0);
    expect(sleepSm.getCurrentStage()).toBe('inhale');
    expect(sleepSm.getCycleCount()).toBe(1);

    const snapshot = sleepSm.getSnapshot();
    expect(Number.isNaN(snapshot.stageProgress)).toBe(false);
    expect(Number.isNaN(snapshot.breathMacro)).toBe(false);
    expect(Number.isNaN(snapshot.cycleProgress)).toBe(false);
  });

  it('handles double zero-duration stages (Coherent: holdIn = 0s, holdOut = 0s)', () => {
    const coherentSm = new BreathStateMachine({
      rhythm: { inhale: 5.5, holdIn: 0.0, exhale: 5.5, holdOut: 0.0 }
    });
    coherentSm.start();

    expect(coherentSm.getCurrentStage()).toBe('inhale');

    // 5.5s inhale completes: holdIn is 0s, so it passes through to exhale
    coherentSm.tick(5.5);
    expect(coherentSm.getCurrentStage()).toBe('exhale');

    // 5.5s exhale completes: holdOut is 0s, so it passes through to inhale, incrementing cycle
    coherentSm.tick(5.5);
    expect(coherentSm.getCurrentStage()).toBe('inhale');
    expect(coherentSm.getCycleCount()).toBe(1);
  });

  it('freezes progress on pause and resumes seamlessly without time jump', () => {
    sm.start();
    sm.tick(2.0); // 50% through inhale

    const prePauseSnapshot = sm.getSnapshot();
    expect(prePauseSnapshot.stageProgress).toBeCloseTo(0.5, 3);
    expect(prePauseSnapshot.isPlaying).toBe(true);

    sm.pause();
    expect(sm.getIsPlaying()).toBe(false);

    // Ticks while paused should not advance progress
    sm.tick(10.0);
    const pausedSnapshot = sm.getSnapshot();
    expect(pausedSnapshot.stageProgress).toBeCloseTo(0.5, 3);
    expect(pausedSnapshot.isPlaying).toBe(false);

    // Resume and tick 1s -> should be 3.0s (75%)
    sm.resume();
    sm.tick(1.0);
    const resumedSnapshot = sm.getSnapshot();
    expect(resumedSnapshot.stageProgress).toBeCloseTo(0.75, 3);
  });

  it('toggles playback state correctly', () => {
    expect(sm.getIsPlaying()).toBe(false);
    sm.toggle();
    expect(sm.getIsPlaying()).toBe(true);
    sm.toggle();
    expect(sm.getIsPlaying()).toBe(false);
  });

  it('resets clock back to inhale start', () => {
    sm.start();
    sm.tick(12.0); // into holdOut
    expect(sm.getCurrentStage()).toBe('holdOut');

    sm.reset();
    expect(sm.getCurrentStage()).toBe('inhale');
    expect(sm.getCycleCount()).toBe(0);
    const snap = sm.getSnapshot();
    expect(snap.stageProgress).toBe(0);
  });

  it('hot-rescaling preserves normalized phase when stage duration changes mid-flight', () => {
    sm.start();
    sm.tick(2.0); // 2s out of 4s = 50%
    expect(sm.getSnapshot().stageProgress).toBeCloseTo(0.5, 3);

    // Change inhale duration to 8s
    sm.setRhythm({ inhale: 8.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });

    const updatedSnapshot = sm.getSnapshot();
    // Phase should still be 50%
    expect(updatedSnapshot.stageProgress).toBeCloseTo(0.5, 3);
    expect(updatedSnapshot.stageRemainingSeconds).toBeCloseTo(4.0, 3);
  });

  it('calculates exact completed cycle count on extreme time leap (320s leap on 16s cycle)', () => {
    sm.start();
    // Leap forward 320 seconds
    sm.tick(320.0);
    expect(sm.getCycleCount()).toBe(20);
    expect(sm.getCurrentStage()).toBe('inhale');
  });

  it('produces frozen immutable snapshot objects', () => {
    const snap = sm.getSnapshot();
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('tracks cycleProgress from 0.0 to 1.0 across full 4-stage cycle', () => {
    sm.start();
    expect(sm.getSnapshot().cycleProgress).toBeCloseTo(0.0, 3);

    sm.tick(4.0); // end of inhale -> 25% of 16s
    expect(sm.getSnapshot().cycleProgress).toBeCloseTo(0.25, 3);

    sm.tick(4.0); // end of holdIn -> 50% of 16s
    expect(sm.getSnapshot().cycleProgress).toBeCloseTo(0.5, 3);

    sm.tick(4.0); // end of exhale -> 75% of 16s
    expect(sm.getSnapshot().cycleProgress).toBeCloseTo(0.75, 3);
  });
});
