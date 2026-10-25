/**
 * Synhale 2 - StereoDelay (Ping-Pong Stereo Feedback Delay with Damping Absorption)
 * 
 * Features:
 * - Ping-pong cross-feedback delay lines (L -> R -> L)
 * - In-loop low-pass high-frequency absorption filters (tape/analog damping)
 * - Anti-howl feedback limiter clamped to <= 0.85
 * - Equal-power dry/wet mix matrix
 * - Instant zero-residue loop purge for 0ms hard cut
 * - 5ms smooth hardware bypass relay
 */

import { EffectsChainParams, AudioEffectNode } from '../../types/audio';
import { computeEqualPowerMix } from '../dsp/syntheticReverb';
import { sanitizeParameterPatch } from '../dsp/parameterSafety';

export class StereoDelay implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  public readonly delayInGain: GainNode;
  private splitter: ChannelSplitterNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private dampingFilterL: BiquadFilterNode;
  private dampingFilterR: BiquadFilterNode;
  public readonly feedbackGainL: GainNode;
  public readonly feedbackGainR: GainNode;
  private merger: ChannelMergerNode;

  private dryGain: GainNode;
  public readonly wetGain: GainNode;
  private processedMixNode: GainNode;
  private bypassDryGain: GainNode;
  private effectOutGain: GainNode;

  private currentParams: EffectsChainParams['delay'] = {
    time: 0.36,
    feedback: 0.45,
    damping: 3500,
    mix: 0.35,
    bypass: false
  };

  private isPurged = false;
  private isDisposed = false;

  constructor(ctx: BaseAudioContext, id = 'delay') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.delayInGain = ctx.createGain();
    this.splitter = ctx.createChannelSplitter(2);
    this.delayL = ctx.createDelay(5.0);
    this.delayR = ctx.createDelay(5.0);

    this.dampingFilterL = ctx.createBiquadFilter();
    this.dampingFilterR = ctx.createBiquadFilter();
    this.dampingFilterL.type = 'lowpass';
    this.dampingFilterR.type = 'lowpass';

    this.feedbackGainL = ctx.createGain();
    this.feedbackGainR = ctx.createGain();
    this.merger = ctx.createChannelMerger(2);

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.processedMixNode = ctx.createGain();
    this.bypassDryGain = ctx.createGain();
    this.effectOutGain = ctx.createGain();

    // Configure initial times and damping
    this.delayL.delayTime.value = this.currentParams.time;
    // Right delay slightly offset for ping-pong rhythm (1.33x or 1.5x)
    this.delayR.delayTime.value = Math.min(4.5, this.currentParams.time * 1.33);

    this.dampingFilterL.frequency.value = this.currentParams.damping;
    this.dampingFilterR.frequency.value = this.currentParams.damping;

    this.feedbackGainL.gain.value = this.currentParams.feedback;
    this.feedbackGainR.gain.value = this.currentParams.feedback;

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

    // 2. Wet delay path:
    this.inputNode.connect(this.delayInGain);
    this.delayInGain.connect(this.splitter);

    // Splitter channel 0 -> delayL
    this.splitter.connect(this.delayL, 0);
    // Splitter channel 1 -> delayR
    this.splitter.connect(this.delayR, 1);

    // Ping-pong cross feedback:
    // delayL -> dampingFilterL -> feedbackGainL -> delayR
    this.delayL.connect(this.dampingFilterL);
    this.dampingFilterL.connect(this.feedbackGainL);
    this.feedbackGainL.connect(this.delayR);

    // delayR -> dampingFilterR -> feedbackGainR -> delayL
    this.delayR.connect(this.dampingFilterR);
    this.dampingFilterR.connect(this.feedbackGainR);
    this.feedbackGainR.connect(this.delayL);

    // Delay outputs -> merger -> wetGain -> processedMixNode
    this.delayL.connect(this.merger, 0, 0);
    this.delayR.connect(this.merger, 0, 1);
    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.processedMixNode);

    // 3. Hardware Bypass switching:
    this.processedMixNode.connect(this.effectOutGain);
    this.effectOutGain.connect(this.outputNode);

    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);
  }

  setParams(params: Partial<EffectsChainParams['delay']>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    if (params.time !== undefined) {
      this.currentParams.time = Math.max(0.01, Math.min(3.0, params.time));
      this.delayL.delayTime.setTargetAtTime(this.currentParams.time, now, 0.06);
      this.delayR.delayTime.setTargetAtTime(Math.min(4.5, this.currentParams.time * 1.33), now, 0.06);
    }

    if (params.feedback !== undefined) {
      // Anti-howl feedback limiter: 0.95 sat dangerously close to the
      // ping-pong self-oscillation threshold (damping filter provides only
      // ~6 dB/oct above cutoff). 0.85 preserves generous tail length while
      // leaving a stable margin under any damping setting. Matches the
      // documented range in types/audio.ts (0..0.85) and the module header
      // comment on line 7.
      this.currentParams.feedback = Math.max(0, Math.min(0.85, params.feedback));
      if (!this.isPurged) {
        this.feedbackGainL.gain.setTargetAtTime(this.currentParams.feedback, now, 0.015);
        this.feedbackGainR.gain.setTargetAtTime(this.currentParams.feedback, now, 0.015);
      }
    }

    if (params.damping !== undefined) {
      this.currentParams.damping = Math.max(500, Math.min(12000, params.damping));
      this.dampingFilterL.frequency.setTargetAtTime(this.currentParams.damping, now, 0.02);
      this.dampingFilterR.frequency.setTargetAtTime(this.currentParams.damping, now, 0.02);
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
   * Instantly purges delay feedback loop and cuts new input and wet output for 0ms hard stop
   */
  purge(): void {
    if (this.isDisposed) return;
    this.isPurged = true;
    const now = this.ctx.currentTime;

    // Cut delay input immediately
    this.delayInGain.gain.cancelScheduledValues(now);
    this.delayInGain.gain.setValueAtTime(0, now);
    this.delayInGain.gain.value = 0;

    // Cut feedback loop immediately to extinguish lingering echoes
    this.feedbackGainL.gain.cancelScheduledValues(now);
    this.feedbackGainL.gain.setValueAtTime(0, now);
    this.feedbackGainL.gain.value = 0;

    this.feedbackGainR.gain.cancelScheduledValues(now);
    this.feedbackGainR.gain.setValueAtTime(0, now);
    this.feedbackGainR.gain.value = 0;

    // Cut wet gain immediately to prevent lingering in-flight buffer echoes from leaking
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(0, now);
    this.wetGain.gain.value = 0;
  }

  /**
   * Restores delay input, feedback loop, and wet output gains
   */
  restore(): void {
    if (this.isDisposed) return;
    this.isPurged = false;
    const now = this.ctx.currentTime;

    this.delayInGain.gain.cancelScheduledValues(now);
    this.delayInGain.gain.setValueAtTime(1.0, now);
    this.delayInGain.gain.value = 1.0;

    this.feedbackGainL.gain.cancelScheduledValues(now);
    this.feedbackGainL.gain.setValueAtTime(this.currentParams.feedback, now);
    this.feedbackGainL.gain.value = this.currentParams.feedback;

    this.feedbackGainR.gain.cancelScheduledValues(now);
    this.feedbackGainR.gain.setValueAtTime(this.currentParams.feedback, now);
    this.feedbackGainR.gain.value = this.currentParams.feedback;

    const { wet } = computeEqualPowerMix(this.currentParams.mix);
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(0, now);
    this.wetGain.gain.linearRampToValueAtTime(wet, now + 0.003);
  }

  getParams(): Readonly<EffectsChainParams['delay']> {
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
    this.disconnect();
    this.inputNode.disconnect();
    this.delayInGain.disconnect();
    this.splitter.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
    this.dampingFilterL.disconnect();
    this.dampingFilterR.disconnect();
    this.feedbackGainL.disconnect();
    this.feedbackGainR.disconnect();
    this.merger.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.processedMixNode.disconnect();
    this.bypassDryGain.disconnect();
    this.effectOutGain.disconnect();
  }
}
