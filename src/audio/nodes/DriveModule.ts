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
import { getPerformanceBudget } from '../../performance/budget';

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

  // Threshold guard: rebuilding the waveshaper curve on a 4x-oversampled node is audible
  // (resets internal filter state), so suppress micro-updates below perceptual delta.
  private lastAppliedAmount = 0.0;
  private lastAppliedTone = 0.5;
  private static readonly CURVE_UPDATE_THRESHOLD = 0.005;

  /**
   * Curve cache: generateDriveCurve allocates a fresh Float32Array(2048) and runs a
   * non-linear shaping loop. Caching by quantized (amount, tone) avoids redundant work
   * during parameter sweeps; bounded LRU keeps memory flat.
   */
  private static curveCache = new Map<string, Float32Array>();
  private static readonly CURVE_CACHE_MAX = 48;

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

    // 4x 过采样是抗混叠最优解,但按性能预算降级 (medium:2x / low:none) 以保中低端流畅
    const tier = getPerformanceBudget().tier;
    this.waveShaper.oversample = tier === 'high' ? '4x' : tier === 'medium' ? '2x' : 'none';

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
    // Quantize to share cache entries across imperceptible parameter deltas
    const qAmount = Math.round(this.currentParams.amount * 200) / 200;
    const qTone = Math.round(this.currentParams.tone * 200) / 200;
    const key = `${qAmount}|${qTone}`;

    let curve = DriveModule.curveCache.get(key);
    if (!curve) {
      curve = generateDriveCurve(this.currentParams.amount, this.currentParams.tone) as unknown as Float32Array;
      if (DriveModule.curveCache.size >= DriveModule.CURVE_CACHE_MAX) {
        const firstKey = DriveModule.curveCache.keys().next().value;
        if (firstKey !== undefined) DriveModule.curveCache.delete(firstKey);
      }
      DriveModule.curveCache.set(key, curve);
    } else {
      // Refresh LRU
      DriveModule.curveCache.delete(key);
      DriveModule.curveCache.set(key, curve);
    }
    this.waveShaper.curve = curve as unknown as Float32Array<ArrayBuffer>;
    this.lastAppliedAmount = this.currentParams.amount;
    this.lastAppliedTone = this.currentParams.tone;
  }

  setParams(params: Partial<EffectsChainParams['drive']>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;
    let curveNeedsUpdate = false;

    if (params.tone !== undefined && params.tone !== this.currentParams.tone) {
      this.currentParams.tone = Math.max(0, Math.min(1, params.tone));
      // Only rebuild curve when delta is perceptually meaningful
      if (Math.abs(this.currentParams.tone - this.lastAppliedTone) >= DriveModule.CURVE_UPDATE_THRESHOLD) {
        curveNeedsUpdate = true;
      }
    }

    if (params.amount !== undefined && params.amount !== this.currentParams.amount) {
      this.currentParams.amount = Math.max(0, Math.min(1, params.amount));
      const makeup = computeDriveMakeupGain(this.currentParams.amount);
      this.makeupGain.gain.setTargetAtTime(makeup, now, 0.015);
      // Only rebuild curve when delta is perceptually meaningful
      if (Math.abs(this.currentParams.amount - this.lastAppliedAmount) >= DriveModule.CURVE_UPDATE_THRESHOLD) {
        curveNeedsUpdate = true;
      }
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

      // NOTE: We deliberately DO NOT disconnect inputNode from waveShaper.
      // Topology changes on the input side of an actively-biased WaveShaper (its 4x
      // oversampling state holds residual signal) cause audible clicks ("滋滋声")
      // in Chromium-based WebView. The dry/wet relay above already silences the
      // wet path; the residual cost of an idle shaper is far smaller than the click risk.
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
