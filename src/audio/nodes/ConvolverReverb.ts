/**
 * Synhale 2 - ConvolverReverb (Synthetic IR Convolver & Instant Purge)
 * 
 * Features:
 * - Direct in-memory mathematical Gaussian impulse response generation (no external assets)
 * - Decay time (0.5..12.0s) and high frequency damping adaptation
 * - Equal-power dry/wet crossfade matrix
 * - Instant zero-residue loop purge for 0ms hard cut
 * - 5ms smooth hardware bypass relay
 */

import { EffectsChainParams, AudioEffectNode } from '../../types/audio';
import { computeEqualPowerMix, generateSyntheticImpulseResponse } from '../dsp/syntheticReverb';
import { sanitizeParameterPatch } from '../dsp/parameterSafety';

export class ConvolverReverb implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  public readonly reverbInGain: GainNode;
  private convolver: ConvolverNode;
  private dryGain: GainNode;
  public readonly wetGain: GainNode;
  private processedMixNode: GainNode;
  private bypassDryGain: GainNode;
  private effectOutGain: GainNode;

  private currentParams: EffectsChainParams['reverb'] = {
    decayTime: 3.2,
    damping: 0.4,
    mix: 0.3,
    bypass: false
  };

  private isPurged = false;
  private isDisposed = false;
  private irDebounceTimer: any = null;

  constructor(ctx: BaseAudioContext, id = 'reverb') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.reverbInGain = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.processedMixNode = ctx.createGain();
    this.bypassDryGain = ctx.createGain();
    this.effectOutGain = ctx.createGain();

    // Generate initial synthetic IR
    this.updateImpulseResponse();

    // Equal-power gains
    const { dry, wet } = computeEqualPowerMix(this.currentParams.mix);
    this.dryGain.gain.value = dry;
    this.wetGain.gain.value = wet;

    // Bypass state
    const isBypassed = this.currentParams.bypass;
    this.bypassDryGain.gain.value = isBypassed ? 1.0 : 0.0;
    this.effectOutGain.gain.value = isBypassed ? 0.0 : 1.0;

    // Routing:
    // 1. Dry path within effect:
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.processedMixNode);

    // 2. Wet path:
    this.inputNode.connect(this.reverbInGain);
    this.reverbInGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.processedMixNode);

    // 3. Bypass switching:
    this.processedMixNode.connect(this.effectOutGain);
    this.effectOutGain.connect(this.outputNode);

    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);
  }

  private updateImpulseResponse(): void {
    try {
      const buffer = generateSyntheticImpulseResponse(
        this.ctx,
        this.currentParams.decayTime,
        this.currentParams.damping
      );
      this.convolver.buffer = buffer;
    } catch {
      // In case context is in closed or mock state
    }
  }

  private scheduleImpulseResponseUpdate(): void {
    if (this.irDebounceTimer) {
      clearTimeout(this.irDebounceTimer);
    }
    this.irDebounceTimer = setTimeout(() => {
      if (this.isDisposed) return;
      this.updateImpulseResponse();
      this.irDebounceTimer = null;
    }, 120);
  }

  setParams(params: Partial<EffectsChainParams['reverb']>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    let irNeedsUpdate = false;

    if (params.decayTime !== undefined && params.decayTime !== this.currentParams.decayTime) {
      this.currentParams.decayTime = Math.max(0.2, Math.min(20.0, params.decayTime));
      irNeedsUpdate = true;
    }

    if (params.damping !== undefined && params.damping !== this.currentParams.damping) {
      this.currentParams.damping = Math.max(0, Math.min(1, params.damping));
      irNeedsUpdate = true;
    }

    if (irNeedsUpdate) {
      this.scheduleImpulseResponseUpdate();
    }

    if (params.mix !== undefined) {
      this.currentParams.mix = Math.max(0, Math.min(1, params.mix));
      const { dry, wet } = computeEqualPowerMix(this.currentParams.mix);
      this.dryGain.gain.setTargetAtTime(dry, now, 0.01);
      if (!this.isPurged) {
        this.wetGain.gain.setTargetAtTime(wet, now, 0.01);
      }
    }

    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      const isBypassed = this.currentParams.bypass;
      const wetTarget = isBypassed ? 0.0 : 1.0;
      const dryTarget = isBypassed ? 1.0 : 0.0;

      // 5ms smooth relay crossfade
      this.bypassDryGain.gain.cancelScheduledValues(now);
      this.bypassDryGain.gain.setValueAtTime(this.bypassDryGain.gain.value, now);
      this.bypassDryGain.gain.linearRampToValueAtTime(dryTarget, now + 0.005);

      this.effectOutGain.gain.cancelScheduledValues(now);
      this.effectOutGain.gain.setValueAtTime(this.effectOutGain.gain.value, now);
      this.effectOutGain.gain.linearRampToValueAtTime(wetTarget, now + 0.005);
    }
  }

  /**
   * Instantly purges convolver input and wet send for 0ms hard stop
   */
  purge(): void {
    if (this.isDisposed) return;
    this.isPurged = true;
    const now = this.ctx.currentTime;

    // Cut reverb input immediately
    this.reverbInGain.gain.cancelScheduledValues(now);
    this.reverbInGain.gain.setValueAtTime(0, now);
    this.reverbInGain.gain.value = 0;

    // Mute wet output immediately to extinguish residual reverberation tail
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(0, now);
    this.wetGain.gain.value = 0;
  }

  /**
   * Restores convolver input and wet gains with 3ms anti-burst micro-ramp
   */
  restore(): void {
    if (this.isDisposed) return;
    this.isPurged = false;
    const now = this.ctx.currentTime;

    this.reverbInGain.gain.cancelScheduledValues(now);
    this.reverbInGain.gain.setValueAtTime(1.0, now);
    this.reverbInGain.gain.value = 1.0;

    const { wet } = computeEqualPowerMix(this.currentParams.mix);
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(0.0, now);
    this.wetGain.gain.linearRampToValueAtTime(wet, now + 0.003);
  }

  getParams(): Readonly<EffectsChainParams['reverb']> {
    return { ...this.currentParams };
  }

  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  disconnect(): void {
    this.outputNode.disconnect();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.irDebounceTimer) {
      clearTimeout(this.irDebounceTimer);
      this.irDebounceTimer = null;
    }
    this.disconnect();
    this.inputNode.disconnect();
    this.reverbInGain.disconnect();
    this.convolver.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.processedMixNode.disconnect();
    this.bypassDryGain.disconnect();
    this.effectOutGain.disconnect();
  }
}
