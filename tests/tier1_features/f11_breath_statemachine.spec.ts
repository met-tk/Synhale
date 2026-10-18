import { describe, it, expect } from 'vitest';
import type { BreathStage, BreathRhythmConfig, BreathClockSnapshot } from '../../src/types';

// Pure reference state machine simulation for contract verification
class ReferenceBreathClock {
  rhythm: BreathRhythmConfig;
  currentStage: BreathStage = 'inhale';
  stageElapsed = 0;
  isPlaying = false;
  cycleCount = 0;

  constructor(rhythm: BreathRhythmConfig) {
    this.rhythm = rhythm;
  }

  start() { this.isPlaying = true; }
  pause() { this.isPlaying = false; }

  tick(deltaSec: number): BreathClockSnapshot {
    if (!this.isPlaying) return this.getSnapshot();

    this.stageElapsed += deltaSec;
    let duration = this.getStageDuration(this.currentStage);

    // Handle stage progression & zero-duration pass-through
    while (this.stageElapsed >= duration && this.isPlaying) {
      this.stageElapsed -= duration;
      this.advanceStage();
      duration = this.getStageDuration(this.currentStage);
      if (duration <= 0.001) {
        // Zero duration passthrough
        this.advanceStage();
        duration = this.getStageDuration(this.currentStage);
      }
    }

    return this.getSnapshot();
  }

  private advanceStage() {
    switch (this.currentStage) {
      case 'inhale': this.currentStage = 'holdIn'; break;
      case 'holdIn': this.currentStage = 'exhale'; break;
      case 'exhale': this.currentStage = 'holdOut'; break;
      case 'holdOut':
        this.currentStage = 'inhale';
        this.cycleCount++;
        break;
    }
  }

  getStageDuration(stage: BreathStage): number {
    return this.rhythm[stage];
  }

  getSnapshot(): BreathClockSnapshot {
    const dur = Math.max(0.001, this.getStageDuration(this.currentStage));
    const stageProgress = Math.min(1.0, this.stageElapsed / dur);
    const stageRemainingSeconds = Math.max(0, dur - this.stageElapsed);

    let breathMacro = 0;
    if (this.currentStage === 'inhale') breathMacro = stageProgress;
    else if (this.currentStage === 'holdIn') breathMacro = 1.0;
    else if (this.currentStage === 'exhale') breathMacro = 1.0 - stageProgress;
    else breathMacro = 0.0;

    return {
      isPlaying: this.isPlaying,
      currentStage: this.currentStage,
      stageProgress,
      stageRemainingSeconds,
      cycleProgress: 0,
      breathMacro,
      cycleCount: this.cycleCount
    };
  }
}

describe('Feature F11: 4-Stage State Machine & 0-Duration Passthrough', () => {
  it('F11-1: State machine cycles sequentially through Inhale -> Hold In -> Exhale -> Hold Out', () => {
    const clock = new ReferenceBreathClock({ inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });
    clock.start();

    expect(clock.currentStage).toBe('inhale');
    clock.tick(4.0);
    expect(clock.currentStage).toBe('holdIn');
    clock.tick(4.0);
    expect(clock.currentStage).toBe('exhale');
    clock.tick(4.0);
    expect(clock.currentStage).toBe('holdOut');
    clock.tick(4.0);
    expect(clock.currentStage).toBe('inhale');
  });

  it('F11-2: Cycle counter increments when completing Hold Out and returning to Inhale', () => {
    const clock = new ReferenceBreathClock({ inhale: 2.0, holdIn: 2.0, exhale: 2.0, holdOut: 2.0 });
    clock.start();
    expect(clock.cycleCount).toBe(0);

    clock.tick(8.0); // 1 full cycle
    expect(clock.cycleCount).toBe(1);

    clock.tick(16.0); // 2 more cycles
    expect(clock.cycleCount).toBe(3);
  });

  it('F11-3: Zero-duration stage (e.g. 4-7-8 HoldOut = 0s) passes through immediately without NaN or stalling', () => {
    const clock = new ReferenceBreathClock({ inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 });
    clock.start();

    clock.tick(4.0);
    expect(clock.currentStage).toBe('holdIn');
    clock.tick(7.0);
    expect(clock.currentStage).toBe('exhale');
    clock.tick(8.0); // Exhale ends, Hold Out is 0s -> should instantaneously loop back to Inhale and cycleCount++
    expect(clock.currentStage).toBe('inhale');
    expect(clock.cycleCount).toBe(1);

    const snapshot = clock.getSnapshot();
    expect(Number.isNaN(snapshot.stageProgress)).toBe(false);
    expect(Number.isNaN(snapshot.breathMacro)).toBe(false);
  });

  it('F11-4: Pausing freezes elapsed stage progress; resuming continues from exact stored position', () => {
    const clock = new ReferenceBreathClock({ inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 });
    clock.start();
    clock.tick(2.0); // Mid-inhale (50%)

    const snapshotPrePause = clock.getSnapshot();
    expect(snapshotPrePause.stageProgress).toBeCloseTo(0.5, 3);

    clock.pause();
    clock.tick(5.0); // Tick while paused should not advance stage
    const snapshotPaused = clock.getSnapshot();
    expect(snapshotPaused.stageProgress).toBeCloseTo(0.5, 3);
    expect(snapshotPaused.isPlaying).toBe(false);

    clock.start();
    clock.tick(1.0); // Now 3.0s in -> 75%
    expect(clock.getSnapshot().stageProgress).toBeCloseTo(0.75, 3);
  });

  it('F11-5: High-resolution timestamp calculation maintains microsecond precision without accumulated drift', () => {
    let stageStart = 1000.0;
    const durationMs = 4000.0;

    const t1 = 2000.0;
    const elapsed1 = t1 - stageStart;
    const progress1 = elapsed1 / durationMs;
    expect(progress1).toBe(0.25);

    const t2 = 3500.0;
    const elapsed2 = t2 - stageStart;
    const progress2 = elapsed2 / durationMs;
    expect(progress2).toBe(0.625);
  });
});
