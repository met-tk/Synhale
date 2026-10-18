import type {
  BreathEngineApi,
  BreathRhythmConfig,
  ParameterAutomationConfig,
  BreathClockSnapshot,
  BreathStage
} from '../types';
import { BreathStateMachine } from './stateMachine';
import { FACTORY_AUTOMATIONS, loadBreathConfig, FACTORY_RHYTHMS } from './storage';

export type BreathTickSubscriber = (snapshot: BreathClockSnapshot) => void;
export type StageChangeSubscriber = (
  newStage: BreathStage,
  oldStage: BreathStage,
  cycleCount: number
) => void;
export type CycleCompleteSubscriber = (cycleCount: number) => void;

export interface BreathEngineOptions {
  rhythm?: BreathRhythmConfig;
  automations?: ParameterAutomationConfig[];
  autoStart?: boolean;
}

/**
 * High-precision 60fps Breath Engine
 * Coordinates 4-stage biological breath state machine and notifies subscribers
 */
export class BreathEngine implements BreathEngineApi {
  private stateMachine: BreathStateMachine;
  private automations: ParameterAutomationConfig[];
  private tickSubscribers: Set<BreathTickSubscriber> = new Set();
  private stageSubscribers: Set<StageChangeSubscriber> = new Set();
  private cycleSubscribers: Set<CycleCompleteSubscriber> = new Set();

  private animationFrameId: number | null = null;
  private intervalTimerId: any = null;
  private lastStage: BreathStage = 'inhale';
  private lastCycle: number = 0;
  private isDisposed: boolean = false;

  constructor(options?: BreathEngineOptions) {
    let rhythmConfig = options?.rhythm;
    let autoConfig = options?.automations;

    if (!rhythmConfig) {
      // Attempt loading persisted configuration or fallback to factory default
      const saved = loadBreathConfig();
      rhythmConfig = saved.customRhythm || FACTORY_RHYTHMS.box;
      if (!autoConfig && saved.automations) {
        autoConfig = saved.automations;
      }
    }

    this.stateMachine = new BreathStateMachine({ rhythm: rhythmConfig });
    this.automations = autoConfig ? [...autoConfig] : [...FACTORY_AUTOMATIONS];
    this.lastStage = this.stateMachine.getCurrentStage();
    this.lastCycle = this.stateMachine.getCycleCount();

    if (options?.autoStart) {
      this.start();
    }
  }

  /**
   * Starts or resumes breath cycle loop
   */
  start(): void {
    if (this.isDisposed || this.stateMachine.getIsPlaying()) return;

    this.stateMachine.start();
    this.startLoop();

    // Immediately broadcast resume snapshot
    this.broadcastSnapshot();
  }

  /**
   * Pauses the breath cycle loop and freezes state
   */
  pause(): void {
    if (this.isDisposed || !this.stateMachine.getIsPlaying()) return;

    this.stateMachine.pause();
    this.stopLoop();

    // Broadcast final paused snapshot
    this.broadcastSnapshot();
  }

  /**
   * Resume clock
   */
  resume(): void {
    this.start();
  }

  /**
   * Toggles between play and pause
   */
  toggle(): void {
    if (this.stateMachine.getIsPlaying()) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Stops playback and resets state to beginning of Inhale
   */
  stop(): void {
    this.pause();
    this.stateMachine.reset();
    this.lastStage = 'inhale';
    this.lastCycle = 0;
    this.broadcastSnapshot();
  }

  /**
   * Updates breath rhythm durations with hot-rescaling
   */
  setRhythm(rhythm: BreathRhythmConfig): void {
    this.stateMachine.setRhythm(rhythm);
    this.broadcastSnapshot();
  }

  /**
   * Retrieves active rhythm
   */
  getRhythm(): BreathRhythmConfig {
    return this.stateMachine.getRhythm();
  }

  /**
   * Configures parameter automation curves
   */
  setAutomation(config: ParameterAutomationConfig[]): void {
    this.automations = Array.isArray(config) ? [...config] : [...FACTORY_AUTOMATIONS];
  }

  /**
   * Retrieves active automation configs
   */
  getAutomation(): ParameterAutomationConfig[] {
    return [...this.automations];
  }

  /**
   * Returns current immutable clock snapshot
   */
  getSnapshot(): BreathClockSnapshot {
    return this.stateMachine.getSnapshot();
  }

  /**
   * Subscribes to 60fps clock ticks
   * @returns Unsubscribe function
   */
  onTick(callback: BreathTickSubscriber): () => void {
    this.tickSubscribers.add(callback);
    return () => {
      this.tickSubscribers.delete(callback);
    };
  }

  /**
   * Subscribes to stage transition events
   */
  onStageChange(callback: StageChangeSubscriber): () => void {
    this.stageSubscribers.add(callback);
    return () => {
      this.stageSubscribers.delete(callback);
    };
  }

  /**
   * Subscribes to cycle completion events
   */
  onCycleComplete(callback: CycleCompleteSubscriber): () => void {
    this.cycleSubscribers.add(callback);
    return () => {
      this.cycleSubscribers.delete(callback);
    };
  }

  /**
   * Manual clock tick (for unit test stepping or external sync)
   */
  tick(deltaSec?: number): BreathClockSnapshot {
    const snapshot = this.stateMachine.tick(deltaSec);
    this.checkTransitionsAndNotify(snapshot);
    return snapshot;
  }

  /**
   * Disposes the engine and releases all timers and subscribers
   */
  dispose(): void {
    this.pause();
    this.isDisposed = true;
    this.stopLoop();
    this.tickSubscribers.clear();
    this.stageSubscribers.clear();
    this.cycleSubscribers.clear();
  }

  private startLoop(): void {
    this.stopLoop();

    if (typeof requestAnimationFrame !== 'undefined') {
      const loop = () => {
        if (!this.stateMachine.getIsPlaying() || this.isDisposed) {
          return;
        }
        const snapshot = this.stateMachine.tick();
        this.checkTransitionsAndNotify(snapshot);
        this.animationFrameId = requestAnimationFrame(loop);
      };
      this.animationFrameId = requestAnimationFrame(loop);
    } else {
      // Fallback for Node / headless Vitest environments (~60fps, 16ms)
      this.intervalTimerId = setInterval(() => {
        if (!this.stateMachine.getIsPlaying() || this.isDisposed) {
          this.stopLoop();
          return;
        }
        const snapshot = this.stateMachine.tick(0.016);
        this.checkTransitionsAndNotify(snapshot);
      }, 16);
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.intervalTimerId !== null) {
      clearInterval(this.intervalTimerId);
      this.intervalTimerId = null;
    }
  }

  private broadcastSnapshot(): void {
    const snapshot = this.stateMachine.getSnapshot();
    this.checkTransitionsAndNotify(snapshot);
  }

  private checkTransitionsAndNotify(snapshot: BreathClockSnapshot): void {
    // Check stage change
    if (snapshot.currentStage !== this.lastStage) {
      const oldStage = this.lastStage;
      this.lastStage = snapshot.currentStage;
      for (const sub of this.stageSubscribers) {
        try {
          sub(snapshot.currentStage, oldStage, snapshot.cycleCount);
        } catch {
          // Guard against subscriber errors
        }
      }
    }

    // Check cycle completion
    if (snapshot.cycleCount > this.lastCycle) {
      this.lastCycle = snapshot.cycleCount;
      for (const sub of this.cycleSubscribers) {
        try {
          sub(snapshot.cycleCount);
        } catch {
          // Guard against subscriber errors
        }
      }
    }

    // Emit tick to all tick subscribers
    for (const sub of this.tickSubscribers) {
      try {
        sub(snapshot);
      } catch {
        // Guard against subscriber errors
      }
    }
  }
}
