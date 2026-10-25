import { sanitizeParameterPatch } from '../dsp/parameterSafety';
/**
 * Synhale 2 - DualLfoModule (Organic Pitch Drift, Filter Breathing, Tremolo & Spatial Pan)
 * 
 * Architecture:
 * - LFO 1: Organic Pitch Drift & Vibrato (0.05..10 Hz)
 *   Modulates OscA & Drone detune AudioParams (±0..25 cents) for natural singing bowl & acoustic warmth.
 * - LFO 2: Filter Breathing Swell, Tremolo & Stereo Orbit (0.02..5 Hz)
 *   Modulates MultimodeFilter cutoff (±0..800 Hz), amplitude (0..15%), and stereo pan (±0..0.6).
 * 
 * Supports:
 * - Anti-pop parameter smoothing
 * - Hard cut purge & restore
 * - Full disposal cleanup
 */

import {
  DEFAULT_LFO1_PARAMS,
  DEFAULT_LFO2_PARAMS,
  type Lfo1Params,
  type Lfo2Params,
  type LfoShape
} from '../../types/audio';
import { resolveEffectiveLfoRate, computeLfoLiveValue } from '../dsp/lfoMath';

export { DEFAULT_LFO1_PARAMS, DEFAULT_LFO2_PARAMS };

function mapShapeToOscillatorType(shape?: LfoShape): OscillatorType {
  if (shape === 'triangle') return 'triangle';
  if (shape === 'sawtooth') return 'sawtooth';
  if (shape === 'square') return 'square';
  if (shape === 'random') return 'square';
  return 'sine';
}

export class DualLfoModule {
  private ctx: BaseAudioContext;
  private isStarted = false;
  private isDisposed = false;
  private activeParamConnections: Set<AudioParam> = new Set();

  // LFO 1 - Pitch / Vibrato
  private oscLfo1: OscillatorNode;
  private lfo1DepthGain: GainNode;
  public readonly detuneModOut: GainNode;

  // LFO 2 - Filter / Pan / Tremolo
  private oscLfo2: OscillatorNode;
  private lfo2FilterGain: GainNode;
  private lfo2PanGain: GainNode;
  private lfo2TremoloGain: GainNode;
  public readonly filterModOut: GainNode;
  public readonly panModOut: GainNode;
  public readonly tremoloModOut: GainNode;

  private currentLfo1: Lfo1Params = { ...DEFAULT_LFO1_PARAMS };
  private currentLfo2: Lfo2Params = { ...DEFAULT_LFO2_PARAMS };

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;

    // --- 1. LFO 1 Setup (Pitch Detune) ---
    this.oscLfo1 = ctx.createOscillator();
    this.oscLfo1.type = mapShapeToOscillatorType(this.currentLfo1.shape);
    this.oscLfo1.frequency.value = this.currentLfo1.rate;

    this.lfo1DepthGain = ctx.createGain();
    const lfo1MaxCents = 25.0; // Max 25 cents modulation
    this.lfo1DepthGain.gain.value = this.currentLfo1.bypass ? 0 : this.currentLfo1.depth * lfo1MaxCents;

    this.detuneModOut = ctx.createGain();
    this.detuneModOut.gain.value = 1.0;

    this.oscLfo1.connect(this.lfo1DepthGain);
    this.lfo1DepthGain.connect(this.detuneModOut);

    // --- 2. LFO 2 Setup (Filter, Pan, Tremolo) ---
    this.oscLfo2 = ctx.createOscillator();
    this.oscLfo2.type = mapShapeToOscillatorType(this.currentLfo2.shape);
    this.oscLfo2.frequency.value = this.currentLfo2.rate;

    // Filter Cutoff Mod Output (±0..800 Hz)
    this.lfo2FilterGain = ctx.createGain();
    const lfo2MaxCutoffHz = 800.0;
    const filterGainVal = this.currentLfo2.bypass
      ? 0
      : this.currentLfo2.depth * (this.currentLfo2.filterMod ?? 0.35) * lfo2MaxCutoffHz;
    this.lfo2FilterGain.gain.value = filterGainVal;

    this.filterModOut = ctx.createGain();
    this.filterModOut.gain.value = 1.0;
    this.oscLfo2.connect(this.lfo2FilterGain);
    this.lfo2FilterGain.connect(this.filterModOut);

    // Stereo Pan Mod Output (±0..0.6)
    this.lfo2PanGain = ctx.createGain();
    const panGainVal = this.currentLfo2.bypass
      ? 0
      : this.currentLfo2.depth * (this.currentLfo2.panMod ?? 0.3) * 0.6;
    this.lfo2PanGain.gain.value = panGainVal;

    this.panModOut = ctx.createGain();
    this.panModOut.gain.value = 1.0;
    this.oscLfo2.connect(this.lfo2PanGain);
    this.lfo2PanGain.connect(this.panModOut);

    // Tremolo Mod Output (±0..0.15)
    this.lfo2TremoloGain = ctx.createGain();
    const tremoloGainVal = this.currentLfo2.bypass
      ? 0
      : this.currentLfo2.depth * (this.currentLfo2.tremoloMod ?? 0.1) * 0.15;
    this.lfo2TremoloGain.gain.value = tremoloGainVal;

    this.tremoloModOut = ctx.createGain();
    this.tremoloModOut.gain.value = 1.0;
    this.oscLfo2.connect(this.lfo2TremoloGain);
    this.lfo2TremoloGain.connect(this.tremoloModOut);
  }

  start(when = 0): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;
    try {
      this.oscLfo1.start(when);
      this.oscLfo2.start(when);
    } catch {
      // In case context mock already started
    }
  }

  stop(when = 0): void {
    if (!this.isStarted || this.isDisposed) return;
    try {
      this.oscLfo1.stop(when);
      this.oscLfo2.stop(when);
    } catch {
      // Ignore if already stopped
    }
    this.isStarted = false;
  }

  setLfo1Params(params: Partial<Lfo1Params>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    if (params.sync !== undefined) {
      this.currentLfo1.sync = params.sync;
    }

    if (params.rate !== undefined || params.sync !== undefined) {
      if (params.rate !== undefined) {
        this.currentLfo1.rate = Math.max(0.01, Math.min(30.0, params.rate));
      }
      const effectiveRate = resolveEffectiveLfoRate(this.currentLfo1.rate, this.currentLfo1.sync);
      this.oscLfo1.frequency.setTargetAtTime(effectiveRate, now, 0.02);
    }

    if (params.depth !== undefined) {
      this.currentLfo1.depth = Math.max(0, Math.min(1, params.depth));
    }

    if (params.shape !== undefined && params.shape !== this.currentLfo1.shape) {
      this.currentLfo1.shape = params.shape;
      this.oscLfo1.type = mapShapeToOscillatorType(params.shape);
    }

    if (params.polarity !== undefined) {
      this.currentLfo1.polarity = params.polarity;
    }

    if (params.bypass !== undefined) {
      this.currentLfo1.bypass = params.bypass;
    }

    const targetGain = this.currentLfo1.bypass ? 0 : this.currentLfo1.depth * 25.0;
    this.lfo1DepthGain.gain.setTargetAtTime(targetGain, now, 0.02);
  }

  setLfo2Params(params: Partial<Lfo2Params>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    if (params.sync !== undefined) {
      this.currentLfo2.sync = params.sync;
    }

    if (params.rate !== undefined || params.sync !== undefined) {
      if (params.rate !== undefined) {
        this.currentLfo2.rate = Math.max(0.01, Math.min(20.0, params.rate));
      }
      const effectiveRate = resolveEffectiveLfoRate(this.currentLfo2.rate, this.currentLfo2.sync);
      this.oscLfo2.frequency.setTargetAtTime(effectiveRate, now, 0.02);
    }

    if (params.depth !== undefined) {
      this.currentLfo2.depth = Math.max(0, Math.min(1, params.depth));
    }

    if (params.filterMod !== undefined) {
      this.currentLfo2.filterMod = Math.max(0, Math.min(1, params.filterMod));
    }

    if (params.panMod !== undefined) {
      this.currentLfo2.panMod = Math.max(0, Math.min(1, params.panMod));
    }

    if (params.tremoloMod !== undefined) {
      this.currentLfo2.tremoloMod = Math.max(0, Math.min(1, params.tremoloMod));
    }

    if (params.shape !== undefined && params.shape !== this.currentLfo2.shape) {
      this.currentLfo2.shape = params.shape;
      this.oscLfo2.type = mapShapeToOscillatorType(params.shape);
    }

    if (params.polarity !== undefined) {
      this.currentLfo2.polarity = params.polarity;
    }

    if (params.bypass !== undefined) {
      this.currentLfo2.bypass = params.bypass;
    }

    const effectiveDepth = this.currentLfo2.bypass ? 0 : this.currentLfo2.depth;
    this.lfo2FilterGain.gain.setTargetAtTime(effectiveDepth * (this.currentLfo2.filterMod ?? 0.35) * 800.0, now, 0.02);
    this.lfo2PanGain.gain.setTargetAtTime(effectiveDepth * (this.currentLfo2.panMod ?? 0.3) * 0.6, now, 0.02);
    this.lfo2TremoloGain.gain.setTargetAtTime(effectiveDepth * (this.currentLfo2.tremoloMod ?? 0.1) * 0.15, now, 0.02);
  }

  getLfo1Params(): Readonly<Lfo1Params> {
    return { ...this.currentLfo1 };
  }

  getLfo2Params(): Readonly<Lfo2Params> {
    return { ...this.currentLfo2 };
  }

  connectDetune(param: AudioParam): void {
    this.detuneModOut.connect(param);
    this.activeParamConnections.add(param);
  }

  connectFilter(param: AudioParam): void {
    this.filterModOut.connect(param);
    this.activeParamConnections.add(param);
  }

  connectPan(param: AudioParam): void {
    this.panModOut.connect(param);
    this.activeParamConnections.add(param);
  }

  connectTremolo(param: AudioParam): void {
    this.tremoloModOut.connect(param);
    this.activeParamConnections.add(param);
  }

  disconnectAll(): void {
    try { this.detuneModOut.disconnect(); } catch {}
    try { this.filterModOut.disconnect(); } catch {}
    try { this.panModOut.disconnect(); } catch {}
    try { this.tremoloModOut.disconnect(); } catch {}
    this.activeParamConnections.clear();
  }

  hasActiveConnections(): boolean {
    return this.activeParamConnections.size > 0;
  }

  computeLiveLfo1(nowSec?: number): number {
    const t = nowSec !== undefined ? nowSec : (this.ctx ? this.ctx.currentTime : 0);
    return computeLfoLiveValue(
      this.currentLfo1.rate,
      this.currentLfo1.depth,
      this.currentLfo1.shape,
      this.currentLfo1.bypass,
      t,
      this.currentLfo1.polarity ?? 'bipolar',
      this.currentLfo1.sync
    );
  }

  computeLiveLfo2(nowSec?: number): number {
    const t = nowSec !== undefined ? nowSec : (this.ctx ? this.ctx.currentTime : 0);
    return computeLfoLiveValue(
      this.currentLfo2.rate,
      this.currentLfo2.depth,
      this.currentLfo2.shape,
      this.currentLfo2.bypass,
      t,
      this.currentLfo2.polarity ?? 'bipolar',
      this.currentLfo2.sync
    );
  }

  purge(): void {
    const now = this.ctx.currentTime;
    this.detuneModOut.gain.cancelScheduledValues(now);
    this.detuneModOut.gain.setValueAtTime(0, now);
    this.filterModOut.gain.cancelScheduledValues(now);
    this.filterModOut.gain.setValueAtTime(0, now);
    this.panModOut.gain.cancelScheduledValues(now);
    this.panModOut.gain.setValueAtTime(0, now);
    this.tremoloModOut.gain.cancelScheduledValues(now);
    this.tremoloModOut.gain.setValueAtTime(0, now);
  }

  restore(): void {
    const now = this.ctx.currentTime;
    this.detuneModOut.gain.cancelScheduledValues(now);
    this.detuneModOut.gain.linearRampToValueAtTime(1.0, now + 0.005);
    this.filterModOut.gain.cancelScheduledValues(now);
    this.filterModOut.gain.linearRampToValueAtTime(1.0, now + 0.005);
    this.panModOut.gain.cancelScheduledValues(now);
    this.panModOut.gain.linearRampToValueAtTime(1.0, now + 0.005);
    this.tremoloModOut.gain.cancelScheduledValues(now);
    this.tremoloModOut.gain.linearRampToValueAtTime(1.0, now + 0.005);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.stop(0);
    this.isDisposed = true;
    this.disconnectAll();

    try {
      this.oscLfo1.disconnect();
      this.lfo1DepthGain.disconnect();
      this.detuneModOut.disconnect();

      this.oscLfo2.disconnect();
      this.lfo2FilterGain.disconnect();
      this.filterModOut.disconnect();
      this.lfo2PanGain.disconnect();
      this.panModOut.disconnect();
      this.lfo2TremoloGain.disconnect();
      this.tremoloModOut.disconnect();
    } catch {
      // Ignore disconnect errors on disposal
    }
  }
}
