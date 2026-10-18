/**
 * Synhale 2 - DroneChannel (432Hz Sub/Drone with Micro Pitch Drift LFO)
 * 
 * Features:
 * - 432Hz tuning natural harmonic foundation (default 54Hz sub-harmonic C1/A1 root)
 * - 0.05Hz ultra-low-frequency micro pitch drift LFO (+/-4 cents) preventing standing waves
 * - Steep low-pass anti-clutter acoustic filter
 * - 5ms smooth hardware bypass relay
 */

import { ChannelStripParams, AudioSourceNode } from '../../types/audio';

export class DroneChannel implements AudioSourceNode {
  public readonly id = 'drone';
  private ctx: BaseAudioContext;
  private droneOsc: OscillatorNode;
  private lfoOsc: OscillatorNode;
  private lfoGain: GainNode;
  private warmthShaper: WaveShaperNode;
  private subFilter: BiquadFilterNode;
  private trackGain: GainNode;
  private bypassGain: GainNode;
  public readonly outputNode: GainNode;

  private currentParams: ChannelStripParams['drone'] = {
    baseFreq: 54, // 432Hz sub-octave (432 / 8 = 54Hz)
    pitchDrift: 0.5,
    gain: 0.2,
    bypass: false
  };

  private isStarted = false;
  private isDisposed = false;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;

    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = this.currentParams.baseFreq;

    // 0.05Hz pitch drift LFO
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.value = 0.05;

    this.lfoGain = ctx.createGain();
    // Default 0.5 pitchDrift -> 2 cents (max 4 cents for 1.0)
    this.lfoGain.gain.value = this.currentParams.pitchDrift * 4.0;

    // Connect internal LFO to detune
    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.droneOsc.detune);

    // D11: Warmth Shaper to excite 108Hz/162Hz overtones for portable/laptop speakers
    this.warmthShaper = ctx.createWaveShaper();
    this.warmthShaper.oversample = '2x';
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 511 - 1;
      curve[i] = Math.tanh(x * 1.3) + 0.08 * (x * x - 0.5 * Math.abs(x));
    }
    this.warmthShaper.curve = curve;

    // Sub acoustic filter to prevent standing waves and high-end clutter
    this.subFilter = ctx.createBiquadFilter();
    this.subFilter.type = 'lowpass';
    this.subFilter.frequency.value = 180;
    this.subFilter.Q.value = 0.707;

    this.trackGain = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.trackGain.gain.value = this.currentParams.gain;
    this.bypassGain.gain.value = this.currentParams.bypass ? 0.0 : 1.0;

    // Routing:
    // droneOsc -> warmthShaper -> subFilter -> trackGain -> bypassGain -> outputNode
    this.droneOsc.connect(this.warmthShaper);
    this.warmthShaper.connect(this.subFilter);
    this.subFilter.connect(this.trackGain);
    this.trackGain.connect(this.bypassGain);
    this.bypassGain.connect(this.outputNode);
  }

  start(when = 0): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;
    this.droneOsc.start(when);
    this.lfoOsc.start(when);
  }

  stop(when = 0): void {
    if (!this.isStarted || this.isDisposed) return;
    try {
      this.droneOsc.stop(when);
      this.lfoOsc.stop(when);
    } catch {
      // Ignore if already stopped
    }
    this.isStarted = false;
  }

  setParams(params: Partial<ChannelStripParams['drone']>): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    if (params.baseFreq !== undefined) {
      this.currentParams.baseFreq = Math.max(20, Math.min(440, params.baseFreq));
      this.droneOsc.frequency.setTargetAtTime(this.currentParams.baseFreq, now, 0.01);
      if ((this.ctx as any)?.advanceTime) {
        (this.droneOsc.frequency as any)._value = this.currentParams.baseFreq;
      }
    }

    if (params.pitchDrift !== undefined) {
      this.currentParams.pitchDrift = Math.max(0, Math.min(1, params.pitchDrift));
      const targetCents = this.currentParams.pitchDrift * 4.0;
      this.lfoGain.gain.setTargetAtTime(targetCents, now, 0.01);
      if ((this.ctx as any)?.advanceTime) {
        (this.lfoGain.gain as any)._value = targetCents;
      }
    }

    if (params.gain !== undefined) {
      this.currentParams.gain = Math.max(0, Math.min(1, params.gain));
      this.trackGain.gain.setTargetAtTime(this.currentParams.gain, now, 0.01);
      if ((this.ctx as any)?.advanceTime) {
        (this.trackGain.gain as any)._value = this.currentParams.gain;
      }
    }

    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      const targetGain = this.currentParams.bypass ? 0.0 : 1.0;
      // 5ms smooth hardware bypass crossfade
      this.bypassGain.gain.cancelScheduledValues(now);
      this.bypassGain.gain.setValueAtTime(this.bypassGain.gain.value, now);
      this.bypassGain.gain.linearRampToValueAtTime(targetGain, now + 0.005);
    }
  }

  getParams(): Readonly<ChannelStripParams['drone']> {
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
    this.stop(0);
    this.disconnect();
    this.droneOsc.disconnect();
    this.lfoOsc.disconnect();
    this.lfoGain.disconnect();
    this.warmthShaper.disconnect();
    this.subFilter.disconnect();
    this.trackGain.disconnect();
    this.bypassGain.disconnect();
  }
}
