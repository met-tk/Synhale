import type { BreathStage, BreathRhythmConfig, BreathClockSnapshot } from '../types';

export interface BreathStateMachineOptions {
  rhythm?: BreathRhythmConfig;
  autoStart?: boolean;
}

export class BreathStateMachine {
  private rhythm: BreathRhythmConfig;
  private currentStage: BreathStage = 'inhale';
  private stageElapsed: number = 0; // seconds
  private isPlaying: boolean = false;
  private cycleCount: number = 0;
  private lastTimestampMs: number | null = null;

  constructor(options?: BreathStateMachineOptions) {
    this.rhythm = options?.rhythm
      ? { ...options.rhythm }
      : { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 };

    if (options?.autoStart) {
      this.start();
    }
  }

  /**
   * Start or resume the breath clock
   */
  start(nowMs?: number): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const timestamp = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.lastTimestampMs = Number.isFinite(timestamp) ? timestamp : null;

    // If initial stage has zero duration, pass through immediately
    this.handleZeroDurationPassthrough();
  }

  /**
   * Pause the breath clock, freezing current progress
   */
  pause(): void {
    this.isPlaying = false;
    this.lastTimestampMs = null;
  }

  /**
   * Resume from paused state without time jump
   */
  resume(nowMs?: number): void {
    this.start(nowMs);
  }

  /**
   * Toggle between playing and paused
   */
  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Reset state machine to initial state
   */
  reset(): void {
    this.currentStage = 'inhale';
    this.stageElapsed = 0;
    this.cycleCount = 0;
    this.lastTimestampMs = null;
  }

  /**
   * Step the clock forward by delta seconds (pure timing simulation)
   */
  tick(deltaSec?: number): BreathClockSnapshot {
    if (!this.isPlaying) {
      return this.getSnapshot();
    }

    let delta: number;
    if (typeof deltaSec === 'number' && Number.isFinite(deltaSec)) {
      delta = Math.max(0, deltaSec);
    } else if (typeof deltaSec === 'number') {
      // Non-finite deltaSec (NaN, Infinity): ignore and return current snapshot without corruption
      return this.getSnapshot();
    } else {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return this.updateTimestamp(now);
    }

    if (delta <= 0) {
      return this.getSnapshot();
    }

    this.advanceTime(delta);
    return this.getSnapshot();
  }

  /**
   * Step using absolute timestamp in milliseconds
   */
  updateTimestamp(nowMs: number): BreathClockSnapshot {
    if (!this.isPlaying || !Number.isFinite(nowMs)) {
      return this.getSnapshot();
    }

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = nowMs;
      return this.getSnapshot();
    }

    // Regressing or invalid timestamps must not move the reference backwards:
    // otherwise the next valid frame counts the same interval a second time.
    if (nowMs < this.lastTimestampMs) return this.getSnapshot();
    const deltaSec = (nowMs - this.lastTimestampMs) / 1000.0;
    this.lastTimestampMs = nowMs;
    return this.tick(deltaSec);
  }

  /**
   * Update rhythm durations with hot-rescaling: preserves normalized phase without jump
   */
  setRhythm(newRhythm: BreathRhythmConfig): void {
    const oldDur = this.getStageDuration(this.currentStage);
    const oldPhase = oldDur > 0.001 ? Math.min(1.0, this.stageElapsed / oldDur) : 0;

    this.rhythm = {
      inhale: Number.isFinite(newRhythm.inhale) ? Math.max(0, newRhythm.inhale) : 4.0,
      holdIn: Number.isFinite(newRhythm.holdIn) ? Math.max(0, newRhythm.holdIn) : 4.0,
      exhale: Number.isFinite(newRhythm.exhale) ? Math.max(0, newRhythm.exhale) : 4.0,
      holdOut: Number.isFinite(newRhythm.holdOut) ? Math.max(0, newRhythm.holdOut) : 4.0
    };
    const newDur = this.getStageDuration(this.currentStage);

    if (newDur <= 0.001) {
      this.stageElapsed = 0;
      this.handleZeroDurationPassthrough();
    } else {
      this.stageElapsed = oldPhase * newDur;
    }
  }

  /**
   * Get current rhythm configuration
   */
  getRhythm(): BreathRhythmConfig {
    return { ...this.rhythm };
  }

  /**
   * Directly switch to a specific stage
   */
  setStage(stage: BreathStage): void {
    if (!['inhale', 'holdIn', 'exhale', 'holdOut'].includes(stage)) return;
    this.currentStage = stage;
    this.stageElapsed = 0;
    this.handleZeroDurationPassthrough();
  }

  /**
   * Read current stage duration
   */
  getStageDuration(stage: BreathStage): number {
    const dur = this.rhythm[stage];
    // Sub-millisecond stages are skipped everywhere, including the fast-cycle
    // divisor, so a large leap and small ticks use the same effective rhythm.
    return typeof dur === 'number' && Number.isFinite(dur) && dur > 0.001 ? Math.min(60, dur) : 0;
  }

  /**
   * Total duration for a full 4-stage cycle
   */
  getTotalCycleDuration(): number {
    return (
      this.getStageDuration('inhale') +
      this.getStageDuration('holdIn') +
      this.getStageDuration('exhale') +
      this.getStageDuration('holdOut')
    );
  }

  /**
   * Current stage name getter
   */
  getCurrentStage(): BreathStage {
    return this.currentStage;
  }

  /**
   * Completed cycle count getter
   */
  getCycleCount(): number {
    return this.cycleCount;
  }

  /**
   * Play state getter
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Generates an immutable snapshot of the current breath clock state
   */
  getSnapshot(): BreathClockSnapshot {
    const stageDuration = this.getStageDuration(this.currentStage);
    const stageProgress =
      stageDuration > 0.001
        ? Math.max(0.0, Math.min(1.0, this.stageElapsed / stageDuration))
        : 1.0;

    const stageRemainingSeconds =
      stageDuration > 0.001
        ? Math.max(0.0, stageDuration - this.stageElapsed)
        : 0.0;

    const dInhale = this.getStageDuration('inhale');
    const dHoldIn = this.getStageDuration('holdIn');
    const dExhale = this.getStageDuration('exhale');
    const dHoldOut = this.getStageDuration('holdOut');
    const totalCycleDuration = dInhale + dHoldIn + dExhale + dHoldOut;
    let cycleElapsed = 0;

    switch (this.currentStage) {
      case 'inhale':
        cycleElapsed = this.stageElapsed;
        break;
      case 'holdIn':
        cycleElapsed = dInhale + this.stageElapsed;
        break;
      case 'exhale':
        cycleElapsed = dInhale + dHoldIn + this.stageElapsed;
        break;
      case 'holdOut':
        cycleElapsed = dInhale + dHoldIn + dExhale + this.stageElapsed;
        break;
    }

    const cycleProgress =
      totalCycleDuration > 0.001
        ? Math.max(0.0, Math.min(1.0, cycleElapsed / totalCycleDuration))
        : 0.0;

    let breathMacro = 0.0;
    switch (this.currentStage) {
      case 'inhale':
        breathMacro = stageProgress;
        break;
      case 'holdIn':
        breathMacro = 1.0;
        break;
      case 'exhale':
        breathMacro = 1.0 - stageProgress;
        break;
      case 'holdOut':
        breathMacro = 0.0;
        break;
    }

    return Object.freeze({
      isPlaying: this.isPlaying,
      currentStage: this.currentStage,
      stageProgress,
      stageRemainingSeconds,
      cycleProgress,
      breathMacro: Math.max(0.0, Math.min(1.0, breathMacro)),
      cycleCount: this.cycleCount
    });
  }

  /**
   * Advances stage progression and handles large leaps & zero durations
   */
  private advanceTime(deltaSec: number): void {
    if (!Number.isFinite(deltaSec) || deltaSec <= 0) {
      return;
    }

    const totalCycleDuration = this.getTotalCycleDuration();
    if (totalCycleDuration <= 0.001) {
      this.stageElapsed = 0;
      return;
    }

    // Fast leap optimization for large time jumps (e.g. background tab return)
    if (deltaSec >= totalCycleDuration) {
      const fullCycles = Math.floor(deltaSec / totalCycleDuration);
      this.cycleCount = Math.min(Number.MAX_SAFE_INTEGER, this.cycleCount + fullCycles);
      deltaSec %= totalCycleDuration;
    }

    this.stageElapsed += deltaSec;
    let duration = this.getStageDuration(this.currentStage);

    const MAX_TRANSITIONS = 32;
    let transitions = 0;

    while (this.stageElapsed >= duration && this.isPlaying && transitions < MAX_TRANSITIONS) {
      this.stageElapsed -= duration;
      this.advanceToNextStage(true);
      duration = this.getStageDuration(this.currentStage);
      transitions++;

      // Zero-duration stage passthrough
      while (duration <= 0.001 && transitions < MAX_TRANSITIONS) {
        this.advanceToNextStage(true);
        duration = this.getStageDuration(this.currentStage);
        transitions++;
      }
    }

    // Safety guard against stageElapsed running unbounded if all durations are 0
    if (duration <= 0.001) {
      this.stageElapsed = 0;
    }
  }

  /**
   * Advance to the next sequential stage in the 4-stage cycle
   */
  private advanceToNextStage(incrementCycle = true): void {
    switch (this.currentStage) {
      case 'inhale':
        this.currentStage = 'holdIn';
        break;
      case 'holdIn':
        this.currentStage = 'exhale';
        break;
      case 'exhale':
        this.currentStage = 'holdOut';
        break;
      case 'holdOut':
        this.currentStage = 'inhale';
        if (incrementCycle) {
          this.cycleCount = Math.min(Number.MAX_SAFE_INTEGER, this.cycleCount + 1);
        }
        break;
    }
  }

  /**
   * If current stage has zero duration, advance until a non-zero stage is found
   */
  private handleZeroDurationPassthrough(): void {
    let transitions = 0;
    const MAX_TRANSITIONS = 8;
    while (
      this.getStageDuration(this.currentStage) <= 0.001 &&
      transitions < MAX_TRANSITIONS
    ) {
      this.advanceToNextStage(false);
      transitions++;
    }
  }
}
