import type { BreathStage } from './audio';

export interface BreathRhythmConfig {
  inhale: number;   // seconds >= 0.5
  holdIn: number;   // seconds >= 0.0
  exhale: number;   // seconds >= 0.5
  holdOut: number;  // seconds >= 0.0
}

export interface StageAutomationCurve {
  startVal: number; // 0..1
  endVal: number;   // 0..1
  tension: number;  // -1..+1 (0 = linear)
}

export interface ParameterAutomationConfig {
  targetParam: string;
  inhale: StageAutomationCurve;
  holdIn: StageAutomationCurve;
  exhale: StageAutomationCurve;
  holdOut: StageAutomationCurve;
}

export interface BreathClockSnapshot {
  isPlaying: boolean;
  currentStage: BreathStage;
  stageProgress: number;     // 0..1
  stageRemainingSeconds: number;
  cycleProgress: number;     // 0..1
  breathMacro: number;       // 0..1
  cycleCount: number;
}

export interface BreathEngineApi {
  start(): void;
  pause(): void;
  toggle(): void;
  setRhythm(rhythm: BreathRhythmConfig): void;
  setAutomation(config: ParameterAutomationConfig[]): void;
  getSnapshot(): BreathClockSnapshot;
  onTick(callback: (snapshot: BreathClockSnapshot) => void): () => void;
}
