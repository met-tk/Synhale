import { sanitizeParameterPatch } from '../dsp/parameterSafety';
/**
 * Synhale 2 - GainModule (Precision Preamp & Soft-Clipping Protection)
 * 
 * Features:
 * - Clean analog-modeled gain from -12dB to +24dB
 * - 12Hz Butterworth highpass filter (DC Blocker) to eliminate sub-audio offset
 * - Switchable smooth tanh soft-clipping protection (prevents digital harsh distortion)
 * - 4x oversampling anti-aliased WaveShaperNode
 * - 5ms smooth hardware bypass crossfade
 * - 25ms golden anti-zipper de-clicking audio parameter interpolation via setTargetAtTime
 */

import { GainParams, AudioEffectNode } from '../../types/audio';

export class GainModule implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private dcBlocker: BiquadFilterNode;
  private gainNode: GainNode;
  private softClipper: WaveShaperNode;
  private softClipWetGain: GainNode;
  private softClipDryGain: GainNode;
  private effectOutGain: GainNode;
  private bypassDryGain: GainNode;

  private currentParams: GainParams = {
    value: 0.0, // 0 dB (unity gain)
    bypass: false,
    softClip: true
  };

  private isDisposed = false;
  private currentLinearGain = 1.0;

  constructor(ctx: BaseAudioContext, id = 'gain') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.dcBlocker = ctx.createBiquadFilter();
    this.gainNode = ctx.createGain();
    this.softClipper = ctx.createWaveShaper();
    this.softClipWetGain = ctx.createGain();
    this.softClipDryGain = ctx.createGain();
    this.effectOutGain = ctx.createGain();
    this.bypassDryGain = ctx.createGain();

    // 12Hz Butterworth highpass filter (DC Blocker) to eliminate sub-audio DC offset
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 12.0;
    this.dcBlocker.Q.value = 0.7071;

    // Configure 4x oversampling soft-clipping curve (tanh curve)
    this.softClipper.oversample = '4x';
    this.softClipper.curve = this.generateSoftClipCurve() as unknown as Float32Array<ArrayBuffer>;

    // Initial gain calculation (0 dB = 1.0)
    const initialLinear = Math.pow(10, this.currentParams.value / 20);
    this.gainNode.gain.value = initialLinear;

    // Initial soft-clip routing
    const useSoftClip = this.currentParams.softClip ?? true;
    this.softClipWetGain.gain.value = useSoftClip ? 1.0 : 0.0;
    this.softClipDryGain.gain.value = useSoftClip ? 0.0 : 1.0;

    // Initial bypass configuration
    const isBypassed = this.currentParams.bypass;
    this.bypassDryGain.gain.value = isBypassed ? 1.0 : 0.0;
    this.effectOutGain.gain.value = isBypassed ? 0.0 : 1.0;

    // Audio Graph Routing:
    // 1. Core Path: input -> dcBlocker (12Hz HPF) -> gainNode
    this.inputNode.connect(this.dcBlocker);
    this.dcBlocker.connect(this.gainNode);

    // 2. Soft-clip split:
    //    gainNode -> softClipper -> softClipWetGain -> effectOutGain
    //    gainNode -> softClipDryGain -> effectOutGain
    this.gainNode.connect(this.softClipper);
    this.softClipper.connect(this.softClipWetGain);
    this.softClipWetGain.connect(this.effectOutGain);

    this.gainNode.connect(this.softClipDryGain);
    this.softClipDryGain.connect(this.effectOutGain);

    this.effectOutGain.connect(this.outputNode);

    // 3. Bypass direct wire: input -> bypassDryGain -> outputNode
    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);
  }

  private generateSoftClipCurve(): Float32Array {
    const nSamples = 1024;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1; // -1 to 1
      // Gentle warm tanh soft-clipping with unity slope at origin
      curve[i] = Math.tanh(x * 1.25) / Math.tanh(1.25);
    }
    return curve;
  }

  setParams(params: Partial<GainParams>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    if (params.value !== undefined) {
      // Clamped to [-12 dB, +24 dB]
      const nextValue = Math.max(-12.0, Math.min(24.0, params.value));
      if (Math.abs(nextValue - this.currentParams.value) > 1e-4) {
        this.currentParams.value = nextValue;
        const targetLinear = Math.pow(10, this.currentParams.value / 20);

        const currentLinear = Number.isFinite(this.currentLinearGain) && this.currentLinearGain > 0
          ? this.currentLinearGain
          : Math.pow(10, this.currentParams.value / 20);
        const anchorValue = (Number.isFinite(this.gainNode.gain.value) && this.gainNode.gain.value > 1e-4)
          ? this.gainNode.gain.value
          : currentLinear;
        this.currentLinearGain = targetLinear;

        // Cancel pending automations to prevent curve stacking
        this.gainNode.gain.cancelScheduledValues(now);
        // Anchor to safe non-zero instantaneous value for continuous derivative
        this.gainNode.gain.setValueAtTime(anchorValue, now);
        // Smooth exponential transition with 25ms golden anti-zipper time constant
        this.gainNode.gain.setTargetAtTime(targetLinear, now, 0.025);
      }
    }

    if (params.softClip !== undefined && params.softClip !== this.currentParams.softClip) {
      this.currentParams.softClip = params.softClip;
      const wet = this.currentParams.softClip ? 1.0 : 0.0;
      const dry = this.currentParams.softClip ? 0.0 : 1.0;
      this.softClipWetGain.gain.setTargetAtTime(wet, now, 0.008);
      this.softClipDryGain.gain.setTargetAtTime(dry, now, 0.008);
    }

    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      const isBypassed = this.currentParams.bypass;
      const wetTarget = isBypassed ? 0.0 : 1.0;
      const dryTarget = isBypassed ? 1.0 : 0.0;

      // 5ms smooth hardware bypass crossfade
      this.bypassDryGain.gain.cancelScheduledValues(now);
      this.bypassDryGain.gain.setValueAtTime(this.bypassDryGain.gain.value, now);
      this.bypassDryGain.gain.linearRampToValueAtTime(dryTarget, now + 0.005);

      this.effectOutGain.gain.cancelScheduledValues(now);
      this.effectOutGain.gain.setValueAtTime(this.effectOutGain.gain.value, now);
      this.effectOutGain.gain.linearRampToValueAtTime(wetTarget, now + 0.005);
    }
  }

  getParams(): Readonly<GainParams> {
    return { ...this.currentParams };
  }

  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  disconnect(): void {
    this.outputNode.disconnect();
  }

  purge(): void {
    // Zero-residue purge
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.disconnect();
    this.inputNode.disconnect();
    this.dcBlocker.disconnect();
    this.gainNode.disconnect();
    this.softClipper.disconnect();
    this.softClipWetGain.disconnect();
    this.softClipDryGain.disconnect();
    this.effectOutGain.disconnect();
    this.bypassDryGain.disconnect();
  }
}
