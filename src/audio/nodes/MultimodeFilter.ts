/**
 * Synhale 2 - MultimodeFilter (24dB/oct Cascaded Dual Biquad Ladder Emulation)
 * 
 * Features:
 * - Two cascaded 2-pole BiquadFilterNodes achieving -24dB/octave attenuation
 * - Lowpass, Highpass, and Bandpass selectable filter types
 * - Split Q factor (sqrt(Q)) for smooth resonance without harsh peaking
 * - 15ms de-zippering automation on cutoff frequency
 * - True hardware relay bypass with 5ms smooth crossfade
 */

import { EffectsChainParams, FilterType, AudioEffectNode } from '../../types/audio';

export class MultimodeFilter implements AudioEffectNode {
  public readonly id: string;
  private ctx: BaseAudioContext;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private filterInGain: GainNode;
  private stage1: BiquadFilterNode;
  private stage2: BiquadFilterNode;
  private filterOutGain: GainNode;
  private bypassDryGain: GainNode;

  private currentParams: EffectsChainParams['filter'] = {
    type: 'lowpass',
    cutoff: 2000,
    resonance: 1.0,
    bypass: false
  };

  private isDisposed = false;
  private filterTypeTimer: ReturnType<typeof setTimeout> | null = null;
  // Purge/restore state for zero-residue hard cut. Without a purge, the
  // internal BiquadFilterNode delay lines retain energy that can ring out
  // during the cut micro-ramp and smear the restart. purge() zeros the
  // in/out/bypass gains instantly; restore() re-applies the pre-purge
  // bypass state via a 5ms relay crossfade to match the live path.
  private isPurged = false;
  private prePurgeBypass = false;

  constructor(ctx: BaseAudioContext, id = 'filter') {
    this.id = id;
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.filterInGain = ctx.createGain();
    this.stage1 = ctx.createBiquadFilter();
    this.stage2 = ctx.createBiquadFilter();
    this.filterOutGain = ctx.createGain();
    this.bypassDryGain = ctx.createGain();

    // Configure initial filter parameters
    this.applyFilterParameters(this.currentParams.type, this.currentParams.cutoff, this.currentParams.resonance, true);

    // Initial bypass state
    const isBypassed = this.currentParams.bypass;
    const initialResComp = 1 / Math.sqrt(1 + 0.25 * this.currentParams.resonance);
    this.bypassDryGain.gain.value = isBypassed ? 1.0 : 0.0;
    this.filterInGain.gain.value = isBypassed ? 0.0 : 1.0;
    this.filterOutGain.gain.value = isBypassed ? 0.0 : initialResComp;

    // Routing:
    // inputNode ──┬──> filterInGain ──> stage1 ──> stage2 ──> filterOutGain ──┬──> outputNode
    //             └──> bypassDryGain ─────────────────────────────────────────┘
    this.inputNode.connect(this.filterInGain);
    this.filterInGain.connect(this.stage1);
    this.stage1.connect(this.stage2);
    this.stage2.connect(this.filterOutGain);
    this.filterOutGain.connect(this.outputNode);

    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);
  }

  setParams(params: Partial<EffectsChainParams['filter']>): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    let updateAcoustics = false;

    if (params.type !== undefined && params.type !== this.currentParams.type) {
      this.currentParams.type = params.type;
      updateAcoustics = true;
    }

    if (params.cutoff !== undefined) {
      const nyquist = (this.ctx.sampleRate || 44100) / 2 - 100;
      const rawCutoff = Number.isFinite(params.cutoff) ? params.cutoff : this.currentParams.cutoff;
      const safeCutoff = Math.max(20, Math.min(Math.min(20000, nyquist), rawCutoff));
      if (safeCutoff !== this.currentParams.cutoff) {
        this.currentParams.cutoff = safeCutoff;
        updateAcoustics = true;
      }
    }

    if (params.resonance !== undefined) {
      const rawRes = Number.isFinite(params.resonance) ? params.resonance : this.currentParams.resonance;
      const safeRes = Math.max(0.1, Math.min(18.0, rawRes));
      if (safeRes !== this.currentParams.resonance) {
        this.currentParams.resonance = safeRes;
        updateAcoustics = true;
      }
    }

    if (updateAcoustics) {
      this.applyFilterParameters(this.currentParams.type, this.currentParams.cutoff, this.currentParams.resonance, false);
    }

    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      const isBypassed = this.currentParams.bypass;
      const resGainComp = 1 / Math.sqrt(1 + 0.25 * this.currentParams.resonance);
      const wetTarget = isBypassed ? 0.0 : resGainComp;
      const dryTarget = isBypassed ? 1.0 : 0.0;

      // 5ms smooth relay crossfade
      this.bypassDryGain.gain.cancelScheduledValues(now);
      this.bypassDryGain.gain.setValueAtTime(this.bypassDryGain.gain.value, now);
      this.bypassDryGain.gain.linearRampToValueAtTime(dryTarget, now + 0.005);

      this.filterInGain.gain.cancelScheduledValues(now);
      this.filterInGain.gain.setValueAtTime(this.filterInGain.gain.value, now);
      this.filterInGain.gain.linearRampToValueAtTime(isBypassed ? 0.0 : 1.0, now + 0.005);

      this.filterOutGain.gain.cancelScheduledValues(now);
      this.filterOutGain.gain.setValueAtTime(this.filterOutGain.gain.value, now);
      this.filterOutGain.gain.linearRampToValueAtTime(wetTarget, now + 0.005);
    }
  }

  private applyFilterParameters(type: FilterType, cutoff: number, resonance: number, immediate: boolean): void {
    const now = this.ctx.currentTime;
    const stageQ = Math.sqrt(Math.max(0.1, resonance));

    let biquadType: BiquadFilterType = 'lowpass';
    let peakGain = 0;
    let effectiveQ = stageQ;

    switch (type) {
      case 'lowpass':
        biquadType = 'lowpass';
        break;
      case 'highpass':
        biquadType = 'highpass';
        break;
      case 'bandpass':
        biquadType = 'bandpass';
        break;
      case 'notch':
        biquadType = 'notch';
        break;
      case 'peak':
        biquadType = 'peaking';
        // Split peak gain across two cascaded biquad stages (max 9dB per stage = 18dB total boost)
        peakGain = Math.min(9, resonance * 1.75);
        break;
      case 'ladder':
        biquadType = 'lowpass';
        // Moog 24dB ladder emulation: slightly higher Q with organic saturation slope
        effectiveQ = stageQ * 1.35;
        break;
    }

    // Adaptive resonance damping compensation: 1 / sqrt(1 + 0.25 * Q)
    // Prevents cascaded dual 2-pole resonance from exploding +30dB to +36dB at Q=18
    const resGainCompensation = 1 / Math.sqrt(1 + 0.25 * resonance);

    if (this.stage1.type !== biquadType || this.stage2.type !== biquadType) {
      if (this.filterTypeTimer !== null) {
        clearTimeout(this.filterTypeTimer);
        this.filterTypeTimer = null;
      }
      if (!immediate && this.ctx.state === 'running') {
        // 3ms micro-ducking on filter type transition to eliminate coefficient clicks
        this.filterOutGain.gain.cancelScheduledValues(now);
        this.filterOutGain.gain.setValueAtTime(this.filterOutGain.gain.value, now);
        this.filterOutGain.gain.linearRampToValueAtTime(0.0001, now + 0.003);
        this.filterTypeTimer = setTimeout(() => {
          this.filterTypeTimer = null;
          if (this.isDisposed) return;
          this.stage1.type = biquadType;
          this.stage2.type = biquadType;
          const postNow = this.ctx.currentTime;
          this.filterOutGain.gain.cancelScheduledValues(postNow);
          const targetGain = this.currentParams.bypass ? 0.0 : resGainCompensation;
          this.filterOutGain.gain.linearRampToValueAtTime(targetGain, postNow + 0.003);
        }, 3);
      } else {
        this.stage1.type = biquadType;
        this.stage2.type = biquadType;
        if (!this.currentParams.bypass) {
          this.filterOutGain.gain.setValueAtTime(resGainCompensation, now);
          this.filterOutGain.gain.value = resGainCompensation;
        }
      }
    } else {
      if (!this.currentParams.bypass) {
        if (immediate) {
          this.filterOutGain.gain.setValueAtTime(resGainCompensation, now);
          this.filterOutGain.gain.value = resGainCompensation;
        } else {
          this.filterOutGain.gain.setTargetAtTime(resGainCompensation, now, 0.015);
        }
      }
    }

    if (biquadType === 'peaking') {
      if (immediate) {
        this.stage1.gain.value = peakGain;
        this.stage2.gain.value = peakGain;
      } else {
        this.stage1.gain.setTargetAtTime(peakGain, now, 0.015);
        this.stage2.gain.setTargetAtTime(peakGain, now, 0.015);
      }
    }

    if (immediate) {
      this.stage1.frequency.value = cutoff;
      this.stage2.frequency.value = cutoff;
      this.stage1.Q.value = effectiveQ;
      this.stage2.Q.value = effectiveQ;
    } else {
      // 15ms de-zippering smooth transition
      this.stage1.frequency.setTargetAtTime(cutoff, now, 0.015);
      this.stage2.frequency.setTargetAtTime(cutoff, now, 0.015);
      this.stage1.Q.setTargetAtTime(effectiveQ, now, 0.015);
      this.stage2.Q.setTargetAtTime(effectiveQ, now, 0.015);
    }
  }

  getParams(): Readonly<EffectsChainParams['filter']> {
    return { ...this.currentParams };
  }

  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  disconnect(): void {
    this.outputNode.disconnect();
  }

  purge(): void {
    // Zero-residue purge: instantly silence all filter path gains so the
    // internal BiquadFilterNode delay lines can no longer contribute energy
    // downstream during the master cut micro-ramp. Restored by restore().
    if (this.isDisposed || this.isPurged) return;
    this.isPurged = true;
    this.prePurgeBypass = this.currentParams.bypass;

    const now = this.ctx.currentTime;
    this.filterInGain.gain.cancelScheduledValues(now);
    this.filterInGain.gain.setValueAtTime(0.0, now);

    this.filterOutGain.gain.cancelScheduledValues(now);
    this.filterOutGain.gain.setValueAtTime(0.0, now);

    this.bypassDryGain.gain.cancelScheduledValues(now);
    this.bypassDryGain.gain.setValueAtTime(0.0, now);
  }

  /**
   * Restores normal audio routing after hard cut. Re-applies the pre-purge
   * bypass state through the same 5ms relay crossfade used by setParams.
   */
  restore(): void {
    if (this.isDisposed || !this.isPurged) return;
    this.isPurged = false;

    const now = this.ctx.currentTime;
    const isBypassed = this.prePurgeBypass;
    const resGainComp = 1 / Math.sqrt(1 + 0.25 * this.currentParams.resonance);
    const wetTarget = isBypassed ? 0.0 : resGainComp;
    const dryTarget = isBypassed ? 1.0 : 0.0;
    const rampEnd = now + 0.005;

    this.bypassDryGain.gain.cancelScheduledValues(now);
    this.bypassDryGain.gain.setValueAtTime(this.bypassDryGain.gain.value, now);
    this.bypassDryGain.gain.linearRampToValueAtTime(dryTarget, rampEnd);

    this.filterInGain.gain.cancelScheduledValues(now);
    this.filterInGain.gain.setValueAtTime(this.filterInGain.gain.value, now);
    this.filterInGain.gain.linearRampToValueAtTime(isBypassed ? 0.0 : 1.0, rampEnd);

    this.filterOutGain.gain.cancelScheduledValues(now);
    this.filterOutGain.gain.setValueAtTime(this.filterOutGain.gain.value, now);
    this.filterOutGain.gain.linearRampToValueAtTime(wetTarget, rampEnd);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.filterTypeTimer !== null) {
      clearTimeout(this.filterTypeTimer);
      this.filterTypeTimer = null;
    }
    this.disconnect();
    this.inputNode.disconnect();
    this.filterInGain.disconnect();
    this.stage1.disconnect();
    this.stage2.disconnect();
    this.filterOutGain.disconnect();
    this.bypassDryGain.disconnect();
  }
}
