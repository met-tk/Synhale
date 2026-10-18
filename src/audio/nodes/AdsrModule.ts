/**
 * Synhale 2 - AdsrModule (Acoustic Amplitude & Breath Envelope Generator)
 * 
 * High-fidelity Web Audio envelope shaper designed for breathing sound synthesis:
 * - Attack: Controls initial acoustic onset transient (0.01..10.0 s)
 * - Decay: Natural harmonic dissipation towards sustain body (0.01..10.0 s)
 * - Sustain: Steady vibration amplitude during chest hold (0.0..1.0)
 * - Release: Gentle dissipation into silence on exhalation (0.01..15.0 s)
 * 
 * Features:
 * - Direct VCA in-line audio processing (inputNode -> envelopeGain -> outputNode)
 * - Adaptive duration clamping to prevent stage overruns
 * - Pop-free parameter ramping with cancellation anchoring
 * - 0ms hard-cut purge & instant restoration
 * - Full zero-emoji compliance
 */

import { DEFAULT_ADSR_PARAMS, type AdsrParams, type AudioEffectNode } from '../../types/audio';

export { DEFAULT_ADSR_PARAMS };

export class AdsrModule implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;
  public readonly envelopeGain: GainNode;

  private currentParams: AdsrParams = { ...DEFAULT_ADSR_PARAMS };
  private isDisposed = false;
  private lastStage: string | null = null;

  constructor(ctx: BaseAudioContext, id = 'adsr') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.envelopeGain = ctx.createGain();

    // Default to zero level before gate triggers (click-free startup)
    this.envelopeGain.gain.value = this.currentParams.bypass ? 1.0 : 0.0;

    // Connect audio signal chain: input -> envelopeGain -> output
    this.inputNode.connect(this.envelopeGain);
    this.envelopeGain.connect(this.outputNode);
  }

  /**
   * Connects the output of this module to a destination AudioNode or AudioParam
   */
  connect(destination: AudioNode): AudioNode;
  connect(destination: AudioParam): void;
  connect(destination: AudioNode | AudioParam): AudioNode | void {
    return (this.outputNode as any).connect(destination);
  }

  /**
   * Disconnects the output node
   */
  disconnect(): void {
    this.outputNode.disconnect();
  }

  /**
   * Triggers the Attack and schedules Decay towards Sustain (Gate ON / Inhale)
   */
  triggerAttack(targetPeak = 1.0, stageDuration?: number): void {
    if (this.isDisposed) return;
    if (this.currentParams.bypass) {
      this.envelopeGain.gain.value = 1.0;
      return;
    }

    const now = this.ctx.currentTime;
    const gain = this.envelopeGain.gain;

    // 1. Cancel past scheduled events and anchor current value to eliminate clicks
    gain.cancelScheduledValues(now);
    const currentValue = Math.max(0.0001, gain.value);
    gain.setValueAtTime(currentValue, now);

    // 2. Adaptive attack duration (clamp to 95% of stage if stageDuration provided)
    const effectiveAttack = stageDuration
      ? Math.max(0.005, Math.min(this.currentParams.attack, stageDuration * 0.95))
      : Math.max(0.005, this.currentParams.attack);
    const attackEndTime = now + effectiveAttack;

    // 3. Attack ramp: smooth linear or log rise to peak
    gain.linearRampToValueAtTime(targetPeak, attackEndTime);

    // 4. Decay ramp: exponential decline towards sustain floor
    const effectiveDecay = Math.max(0.005, this.currentParams.decay);
    const sustainFloor = Math.max(0.0001, this.currentParams.sustain * targetPeak);
    gain.exponentialRampToValueAtTime(sustainFloor, attackEndTime + effectiveDecay);

    this.lastStage = 'attack';
  }

  /**
   * Maintains steady sustain level (Hold In)
   */
  triggerHold(targetPeak = 1.0): void {
    if (this.isDisposed) return;
    if (this.currentParams.bypass) {
      this.envelopeGain.gain.value = 1.0;
      return;
    }

    const now = this.ctx.currentTime;
    const gain = this.envelopeGain.gain;
    const sustainTarget = Math.max(0.0001, this.currentParams.sustain * targetPeak);

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(sustainTarget, now + 0.05);

    this.lastStage = 'hold';
  }

  /**
   * Triggers the Release ramp towards quiet dissipation (Gate OFF / Exhale)
   */
  triggerRelease(stageDuration?: number): void {
    if (this.isDisposed) return;
    if (this.currentParams.bypass) {
      this.envelopeGain.gain.value = 1.0;
      return;
    }

    const now = this.ctx.currentTime;
    const gain = this.envelopeGain.gain;

    // Anchor current value
    gain.cancelScheduledValues(now);
    const currentVal = Math.max(0.0001, gain.value);
    gain.setValueAtTime(currentVal, now);

    // Adaptive release duration
    const effectiveRelease = stageDuration
      ? Math.max(0.005, Math.min(this.currentParams.release, stageDuration * 0.98))
      : Math.max(0.005, this.currentParams.release);

    gain.exponentialRampToValueAtTime(0.0001, now + effectiveRelease);

    this.lastStage = 'release';
  }

  /**
   * Sets envelope to stillness floor (Hold Out)
   */
  triggerQuiet(): void {
    if (this.isDisposed) return;
    if (this.currentParams.bypass) {
      this.envelopeGain.gain.value = 1.0;
      return;
    }

    const now = this.ctx.currentTime;
    const gain = this.envelopeGain.gain;

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0.0001, now + 0.05);

    this.lastStage = 'quiet';
  }

  /**
   * Updates ADSR envelope parameters with clamping
   */
  setParams(params: Partial<AdsrParams>): void {
    if (this.isDisposed) return;

    if (params.attack !== undefined) {
      this.currentParams.attack = Math.max(0.005, Math.min(15.0, params.attack));
    }
    if (params.decay !== undefined) {
      this.currentParams.decay = Math.max(0.005, Math.min(15.0, params.decay));
    }
    if (params.sustain !== undefined) {
      this.currentParams.sustain = Math.max(0.0, Math.min(1.0, params.sustain));
      // In commercial synths (Serum, Vital, Pigments), updating sustain only adapts the hold level
      // when already settled in the sustain stage; it NEVER abruptly aborts ongoing Attack or Decay ramps!
      if (!this.currentParams.bypass && this.lastStage === 'hold') {
        const now = this.ctx.currentTime;
        const targetSustain = Math.max(0.0001, this.currentParams.sustain);
        const anchorVal = Number.isFinite(this.envelopeGain.gain.value) && this.envelopeGain.gain.value > 0.0001
          ? this.envelopeGain.gain.value
          : targetSustain;
        this.envelopeGain.gain.cancelScheduledValues(now);
        this.envelopeGain.gain.setValueAtTime(anchorVal, now);
        this.envelopeGain.gain.setTargetAtTime(targetSustain, now, 0.025);
      }
    }
    if (params.release !== undefined) {
      this.currentParams.release = Math.max(0.005, Math.min(15.0, params.release));
    }
    if (params.bypass !== undefined) {
      this.currentParams.bypass = params.bypass;
      if (params.bypass) {
        const now = this.ctx.currentTime;
        this.envelopeGain.gain.cancelScheduledValues(now);
        this.envelopeGain.gain.setValueAtTime(1.0, now);
        this.envelopeGain.gain.value = 1.0;
      }
    }
  }

  /**
   * Returns current active ADSR parameters
   */
  getParams(): AdsrParams {
    return { ...this.currentParams };
  }

  /**
   * Returns the last triggered stage name
   */
  getLastStage(): string | null {
    return this.lastStage;
  }

  /**
   * Zero-residue purge for instantaneous 0ms pause/hard-cut
   */
  purge(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;
    this.envelopeGain.gain.cancelScheduledValues(now);
    this.envelopeGain.gain.setValueAtTime(0.0, now);
    this.envelopeGain.gain.value = 0.0;
  }

  /**
   * Restores normal envelope operation upon audio resume
   */
  restore(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;
    const restoredGain = this.currentParams.bypass ? 1.0 : Math.max(0.0001, this.currentParams.sustain);
    this.envelopeGain.gain.cancelScheduledValues(now);
    this.envelopeGain.gain.setValueAtTime(restoredGain, now);
    this.envelopeGain.gain.value = restoredGain;
  }

  /**
   * Disposes the module and tears down node connections
   */
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    try {
      this.inputNode.disconnect();
      this.envelopeGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
