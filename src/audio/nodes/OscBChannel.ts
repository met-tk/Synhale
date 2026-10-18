/**
 * Synhale 2 - OscBChannel (Pink Noise Airflow Generator & Airway Shaping)
 * 
 * Features:
 * - Paul Kellet 1/f stereo pink noise buffer looping
 * - Bandpass airway friction formant filter with dynamic color and resonance tracking
 * - High-shelf air sheen filter
 * - 5ms smooth hardware bypass relay
 */

import { ChannelStripParams, NoiseType, AudioSourceNode } from '../../types/audio';
import { generatePinkNoiseBuffer, generateNoiseBufferByType, loadRealNoiseBuffer } from '../dsp/pinkNoise';

export class OscBChannel implements AudioSourceNode {
  public readonly id = 'oscB';
  private ctx: BaseAudioContext;
  private noiseSource: AudioBufferSourceNode;
  private noiseBuffer: AudioBuffer;
  private bandpassFilter: BiquadFilterNode;
  private shelfFilter: BiquadFilterNode;
  private highpassFilter: BiquadFilterNode;
  private motionLfo: OscillatorNode;
  private motionGain: GainNode;
  private trackGain: GainNode;
  private makeupGain: GainNode;
  private bypassGain: GainNode;
  public readonly outputNode: GainNode;

  // Mid/Side Stereo Width Matrix Nodes
  private msSplitter: ChannelSplitterNode;
  private midGainL: GainNode;
  private midGainR: GainNode;
  private midSum: GainNode;
  private sideGainL: GainNode;
  private sideGainR: GainNode;
  private sideSum: GainNode;
  private sideWidthGain: GainNode;
  private sideInv: GainNode;
  private msMerger: ChannelMergerNode;

  private currentParams: ChannelStripParams['oscB'] = {
    color: 0.5,
    friction: 0.4,
    gain: 0.4,
    bypass: false,
    noiseType: 'pink',
    lowCut: 80,
    motion: 0.2,
    stereoWidth: 0.5
  };

  private isStarted = false;
  private isDisposed = false;
  private switchTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(ctx: BaseAudioContext, customBuffer?: AudioBuffer) {
    this.ctx = ctx;
    this.noiseBuffer = customBuffer ?? generatePinkNoiseBuffer(ctx, 10);

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    this.bandpassFilter = ctx.createBiquadFilter();
    this.bandpassFilter.type = 'bandpass';

    this.shelfFilter = ctx.createBiquadFilter();
    this.shelfFilter.type = 'highshelf';
    this.shelfFilter.frequency.value = 3500;

    this.highpassFilter = ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 80;

    // Organic Airflow Flutter LFO (driving bandpass center turbulence)
    this.motionLfo = ctx.createOscillator();
    this.motionGain = ctx.createGain();
    this.motionLfo.type = 'sine';
    this.motionLfo.frequency.value = 1.35; // 1.35 Hz natural airflow fluttering
    this.motionGain.gain.value = 0.0;
    this.motionLfo.connect(this.motionGain);
    this.motionGain.connect(this.bandpassFilter.frequency);

    this.trackGain = ctx.createGain();
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 2.8; // Acoustic makeup for filter insertion loss
    this.bypassGain = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Mid/Side Stereo Width Matrix Nodes
    this.msSplitter = ctx.createChannelSplitter(2);
    this.midGainL = ctx.createGain();
    this.midGainR = ctx.createGain();
    this.midSum = ctx.createGain();
    this.sideGainL = ctx.createGain();
    this.sideGainR = ctx.createGain();
    this.sideSum = ctx.createGain();
    this.sideWidthGain = ctx.createGain();
    this.sideInv = ctx.createGain();
    this.msMerger = ctx.createChannelMerger(2);

    this.midGainL.gain.value = 0.5;
    this.midGainR.gain.value = 0.5;
    this.sideGainL.gain.value = 0.5;
    this.sideGainR.gain.value = -0.5;
    this.sideInv.gain.value = -1.0;
    this.sideWidthGain.gain.value = this.currentParams.stereoWidth ?? 0.5;

    // Mid summing: M = 0.5*L + 0.5*R
    this.msSplitter.connect(this.midGainL, 0);
    this.msSplitter.connect(this.midGainR, 1);
    this.midGainL.connect(this.midSum);
    this.midGainR.connect(this.midSum);

    // Side summing: S = 0.5*L - 0.5*R
    this.msSplitter.connect(this.sideGainL, 0);
    this.msSplitter.connect(this.sideGainR, 1);
    this.sideGainL.connect(this.sideSum);
    this.sideGainR.connect(this.sideSum);
    this.sideSum.connect(this.sideWidthGain);

    // Recombine Mid and Side into L and R:
    // L' = M + width * S
    // R' = M - width * S
    this.midSum.connect(this.msMerger, 0, 0);
    this.sideWidthGain.connect(this.msMerger, 0, 0);

    this.midSum.connect(this.msMerger, 0, 1);
    this.sideWidthGain.connect(this.sideInv);
    this.sideInv.connect(this.msMerger, 0, 1);

    this.trackGain.gain.value = this.currentParams.gain;
    this.bypassGain.gain.value = this.currentParams.bypass ? 0.0 : 1.0;

    // Initial filter parameters
    this.applyFilterParams(this.currentParams.color, this.currentParams.friction, true);
    this.applyMotionParams(this.currentParams.motion ?? 0.2);

    if (!customBuffer) {
      this.loadAndApplyRealNoise('pink');
    }

    // Routing:
    // noiseSource -> bandpassFilter -> shelfFilter -> highpassFilter -> trackGain -> makeupGain -> msSplitter -> [M/S Matrix] -> msMerger -> bypassGain -> outputNode
    this.noiseSource.connect(this.bandpassFilter);
    this.bandpassFilter.connect(this.shelfFilter);
    this.shelfFilter.connect(this.highpassFilter);
    this.highpassFilter.connect(this.trackGain);
    this.trackGain.connect(this.makeupGain);
    this.makeupGain.connect(this.msSplitter);
    this.msMerger.connect(this.bypassGain);
    this.bypassGain.connect(this.outputNode);
  }

  start(when = 0): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;
    this.noiseSource.start(when);
    try {
      this.motionLfo.start(when);
    } catch {
      // Ignore if already started
    }
  }

  stop(when = 0): void {
    if (!this.isStarted || this.isDisposed) return;
    try {
      this.noiseSource.stop(when);
    } catch {
      // Ignore if already stopped
    }
    try {
      this.motionLfo.stop(when);
    } catch {
      // Ignore if already stopped
    }
    this.isStarted = false;
  }

  setParams(params: Partial<ChannelStripParams['oscB']>): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    if (params.gain !== undefined) {
      this.currentParams.gain = Math.max(0, Math.min(1, params.gain));
      this.trackGain.gain.setTargetAtTime(this.currentParams.gain, now, 0.005);
    }

    if (params.color !== undefined) {
      this.currentParams.color = Math.max(0, Math.min(1, params.color));
    }

    if (params.friction !== undefined) {
      this.currentParams.friction = Math.max(0, Math.min(1, params.friction));
    }

    if (params.lowCut !== undefined) {
      this.currentParams.lowCut = Math.max(20, Math.min(3000, params.lowCut));
      this.highpassFilter.frequency.setTargetAtTime(this.currentParams.lowCut, now, 0.015);
    }

    if (params.motion !== undefined) {
      this.currentParams.motion = Math.max(0, Math.min(1, params.motion));
      this.applyMotionParams(this.currentParams.motion);
    }

    if (params.stereoWidth !== undefined) {
      this.currentParams.stereoWidth = Math.max(0, Math.min(1, params.stereoWidth));
      this.sideWidthGain.gain.setTargetAtTime(this.currentParams.stereoWidth, now, 0.015);
    }

    if (params.color !== undefined || params.friction !== undefined) {
      this.applyFilterParams(this.currentParams.color, this.currentParams.friction, false);
      this.applyMotionParams(this.currentParams.motion ?? 0.2);
    }

    if (params.noiseType !== undefined && params.noiseType !== this.currentParams.noiseType) {
      this.currentParams.noiseType = params.noiseType;
      this.switchNoiseType(params.noiseType);
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

  switchNoiseType(type: NoiseType): void {
    if (this.isDisposed) return;
    this.currentParams.noiseType = type;
    try {
      const newBuffer = generateNoiseBufferByType(this.ctx, type, 10);
      this.setSourceBuffer(newBuffer);
    } catch {
      // In mock/test environments
    }
    this.loadAndApplyRealNoise(type);
  }

  private setSourceBuffer(newBuffer: AudioBuffer): void {
    if (this.isDisposed) return;
    this.noiseBuffer = newBuffer;
    if (this.isStarted) {
      this.crossfadeToBuffer(newBuffer);
    } else {
      try {
        this.noiseSource.disconnect();
      } catch {}
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = newBuffer;
      this.noiseSource.loop = true;
      this.noiseSource.connect(this.bandpassFilter);
    }
  }

  private async loadAndApplyRealNoise(type: NoiseType): Promise<void> {
    try {
      const realBuf = await loadRealNoiseBuffer(this.ctx, type);
      if (!realBuf || this.isDisposed || this.currentParams.noiseType !== type) return;
      if (this.noiseSource.buffer === realBuf) return;
      this.setSourceBuffer(realBuf);
    } catch {
      // Ignore background load failures
    }
  }

  private crossfadeToBuffer(newBuffer: AudioBuffer): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;
    const fadeDur = 0.005; // 5ms micro-fade crossfade to eliminate clicks
    const oldSource = this.noiseSource;
    const oldGain = this.ctx.createGain();
    try {
      oldSource.disconnect();
      oldSource.connect(oldGain);
      oldGain.connect(this.bandpassFilter);
      oldGain.gain.setValueAtTime(1.0, now);
      oldGain.gain.linearRampToValueAtTime(0.0, now + fadeDur);
      oldSource.stop(now + fadeDur + 0.002);
      const timer1 = setTimeout(() => {
        try {
          oldSource.disconnect();
          oldGain.disconnect();
        } catch {}
        const idx = this.switchTimers.indexOf(timer1);
        if (idx !== -1) this.switchTimers.splice(idx, 1);
      }, 20);
      this.switchTimers.push(timer1);
    } catch {
      // Ignore if source not running or in mock environment
    }

    const newSource = this.ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;
    const newGain = this.ctx.createGain();
    newSource.connect(newGain);
    newGain.connect(this.bandpassFilter);
    newGain.gain.setValueAtTime(0.0, now);
    newGain.gain.linearRampToValueAtTime(1.0, now + fadeDur);
    newSource.start(now);
    this.noiseSource = newSource;
    const timer2 = setTimeout(() => {
      try {
        newSource.disconnect(newGain);
        newSource.connect(this.bandpassFilter);
        newGain.disconnect();
      } catch {}
      const idx = this.switchTimers.indexOf(timer2);
      if (idx !== -1) this.switchTimers.splice(idx, 1);
    }, 20);
    this.switchTimers.push(timer2);
  }

  private applyFilterParams(color: number, friction: number, immediate: boolean): void {
    const now = this.ctx.currentTime;
    // Map color 0..1 to 200..4000 Hz exponentially
    const minFreq = 200;
    const maxFreq = 4000;
    const centerFreq = minFreq * Math.pow(maxFreq / minFreq, color);

    // Map friction 0..1 to Q 0.5..6.0
    const qValue = 0.5 + friction * 5.5;

    // Shelf filter gain based on friction
    const shelfGain = -6 + friction * 12; // -6dB to +6dB

    if (immediate) {
      this.bandpassFilter.frequency.value = centerFreq;
      this.bandpassFilter.Q.value = qValue;
      this.shelfFilter.gain.value = shelfGain;
    } else {
      this.bandpassFilter.frequency.setTargetAtTime(centerFreq, now, 0.015);
      this.bandpassFilter.Q.setTargetAtTime(qValue, now, 0.015);
      this.shelfFilter.gain.setTargetAtTime(shelfGain, now, 0.015);
    }
  }

  private applyMotionParams(motion: number): void {
    const now = this.ctx.currentTime;
    const minFreq = 200;
    const maxFreq = 4000;
    const centerFreq = minFreq * Math.pow(maxFreq / minFreq, this.currentParams.color);
    // Dynamic flutter sweep: up to ±25% frequency drift at 100% motion
    const flutterDepth = motion * centerFreq * 0.25;
    this.motionGain.gain.setTargetAtTime(flutterDepth, now, 0.02);
  }

  getParams(): Readonly<ChannelStripParams['oscB']> {
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
    for (const timer of this.switchTimers) {
      clearTimeout(timer);
    }
    this.switchTimers = [];
    this.stop(0);
    this.disconnect();
    this.noiseSource.disconnect();
    this.motionLfo.disconnect();
    this.motionGain.disconnect();
    this.bandpassFilter.disconnect();
    this.shelfFilter.disconnect();
    this.highpassFilter.disconnect();
    this.trackGain.disconnect();
    this.makeupGain.disconnect();
    this.msSplitter.disconnect();
    this.midGainL.disconnect();
    this.midGainR.disconnect();
    this.midSum.disconnect();
    this.sideGainL.disconnect();
    this.sideGainR.disconnect();
    this.sideSum.disconnect();
    this.sideWidthGain.disconnect();
    this.sideInv.disconnect();
    this.msMerger.disconnect();
    this.bypassGain.disconnect();
  }
}
