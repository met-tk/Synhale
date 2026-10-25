/**
 * Synhale 2 - Core AudioEngine
 * 
 * Implements AudioEngineApi (Web Audio API semi-modular subtractive synthesis engine)
 * 
 * Features:
 * - 3-track channel strip: Osc A (wavetable), Osc B (pink noise airflow), Drone (432Hz micro-drift)
 * - Analog processing chain: Drive (4x oversampled) -> MultimodeFilter (24dB cascaded) -> StereoDelay -> ConvolverReverb
 * - 0ms Zero-Residue Instant Hard Cut (2.5ms cosine micro-ramp, delay/reverb purge, freeze & seamless resume)
 * - 4-stage breath macro physical modulation network
 */

import {
  AudioEngineApi,
  BreathStage,
  ChannelStripParams,
  DeepPartial,
  DEFAULT_EQ_PARAMS,
  EffectsChainParams,
  LaneId,
  SoundSourceId,
  SoundSourceType,
  SourceRouteMap,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  getEffectModuleType,
  getDefaultEffectParams,
  DEFAULT_GAIN_PARAMS,
  DEFAULT_FILTER_PARAMS,
  DEFAULT_DRIVE_PARAMS,
  DEFAULT_DELAY_PARAMS,
  DEFAULT_REVERB_PARAMS,
  DEFAULT_AMBIENT_PARAMS
} from '../types/audio';
import { DEFAULT_MODULATION_ROUTES, type ModulationRoute } from '../types/ui';
import { OscAChannel } from './nodes/OscAChannel';
import { GranularChannel, type ParticleVisualGrain } from './nodes/GranularChannel';
import { OscBChannel } from './nodes/OscBChannel';
import { DroneChannel } from './nodes/DroneChannel';
import { AmbientChannel } from './nodes/AmbientChannel';
import { prewarmAllAmbientBuffers } from './nodes/AmbientSoundscapeLibrary';
import { GainModule } from './nodes/GainModule';
import { MultimodeFilter } from './nodes/MultimodeFilter';
import { DriveModule } from './nodes/DriveModule';
import { StereoDelay } from './nodes/StereoDelay';
import { ConvolverReverb } from './nodes/ConvolverReverb';
import { EqModule } from './nodes/EqModule';
import {
  DualLfoModule,
  DEFAULT_LFO1_PARAMS,
  DEFAULT_LFO2_PARAMS
} from './nodes/DualLfoModule';
import {
  AdsrModule,
  DEFAULT_ADSR_PARAMS
} from './nodes/AdsrModule';
import { evaluateFullBreathCurve } from './dsp/curveMath';
import { computeLfoLiveValue } from './dsp/lfoMath';
import { sanitizeParameterPatch } from './dsp/parameterSafety';
import { DEFAULT_GRANULAR_PARAMS, DEFAULT_OSC_A_PARAMS, AudioSourceNode, AudioEffectNode } from '../types/audio';
import { EffectChainManager } from './nodes/EffectChainManager';
import { LfoRackEffectModule } from './nodes/LfoRackEffectModule';

import { SoundPreset, getSoundPresetById } from './presets/soundPresets';
import { clearNoiseCache } from './dsp/pinkNoise';
import { clearAmbientSoundscapeCache } from './nodes/AmbientSoundscapeLibrary';
import { clearGranularSampleCache } from './nodes/GranularSampleLibrary';
import { clearCueSampleCache } from './cue/breathCuePlayer';

export const DEFAULT_CHANNEL_STRIP: ChannelStripParams = {
  oscA: {
    ...DEFAULT_OSC_A_PARAMS,
    baseFreq: 216, // Sacred 432Hz subharmonic root (432 / 2 = 216Hz, warm soothing mid-range A3)
    harmonics: 0.8,
    gain: 0.70,
    unison: 0.25,
    unisonVoices: 2,
    subGain: 0.15,
    warmth: 0.1,
    spread: 0.2
  },
  granular: {
    ...DEFAULT_GRANULAR_PARAMS,
    bypass: false
  },
  oscB: {
    color: 0.45,
    friction: 0.4,
    gain: 0.35,
    bypass: false,
    lowCut: 80,
    motion: 0.2,
    stereoWidth: 0.5
  },
  drone: {
    baseFreq: 54, // 432Hz tuning sub-harmonic (432 / 8)
    pitchDrift: 0.5,
    gain: 0.14,
    bypass: false
  },
  ambient: {
    ...DEFAULT_AMBIENT_PARAMS
  }
};

export const DEFAULT_EFFECTS_CHAIN: EffectsChainParams = {
  gain: {
    value: 0.0,
    bypass: false,
    softClip: true
  },
  eq: { ...DEFAULT_EQ_PARAMS },
  filter: {
    type: 'lowpass',
    cutoff: 3500,
    resonance: 1.5,
    bypass: false
  },
  drive: {
    amount: 0.0,
    tone: 0.5,
    bypass: true
  },
  delay: {
    time: 0.32,
    feedback: 0.4,
    damping: 4000,
    mix: 0.25,
    bypass: false
  },
  reverb: {
    decayTime: 3.5,
    damping: 0.45,
    mix: 0.3,
    bypass: false
  },
  masterGain: 0.85,
  masterPan: 0.0,
  busMix: 0.5,
  busLevelA: 1.0,
  busLevelB: 1.0,
  lfo1: { ...DEFAULT_LFO1_PARAMS },
  lfo2: { ...DEFAULT_LFO2_PARAMS },
  adsr: { ...DEFAULT_ADSR_PARAMS }
};

export class AudioEngine implements AudioEngineApi {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isDisposed = false;
  private isPaused = false;
  private playbackRevision = 0;

  // Nodes
  public oscA!: OscAChannel;
  public granular!: GranularChannel;
  public oscB!: OscBChannel;
  public drone!: DroneChannel;
  public ambient!: AmbientChannel;
  public sources: Map<string, AudioSourceNode> = new Map();
  public gainModule!: GainModule;
  public drive!: DriveModule;
  public filter!: MultimodeFilter;
  public eq!: EqModule;
  public effectChain!: EffectChainManager; // Backward-compatibility alias pointing to effectChainA
  public effectChainA!: EffectChainManager;
  public effectChainB!: EffectChainManager;
  public laneBusA!: GainNode;
  public laneBusB!: GainNode;
  public thruBus!: GainNode;
  public busGainA!: GainNode;
  public busGainB!: GainNode;
  public busMixer!: GainNode;
  private currentBusMix = 0.5;
  public delay!: StereoDelay;
  public reverb!: ConvolverReverb;
  public panner!: StereoPannerNode;
  public dualLfo!: DualLfoModule;
  public lfoRackModule!: LfoRackEffectModule;
  public adsr!: AdsrModule;
  public masterCutGain!: GainNode;
  public masterLimiter!: DynamicsCompressorNode;
  public masterVolumeGain!: GainNode;

  // Multi-Lane Routing State
  private sourceRouteGains: Map<SoundSourceId, { toA: GainNode; toB: GainNode; toThru: GainNode }> = new Map();
  private sourceRoutes: SourceRouteMap = { ...DEFAULT_SOURCE_ROUTES };
  private laneAOrder: string[] = [...DEFAULT_LANE_A_ORDER];
  private laneBOrder: string[] = [...DEFAULT_LANE_B_ORDER];
  private effectModules: Map<string, AudioEffectNode> = new Map();
  private effectModuleParams: Map<string, any> = new Map();

  // State caches
  private channelStripState: ChannelStripParams = JSON.parse(JSON.stringify(DEFAULT_CHANNEL_STRIP));
  private effectsState: EffectsChainParams = JSON.parse(JSON.stringify(DEFAULT_EFFECTS_CHAIN));
  private isCustomWavetableSelected = false;
  private lastBreathStage: BreathStage | null = 'inhale';
  private modulationRoutes: Record<string, ModulationRoute> = {};


  /**
   * Sets active modulation matrix routes
   */
  public setModulationRoutes(routes: Record<string, ModulationRoute>): void {
    this.modulationRoutes = { ...routes };
  }

  /**
   * Updates or removes a single modulation route
   */
  public setModulationRoute(target: string, route: ModulationRoute | null): void {
    if (!route) {
      delete this.modulationRoutes[target];
    } else {
      this.modulationRoutes[target] = route;
    }
  }

  /**
   * Gets current modulation routes snapshot
   */
  public getModulationRoutes(): Record<string, ModulationRoute> {
    return { ...this.modulationRoutes };
  }

  // Snapshot for freeze & resume
  private currentBreathStage: BreathStage = 'holdOut';
  private currentBreathProgress = 0;
  private currentBreathMacro = 0;
  private freezeSnapshot: {
    timestamp: number;
    stage: BreathStage;
    stageProgress: number;
    macroValue: number;
  } | null = null;
  private hardCutPurgeTimer: ReturnType<typeof setTimeout> | null = null;
  private removeSourceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(customContext?: AudioContext) {
    if (customContext) {
      this.ctx = customContext;
    }
  }

  /**
   * Initializes the Web Audio graph and starts source nodes
   */
  async init(options: { muted?: boolean } = {}): Promise<void> {
    if (this.isInitialized || this.isDisposed) return;

    if (!this.ctx) {
      const AudioCtxConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxConstructor) {
        console.warn('AudioEngine.init: Web Audio API is not supported in this environment');
        return;
      }
      this.ctx = new AudioCtxConstructor();
    }

    const ctx = this.ctx;

    // 1. Instantiate 5 Modular Sound Source Channels (OSC A Wavetable, Granular Cloud, OSC B Noise, Sub Drone, Ambient Soundscape)
    this.oscA = new OscAChannel(ctx);
    this.granular = new GranularChannel(ctx);
    this.oscB = new OscBChannel(ctx);
    this.drone = new DroneChannel(ctx);
    this.ambient = new AmbientChannel(ctx);

    this.sources.set('oscA', this.oscA);
    this.sources.set('granular', this.granular);
    this.sources.set('oscB', this.oscB);
    this.sources.set('drone', this.drone);
    this.sources.set('ambient', this.ambient);

    // 2. Instantiate Multi-Lane Routing Buses & Headroom Mixer (ADR-20)
    // laneBusA -> effectChainA \
    // laneBusB -> effectChainB -+-> busMixer (0.707 Headroom) -> panner -> masterCutGain -> masterLimiter -> masterVolumeGain
    // thruBus  ----------------/
    this.laneBusA = ctx.createGain();
    this.laneBusB = ctx.createGain();
    this.thruBus = ctx.createGain();
    this.busMixer = ctx.createGain();
    this.laneBusA.gain.value = 1.0;
    this.laneBusB.gain.value = 1.0;
    this.thruBus.gain.value = 1.0;
    this.busMixer.gain.value = 0.707; // -3dB equal-power summing protection

    // 2b. Configure pop-free routing crossfaders for all 5 sound sources
    const sourceList: Array<{ id: SoundSourceId; node: AudioSourceNode }> = [
      { id: 'oscA', node: this.oscA },
      { id: 'granular', node: this.granular },
      { id: 'oscB', node: this.oscB },
      { id: 'drone', node: this.drone },
      { id: 'ambient', node: this.ambient }
    ];

    for (const src of sourceList) {
      const toA = ctx.createGain();
      const toB = ctx.createGain();
      const toThru = ctx.createGain();

      const route = this.sourceRoutes[src.id] ?? 'laneA';
      toA.gain.value = route === 'laneA' ? 1.0 : 0.0;
      toB.gain.value = route === 'laneB' ? 1.0 : 0.0;
      toThru.gain.value = route === 'thru' ? 1.0 : 0.0;

      src.node.outputNode.connect(toA);
      src.node.outputNode.connect(toB);
      src.node.outputNode.connect(toThru);

      toA.connect(this.laneBusA);
      toB.connect(this.laneBusB);
      toThru.connect(this.thruBus);

      this.sourceRouteGains.set(src.id, { toA, toB, toThru });
    }

    // 3. Instantiate Processing Chain Modules
    this.gainModule = new GainModule(ctx);
    if (this.effectsState.gain) {
      this.gainModule.setParams(this.effectsState.gain);
    }
    this.drive = new DriveModule(ctx);
    this.filter = new MultimodeFilter(ctx);
    this.eq = new EqModule(ctx, this.effectsState.eq);
    this.adsr = new AdsrModule(ctx);
    this.delay = new StereoDelay(ctx);
    this.reverb = new ConvolverReverb(ctx);
    this.panner = ctx.createStereoPanner();
    this.panner.pan.value = 0.0;
    this.dualLfo = new DualLfoModule(ctx);

    // Register all modules into dictionary for dynamic lane assignment
    this.effectModules.set('gain', this.gainModule);
    this.effectModules.set('drive', this.drive);
    this.effectModules.set('filter', this.filter);
    this.effectModules.set('eq', this.eq);
    this.effectModules.set('adsr', this.adsr);
    this.effectModules.set('delay', this.delay);
    this.effectModules.set('reverb', this.reverb);
    this.lfoRackModule = new LfoRackEffectModule(ctx, this.dualLfo, 'lfo');
    this.effectModules.set('lfo', this.lfoRackModule);

    // Initialize dedicated instance param snapshots
    this.effectModuleParams.set('gain', JSON.parse(JSON.stringify(this.effectsState.gain || DEFAULT_GAIN_PARAMS)));
    this.effectModuleParams.set('drive', JSON.parse(JSON.stringify(this.effectsState.drive || DEFAULT_DRIVE_PARAMS)));
    this.effectModuleParams.set('filter', JSON.parse(JSON.stringify(this.effectsState.filter || DEFAULT_FILTER_PARAMS)));
    this.effectModuleParams.set('eq', JSON.parse(JSON.stringify(this.effectsState.eq || DEFAULT_EQ_PARAMS)));
    this.effectModuleParams.set('delay', JSON.parse(JSON.stringify(this.effectsState.delay || DEFAULT_DELAY_PARAMS)));
    this.effectModuleParams.set('reverb', JSON.parse(JSON.stringify(this.effectsState.reverb || DEFAULT_REVERB_PARAMS)));
    this.effectModuleParams.set('adsr', JSON.parse(JSON.stringify(this.effectsState.adsr || DEFAULT_ADSR_PARAMS)));
    this.effectModuleParams.set('lfo', { bypass: this.effectsState.lfo?.bypass ?? false });

    // 4. Instantiate Master Bus Nodes with Safety Dynamics Limiter
    this.masterCutGain = ctx.createGain();
    // Keep initial graph construction silent while the app applies its chosen preset.
    this.masterCutGain.gain.value = options.muted ? 0.0 : 1.0;

    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -1.5;
    this.masterLimiter.knee.value = 6.0;
    this.masterLimiter.ratio.value = 16.0;
    this.masterLimiter.attack.value = 0.003;
    this.masterLimiter.release.value = 0.12;

    this.masterVolumeGain = ctx.createGain();
    this.masterVolumeGain.gain.value = this.effectsState.masterGain;

    // 5. Connect Dual Modular Effect Chains (Lane A & Lane B)
    this.effectChainA = new EffectChainManager(ctx);
    this.effectChainB = new EffectChainManager(ctx);
    this.effectChain = this.effectChainA; // Legacy alias

    // Populate Lane A
    for (const effId of this.laneAOrder) {
      const mod = this.effectModules.get(effId);
      if (mod) this.effectChainA.registerEffect(mod);
    }

    // Populate Lane B
    for (const effId of this.laneBOrder) {
      const mod = this.effectModules.get(effId);
      if (mod) this.effectChainB.registerEffect(mod);
    }

    this.busGainA = ctx.createGain();
    this.busGainB = ctx.createGain();
    this.currentBusMix = this.effectsState.busMix ?? 0.5;
    const cosA = Math.cos(this.currentBusMix * Math.PI * 0.5);
    const sinB = Math.sin(this.currentBusMix * Math.PI * 0.5);
    const initLevelA = this.effectsState.busLevelA ?? 1.0;
    const initLevelB = this.effectsState.busLevelB ?? 1.0;
    this.busGainA.gain.value = cosA * initLevelA;
    this.busGainB.gain.value = sinB * initLevelB;

    this.laneBusA.connect(this.effectChainA.inputNode);
    this.laneBusB.connect(this.effectChainB.inputNode);

    this.effectChainA.connect(this.busGainA);
    this.effectChainB.connect(this.busGainB);
    this.busGainA.connect(this.busMixer);
    this.busGainB.connect(this.busMixer);
    this.thruBus.connect(this.busMixer);

    this.busMixer.connect(this.panner);
    this.panner.connect(this.masterCutGain);
    this.masterCutGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterVolumeGain);
    this.masterVolumeGain.connect(ctx.destination);

    // 5b. Dual LFO Modulation Network: Pure modular matrix routing.
    // Modulation is exclusively dispatched via applyLiveModulationRoutes according to user matrix routes (100% Knob-Truth).

    this.oscA.setParams(this.channelStripState.oscA);
    this.oscB.setParams(this.channelStripState.oscB);
    this.drone.setParams(this.channelStripState.drone);
    if (this.granular && this.channelStripState.granular) {
      this.granular.setParams(this.channelStripState.granular);
    }
    if (this.ambient && this.channelStripState.ambient) {
      this.ambient.setParams(this.channelStripState.ambient);
    }

    this.filter.setParams(this.effectsState.filter);
    this.drive.setParams(this.effectsState.drive);
    if (this.effectsState.eq) this.eq.setParams(this.effectsState.eq);
    this.delay.setParams(this.effectsState.delay);
    this.reverb.setParams(this.effectsState.reverb);
    if (this.effectsState.lfo1) this.dualLfo.setLfo1Params(this.effectsState.lfo1);
    if (this.effectsState.lfo2) this.dualLfo.setLfo2Params(this.effectsState.lfo2);
    if (this.effectsState.adsr) {
      this.adsr.setParams(this.effectsState.adsr);
    }

    // 7. Start sound sources & LFOs
    this.oscA.start(0);
    this.granular.start(0);
    this.oscB.start(0);
    this.drone.start(0);
    this.ambient.start(0);
    this.dualLfo.start(0);

    // Prewarm the primary ambient soundscapes; other samples load on demand.
    prewarmAllAmbientBuffers(ctx);

    this.isInitialized = true;
    this.isPaused = options.muted === true;
  }

  /**
   * Resumes playback with smooth anti-pop ramp and restored delay/reverb loops
   */
  async resume(): Promise<void> {
    if (!this.ctx || !this.isInitialized || this.isDisposed) return;

    const ctx = this.ctx;
    const revision = ++this.playbackRevision;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // A later pause or disposal must win over an in-flight context resume.
    if (this.isDisposed || revision !== this.playbackRevision) return;

    const now = this.ctx.currentTime;
    const wasPaused = this.isPaused;
    this.isPaused = false;

    if (this.hardCutPurgeTimer !== null) {
      clearTimeout(this.hardCutPurgeTimer);
      this.hardCutPurgeTimer = null;
    }

    // Restore delay and reverb loops and dual LFO
    this.delay.restore();
    this.reverb.restore();
    if (this.effectChainA) {
      this.effectChainA.restore();
    }
    if (this.effectChainB) {
      this.effectChainB.restore();
    }
    if (this.eq) {
      this.eq.restore();
    }
    if (this.filter) {
      this.filter.restore();
    }
    if (this.dualLfo) {
      this.dualLfo.restore();
    }
    if (this.granular) {
      this.granular.restore();
    }
    if (this.ambient) {
      this.ambient.restore();
    }
    for (const src of this.sources.values()) {
      try {
        if (src.restore && src !== this.granular && src !== this.ambient) {
          src.restore();
        }
      } catch (err) {
        console.warn('AudioEngine.resume: source restore failed', err);
      }
    }
    this.triggerAllAdsrRestore(wasPaused);

    // Restore frozen snapshot state if available
    if (this.freezeSnapshot) {
      this.updateBreathModulation(
        this.freezeSnapshot.macroValue,
        this.freezeSnapshot.stage,
        this.freezeSnapshot.stageProgress
      );
    }

    // Smooth un-mute ramp: Only ramp from 0 to 1 if we were actually paused or gain was cut
    const currentGain = this.masterCutGain.gain.value;
    if (currentGain < 0.999 || wasPaused) {
      this.masterCutGain.gain.cancelScheduledValues(now);
      this.masterCutGain.gain.setValueAtTime(currentGain, now);
      this.masterCutGain.gain.linearRampToValueAtTime(1.0, now + 0.003);
    }
  }

  /**
   * Suspend audio context after instant hard cut
   */
  async suspend(): Promise<void> {
    if (!this.ctx || this.isDisposed) return;
    this.executeZeroResidueHardCut();
    if (this.ctx.state === 'running') {
      await this.ctx.suspend();
    }
  }

  /**
   * 0ms Zero-Residue Instant Hard Cut
   * - 2.5ms cosine micro-ramp on master gain to drop to 0 without speaker clicks
   * - Instantly cut delay input and clear feedback gain to 0
   * - Instantly mute reverb wet send and clear loop tail
   * - Purge LFO modulation & ADSR envelope loops
   * - Freeze phase/timeline snapshot
   */
  executeZeroResidueHardCut(): void {
    if (!this.ctx || !this.isInitialized || this.isDisposed) return;
    this.playbackRevision++;
    this.isPaused = true;
    const now = this.ctx.currentTime;
    const CUT_DURATION = 0.0025; // 2.5 milliseconds

    // 1. Master Output 2.5ms Anti-Pop Micro-Ramp
    this.masterCutGain.gain.cancelScheduledValues(now);
    this.masterCutGain.gain.setValueAtTime(this.masterCutGain.gain.value, now);
    this.masterCutGain.gain.linearRampToValueAtTime(0.0, now + CUT_DURATION);

    // 2. Zero-Residue Purge on Delay, Reverb, EQ, LFO & ADSR loops and multi-lane chains
    this.delay.purge();
    this.reverb.purge();
    if (this.effectChainA) {
      this.effectChainA.purge();
    }
    if (this.effectChainB) {
      this.effectChainB.purge();
    }
    if (this.eq) {
      this.eq.purge();
    }
    if (this.filter) {
      this.filter.purge();
    }
    if (this.dualLfo) {
      this.dualLfo.purge();
    }
    this.triggerAllAdsrPurge();

    // Defer voice disconnection by 3ms so source nodes do not clip while master gain micro-ramp is still non-zero
    if (this.hardCutPurgeTimer !== null) {
      clearTimeout(this.hardCutPurgeTimer);
    }
    this.hardCutPurgeTimer = setTimeout(() => {
      this.hardCutPurgeTimer = null;
      if (this.isDisposed || !this.isPaused) return;
      for (const src of this.sources.values()) {
        try {
          if (src.purge) src.purge();
        } catch (err) {
          console.warn('AudioEngine: source purge failed during hard cut', err);
        }
      }
    }, 3);

    // 3. Freeze Snapshot
    this.freezeSnapshot = {
      timestamp: now,
      stage: this.currentBreathStage,
      stageProgress: this.currentBreathProgress,
      macroValue: this.currentBreathMacro
    };
  }

  /**
   * Updates breath physical macro modulation across sound sources and acoustic filters
   */
  updateBreathModulation(macroValue: number, stage: BreathStage, stageProgress: number): void {
    if (!this.isInitialized || this.isDisposed || this.isPaused) return;

    if (!Number.isFinite(macroValue) || !Number.isFinite(stageProgress)) return;
    const clampedMacro = Math.max(0, Math.min(1, macroValue));
    this.currentBreathMacro = clampedMacro;
    this.currentBreathStage = stage;
    this.currentBreathProgress = stageProgress;

    if (this.lastBreathStage !== stage) {
      const prevStage = this.lastBreathStage;
      this.lastBreathStage = stage;

      // Monophonic Breath Gate Note Triggering (Acoustic Breath Note Lifecycle):
      // Inhale acts as Note On (Attack -> Decay -> Sustain)
      // HoldIn and Exhale remain held in continuous resonance at Sustain level
      // HoldOut acts as Note Off (Release into peaceful silence)
      // This ensures plucks/bells (with Sustain=0) strike crisply on every breath cycle without dying forever
      if (stage === 'inhale' && prevStage !== 'inhale') {
        this.triggerAllAdsrAttack(1.0);
      } else if (stage === 'holdOut' && prevStage !== 'holdOut') {
        this.triggerAllAdsrRelease();
      }
    }

    const baseCutoff = Math.max(100, this.effectsState.filter.cutoff);
    const baseResonance = this.effectsState.filter.resonance;
    const baseNoiseGain = this.channelStripState.oscB.gain;
    const baseNoiseColor = this.channelStripState.oscB.color;
    const baseDroneGain = this.channelStripState.drone.gain;

    // Apply Live Modulation Matrix across target parameters (Master Volume, Filter Cutoff, etc.)
    // Knob-truth Principle: All dynamic shifts strictly derive from explicit modulation routes;
    // without modulation, all parameters stay rock-solid to knob values!
    this.applyLiveModulationRoutes(
      stage,
      stageProgress,
      clampedMacro,
      baseCutoff,
      baseResonance,
      baseNoiseColor,
      baseNoiseGain,
      baseDroneGain
    );

    if (this.ambient) {
      this.ambient.updateBreathModulation(clampedMacro, stage, stageProgress);
    }
  }

  /**
   * Computes real-time modulation offset / value for a specific route
   */
  private computeRouteLiveValue(
    route: ModulationRoute,
    stage: BreathStage,
    stageProgress: number,
    breathMacro: number
  ): number {
    switch (route.source) {
      case 'breathMacro': {
        const bm = Math.max(0, Math.min(1, breathMacro));
        return route.bipolar ? bm * 2 - 1 : bm;
      }
      case 'stageProgress': {
        // High-precision MSEG Curve evaluation if curveData is present
        if (route.curveData) {
          const curveVal = evaluateFullBreathCurve(route.curveData, stage, stageProgress);
          return route.bipolar ? curveVal * 2 - 1 : curveVal;
        }

        // Fallback backward-compatible stageMultipliers evaluation
        const mults = route.stageMultipliers;
        if (mults) {
          let fromVal = mults.holdOut;
          let toVal = mults.inhale;
          if (stage === 'holdIn') {
            fromVal = mults.inhale;
            toVal = mults.holdIn;
          } else if (stage === 'exhale') {
            fromVal = mults.holdIn;
            toVal = mults.exhale;
          } else if (stage === 'holdOut') {
            fromVal = mults.exhale;
            toVal = mults.holdOut;
          }
          let t = Math.max(0, Math.min(1, stageProgress));
          const curve = mults.curve ?? 'smooth';
          if (curve === 'smooth') {
            t = 0.5 * (1 - Math.cos(Math.PI * t));
          } else if (curve === 'step') {
            t = 1.0;
          }
          const val = fromVal + (toVal - fromVal) * t;
          return route.bipolar ? val * 2 - 1 : val;
        }
        const sp = Math.max(0, Math.min(1, stageProgress));
        return route.bipolar ? sp * 2 - 1 : sp;
      }
      case 'lfo1':
      case 'lfo2': {
        const isLfo1 = route.source === 'lfo1';
        const lfo = isLfo1 ? this.effectsState.lfo1 : this.effectsState.lfo2;
        const rate = lfo?.rate ?? (isLfo1 ? 0.15 : 0.08);
        const depth = lfo?.depth ?? 1.0;
        const shape = lfo?.shape ?? 'sine';
        const bypass = lfo?.bypass ?? false;
        const polarity = route.bipolar !== undefined ? (route.bipolar ? 'bipolar' : 'unipolar') : (lfo?.polarity ?? 'bipolar');
        const now = this.ctx ? this.ctx.currentTime : 0;
        return computeLfoLiveValue(rate, depth, shape, bypass, now, polarity);
      }
      case 'manual':
      default:
        return 0;
    }
  }

  /**
   * Dispatches calculated modulation signals to audio nodes in real time
   */
  private applyLiveModulationRoutes(
    stage: BreathStage,
    stageProgress: number,
    breathMacro: number,
    baseCutoff: number,
    baseResonance: number,
    baseNoiseColor: number,
    baseNoiseGain: number,
    baseDroneGain: number
  ): void {
    if (!this.ctx || this.isDisposed) return;
    const now = this.ctx.currentTime;

    // 1. Master Volume Modulation (Stage Env / Master Fader)
    const masterRoute = this.modulationRoutes['master-fader'];
    if (masterRoute && masterRoute.source !== 'manual') {
      const liveVal = this.computeRouteLiveValue(masterRoute, stage, stageProgress, breathMacro);
      let factor = 1.0;
      if (masterRoute.bipolar) {
        factor = Math.max(0, Math.min(1, 1 + liveVal * masterRoute.depth));
      } else {
        // Unipolar: Depth 1 = envelope fully controls gain; liveVal = 0 produces absolute silence (0.0 gain)
        factor = (1 - masterRoute.depth) + masterRoute.depth * liveVal;
        if (liveVal <= 0.001 && masterRoute.depth >= 0.95) {
          factor = 0.0;
        }
      }
      const effectiveMasterGain = Math.max(0, Math.min(1, this.effectsState.masterGain * factor));
      if (this.masterVolumeGain) {
        this.masterVolumeGain.gain.setTargetAtTime(effectiveMasterGain, now, 0.008);
      }
    } else {
      if (this.masterVolumeGain) {
        this.masterVolumeGain.gain.setTargetAtTime(this.effectsState.masterGain, now, 0.008);
      }
    }

    // 1b. BUS A & BUS B Master Fader Modulation
    const cosA = Math.cos(this.currentBusMix * Math.PI * 0.5);
    const sinB = Math.sin(this.currentBusMix * Math.PI * 0.5);
    const baseLevelA = this.effectsState.busLevelA ?? 1.0;
    const baseLevelB = this.effectsState.busLevelB ?? 1.0;

    const busARoute = this.modulationRoutes['bus-master-a'];
    let effectiveLevelA = baseLevelA;
    if (busARoute && busARoute.source !== 'manual') {
      const liveVal = this.computeRouteLiveValue(busARoute, stage, stageProgress, breathMacro);
      let factor = 1.0;
      if (busARoute.bipolar) {
        factor = Math.max(0, Math.min(1, 1 + liveVal * busARoute.depth));
      } else {
        factor = (1 - busARoute.depth) + busARoute.depth * liveVal;
        if (liveVal <= 0.001 && busARoute.depth >= 0.95) factor = 0.0;
      }
      effectiveLevelA = Math.max(0, Math.min(1, baseLevelA * factor));
    }
    if (this.busGainA) {
      this.busGainA.gain.setTargetAtTime(cosA * effectiveLevelA, now, 0.008);
    }

    const busBRoute = this.modulationRoutes['bus-master-b'];
    let effectiveLevelB = baseLevelB;
    if (busBRoute && busBRoute.source !== 'manual') {
      const liveVal = this.computeRouteLiveValue(busBRoute, stage, stageProgress, breathMacro);
      let factor = 1.0;
      if (busBRoute.bipolar) {
        factor = Math.max(0, Math.min(1, 1 + liveVal * busBRoute.depth));
      } else {
        factor = (1 - busBRoute.depth) + busBRoute.depth * liveVal;
        if (liveVal <= 0.001 && busBRoute.depth >= 0.95) factor = 0.0;
      }
      effectiveLevelB = Math.max(0, Math.min(1, baseLevelB * factor));
    }
    if (this.busGainB) {
      this.busGainB.gain.setTargetAtTime(sinB * effectiveLevelB, now, 0.008);
    }

    // 2 & 3. Filter Cutoff and Resonance Modulation across all active Filter instances (Single & Multi-Instance)
    for (const [effId, modNode] of this.effectModules.entries()) {
      if (modNode instanceof MultimodeFilter) {
        const isSingleton = effId === 'filter';
        const cutoffKnobId = isSingleton ? 'filter-cutoff' : `${effId}-cutoff`;
        const resKnobId = isSingleton ? 'filter-resonance' : `${effId}-resonance`;

        const instCutoffRoute = this.modulationRoutes[cutoffKnobId] ?? (isSingleton ? this.modulationRoutes['filter-cutoff'] : undefined);
        const instResRoute = this.modulationRoutes[resKnobId] ?? (isSingleton ? this.modulationRoutes['filter-resonance'] : undefined);

        const currentParams = modNode.getParams();
        const instBaseParams = this.effectModuleParams.get(effId) || currentParams;
        const instBaseCutoff = instBaseParams.cutoff ?? (isSingleton ? baseCutoff : 2000);
        const instBaseRes = instBaseParams.resonance ?? (isSingleton ? baseResonance : 1.0);

        // Cutoff modulation
        if (instCutoffRoute && instCutoffRoute.source !== 'manual') {
          const liveVal = this.computeRouteLiveValue(instCutoffRoute, stage, stageProgress, breathMacro);
          const modCutoff = Math.max(60, Math.min(18000, instBaseCutoff * Math.pow(2, liveVal * instCutoffRoute.depth * 2.5)));
          if (Math.abs(modCutoff - currentParams.cutoff) > 0.5) {
            modNode.setParams({ cutoff: modCutoff });
          }
        } else if (Math.abs(instBaseCutoff - currentParams.cutoff) > 0.5) {
          modNode.setParams({ cutoff: instBaseCutoff });
        }

        // Resonance modulation
        if (instResRoute && instResRoute.source !== 'manual') {
          const liveVal = this.computeRouteLiveValue(instResRoute, stage, stageProgress, breathMacro);
          const modRes = Math.max(0.1, Math.min(24, instBaseRes * (1 + liveVal * instResRoute.depth)));
          if (Math.abs(modRes - currentParams.resonance) > 0.01) {
            modNode.setParams({ resonance: modRes });
          }
        } else if (Math.abs(instBaseRes - currentParams.resonance) > 0.01) {
          modNode.setParams({ resonance: instBaseRes });
        }
      }
    }

    // 4. OSC B Noise Color Modulation
    const colorRoute = this.modulationRoutes['oscb-color'];
    if (colorRoute && colorRoute.source !== 'manual') {
      const liveVal = this.computeRouteLiveValue(colorRoute, stage, stageProgress, breathMacro);
      const modColor = Math.max(0, Math.min(1, baseNoiseColor * (1 + (liveVal - 0.5) * colorRoute.depth)));
      this.oscB.setParams({ color: modColor });
    } else {
      this.oscB.setParams({ color: baseNoiseColor });
    }

    // 5. OSC B Noise Gain Modulation
    const noiseGainRoute = this.modulationRoutes['oscb-gain'];
    if (noiseGainRoute && noiseGainRoute.source !== 'manual') {
      const liveVal = this.computeRouteLiveValue(noiseGainRoute, stage, stageProgress, breathMacro);
      const modGain = Math.max(0, Math.min(1, baseNoiseGain * ((1 - noiseGainRoute.depth) + noiseGainRoute.depth * liveVal)));
      this.oscB.setParams({ gain: modGain });
    } else {
      this.oscB.setParams({ gain: baseNoiseGain });
    }

    // 6. Sub Drone Gain Modulation (Independent 432Hz Sub Drone)
    if (this.drone) {
      const droneRoute = this.modulationRoutes['drone-gain'];
      if (droneRoute && droneRoute.source !== 'manual') {
        const liveVal = this.computeRouteLiveValue(droneRoute, stage, stageProgress, breathMacro);
        const modGain = Math.max(0, Math.min(1, baseDroneGain * ((1 - droneRoute.depth) + droneRoute.depth * liveVal)));
        this.drone.setParams({ gain: modGain });
      } else {
        this.drone.setParams({ gain: baseDroneGain });
      }
    }

    // 7. OSC A Morph & Continuous WT Position Modulation
    const wtPosRoute = this.modulationRoutes['osca-wt-pos'];
    const morphRoute = this.modulationRoutes['osca-morph'];
    if (wtPosRoute && wtPosRoute.source !== 'manual' && this.oscA) {
      const basePos = this.channelStripState.oscA.wtPosition ?? 0.0;
      const liveVal = this.computeRouteLiveValue(wtPosRoute, stage, stageProgress, breathMacro);
      const modOffset = (liveVal - (wtPosRoute.bipolar ? 0 : 0.5)) * wtPosRoute.depth * 0.5;
      const modPos = Math.max(0, Math.min(1.0, basePos + modOffset));
      this.oscA.setParams({ wtPosition: modPos });
    } else if (morphRoute && morphRoute.source !== 'manual' && this.oscA) {
      const baseMorph = this.channelStripState.oscA.morphDepth ?? 0.7;
      const liveVal = this.computeRouteLiveValue(morphRoute, stage, stageProgress, breathMacro);
      const modMorph = Math.max(0, Math.min(1, baseMorph * (1 + (liveVal - 0.5) * morphRoute.depth)));
      this.oscA.setParams({ morphDepth: modMorph });
    }

    // 8. OSC A Harmonics Modulation
    const harmRoute = this.modulationRoutes['osca-harmonics'];
    if (harmRoute && harmRoute.source !== 'manual' && this.oscA) {
      const baseHarm = this.channelStripState.oscA.harmonics ?? 0.5;
      const liveVal = this.computeRouteLiveValue(harmRoute, stage, stageProgress, breathMacro);
      const modHarm = Math.max(0, Math.min(1, baseHarm * (1 + (liveVal - 0.5) * harmRoute.depth)));
      this.oscA.setParams({ harmonics: modHarm });
    }

    // 9. OSC A Level Gain Modulation
    const oscaGainRoute = this.modulationRoutes['osca-gain'];
    if (oscaGainRoute && oscaGainRoute.source !== 'manual' && this.oscA) {
      const baseGain = this.channelStripState.oscA.gain ?? 0.7;
      const liveVal = this.computeRouteLiveValue(oscaGainRoute, stage, stageProgress, breathMacro);
      const modGain = Math.max(0, Math.min(1, baseGain * ((1 - oscaGainRoute.depth) + oscaGainRoute.depth * liveVal)));
      this.oscA.setParams({ gain: modGain });
    }

    // 9b. OSC A Warp Modulation
    const oscaWarpRoute = this.modulationRoutes['osca-warp'];
    if (oscaWarpRoute && oscaWarpRoute.source !== 'manual' && this.oscA) {
      const baseWarp = this.channelStripState.oscA.warp ?? 0.0;
      const liveVal = this.computeRouteLiveValue(oscaWarpRoute, stage, stageProgress, breathMacro);
      const modWarp = Math.max(0, Math.min(1, baseWarp + (liveVal - 0.5) * oscaWarpRoute.depth));
      this.oscA.setParams({ warp: modWarp });
    }

    // 9c. OSC A Pan Modulation
    const oscaPanRoute = this.modulationRoutes['osca-pan'];
    if (oscaPanRoute && oscaPanRoute.source !== 'manual' && this.oscA) {
      const basePan = this.channelStripState.oscA.pan ?? 0.0;
      const liveVal = this.computeRouteLiveValue(oscaPanRoute, stage, stageProgress, breathMacro);
      const modPan = Math.max(-1.0, Math.min(1.0, basePan + liveVal * oscaPanRoute.depth));
      this.oscA.setParams({ pan: modPan });
    }

    // 10. Master Stereo Pan Modulation
    const panRoute = this.modulationRoutes['master-pan'];
    const basePan = this.effectsState.masterPan ?? 0.0;
    if (panRoute && panRoute.source !== 'manual' && this.panner) {
      const liveVal = this.computeRouteLiveValue(panRoute, stage, stageProgress, breathMacro);
      const modPan = Math.max(-1.0, Math.min(1.0, basePan + liveVal * panRoute.depth));
      this.panner.pan.setTargetAtTime(modPan, now, 0.008);
    } else if (this.panner) {
      this.panner.pan.setTargetAtTime(basePan, now, 0.008);
    }

    // 11. OSC A Detune Modulation
    const detuneRoute = this.modulationRoutes['osca-detune'];
    if (detuneRoute && detuneRoute.source !== 'manual' && this.oscA) {
      const baseDetune = this.channelStripState.oscA.detune ?? 0;
      const liveVal = this.computeRouteLiveValue(detuneRoute, stage, stageProgress, breathMacro);
      const modDetune = Math.max(-50, Math.min(50, baseDetune + liveVal * detuneRoute.depth * 25));
      this.oscA.setParams({ detune: modDetune });
    }

    // 12. Drone Pitch Drift Modulation
    const driftRoute = this.modulationRoutes['drone-drift'];
    if (driftRoute && driftRoute.source !== 'manual' && this.drone) {
      const baseDrift = this.channelStripState.drone.pitchDrift ?? 0.5;
      const liveVal = this.computeRouteLiveValue(driftRoute, stage, stageProgress, breathMacro);
      const modDrift = Math.max(0, Math.min(1, baseDrift + (liveVal - (driftRoute.bipolar ? 0 : 0.5)) * driftRoute.depth));
      this.drone.setParams({ pitchDrift: modDrift });
    } else if (this.drone && this.channelStripState.drone.pitchDrift !== undefined) {
      this.drone.setParams({ pitchDrift: this.channelStripState.drone.pitchDrift });
    }

    // 13. Reverb Wet Mix Modulation
    const reverbMixRoute = this.modulationRoutes['reverb-mix'];
    if (reverbMixRoute && reverbMixRoute.source !== 'manual' && this.reverb) {
      const baseMix = this.effectsState.reverb.mix;
      const liveVal = this.computeRouteLiveValue(reverbMixRoute, stage, stageProgress, breathMacro);
      const modMix = Math.max(0, Math.min(1, baseMix * ((1 - reverbMixRoute.depth) + reverbMixRoute.depth * liveVal)));
      this.reverb.setParams({ mix: modMix });
    } else if (this.reverb) {
      this.reverb.setParams({ mix: this.effectsState.reverb.mix });
    }

    // 14. Delay Wet Mix Modulation
    const delayMixRoute = this.modulationRoutes['delay-mix'];
    if (delayMixRoute && delayMixRoute.source !== 'manual' && this.delay) {
      const baseMix = this.effectsState.delay.mix;
      const liveVal = this.computeRouteLiveValue(delayMixRoute, stage, stageProgress, breathMacro);
      const modMix = Math.max(0, Math.min(1, baseMix * ((1 - delayMixRoute.depth) + delayMixRoute.depth * liveVal)));
      this.delay.setParams({ mix: modMix });
    } else if (this.delay) {
      this.delay.setParams({ mix: this.effectsState.delay.mix });
    }

    // 15. Drive Saturation Modulation
    const driveRoute = this.modulationRoutes['drive-amount'];
    if (driveRoute && driveRoute.source !== 'manual' && this.drive) {
      const baseAmount = this.effectsState.drive.amount;
      const liveVal = this.computeRouteLiveValue(driveRoute, stage, stageProgress, breathMacro);
      const modAmount = Math.max(0, Math.min(1, baseAmount * (1 + (liveVal - 0.5) * driveRoute.depth)));
      this.drive.setParams({ amount: modAmount });
    } else if (this.drive) {
      this.drive.setParams({ amount: this.effectsState.drive.amount });
    }

    // 16. Preamp Gain Modulation
    const gainRoute = this.modulationRoutes['preamp-gain'];
    if (this.gainModule) {
      const currentGain = this.gainModule.getParams().value;
      if (gainRoute && gainRoute.source !== 'manual') {
        const baseGain = this.effectsState.gain?.value ?? 0.0;
        const liveVal = this.computeRouteLiveValue(gainRoute, stage, stageProgress, breathMacro);
        const modOffset = (liveVal - (gainRoute.bipolar ? 0 : 0.5)) * gainRoute.depth * 18.0;
        const modGain = Math.max(-12.0, Math.min(24.0, baseGain + modOffset));
        if (Math.abs(modGain - currentGain) > 0.01) {
          this.gainModule.setParams({ value: modGain });
        }
      } else if (this.effectsState.gain?.value !== undefined) {
        if (Math.abs(this.effectsState.gain.value - currentGain) > 0.01) {
          this.gainModule.setParams({ value: this.effectsState.gain.value });
        }
      }
    }

    // 17-20. Granular Rate, Density, Gain & Scan Position Modulation (batched single update)
    if (this.granular) {
      const granState = this.channelStripState.granular;
      const granularUpdates: Partial<NonNullable<ChannelStripParams['granular']>> = {};

      const granularRateRoute = this.modulationRoutes['granular-rate'];
      if (granularRateRoute && granularRateRoute.source !== 'manual') {
        const baseRate = granState?.rate ?? 1.5;
        const liveVal = this.computeRouteLiveValue(granularRateRoute, stage, stageProgress, breathMacro);
        granularUpdates.rate = Math.max(0.1, Math.min(50.0, baseRate * (1 + (liveVal - 0.5) * granularRateRoute.depth)));
      } else if (granState?.rate !== undefined) {
        granularUpdates.rate = granState.rate;
      }

      const granularDensityRoute = this.modulationRoutes['granular-density'];
      if (granularDensityRoute && granularDensityRoute.source !== 'manual') {
        const baseDensity = granState?.density ?? 8;
        const liveVal = this.computeRouteLiveValue(granularDensityRoute, stage, stageProgress, breathMacro);
        granularUpdates.density = Math.max(1, Math.min(32, Math.round(baseDensity * (1 + (liveVal - 0.5) * granularDensityRoute.depth))));
      } else if (granState?.density !== undefined) {
        granularUpdates.density = granState.density;
      }

      const granularGainRoute = this.modulationRoutes['granular-gain'];
      if (granularGainRoute && granularGainRoute.source !== 'manual') {
        const baseGain = granState?.gain ?? 0.75;
        const liveVal = this.computeRouteLiveValue(granularGainRoute, stage, stageProgress, breathMacro);
        granularUpdates.gain = Math.max(0.0, Math.min(1.0, baseGain * ((1 - granularGainRoute.depth) + granularGainRoute.depth * liveVal)));
      } else if (granState?.gain !== undefined) {
        granularUpdates.gain = granState.gain;
      }

      const granularPosRoute = this.modulationRoutes['granular-position'];
      if (granularPosRoute && granularPosRoute.source !== 'manual') {
        const basePos = granState?.position ?? 0.26;
        const liveVal = this.computeRouteLiveValue(granularPosRoute, stage, stageProgress, breathMacro);
        granularUpdates.position = Math.max(0.0, Math.min(1.0, basePos + (liveVal - 0.5) * granularPosRoute.depth));
      } else if (granState?.position !== undefined) {
        granularUpdates.position = granState.position;
      }

      this.granular.setParams(granularUpdates);
    }
  }

  /**
   * Loads a curated sound therapy preset into channel strip and effects chain
   */
  loadSoundPreset(presetOrId: SoundPreset | string): void {
    const preset = typeof presetOrId === 'string' ? getSoundPresetById(presetOrId) : presetOrId;
    if (!preset) return;
    this.isCustomWavetableSelected = true;

    const safeChannelStrip: DeepPartial<ChannelStripParams> = {
      oscA: {
        ...DEFAULT_CHANNEL_STRIP.oscA,
        ...preset.channelStrip.oscA,
        wtPosition: preset.channelStrip.oscA.wtPosition ?? preset.channelStrip.oscA.morphDepth ?? 0.5,
        voiceMode: preset.channelStrip.oscA.voiceMode === 'particles' ? 'drone' : (preset.channelStrip.oscA.voiceMode ?? 'drone')
      },
      oscB: {
        ...DEFAULT_CHANNEL_STRIP.oscB,
        ...preset.channelStrip.oscB
      },
      drone: {
        ...DEFAULT_CHANNEL_STRIP.drone,
        ...preset.channelStrip.drone
      },
      granular: {
        ...DEFAULT_CHANNEL_STRIP.granular,
        ...(preset.channelStrip.granular || {}),
        bypass: preset.channelStrip.granular?.bypass ?? true
      },
      ambient: {
        ...DEFAULT_CHANNEL_STRIP.ambient,
        ...(preset.channelStrip.ambient || {}),
        bypass: preset.channelStrip.ambient?.bypass ?? false
      }
    };

    const safeEffects: DeepPartial<EffectsChainParams> = {
      ...DEFAULT_EFFECTS_CHAIN,
      ...preset.effects,
      gain: {
        ...DEFAULT_EFFECTS_CHAIN.gain,
        ...(preset.effects?.gain || {})
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        ...(preset.effects?.eq || {}),
        low: { ...DEFAULT_EQ_PARAMS.low, ...(preset.effects?.eq?.low || {}) },
        midLow: { ...DEFAULT_EQ_PARAMS.midLow, ...(preset.effects?.eq?.midLow || {}) },
        midHigh: { ...DEFAULT_EQ_PARAMS.midHigh, ...(preset.effects?.eq?.midHigh || {}) },
        high: { ...DEFAULT_EQ_PARAMS.high, ...(preset.effects?.eq?.high || {}) },
        bypass: preset.effects?.eq?.bypass ?? false
      }
    };

    this.updateChannelStrip(safeChannelStrip);
    this.updateEffects(safeEffects);
    if (preset.modulationRoutes) {
      this.setModulationRoutes(preset.modulationRoutes);
    } else {
      this.setModulationRoutes(DEFAULT_MODULATION_ROUTES);
    }

    // Sound Triggering & Anti-Mute: If engine is currently active & running, smoothly retrigger master ADSR
    if (this.ctx && this.ctx.state === 'running' && !this.isPaused) {
      this.triggerAllAdsrAttack(1.0);
    }
  }


  /**
   * Updates channel strip parameters (Osc A, Osc B, Drone)
   */
  updateChannelStrip(params: DeepPartial<ChannelStripParams>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);

    if (params.oscA) {
      if (params.oscA.wavetableIndex !== undefined) {
        params.oscA.wavetableIndex = Math.max(0, Math.min(23, Math.floor(params.oscA.wavetableIndex)));
        this.isCustomWavetableSelected = params.oscA.wavetableIndex !== 0;
      }
      if (params.oscA.wtPosition !== undefined) {
        let pos = params.oscA.wtPosition;
        if (pos > 1.0 && pos <= 23.0) {
          pos = pos / 23.0;
        }
        params.oscA.wtPosition = Math.max(0, Math.min(1.0, pos));
      }
      if (params.oscA.morphDepth !== undefined) {
        params.oscA.morphDepth = Math.max(0, Math.min(1, params.oscA.morphDepth));
      }
      if (params.oscA.detune !== undefined) params.oscA.detune = Math.max(-100, Math.min(100, params.oscA.detune));
      if (params.oscA.harmonics !== undefined) params.oscA.harmonics = Math.max(0, Math.min(1, params.oscA.harmonics));
      if (params.oscA.gain !== undefined) params.oscA.gain = Math.max(0, Math.min(1, params.oscA.gain));
      if (params.oscA.unison !== undefined) params.oscA.unison = Math.max(0, Math.min(1, params.oscA.unison));
      if (params.oscA.unisonVoices !== undefined) params.oscA.unisonVoices = Math.max(1, Math.min(16, Math.round(params.oscA.unisonVoices)));
      if (params.oscA.unisonDetune !== undefined) params.oscA.unisonDetune = Math.max(0, Math.min(1, params.oscA.unisonDetune));
      if (params.oscA.octave !== undefined) params.oscA.octave = Math.max(-4, Math.min(4, Math.round(params.oscA.octave)));
      if (params.oscA.semi !== undefined) params.oscA.semi = Math.max(-12, Math.min(12, Math.round(params.oscA.semi)));
      if (params.oscA.fine !== undefined) params.oscA.fine = Math.max(-100, Math.min(100, Math.round(params.oscA.fine)));
      if (params.oscA.warp !== undefined) params.oscA.warp = Math.max(0, Math.min(1, params.oscA.warp));
      if (params.oscA.phase !== undefined) params.oscA.phase = Math.max(0, Math.min(360, params.oscA.phase));
      if (params.oscA.phaseRand !== undefined) params.oscA.phaseRand = Math.max(0, Math.min(1, params.oscA.phaseRand));
      if (params.oscA.pan !== undefined) params.oscA.pan = Math.max(-1, Math.min(1, params.oscA.pan));
      if (params.oscA.chordMode !== undefined) params.oscA.chordMode = Boolean(params.oscA.chordMode);
      if (params.oscA.subGain !== undefined) params.oscA.subGain = Math.max(0, Math.min(1, params.oscA.subGain));
      if (params.oscA.warmth !== undefined) params.oscA.warmth = Math.max(0, Math.min(1, params.oscA.warmth));
      if (params.oscA.spread !== undefined) params.oscA.spread = Math.max(0, Math.min(1, params.oscA.spread));
      if (params.oscA.voiceMode !== undefined) {
        this.channelStripState.oscA.voiceMode = params.oscA.voiceMode;
      }
      Object.assign(this.channelStripState.oscA, params.oscA);
      if (this.oscA) this.oscA.setParams(this.channelStripState.oscA);
    }

    if (params.oscB) {
      if (params.oscB.color !== undefined) params.oscB.color = Math.max(0, Math.min(1, params.oscB.color));
      if (params.oscB.friction !== undefined) params.oscB.friction = Math.max(0, Math.min(1, params.oscB.friction));
      if (params.oscB.gain !== undefined) params.oscB.gain = Math.max(0, Math.min(1, params.oscB.gain));
      if (params.oscB.lowCut !== undefined) params.oscB.lowCut = Math.max(20, Math.min(3000, params.oscB.lowCut));
      if (params.oscB.motion !== undefined) params.oscB.motion = Math.max(0, Math.min(1, params.oscB.motion));
      if (params.oscB.stereoWidth !== undefined) params.oscB.stereoWidth = Math.max(0, Math.min(1, params.oscB.stereoWidth));
      Object.assign(this.channelStripState.oscB, params.oscB);
      if (this.oscB) this.oscB.setParams(params.oscB);
    }

    if (params.drone) {
      if (params.drone.baseFreq !== undefined) params.drone.baseFreq = Math.max(20, Math.min(440, params.drone.baseFreq));
      if (params.drone.pitchDrift !== undefined) params.drone.pitchDrift = Math.max(0, Math.min(1, params.drone.pitchDrift));
      if (params.drone.gain !== undefined) params.drone.gain = Math.max(0, Math.min(1, params.drone.gain));
      Object.assign(this.channelStripState.drone, params.drone);
      if (this.drone) this.drone.setParams(params.drone);
    }

    if (params.granular) {
      if (!this.channelStripState.granular) {
        this.channelStripState.granular = { ...DEFAULT_GRANULAR_PARAMS };
      }
      const prevGranular = this.channelStripState.granular;
      let safeDuration = params.granular.duration;
      if (safeDuration !== undefined) {
        const validDur = Number.isFinite(safeDuration) ? safeDuration : 0.245;
        const durSec = validDur > 15.0 ? validDur / 1000.0 : validDur;
        safeDuration = Number(Math.max(0.02, Math.min(10.0, durSec)).toFixed(3));
      }
      const nextEnvelope = params.granular.grainEnvelope
        ? {
            ...(prevGranular.grainEnvelope ?? DEFAULT_GRANULAR_PARAMS.grainEnvelope),
            ...params.granular.grainEnvelope
          }
        : prevGranular.grainEnvelope;

      this.channelStripState.granular = {
        ...prevGranular,
        ...params.granular,
        ...(safeDuration !== undefined ? { duration: safeDuration } : {}),
        grainEnvelope: nextEnvelope
      };
      if (this.granular) this.granular.setParams(this.channelStripState.granular); // 更新独立顶级粒子引擎物理参数
    }

    if (params.ambient) {
      if (!this.channelStripState.ambient) {
        this.channelStripState.ambient = { ...DEFAULT_AMBIENT_PARAMS };
      }
      if (params.ambient.gain !== undefined) params.ambient.gain = Math.max(0, Math.min(1, params.ambient.gain));
      if (params.ambient.tone !== undefined) params.ambient.tone = Math.max(0, Math.min(1, params.ambient.tone));
      if (params.ambient.breathSync !== undefined) params.ambient.breathSync = Math.max(0, Math.min(1, params.ambient.breathSync));
      if (params.ambient.width !== undefined) params.ambient.width = Math.max(0, Math.min(1, params.ambient.width));
      Object.assign(this.channelStripState.ambient, params.ambient);
      if (this.ambient) this.ambient.setParams(this.channelStripState.ambient);
    }

    if (params.instances) {
      if (!this.channelStripState.instances) {
        this.channelStripState.instances = {};
      }
      for (const [id, instParams] of Object.entries(params.instances)) {
        if (instParams) {
          this.channelStripState.instances[id] = {
            ...(this.channelStripState.instances[id] || {}),
            ...instParams
          };
          const src = this.sources.get(id);
          if (src) {
            src.setParams(instParams);
          }
        }
      }
    }
  }

  /**
   * Updates effects chain parameters (Drive, Filter, Delay, Reverb, MasterGain)
   */
  updateEffects(params: DeepPartial<EffectsChainParams>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);

    if (params.gain) {
      if (!this.effectsState.gain) {
        this.effectsState.gain = { value: 0.0, bypass: false, softClip: true };
      }
      Object.assign(this.effectsState.gain, params.gain);
      this.effectModuleParams.set('gain', { ...this.effectModuleParams.get('gain'), ...params.gain });
      if (this.gainModule) this.gainModule.setParams(params.gain);
    }

    if (params.filter) {
      Object.assign(this.effectsState.filter, params.filter);
      this.effectModuleParams.set('filter', { ...this.effectModuleParams.get('filter'), ...params.filter });
      if (this.filter) this.filter.setParams(params.filter);
    }

    if (params.eq) {
      this.effectsState.eq = {
        ...(this.effectsState.eq || DEFAULT_EQ_PARAMS),
        ...params.eq,
        low: { ...(this.effectsState.eq?.low || DEFAULT_EQ_PARAMS.low), ...(params.eq.low || {}) },
        midLow: { ...(this.effectsState.eq?.midLow || DEFAULT_EQ_PARAMS.midLow), ...(params.eq.midLow || {}) },
        midHigh: { ...(this.effectsState.eq?.midHigh || DEFAULT_EQ_PARAMS.midHigh), ...(params.eq.midHigh || {}) },
        high: { ...(this.effectsState.eq?.high || DEFAULT_EQ_PARAMS.high), ...(params.eq.high || {}) }
      };
      this.effectModuleParams.set('eq', { ...this.effectsState.eq });
      if (this.eq) this.eq.setParams(this.effectsState.eq);
    }

    if (params.drive) {
      Object.assign(this.effectsState.drive, params.drive);
      this.effectModuleParams.set('drive', { ...this.effectModuleParams.get('drive'), ...params.drive });
      if (this.drive) this.drive.setParams(params.drive);
    }

    if (params.delay) {
      Object.assign(this.effectsState.delay, params.delay);
      this.effectModuleParams.set('delay', { ...this.effectModuleParams.get('delay'), ...params.delay });
      if (this.delay) this.delay.setParams(params.delay);
    }

    if (params.reverb) {
      Object.assign(this.effectsState.reverb, params.reverb);
      this.effectModuleParams.set('reverb', { ...this.effectModuleParams.get('reverb'), ...params.reverb });
      if (this.reverb) this.reverb.setParams(params.reverb);
    }

    // 2. Dispatch instance-specific parameters to respective nodes (e.g. 'filter_2', 'delay_2', etc.)
    const instanceEntries: [string, any][] = [];
    if (params.instances) {
      for (const [id, instParams] of Object.entries(params.instances)) {
        if (instParams) instanceEntries.push([id, instParams]);
      }
    }
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'instances' && key.includes('_') && value) {
        instanceEntries.push([key, value]);
      }
    }

    for (const [effId, effParams] of instanceEntries) {
      const baseType = getEffectModuleType(effId);
      const existingParams = this.effectModuleParams.get(effId) || getDefaultEffectParams(baseType);
      let merged: any;
      if (baseType === 'eq') {
        merged = {
          ...existingParams,
          ...effParams,
          low: { ...(existingParams.low || DEFAULT_EQ_PARAMS.low), ...(effParams.low || {}) },
          midLow: { ...(existingParams.midLow || DEFAULT_EQ_PARAMS.midLow), ...(effParams.midLow || {}) },
          midHigh: { ...(existingParams.midHigh || DEFAULT_EQ_PARAMS.midHigh), ...(effParams.midHigh || {}) },
          high: { ...(existingParams.high || DEFAULT_EQ_PARAMS.high), ...(effParams.high || {}) }
        };
      } else {
        merged = { ...existingParams, ...effParams };
      }
      this.effectModuleParams.set(effId, merged);
      const targetNode = this.getOrCreateEffectModule(effId);
      if (targetNode && typeof targetNode.setParams === 'function') {
        targetNode.setParams(merged);
      }
    }

    if (params.masterGain !== undefined) {
      this.effectsState.masterGain = Math.max(0, Math.min(1, params.masterGain));
      if (this.masterVolumeGain && this.ctx) {
        this.masterVolumeGain.gain.setTargetAtTime(this.effectsState.masterGain, this.ctx.currentTime, 0.005);
      }
    }

    if (params.masterPan !== undefined) {
      this.effectsState.masterPan = Math.max(-1, Math.min(1, params.masterPan));
      if (this.panner && this.ctx) {
        this.panner.pan.setTargetAtTime(this.effectsState.masterPan, this.ctx.currentTime, 0.02);
      }
    }

    if (params.lfo1) {
      this.effectsState.lfo1 = { ...(this.effectsState.lfo1 || DEFAULT_LFO1_PARAMS), ...params.lfo1 };
      if (this.dualLfo) this.dualLfo.setLfo1Params(params.lfo1);
    }

    if (params.lfo2) {
      this.effectsState.lfo2 = { ...(this.effectsState.lfo2 || DEFAULT_LFO2_PARAMS), ...params.lfo2 };
      if (this.dualLfo) this.dualLfo.setLfo2Params(params.lfo2);
    }

    if (params.lfo) {
      this.effectsState.lfo = { ...(this.effectsState.lfo || { bypass: false }), ...params.lfo };
      this.effectModuleParams.set('lfo', { ...this.effectModuleParams.get('lfo'), ...params.lfo });
      const lfoNode = this.getOrCreateEffectModule('lfo');
      if (lfoNode && typeof lfoNode.setParams === 'function') {
        lfoNode.setParams(this.effectsState.lfo);
      }
    }

    if (params.adsr) {
      this.effectsState.adsr = { ...(this.effectsState.adsr || DEFAULT_ADSR_PARAMS), ...params.adsr };
      if (this.adsr) this.adsr.setParams(params.adsr);
    }

    if (params.busMix !== undefined) {
      this.setBusMix(params.busMix);
    }

    if (params.busLevelA !== undefined) {
      const clampedA = Math.max(0, Math.min(1, params.busLevelA));
      this.effectsState.busLevelA = clampedA;
      const cosA = Math.cos(this.currentBusMix * Math.PI * 0.5);
      const targetA = cosA * clampedA;
      if (this.busGainA && this.ctx) {
        const now = this.ctx.currentTime;
        this.busGainA.gain.setTargetAtTime(targetA, now, 0.015);
      }
    }

    if (params.busLevelB !== undefined) {
      const clampedB = Math.max(0, Math.min(1, params.busLevelB));
      this.effectsState.busLevelB = clampedB;
      const sinB = Math.sin(this.currentBusMix * Math.PI * 0.5);
      const targetB = sinB * clampedB;
      if (this.busGainB && this.ctx) {
        const now = this.ctx.currentTime;
        this.busGainB.gain.setTargetAtTime(targetB, now, 0.015);
      }
    }

    if (params.sourceRoutes) {
      for (const [srcId, lane] of Object.entries(params.sourceRoutes)) {
        if (lane && this.sourceRoutes[srcId as SoundSourceId] !== lane) {
          this.setSourceRoute(srcId as SoundSourceId, lane as LaneId);
        }
      }
    }

    if (params.laneAOrder) {
      const isSameA =
        Array.isArray(params.laneAOrder) &&
        params.laneAOrder.length === this.laneAOrder.length &&
        params.laneAOrder.every((id, idx) => id === this.laneAOrder[idx]);
      if (!isSameA) {
        this.reorderLaneEffects('laneA', params.laneAOrder as string[]);
      }
    }

    if (params.laneBOrder) {
      const isSameB =
        Array.isArray(params.laneBOrder) &&
        params.laneBOrder.length === this.laneBOrder.length &&
        params.laneBOrder.every((id, idx) => id === this.laneBOrder[idx]);
      if (!isSameB) {
        this.reorderLaneEffects('laneB', params.laneBOrder as string[]);
      }
    }
  }

  /**
   * Sets equal-power crossfade between Lane A and Lane B (0.0 = 100% Lane A, 0.5 = Balanced, 1.0 = 100% Lane B)
   */
  public setBusMix(mix: number): void {
    if (this.isDisposed || !Number.isFinite(mix)) return;
    const clamped = Math.max(0, Math.min(1, mix));
    this.currentBusMix = clamped;
    this.effectsState.busMix = clamped;

    const cosA = Math.cos(clamped * Math.PI * 0.5);
    const sinB = Math.sin(clamped * Math.PI * 0.5);
    const targetA = cosA * (this.effectsState.busLevelA ?? 1.0);
    const targetB = sinB * (this.effectsState.busLevelB ?? 1.0);

    if (this.busGainA && this.busGainB && this.ctx) {
      const now = this.ctx.currentTime;
      this.busGainA.gain.setTargetAtTime(targetA, now, 0.015);
      this.busGainB.gain.setTargetAtTime(targetB, now, 0.015);
    }
  }

  /**
   * Gets current bus mix balance (0.0 - 1.0)
   */
  public getBusMix(): number {
    return this.currentBusMix;
  }

  public getBusLevelA(): number {
    return this.effectsState.busLevelA ?? 1.0;
  }

  public getBusLevelB(): number {
    return this.effectsState.busLevelB ?? 1.0;
  }

  /**
   * Triggers attack on all registered ADSR modules across Lane A and Lane B
   */
  private triggerAllAdsrAttack(velocity = 1.0): void {
    if (this.adsr && !this.effectsState.adsr?.bypass) {
      this.adsr.triggerAttack(velocity);
    }
    for (const [id, mod] of this.effectModules.entries()) {
      if (id !== 'adsr' && mod instanceof AdsrModule) {
        const params = this.effectModuleParams.get(id);
        if (!params?.bypass) {
          mod.triggerAttack(velocity);
        }
      }
    }
  }

  /**
   * Triggers release on all registered ADSR modules across Lane A and Lane B
   */
  private triggerAllAdsrRelease(): void {
    if (this.adsr && !this.effectsState.adsr?.bypass) {
      this.adsr.triggerRelease();
    }
    for (const [id, mod] of this.effectModules.entries()) {
      if (id !== 'adsr' && mod instanceof AdsrModule) {
        const params = this.effectModuleParams.get(id);
        if (!params?.bypass) {
          mod.triggerRelease();
        }
      }
    }
  }

  /**
   * Purges all registered ADSR modules across Lane A and Lane B
   */
  private triggerAllAdsrPurge(): void {
    if (this.adsr) {
      this.adsr.purge();
    }
    for (const [id, mod] of this.effectModules.entries()) {
      if (id !== 'adsr' && mod instanceof AdsrModule) {
        mod.purge();
      }
    }
  }

  /**
   * Restores all registered ADSR modules across Lane A and Lane B
   */
  private triggerAllAdsrRestore(wasPaused: boolean): void {
    if (this.adsr) {
      this.adsr.restore();
      if (wasPaused) {
        this.adsr.triggerAttack(1.0);
      }
    }
    for (const [id, mod] of this.effectModules.entries()) {
      if (id !== 'adsr' && mod instanceof AdsrModule) {
        mod.restore();
        if (wasPaused) {
          mod.triggerAttack(1.0);
        }
      }
    }
  }

  getChannelStripParams(): Readonly<ChannelStripParams> {
    if (this.isCustomWavetableSelected) {
      return JSON.parse(JSON.stringify(this.channelStripState));
    }
    if (this.oscA && this.oscB && this.drone) {
      return {
        oscA: this.oscA.getParams(),
        granular: this.granular ? this.granular.getParams() : this.channelStripState.granular,
        oscB: this.oscB.getParams(),
        drone: this.drone.getParams(),
        ambient: this.ambient ? this.ambient.getParams() : this.channelStripState.ambient,
        instances: JSON.parse(JSON.stringify(this.channelStripState.instances || {}))
      };
    }
    return JSON.parse(JSON.stringify(this.channelStripState));
  }

  getEffectsParams(): Readonly<EffectsChainParams> {
    const instancesObj: Record<string, any> = {};
    for (const [id, p] of this.effectModuleParams.entries()) {
      instancesObj[id] = JSON.parse(JSON.stringify(p));
    }

    if (this.filter && this.drive && this.delay && this.reverb) {
      return {
        gain: this.gainModule ? this.gainModule.getParams() : this.effectsState.gain,
        filter: this.filter.getParams(),
        drive: this.drive.getParams(),
        eq: this.eq ? this.eq.getParams() : this.effectsState.eq,
        delay: this.delay.getParams(),
        reverb: this.reverb.getParams(),
        masterGain: this.effectsState.masterGain,
        masterPan: this.effectsState.masterPan,
        busMix: this.currentBusMix,
        busLevelA: this.effectsState.busLevelA ?? 1.0,
        busLevelB: this.effectsState.busLevelB ?? 1.0,
        lfo1: this.dualLfo ? this.dualLfo.getLfo1Params() : this.effectsState.lfo1,
        lfo2: this.dualLfo ? this.dualLfo.getLfo2Params() : this.effectsState.lfo2,
        adsr: this.adsr ? this.adsr.getParams() : this.effectsState.adsr,
        sourceRoutes: this.getSourceRoutes(),
        laneAOrder: this.getLaneEffectOrder('laneA'),
        laneBOrder: this.getLaneEffectOrder('laneB'),
        instances: instancesObj
      };
    }
    return {
      ...JSON.parse(JSON.stringify(this.effectsState)),
      busMix: this.currentBusMix,
      sourceRoutes: this.getSourceRoutes(),
      laneAOrder: this.getLaneEffectOrder('laneA'),
      laneBOrder: this.getLaneEffectOrder('laneB'),
      instances: instancesObj
    };
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Returns current active visual grains snapshot ONLY from GranularChannel for Phase Plant Scope visualization.
   * Strictly decoupled from OscAChannel. If granular is bypassed or uninitialized, strictly returns empty array.
   */
  getVisualGrains(): ParticleVisualGrain[] {
    if (!this.granular || this.channelStripState.granular?.bypass) {
      return [];
    }
    return this.granular.getActiveVisualGrains() ?? [];
  }

  getAudioCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  getFreezeSnapshot(): {
    timestamp: number;
    stage: BreathStage;
    stageProgress: number;
    macroValue: number;
  } | null {
    return this.freezeSnapshot ? { ...this.freezeSnapshot } : null;
  }

  /**
   * Dynamically switches the output route for a sound source with 3ms anti-click crossfade
   */
  setSourceRoute(sourceId: SoundSourceId, lane: LaneId): void {
    this.sourceRoutes[sourceId] = lane;
    if (!this.ctx || this.isDisposed) return;
    const gains = this.sourceRouteGains.get(sourceId);
    if (!gains) return;

    const now = this.ctx.currentTime;
    const FADE = 0.003; // 3ms micro-crossfade eliminates DC clicks

    gains.toA.gain.cancelScheduledValues(now);
    gains.toB.gain.cancelScheduledValues(now);
    gains.toThru.gain.cancelScheduledValues(now);

    const valA = gains.toA.gain.value;
    const valB = gains.toB.gain.value;
    const valThru = gains.toThru.gain.value;

    gains.toA.gain.setValueAtTime(valA, now);
    gains.toB.gain.setValueAtTime(valB, now);
    gains.toThru.gain.setValueAtTime(valThru, now);

    gains.toA.gain.linearRampToValueAtTime(lane === 'laneA' ? 1.0 : 0.0, now + FADE);
    gains.toB.gain.linearRampToValueAtTime(lane === 'laneB' ? 1.0 : 0.0, now + FADE);
    gains.toThru.gain.linearRampToValueAtTime(lane === 'thru' ? 1.0 : 0.0, now + FADE);
  }

  /**
   * Returns current source routing configuration
   */
  getSourceRoutes(): SourceRouteMap {
    return { ...this.sourceRoutes };
  }

  /**
   * Reorders effects in a specific lane with 3ms micro-ducking
   */
  reorderLaneEffects(lane: 'laneA' | 'laneB', order: string[]): void {
    order = [...new Set(order)];
    const currentOrder = lane === 'laneA' ? this.laneAOrder : this.laneBOrder;
    if (
      Array.isArray(order) &&
      order.length === currentOrder.length &&
      order.every((id, idx) => id === currentOrder[idx])
    ) {
      return;
    }

    if (lane === 'laneA') {
      this.laneAOrder = [...order];
      if (this.effectChainA) {
        // Ensure all modules are registered in effectChainA and unregistered from effectChainB
        for (const effId of order) {
          if (this.effectChainB) {
            this.effectChainB.unregisterEffect(effId);
            this.laneBOrder = this.laneBOrder.filter(id => id !== effId);
          }
          const mod = this.getOrCreateEffectModule(effId);
          if (mod) {
            this.effectChainA.registerEffect(mod, false);
          }
        }
        this.effectChainA.reorderEffects(order);
      }
    } else {
      this.laneBOrder = [...order];
      if (this.effectChainB) {
        // Ensure all modules are registered in effectChainB and unregistered from effectChainA
        for (const effId of order) {
          if (this.effectChainA) {
            this.effectChainA.unregisterEffect(effId);
            this.laneAOrder = this.laneAOrder.filter(id => id !== effId);
          }
          const mod = this.getOrCreateEffectModule(effId);
          if (mod) {
            this.effectChainB.registerEffect(mod, false);
          }
        }
        this.effectChainB.reorderEffects(order);
      }
    }
  }

  /**
   * Gets effect order for a specific lane
   */
  getLaneEffectOrder(lane: 'laneA' | 'laneB'): string[] {
    return lane === 'laneA' ? [...this.laneAOrder] : [...this.laneBOrder];
  }

  /**
   * Retrieves or dynamically instantiates an effect module instance
   */
  public getOrCreateEffectModule(effectId: string): AudioEffectNode | null {
    if (this.effectModules.has(effectId)) {
      return this.effectModules.get(effectId)!;
    }
    if (!this.ctx) return null;
    const baseType = getEffectModuleType(effectId);
    let mod: AudioEffectNode | null = null;

    // Retrieve or initialize dedicated instance params snapshot
    let instParams = this.effectModuleParams.get(effectId);
    if (!instParams) {
      if (effectId === baseType) {
        instParams = (this.effectsState as any)[baseType] || getDefaultEffectParams(baseType);
      } else {
        instParams = getDefaultEffectParams(baseType);
      }
      this.effectModuleParams.set(effectId, JSON.parse(JSON.stringify(instParams)));
    }

    switch (baseType) {
      case 'filter':
        mod = new MultimodeFilter(this.ctx, effectId);
        mod.setParams(instParams);
        break;
      case 'gain':
        mod = new GainModule(this.ctx, effectId);
        mod.setParams(instParams);
        break;
      case 'drive':
        mod = new DriveModule(this.ctx, effectId);
        mod.setParams(instParams);
        break;
      case 'eq':
        mod = new EqModule(this.ctx, instParams, effectId);
        break;
      case 'delay':
        mod = new StereoDelay(this.ctx, effectId);
        mod.setParams(instParams);
        break;
      case 'reverb':
        mod = new ConvolverReverb(this.ctx, effectId);
        mod.setParams(instParams);
        break;
      case 'lfo':
        mod = new LfoRackEffectModule(this.ctx, this.dualLfo, effectId);
        mod.setParams(instParams);
        break;
      case 'adsr':
        mod = effectId === 'adsr' ? this.adsr : new AdsrModule(this.ctx, effectId);
        if (mod && mod !== this.adsr) {
          mod.setParams(instParams);
        }
        break;
    }
    if (mod) {
      this.effectModules.set(effectId, mod);
    }
    return mod;
  }

  /**
   * Gets dedicated parameter snapshot for a specific effect module instance
   */
  public getEffectModuleParams(effectId: string): any {
    const p = this.effectModuleParams.get(effectId);
    if (p) return JSON.parse(JSON.stringify(p));
    return getDefaultEffectParams(getEffectModuleType(effectId));
  }

  /**
   * Moves an effect module between lanes with pop-free crossfade and strict registration isolation
   */
  moveEffectBetweenLanes(effectId: string, targetLane: 'laneA' | 'laneB'): void {
    const mod = this.getOrCreateEffectModule(effectId);
    if (!mod) return;

    if (targetLane === 'laneA') {
      if (this.laneBOrder.includes(effectId)) {
        this.laneBOrder = this.laneBOrder.filter(id => id !== effectId);
        this.effectChainB?.unregisterEffect(effectId);
      }
      if (!this.laneAOrder.includes(effectId)) {
        this.laneAOrder.push(effectId);
        this.effectChainA?.addEffect(mod);
      }
    } else {
      if (this.laneAOrder.includes(effectId)) {
        this.laneAOrder = this.laneAOrder.filter(id => id !== effectId);
        this.effectChainA?.unregisterEffect(effectId);
      }
      if (!this.laneBOrder.includes(effectId)) {
        this.laneBOrder.push(effectId);
        this.effectChainB?.addEffect(mod);
      }
    }
  }

  /**
   * Adds an effect module to a specific lane with 3ms click-free crossfade and strict cross-lane unregistration
   */
  addEffectToLane(lane: 'laneA' | 'laneB', effectId: string, index?: number): void {
    const mod = this.getOrCreateEffectModule(effectId);
    if (!mod) return;

    // First ensure it is completely unregistered from the opposite lane
    const oppositeChain = lane === 'laneA' ? this.effectChainB : this.effectChainA;
    if (lane === 'laneA') {
      this.laneBOrder = this.laneBOrder.filter(id => id !== effectId);
    } else {
      this.laneAOrder = this.laneAOrder.filter(id => id !== effectId);
    }
    oppositeChain?.unregisterEffect(effectId);

    if (lane === 'laneA') {
      if (!this.laneAOrder.includes(effectId)) {
        if (index === undefined || index >= this.laneAOrder.length) {
          this.laneAOrder.push(effectId);
        } else {
          this.laneAOrder.splice(Math.max(0, index), 0, effectId);
        }
        this.effectChainA?.addEffect(mod, index);
      }
    } else {
      if (!this.laneBOrder.includes(effectId)) {
        if (index === undefined || index >= this.laneBOrder.length) {
          this.laneBOrder.push(effectId);
        } else {
          this.laneBOrder.splice(Math.max(0, index), 0, effectId);
        }
        this.effectChainB?.addEffect(mod, index);
      }
    }
  }

  /**
   * Removes an effect module from a specific lane and unregisters it to prevent phantom signal routing
   */
  removeEffectFromLane(lane: 'laneA' | 'laneB', effectId: string): void {
    if (lane === 'laneA') {
      this.laneAOrder = this.laneAOrder.filter(id => id !== effectId);
      this.effectChainA?.unregisterEffect(effectId);
    } else {
      this.laneBOrder = this.laneBOrder.filter(id => id !== effectId);
      this.effectChainB?.unregisterEffect(effectId);
    }
  }

  /**
   * Reorders effect processing chain dynamically with 3ms click-free crossfade (Lane A compatibility)
   */
  reorderEffects(order: string[]): void {
    this.reorderLaneEffects('laneA', order);
  }

  /**
   * Gets current effect processing order
   */
  getEffectOrder(): string[] {
    return [...this.laneAOrder];
  }

  /**
   * Dynamically adds or inserts an effect into the chain (Lane A default)
   */
  addEffect(effect: AudioEffectNode, index?: number): void {
    if (this.effectChainA) {
      this.effectChainA.addEffect(effect, index);
      this.laneAOrder = this.effectChainA.getOrder();
    }
  }

  /**
   * Removes an effect from the processing chain (both lanes checked)
   */
  removeEffect(id: string): void {
    if (this.laneAOrder.includes(id)) {
      this.laneAOrder = this.laneAOrder.filter(x => x !== id);
      this.effectChainA?.removeEffect(id);
    }
    if (this.laneBOrder.includes(id)) {
      this.laneBOrder = this.laneBOrder.filter(x => x !== id);
      this.effectChainB?.removeEffect(id);
    }
  }

  /**
   * Dynamically adds and initializes a new sound source instance connected to multi-lane bus
   */
  public addSoundSource(
    sourceId: string,
    type: SoundSourceType,
    initialParams?: any,
    targetLane: LaneId = 'laneA'
  ): AudioSourceNode | null {
    if (this.sources.has(sourceId) || !this.ctx || !this.isInitialized || this.isDisposed) {
      return this.sources.get(sourceId) || null;
    }
    const ctx = this.ctx;
    let node: AudioSourceNode;
    switch (type) {
      case 'oscA':
        node = new OscAChannel(ctx);
        break;
      case 'granular':
        node = new GranularChannel(ctx);
        break;
      case 'oscB':
        node = new OscBChannel(ctx);
        break;
      case 'drone':
        node = new DroneChannel(ctx);
        break;
      case 'ambient':
        node = new AmbientChannel(ctx);
        break;
      default:
        node = new OscAChannel(ctx);
    }

    if (initialParams) {
      node.setParams(initialParams);
      if (!this.channelStripState.instances) {
        this.channelStripState.instances = {};
      }
      try {
        this.channelStripState.instances[sourceId] = structuredClone(initialParams);
      } catch {
        this.channelStripState.instances[sourceId] = JSON.parse(JSON.stringify(initialParams));
      }
    }

    this.sources.set(sourceId, node);

    // Configure pop-free routing crossfaders for this source
    const toA = ctx.createGain();
    const toB = ctx.createGain();
    const toThru = ctx.createGain();

    this.sourceRoutes[sourceId as SoundSourceId] = targetLane;
    toA.gain.value = targetLane === 'laneA' ? 1.0 : 0.0;
    toB.gain.value = targetLane === 'laneB' ? 1.0 : 0.0;
    toThru.gain.value = targetLane === 'thru' ? 1.0 : 0.0;

    node.outputNode.connect(toA);
    node.outputNode.connect(toB);
    node.outputNode.connect(toThru);

    toA.connect(this.laneBusA);
    toB.connect(this.laneBusB);
    toThru.connect(this.thruBus);

    this.sourceRouteGains.set(sourceId as SoundSourceId, { toA, toB, toThru });

    // Start source node
    node.start(0);

    // If engine is currently paused or muted, keep it purged or muted until resume
    if (this.isPaused && node.purge) {
      node.purge();
    }

    return node;
  }

  /**
   * Smoothly removes a sound source from the audio graph with 3ms anti-click micro-ramp
   */
  public removeSoundSource(sourceId: string): void {
    const node = this.sources.get(sourceId);
    const gains = this.sourceRouteGains.get(sourceId as SoundSourceId);

    // Clear any previously pending removal timer to avoid leaking stale callbacks
    // when removeSoundSource is invoked multiple times for the same source.
    const previousTimer = this.removeSourceTimers.get(sourceId);
    if (previousTimer !== undefined) {
      clearTimeout(previousTimer);
      this.removeSourceTimers.delete(sourceId);
    }

    const cleanup = (): void => {
      if (gains) {
        try { gains.toA.disconnect(); } catch (err) { console.warn('removeSoundSource: toA.disconnect failed', err); }
        try { gains.toB.disconnect(); } catch (err) { console.warn('removeSoundSource: toB.disconnect failed', err); }
        try { gains.toThru.disconnect(); } catch (err) { console.warn('removeSoundSource: toThru.disconnect failed', err); }
      }
      try { node?.stop(); } catch (err) { console.warn('removeSoundSource: node.stop failed', err); }
      try { node?.dispose(); } catch (err) { console.warn('removeSoundSource: node.dispose failed', err); }
      this.removeSourceTimers.delete(sourceId);
    };

    if (this.ctx && gains) {
      const now = this.ctx.currentTime;
      gains.toA.gain.cancelScheduledValues(now);
      gains.toB.gain.cancelScheduledValues(now);
      gains.toThru.gain.cancelScheduledValues(now);
      gains.toA.gain.setValueAtTime(gains.toA.gain.value, now);
      gains.toB.gain.setValueAtTime(gains.toB.gain.value, now);
      gains.toThru.gain.setValueAtTime(gains.toThru.gain.value, now);
      gains.toA.gain.linearRampToValueAtTime(0.0, now + 0.003);
      gains.toB.gain.linearRampToValueAtTime(0.0, now + 0.003);
      gains.toThru.gain.linearRampToValueAtTime(0.0, now + 0.003);

      const timer = setTimeout(cleanup, 5);
      this.removeSourceTimers.set(sourceId, timer);
    } else {
      cleanup();
    }

    if (this.channelStripState.instances) {
      delete this.channelStripState.instances[sourceId];
    }
    this.sources.delete(sourceId);
    this.sourceRouteGains.delete(sourceId as SoundSourceId);
    delete this.sourceRoutes[sourceId as SoundSourceId];
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isInitialized = false;
    this.playbackRevision++;

    if (this.hardCutPurgeTimer !== null) {
      clearTimeout(this.hardCutPurgeTimer);
      this.hardCutPurgeTimer = null;
    }

    // Cancel any pending removeSoundSource callbacks so destroyed nodes are not
    // touched after dispose() has already released the graph.
    for (const timer of this.removeSourceTimers.values()) {
      clearTimeout(timer);
    }
    this.removeSourceTimers.clear();

    // A failed node cleanup must not leave the remaining sources or context running.
    const modules = new Set([
      this.dualLfo, this.adsr, ...this.sources.values(),
      this.gainModule, this.drive, this.filter,
      this.eq, this.delay, this.reverb, this.lfoRackModule,
      ...this.effectModules.values(), this.effectChainA, this.effectChainB
    ]);
    for (const module of modules) {
      try { module?.dispose(); } catch (err) { /* Continue releasing the rest of the graph. */ console.warn('AudioEngine.dispose: module dispose failed', err); }
    }
    this.sources.clear();
    this.effectModules.clear();
    this.effectModuleParams.clear();

    const routingNodes = [...this.sourceRouteGains.values()].flatMap(gains => [
      gains.toA, gains.toB, gains.toThru
    ]);
    const nodes = [
      ...routingNodes, this.panner, this.laneBusA, this.laneBusB,
      this.busGainA, this.busGainB, this.thruBus, this.busMixer,
      this.masterCutGain, this.masterLimiter, this.masterVolumeGain
    ];
    for (const node of nodes) {
      try { node?.disconnect(); } catch (err) { /* Continue releasing the rest of the graph. */ console.warn('AudioEngine.dispose: node disconnect failed', err); }
    }
    this.sourceRouteGains.clear();

    try {
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
    } catch (err) { /* The context may already be closing. */ console.warn('AudioEngine.dispose: ctx.close failed', err); }

    // Release module-level AudioBuffer caches so engine recreation does not
    // leak decoded sample memory across AudioContext lifetime boundaries.
    try { clearNoiseCache(); } catch (err) { console.warn('AudioEngine.dispose: clearNoiseCache failed', err); }
    try { clearAmbientSoundscapeCache(); } catch (err) { console.warn('AudioEngine.dispose: clearAmbientSoundscapeCache failed', err); }
    try { clearGranularSampleCache(); } catch (err) { console.warn('AudioEngine.dispose: clearGranularSampleCache failed', err); }
    try { clearCueSampleCache(); } catch (err) { console.warn('AudioEngine.dispose: clearCueSampleCache failed', err); }
  }
}
