/**
 * Synhale 2 - 4-Band Parametric Equalizer Module (EqModule)
 * 
 * Professional 4-Band Parametric EQ tailored for sound therapy and breath synthesis:
 * - Band 1 (Low): 80Hz default (20Hz - 500Hz), switchable Low Shelf / Highpass, +/-18dB, Q: 0.1 - 10.0
 * - Band 2 (Mid-Low): 432Hz Sacred tuning foundation (100Hz - 2000Hz), Peaking, +/-18dB, Q: 0.1 - 10.0
 * - Band 3 (Mid-High): 2160Hz Breath airflow harmonic resonance (500Hz - 8000Hz), Peaking, +/-18dB, Q: 0.1 - 10.0
 * - Band 4 (High): 8000Hz Ethereal air shelf (2000Hz - 20000Hz), High Shelf, +/-18dB, Q: 0.1 - 10.0
 * 
 * Features:
 * - Native Web Audio BiquadFilterNode cascade
 * - 15ms setTargetAtTime acoustic de-zippering schedule with cancelScheduledValues safety
 * - 3ms micro-ducking crossfade on Low band filter type transition to eliminate DC clicks
 * - 5ms smooth hardware-grade bypass crossfade
 * - Implements AudioEffectNode for seamless EffectChainManager integration
 * 
 * Strict industrial aesthetics: zero emoji, precision acoustic engineering.
 */

import { AudioEffectNode, EqParams, DEFAULT_EQ_PARAMS } from '../../types/audio';

export class EqModule implements AudioEffectNode {
  readonly id: string;

  readonly inputNode: GainNode;
  readonly outputNode: GainNode;

  private ctx: AudioContext;
  private eqInGain: GainNode;
  private eqOutGain: GainNode;
  private bypassDryGain: GainNode;

  private lowFilter: BiquadFilterNode;
  private midLowFilter: BiquadFilterNode;
  private midHighFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;

  private currentParams: EqParams;
  private isDisposed = false;
  private isPurged = false;
  private prePurgeBypass = false;
  private lowTypeTimer: ReturnType<typeof setTimeout> | null = null;

  private tempMag: Float32Array | null = null;
  private tempPhase: Float32Array | null = null;

  constructor(ctx: AudioContext, initialParams?: Partial<EqParams>, id = 'eq') {
    this.id = id;
    this.ctx = ctx;
    this.currentParams = {
      low: { ...DEFAULT_EQ_PARAMS.low, ...(initialParams?.low || {}) },
      midLow: { ...DEFAULT_EQ_PARAMS.midLow, ...(initialParams?.midLow || {}) },
      midHigh: { ...DEFAULT_EQ_PARAMS.midHigh, ...(initialParams?.midHigh || {}) },
      high: { ...DEFAULT_EQ_PARAMS.high, ...(initialParams?.high || {}) },
      bypass: initialParams?.bypass ?? DEFAULT_EQ_PARAMS.bypass
    };

    // 1. Boundary & Routing Gain Nodes
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.eqInGain = ctx.createGain();
    this.eqOutGain = ctx.createGain();
    this.bypassDryGain = ctx.createGain();

    // 2. 4-Band Biquad Filter Nodes
    this.lowFilter = ctx.createBiquadFilter();
    this.lowFilter.type = this.currentParams.low.type;
    this.lowFilter.frequency.value = this.currentParams.low.frequency;
    this.lowFilter.gain.value = this.currentParams.low.gain;
    this.lowFilter.Q.value = this.currentParams.low.q;

    this.midLowFilter = ctx.createBiquadFilter();
    this.midLowFilter.type = 'peaking';
    this.midLowFilter.frequency.value = this.currentParams.midLow.frequency;
    this.midLowFilter.gain.value = this.currentParams.midLow.gain;
    this.midLowFilter.Q.value = this.currentParams.midLow.q;

    this.midHighFilter = ctx.createBiquadFilter();
    this.midHighFilter.type = 'peaking';
    this.midHighFilter.frequency.value = this.currentParams.midHigh.frequency;
    this.midHighFilter.gain.value = this.currentParams.midHigh.gain;
    this.midHighFilter.Q.value = this.currentParams.midHigh.q;

    this.highFilter = ctx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = this.currentParams.high.frequency;
    this.highFilter.gain.value = this.currentParams.high.gain;
    this.highFilter.Q.value = this.currentParams.high.q;

    // 3. Connect Processing Cascade:
    // inputNode -> eqInGain -> lowFilter -> midLowFilter -> midHighFilter -> highFilter -> eqOutGain -> outputNode
    this.inputNode.connect(this.eqInGain);
    this.eqInGain.connect(this.lowFilter);
    this.lowFilter.connect(this.midLowFilter);
    this.midLowFilter.connect(this.midHighFilter);
    this.midHighFilter.connect(this.highFilter);
    this.highFilter.connect(this.eqOutGain);
    this.eqOutGain.connect(this.outputNode);

    // 4. Connect Hardware Bypass Path:
    // inputNode -> bypassDryGain -> outputNode
    this.inputNode.connect(this.bypassDryGain);
    this.bypassDryGain.connect(this.outputNode);

    // 5. Initialize Bypass Gains
    this.applyBypassState(this.currentParams.bypass, true);
  }

  private scheduleBandFilter(
    filter: BiquadFilterNode,
    freq: number,
    gain: number,
    q: number,
    now: number,
    rampTimeConstant: number
  ): void {
    const safeFreq = (Number.isFinite(filter.frequency.value) && filter.frequency.value > 10) ? filter.frequency.value : freq;
    const safeGain = Number.isFinite(filter.gain.value) ? filter.gain.value : gain;
    const safeQ = (Number.isFinite(filter.Q.value) && filter.Q.value > 0.01) ? filter.Q.value : q;

    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(safeFreq, now);
    filter.frequency.setTargetAtTime(freq, now, rampTimeConstant);

    filter.gain.cancelScheduledValues(now);
    filter.gain.setValueAtTime(safeGain, now);
    filter.gain.setTargetAtTime(gain, now, rampTimeConstant);

    filter.Q.cancelScheduledValues(now);
    filter.Q.setValueAtTime(safeQ, now);
    filter.Q.setTargetAtTime(q, now, rampTimeConstant);
  }

  /**
   * Updates parametric EQ parameters with smooth de-zippering
   */
  setParams(params: Partial<EqParams>): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;
    const rampTimeConstant = 0.015; // 15ms de-zippering

    // Bypass Transition
    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      this.applyBypassState(params.bypass, false);
    }

    // Band 1: Low (Low Shelf / Highpass)
    if (params.low) {
      const targetLow = { ...this.currentParams.low, ...params.low };
      const rawLowFreq = Number.isFinite(targetLow.frequency) ? targetLow.frequency : 80;
      targetLow.frequency = Math.max(20, Math.min(500, rawLowFreq));
      const rawLowGain = Number.isFinite(targetLow.gain) ? targetLow.gain : 0;
      targetLow.gain = Math.max(-18, Math.min(18, rawLowGain));
      const rawLowQ = Number.isFinite(targetLow.q) ? targetLow.q : 0.707;
      targetLow.q = Math.max(0.1, Math.min(10.0, rawLowQ));

      // Type Switch: 3ms micro-ducking crossfade to prevent biquad state discontinuity click
      if (params.low.type !== undefined && params.low.type !== this.currentParams.low.type) {
        if (this.lowTypeTimer !== null) {
          clearTimeout(this.lowTypeTimer);
          this.lowTypeTimer = null;
        }
        this.currentParams.low.type = params.low.type;
        const duckDuration = 0.003;
        this.eqOutGain.gain.cancelScheduledValues(now);
        this.eqOutGain.gain.setValueAtTime(this.eqOutGain.gain.value, now);
        this.eqOutGain.gain.linearRampToValueAtTime(0.0, now + duckDuration);

        // Schedule type switch and fade-in
        const targetWet = this.currentParams.bypass ? 0.0 : 1.0;
        this.lowTypeTimer = setTimeout(() => {
          this.lowTypeTimer = null;
          if (this.isDisposed) return;
          this.lowFilter.type = targetLow.type;
          const resumeTime = this.ctx.currentTime;
          this.eqOutGain.gain.cancelScheduledValues(resumeTime);
          this.eqOutGain.gain.setValueAtTime(0.0, resumeTime);
          this.eqOutGain.gain.linearRampToValueAtTime(targetWet, resumeTime + duckDuration);
        }, 3);
      }

      this.currentParams.low = targetLow;
      this.scheduleBandFilter(this.lowFilter, targetLow.frequency, targetLow.gain, targetLow.q, now, rampTimeConstant);
    }

    // Band 2: Mid-Low (432Hz Peaking)
    if (params.midLow) {
      const targetMidLow = { ...this.currentParams.midLow, ...params.midLow };
      const rawMidLowFreq = Number.isFinite(targetMidLow.frequency) ? targetMidLow.frequency : 432;
      targetMidLow.frequency = Math.max(100, Math.min(2000, rawMidLowFreq));
      const rawMidLowGain = Number.isFinite(targetMidLow.gain) ? targetMidLow.gain : 0;
      targetMidLow.gain = Math.max(-18, Math.min(18, rawMidLowGain));
      const rawMidLowQ = Number.isFinite(targetMidLow.q) ? targetMidLow.q : 1.0;
      targetMidLow.q = Math.max(0.1, Math.min(10.0, rawMidLowQ));

      this.currentParams.midLow = targetMidLow;
      this.scheduleBandFilter(this.midLowFilter, targetMidLow.frequency, targetMidLow.gain, targetMidLow.q, now, rampTimeConstant);
    }

    // Band 3: Mid-High (2160Hz Peaking)
    if (params.midHigh) {
      const targetMidHigh = { ...this.currentParams.midHigh, ...params.midHigh };
      const rawMidHighFreq = Number.isFinite(targetMidHigh.frequency) ? targetMidHigh.frequency : 2160;
      targetMidHigh.frequency = Math.max(500, Math.min(8000, rawMidHighFreq));
      const rawMidHighGain = Number.isFinite(targetMidHigh.gain) ? targetMidHigh.gain : 0;
      targetMidHigh.gain = Math.max(-18, Math.min(18, rawMidHighGain));
      const rawMidHighQ = Number.isFinite(targetMidHigh.q) ? targetMidHigh.q : 1.0;
      targetMidHigh.q = Math.max(0.1, Math.min(10.0, rawMidHighQ));

      this.currentParams.midHigh = targetMidHigh;
      this.scheduleBandFilter(this.midHighFilter, targetMidHigh.frequency, targetMidHigh.gain, targetMidHigh.q, now, rampTimeConstant);
    }

    // Band 4: High (8000Hz High Shelf)
    if (params.high) {
      const targetHigh = { ...this.currentParams.high, ...params.high };
      const rawHighFreq = Number.isFinite(targetHigh.frequency) ? targetHigh.frequency : 8000;
      targetHigh.frequency = Math.max(2000, Math.min(20000, rawHighFreq));
      const rawHighGain = Number.isFinite(targetHigh.gain) ? targetHigh.gain : 0;
      targetHigh.gain = Math.max(-18, Math.min(18, rawHighGain));
      const rawHighQ = Number.isFinite(targetHigh.q) ? targetHigh.q : 0.707;
      targetHigh.q = Math.max(0.1, Math.min(10.0, rawHighQ));

      this.currentParams.high = targetHigh;
      this.scheduleBandFilter(this.highFilter, targetHigh.frequency, targetHigh.gain, targetHigh.q, now, rampTimeConstant);
    }
  }

  /**
   * Smoothly toggles bypass state with 5ms crossfade
   */
  private applyBypassState(bypass: boolean, immediate = false): void {
    const now = this.ctx.currentTime;
    const targetWet = bypass ? 0.0 : 1.0;
    const targetDry = bypass ? 1.0 : 0.0;

    if (immediate) {
      this.eqInGain.gain.setValueAtTime(targetWet, now);
      this.eqOutGain.gain.setValueAtTime(targetWet, now);
      this.bypassDryGain.gain.setValueAtTime(targetDry, now);
      return;
    }

    const fadeDuration = 0.005; // 5ms crossfade
    this.eqInGain.gain.cancelScheduledValues(now);
    this.eqInGain.gain.setValueAtTime(this.eqInGain.gain.value, now);
    this.eqInGain.gain.linearRampToValueAtTime(targetWet, now + fadeDuration);

    this.eqOutGain.gain.cancelScheduledValues(now);
    this.eqOutGain.gain.setValueAtTime(this.eqOutGain.gain.value, now);
    this.eqOutGain.gain.linearRampToValueAtTime(targetWet, now + fadeDuration);

    this.bypassDryGain.gain.cancelScheduledValues(now);
    this.bypassDryGain.gain.setValueAtTime(this.bypassDryGain.gain.value, now);
    this.bypassDryGain.gain.linearRampToValueAtTime(targetDry, now + fadeDuration);

    // NOTE: We deliberately DO NOT disconnect the biquad cascade. Each BiquadFilterNode
    // has internal z^-1/z^-2 delay state; cutting the cascade mid-stream causes the
    // state to restart from zero on re-attach, producing audible clicks ("滋滋声").
    // The eqInGain / eqOutGain / bypassDryGain relay above already silences the chain.
  }

  /**
   * Returns a copy of current active EQ parameters
   */
  getParams(): EqParams {
    return {
      low: { ...this.currentParams.low },
      midLow: { ...this.currentParams.midLow },
      midHigh: { ...this.currentParams.midHigh },
      high: { ...this.currentParams.high },
      bypass: this.currentParams.bypass
    };
  }

  /**
   * Populates frequency response magnitudes across an array of frequencies
   * Cascades the magnitude responses of all 4 biquad filter stages
   */
  getFrequencyResponse(frequencies: Float32Array, magResponse: Float32Array, phaseResponse: Float32Array): void {
    const len = frequencies.length;
    if (!this.tempMag || this.tempMag.length !== len) {
      this.tempMag = new Float32Array(len);
      this.tempPhase = new Float32Array(len);
    }
    const tempMag = this.tempMag;
    const tempPhase = this.tempPhase!;

    // Initialize with 1.0 magnitude and 0.0 phase
    for (let i = 0; i < len; i++) {
      magResponse[i] = 1.0;
      phaseResponse[i] = 0.0;
    }

    if (this.currentParams.bypass) {
      return; // Flat response when bypassed
    }

    const filters = [this.lowFilter, this.midLowFilter, this.midHighFilter, this.highFilter];
    for (const f of filters) {
      f.getFrequencyResponse(frequencies as any, tempMag as any, tempPhase as any);
      for (let i = 0; i < len; i++) {
        magResponse[i] *= tempMag[i];
        phaseResponse[i] += tempPhase[i];
      }
    }
  }

  /**
   * Zero-residue silence purge
   */
  purge(): void {
    if (this.isDisposed || this.isPurged) return;
    this.isPurged = true;
    this.prePurgeBypass = this.currentParams.bypass;

    const now = this.ctx.currentTime;
    this.eqInGain.gain.cancelScheduledValues(now);
    this.eqInGain.gain.setValueAtTime(0.0, now);

    this.eqOutGain.gain.cancelScheduledValues(now);
    this.eqOutGain.gain.setValueAtTime(0.0, now);

    this.bypassDryGain.gain.cancelScheduledValues(now);
    this.bypassDryGain.gain.setValueAtTime(0.0, now);
  }

  /**
   * Restores normal audio routing after hard cut
   */
  restore(): void {
    if (this.isDisposed || !this.isPurged) return;
    this.isPurged = false;
    this.applyBypassState(this.prePurgeBypass, false);
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

    if (this.lowTypeTimer !== null) {
      clearTimeout(this.lowTypeTimer);
      this.lowTypeTimer = null;
    }

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.eqInGain.disconnect();
      this.eqOutGain.disconnect();
      this.bypassDryGain.disconnect();
      this.lowFilter.disconnect();
      this.midLowFilter.disconnect();
      this.midHighFilter.disconnect();
      this.highFilter.disconnect();
    } catch {
      // Ignored during cleanup
    }
  }
}
