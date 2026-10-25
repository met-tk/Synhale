import { sanitizeParameterPatch } from '../dsp/parameterSafety';
/**
 * Synhale 2 - DriveModule (4x Oversampled Soft Saturation & Auto-Makeup Gain)
 * 
 * Features:
 * - WaveShaperNode with mandatory 4x anti-aliasing oversampling
 * - Tape warmth and tube harmonic saturation curves
 * - Automatic loudness makeup gain compensation
 * - 5ms smooth hardware bypass relay
 */

import { EffectsChainParams, AudioEffectNode } from '../../types/audio';
import { computeDriveMakeupGain, generateDriveCurve } from '../dsp/waveShaperCurves';

export class DriveModule implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private waveShaper: WaveShaperNode;
  private makeupGain: GainNode;
  private dcBlocker: BiquadFilterNode;
  private driveOutGain: GainNode;
  private bypassDryGain: GainNode;

  private currentParams: EffectsChainParams['drive'] = {
    amount: 0.0,
    tone: 0.5,
    bypass: false
  };

  private isDisposed = false;

  constructor(ctx: BaseAudioContext, id = 'drive') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.waveShaper = ctx.createWaveShaper();
    this.makeupGain = ctx.createGain();
    this.dcBlocker = ctx.createBiquadFilter();
    this.driveOutGain = ctx.createGain();
    this.bypassDryGain = ctx.createGain();

    // 4x oversampling is mandatory for anti-aliasing
    this.waveShaper.oversample = '4x';

    // 12Hz DC blocker highpass filter to eliminate DC offset from asymmetric tube saturation
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 12.0;
    this.dcBlocker.Q.value = 0.707;

    this.updateCurve();

    // Initial gains: amount controls transfer function and makeup compensation
    this.makeupGain.gain.value = computeDriveMakeupGain(this.currentParams.amount);

    // Initial bypass configuration
    const isBypassed = this.currentParams.bypass;
    this.bypassDryGain.gain.value = isBypassed ? 1.0 : 0.0;
    this.driveOutGain.gain.value = isBypassed ? 0.0 : 1.0;

    // Clean Serial Routing (eliminates 4x oversampling comb-filtering from parallel dry mixing):
    // inputNode ──> waveShaper ──> makeupGain ──> dcBlocker ──> driveOutGain ──┬──> outputNode
    // inputNode ──> bypassDryGain ─────────────────────────────────────────────┘
    this.inputNode.connect(this.waveShaper);
    this.waveShaper.connect(this.makeupGain);
    this.makeupGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.driveOutGain);
    this.driveOutGain.connect(this.outputNode);

    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);
  }

  private updateCurve(): void {
    // Generate saturated curve combining amount and tone directly in transfer curve
    const curve = generateDriveCurve(this.currentParams.amount, this.currentParams.tone);
    this.waveShaper.curve = curve as unknown as Float32Array<ArrayBuffer>;
  }

  setParams(params: Partial<EffectsChainParams['drive']>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;
    let curveNeedsUpdate = false;

    if (params.tone !== undefined && params.tone !== this.currentParams.tone) {
      this.currentParams.tone = Math.max(0, Math.min(1, params.tone));
      curveNeedsUpdate = true;
    }

    if (params.amount !== undefined && params.amount !== this.currentParams.amount) {
      this.currentParams.amount = Math.max(0, Math.min(1, params.amount));
      const makeup = computeDriveMakeupGain(this.currentParams.amount);
      this.makeupGain.gain.setTargetAtTime(makeup, now, 0.015);
      curveNeedsUpdate = true;
    }

    if (curveNeedsUpdate) {
      this.updateCurve();
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

      this.driveOutGain.gain.cancelScheduledValues(now);
      this.driveOutGain.gain.setValueAtTime(this.driveOutGain.gain.value, now);
      this.driveOutGain.gain.linearRampToValueAtTime(wetTarget, now + 0.005);
    }
  }

  getParams(): Readonly<EffectsChainParams['drive']> {
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
    this.waveShaper.disconnect();
    this.makeupGain.disconnect();
    this.dcBlocker.disconnect();
    this.driveOutGain.disconnect();
    this.bypassDryGain.disconnect();
  }
}
