/**
 * Synhale 2 - GranularChannel (Phase Plant-Grade Hybrid Grain Cloud Synthesizer)
 * 
 * Comprehensive standalone AudioSourceNode generating algorithmic, meditative grain clouds:
 * - Dual Engine: Real Acoustic Sample Buffer Slicing (Handpan, Tibetan Bowl, Water Droplet, etc.)
 *   + 24 Harmonic PeriodicWave Wavetable Synthesis fallback
 * - Phase Plant Upper Row (Mother Physics):
 *   * Level, Semi (-24..+24), Cent (-100..+100), Harmonic (x0.25..x8.0), Shift (-200..+200Hz),
 *   * Phase (0..360°), Phase Jitter, Direction (Forward / Reverse / Ping-Pong)
 * - Phase Plant Lower Row (Micro Grain Wander):
 *   * Position (0..1), Timing Jitter, Pitch Jitter, Level Jitter, Pan Scatter, Reverse %
 * - Phase Plant Grain Envelope: Microsecond Attack-Hold-Release window shaping
 * - Voice Stealing & Dynamic Headroom with 0ms zero-residue hard-cut safety
 * - Real-time physical grain telemetry for Phase Plant Scope visualization
 * 
 * Strict industrial aesthetics: zero emoji, precision acoustic parameters.
 */

import {
  AudioSourceNode,
  GranularParams,
  DEFAULT_GRANULAR_PARAMS,
  ParticleParams,
  DEFAULT_PARTICLE_PARAMS
} from '../../types/audio';
import { WAVETABLE_DEFINITIONS } from '../dsp/wavetableData';
import { sanitizeParameterPatch } from '../dsp/parameterSafety';
import { getRandomScaleNote, getScaleFrequency, SCALES } from '../dsp/scaleQuantizer';
import {
  GRANULAR_SAMPLE_PRESETS,
  loadGranularSampleBuffer,
  getReversedAudioBuffer
} from './GranularSampleLibrary';

// Musical note division → numeric divisor (whole note = 1, quarter = 4, 16th = 16, etc.)
const SYNC_RATE_DIVISORS: Record<string, number> = {
  '1/1': 1, '1/2': 2, '1/4': 4, '1/8': 8, '1/16': 16, '1/32': 32, '1/64': 64
};

export interface ActiveParticleVoice {
  osc?: OscillatorNode;
  bufferSource?: AudioBufferSourceNode;
  vcaGain: GainNode;
  panner: StereoPannerNode;
  stopTime: number;
}

export interface ParticleVisualGrain {
  id: number;
  freq: number;
  pan: number;
  startTime: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  peakGain: number;
  totalStopTime: number;
  sampleOffset?: number; // 0..1 relative position on source sample
  isReverse?: boolean;   // true if grain plays in reverse
  duration?: number;     // grain duration in seconds
  playbackRate?: number; // playback rate multiplier
  grainSpanNorm?: number;// normalized slice span across sample
}

export class GranularChannel implements AudioSourceNode {
  public readonly id = 'granular';
  public readonly outputNode: GainNode;

  private ctx: BaseAudioContext;
  private channelGain: GainNode;
  private channelPanner: StereoPannerNode;
  private activeOutGain: GainNode;

  // Grain Voice Scheduler & Bus
  private particleBus: GainNode;
  private activeVoices = new Set<ActiveParticleVoice>();
  private particleTimer: ReturnType<typeof setInterval> | null = null;
  private nextParticleTime = 0;
  private arpIndex = 0;
  private grainIdCounter = 0;
  private pingPongState = false; // toggle for ping-pong grain direction
  private visualGrains: ParticleVisualGrain[] = [];

  // Active Decoded Sample Buffers
  private currentSampleBuffer: AudioBuffer | null = null;
  private currentReversedBuffer: AudioBuffer | null = null;

  // 24 Harmonic Periodic Waves from Wavetable Definitions
  private waves: PeriodicWave[] = [];

  // Internal Configuration & Parameters
  private currentParams: GranularParams = { ...DEFAULT_GRANULAR_PARAMS }; // 当前粒子引擎物理参数状态


  public isStarted = false;
  public isDisposed = false;
  private isPurged = false;

  public onParticleTrigger?: (grain: ParticleVisualGrain) => void;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;

    this.outputNode = ctx.createGain();
    this.channelGain = ctx.createGain();
    this.channelPanner = ctx.createStereoPanner();
    this.activeOutGain = ctx.createGain();
    this.particleBus = ctx.createGain();

    // Compile periodic waves for rich harmonic grain timbre fallback
    this.initPeriodicWaves();

    // Initial bus gains
    this.channelGain.gain.value = this.currentParams.gain ?? 0.75;
    this.channelPanner.pan.value = this.currentParams.pan ?? 0.0;
    this.activeOutGain.gain.value = 1.0;
    this.particleBus.gain.value = 0.90;

    // Audio Graph:
    // particleBus -> channelGain -> channelPanner -> activeOutGain -> outputNode
    this.particleBus.connect(this.channelGain);
    this.channelGain.connect(this.channelPanner);
    this.channelPanner.connect(this.activeOutGain);
    this.activeOutGain.connect(this.outputNode);

    // Asynchronously load initial acoustic sample (Handpan by default)
    this.loadSampleSource(this.currentParams.sampleId || 'handpan');
  }

  // 编译24组周期波，为纯波表粒子合成模式提供谐波基底
  private initPeriodicWaves(): void {
    try {
      this.waves = WAVETABLE_DEFINITIONS.map(def => {
        return this.ctx.createPeriodicWave(def.real, def.imag, {
          disableNormalization: false
        });
      });
    } catch {
      this.waves = [];
    }
  }

  // 异步加载声学采样音频缓冲，并生成镜像倒放缓冲池供反向微粒读取
  private async loadSampleSource(sampleId: string): Promise<void> {
    if (sampleId === 'celestialWavetable') {
      this.currentSampleBuffer = null;
      this.currentReversedBuffer = null;
      return;
    }

    try {
      const buffer = await loadGranularSampleBuffer(this.ctx, sampleId);
      if (buffer && !this.isDisposed && this.currentParams.sampleId === sampleId) {
        this.currentSampleBuffer = buffer;
        try {
          this.currentReversedBuffer = getReversedAudioBuffer(this.ctx, buffer);
        } catch {
          this.currentReversedBuffer = null;
        }
      }
    } catch {
      // 优雅降级回波表合成模式
      this.currentSampleBuffer = null;
      this.currentReversedBuffer = null;
    }
  }

  // 启动粒子通道：初始化下次发声时间戳并启动调度定时器
  start(when = 0): void {
    if (this.isDisposed || this.isStarted) return;
    this.isStarted = true;
    this.nextParticleTime = Math.max(this.ctx.currentTime, when);

    if (!this.currentParams.bypass) {
      this.startParticleScheduler();
    }
  }

  // 停止粒子通道：关闭调度循环并立即硬切所有在播粒子语音
  stop(_when = 0): void {
    if (this.isDisposed || !this.isStarted) return;
    this.isStarted = false;
    this.stopParticleScheduler();
    this.purgeActiveVoices();
  }

  // 动态更新粒子物理参数：包含采样切换、增益声像平滑过渡、硬件级旁路切换及微粒包络深度合并
  setParams(params: Partial<GranularParams>): void {
    if (this.isDisposed) return;
    params = sanitizeParameterPatch(params);
    const now = this.ctx.currentTime;

    // Sample selection
    if (params.sampleId !== undefined && params.sampleId !== this.currentParams.sampleId) {
      this.currentParams.sampleId = params.sampleId;
      this.loadSampleSource(params.sampleId);
    }

    // Gain adjustment
    if (params.gain !== undefined) {
      params.gain = Math.max(0, Math.min(1, params.gain));
      this.currentParams.gain = params.gain;
      this.channelGain.gain.setTargetAtTime(this.currentParams.gain, now, 0.015);
    }

    // Pan adjustment
    if (params.pan !== undefined) {
      params.pan = Math.max(-1, Math.min(1, params.pan));
      this.currentParams.pan = params.pan;
      this.channelPanner.pan.setTargetAtTime(this.currentParams.pan, now, 0.02);
    }

    // Base Frequency
    if (params.baseFreq !== undefined) {
      params.baseFreq = Math.max(20, Math.min(2000, params.baseFreq));
      this.currentParams.baseFreq = params.baseFreq;
    }

    // Bypass switching (5ms anti-click crossfade)
    if (params.bypass !== undefined && params.bypass !== this.currentParams.bypass) {
      this.currentParams.bypass = params.bypass;
      if (this.currentParams.bypass) {
        this.activeOutGain.gain.setTargetAtTime(0.0, now, 0.005);
        this.stopParticleScheduler();
        this.purgeActiveVoices();
      } else {
        this.activeOutGain.gain.setTargetAtTime(1.0, now, 0.005);
        if (this.isStarted) {
          this.nextParticleTime = now + 0.02;
          this.startParticleScheduler();
        }
      }
    }

    // Duration defensive normalization & clamping (seconds)
    if (params.duration !== undefined) {
      const validDur = Number.isFinite(params.duration) ? params.duration : 0.245;
      const durSec = validDur > 15.0 ? validDur / 1000.0 : validDur;
      params.duration = Number(Math.max(0.02, Math.min(10.0, durSec)).toFixed(3));
    }

    // Deeply merge grainEnvelope to prevent partial updates from dropping parameters
    const nextEnvelope = params.grainEnvelope
      ? {
          ...(this.currentParams.grainEnvelope ?? DEFAULT_GRANULAR_PARAMS.grainEnvelope),
          ...params.grainEnvelope
        }
      : this.currentParams.grainEnvelope;

    // Merge all remaining Phase Plant & grain parameters
    this.currentParams = {
      ...this.currentParams,
      ...(params as any),
      grainEnvelope: nextEnvelope
    };
  }

  // 获取当前粒子通道参数快照
  getParams(): GranularParams {
    return { ...this.currentParams, grainEnvelope: { ...this.currentParams.grainEnvelope } };
  }

  // 将粒子通道主音频输出节点连接至目标节点
  public connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  // 过滤并获取当前 Web Audio 时间轴上正在播放的粒子物理遥测数据（用于示波器 1:1 动态呈现）
  public getActiveVisualGrains(): ParticleVisualGrain[] {
    const now = this.ctx.currentTime;
    return this.visualGrains.filter(g => g.totalStopTime > now);
  }

  // 获取当前已载入采样的元数据（采样率、声道数、时长、采样名称）
  public getSampleMetadata(): { sampleRate: number; channels: number; duration: number; name: string } {
    const samplePreset = GRANULAR_SAMPLE_PRESETS[this.currentParams.sampleId || 'handpan'];
    const buf = this.currentSampleBuffer;
    return {
      sampleRate: buf?.sampleRate ?? 44100,
      channels: buf?.numberOfChannels ?? 2,
      duration: buf?.duration ?? samplePreset?.duration ?? 3.6,
      name: samplePreset?.name ?? 'Handpan Single Note'
    };
  }

  // 启动 40ms 超前调度定时器，驱动粒子发射与时序生成
  private startParticleScheduler(): void {
    if (this.particleTimer !== null || this.isDisposed || this.isPurged || !this.isStarted) return;
    this.nextParticleTime = this.ctx.currentTime + 0.01;
    this.scheduleParticles(); // 立刻执行首次调度，消除 40ms 初始启动延迟

    this.particleTimer = setInterval(() => {
      this.scheduleParticles();
    }, 40);
  }

  // 关闭粒子调度定时器，停止生成新微粒
  private stopParticleScheduler(): void {
    if (this.particleTimer !== null) {
      clearInterval(this.particleTimer);
      this.particleTimer = null;
    }
  }

  // 核心微粒调度引擎：在 120ms Lookahead 时间窗口内计算发射概率、时序抖动并调度微粒发声
  private scheduleParticles(): void {
    if (this.isDisposed || this.isPurged || !this.isStarted || this.currentParams.bypass) return;

    const lookAhead = 0.12; // 120ms lookahead
    const particleCfg: ParticleParams = {
      ...DEFAULT_PARTICLE_PARAMS,
      ...this.currentParams
    };

    // Tempo Sync: when enabled, derive trigger rate from BPM and musical note division
    let effectiveRate: number;
    if (this.currentParams.sync) {
      const bpm = Math.max(20, Math.min(300, this.currentParams.bpm ?? 120));
      const wholeNoteSec = (60.0 / bpm) * 4.0; // duration of one whole note in seconds
      const divisor = SYNC_RATE_DIVISORS[this.currentParams.syncRate ?? '1/16'] ?? 16;
      const syncIntervalSec = wholeNoteSec / divisor; // time between sync-quantized grain triggers
      effectiveRate = Math.max(0.05, Math.min(200.0, 1.0 / syncIntervalSec));
    } else {
      const duration = Math.max(0.01, particleCfg.duration ?? 0.245);
      // D03: HZ 与 GR 双模态自洽性修复：若显式设定了 rate，以 Rate(Hz) 优先，并自洽联动反推并发粒子密度
      if (this.currentParams.rate !== undefined && this.currentParams.rate > 0.05) {
        effectiveRate = Math.max(0.05, Math.min(200.0, this.currentParams.rate));
      } else {
        const density = Math.max(0.5, Math.min(32, particleCfg.density ?? 4.0));
        effectiveRate = Math.max(0.05, Math.min(200.0, density / duration));
      }
    }
    const interval = 1.0 / effectiveRate;

    const now = this.ctx.currentTime;
    const duration = Math.max(0.01, particleCfg.duration ?? 0.245);
    const calculatedDensity = Math.round(effectiveRate * duration);
    const maxDensity = Math.max(1, Math.min(32, Math.max(particleCfg.density ?? 6, calculatedDensity)));

    // Dynamic bus headroom balancing with calibrated non-coherent power compensation
    const busGain = Math.min(1.0, 2.2 / Math.sqrt(Math.max(1, maxDensity)));
    this.particleBus.gain.setTargetAtTime(busGain, now, 0.02);

    // Background tab wake-up catch-up storm guard: prevent burst allocations when returning from background
    if (this.nextParticleTime < now) {
      this.nextParticleTime = now;
    }

    let cycleCount = 0;
    while (this.nextParticleTime < now + lookAhead && cycleCount < 32) {
      cycleCount++;
      const triggerTime = this.nextParticleTime;
      const prob = particleCfg.probability ?? 0.85;
      if (Math.random() <= prob) {
        const spray = Math.max(1, Math.min(4, Math.round(particleCfg.spray ?? 1)));
        for (let s = 0; s < spray; s++) {
          if (this.activeVoices.size >= maxDensity) {
            const oldestVoice = this.activeVoices.values().next().value;
            if (oldestVoice) {
              this.stealVoice(oldestVoice, triggerTime);
            }
          }
          const burstOffset = s === 0 ? 0 : Math.random() * 0.015;
          this.triggerParticleVoice(triggerTime + burstOffset, particleCfg);
        }
      }
      // Timing jitter: randomized humanized groove (Phase Plant TIMING knob)
      const jitterFactor = (Math.random() * 2 - 1) * (this.currentParams.timingJitter ?? 0.35);
      this.nextParticleTime += interval * Math.max(0.15, 1.0 + jitterFactor);
    }

    // Clean up finished voices
    for (const voice of this.activeVoices) {
      if (voice.stopTime < now) {
        try {
          voice.osc?.disconnect();
          voice.bufferSource?.disconnect();
          voice.vcaGain.disconnect();
          voice.panner.disconnect();
        } catch {
          // Safeguard disconnect
        }
        this.activeVoices.delete(voice);
      }
    }

    // Clean up visual grains snapshot
    this.visualGrains = this.visualGrains.filter(g => g.totalStopTime > now);
  }

  // 语音抢占算法：对超出并发上限的最老粒子执行 6ms 线性无缝微淡出至 0.0，彻底消除截断爆音 (D01)
  private stealVoice(voice: ActiveParticleVoice, stealTime: number): void {
    try {
      const now = this.ctx.currentTime;
      const effectiveStealTime = Math.max(now, stealTime);
      const fadeDuration = 0.006; // 6ms clean anti-pop micro-ramp
      voice.vcaGain.gain.cancelScheduledValues(effectiveStealTime);
      voice.vcaGain.gain.setValueAtTime(Math.max(0.0001, voice.vcaGain.gain.value), effectiveStealTime);
      voice.vcaGain.gain.linearRampToValueAtTime(0.0, effectiveStealTime + fadeDuration);
      const hardStopTime = effectiveStealTime + fadeDuration + 0.005;
      try {
        voice.osc?.stop(hardStopTime);
      } catch {}
      try {
        voice.bufferSource?.stop(hardStopTime);
      } catch {}
      voice.stopTime = hardStopTime; // 更新生命周期，交由 scheduleParticles 定时自然清理，移除宿主 setTimeout
    } catch {
      // Audio scheduling safeguard
    }
  }

  // 触发单个物理微粒：融合调式量化、双引擎采样/波表合成、包络塑形与立体声全景
  private triggerParticleVoice(startTime: number, cfg: ParticleParams): void {
    if (this.isDisposed) return;
    try {
      const ctx = this.ctx;
      const vca = ctx.createGain();
      const panner = ctx.createStereoPanner();

      // Pitch calculation (Scale Quantization + Semi + Cent + Harmonic + Shift)
      const scaleType = this.currentParams.scale ?? cfg.scale ?? 'pentatonic';
      const octaveRange = this.currentParams.octaveRange ?? cfg.octaveRange ?? 2;
      const samplePreset = GRANULAR_SAMPLE_PRESETS[this.currentParams.sampleId || 'handpan'];
      const sampleRootFreq = samplePreset?.baseFreq ?? this.currentParams.baseFreq ?? 216;
      const baseFreq = sampleRootFreq; // 调式参考基准频率与采样物理基准频率严格对齐，消除走调偏置
      let rawFreq: number;

      const scaleInfo = SCALES[scaleType] || SCALES.pentatonic;
      const scaleDegreeCount = scaleInfo.intervals.length;
      const totalDegrees = Math.max(1, scaleDegreeCount * octaveRange);

      if (this.currentParams.mode === 'arp') {
        this.arpIndex = (this.arpIndex + 1) % totalDegrees;
        rawFreq = getScaleFrequency(baseFreq, scaleType, this.arpIndex);
      } else if (this.currentParams.mode === 'burst') {
        const step = Math.floor(Math.random() * totalDegrees);
        rawFreq = getScaleFrequency(baseFreq, scaleType, step);
      } else {
        rawFreq = getRandomScaleNote(baseFreq, scaleType, octaveRange);
      }

      // Microtonal Pitch Jitter (Phase Plant PITCH knob: 0..1.0 semitone or 0..50 cents)
      const pitchJitterVal = this.currentParams.pitchJitter ?? cfg.pitchJitter ?? 0.01;
      const pitchJitterCents = (Math.random() * 2 - 1) * (pitchJitterVal <= 1.0 ? pitchJitterVal * 100 : Math.min(50, pitchJitterVal));
      const octave = Math.max(-4, Math.min(4, Math.round(this.currentParams.octave ?? 0)));
      const semi = this.currentParams.semi ?? 0;
      const cent = this.currentParams.cent ?? 0;
      const harmonic = Math.max(0.125, Math.min(16.0, this.currentParams.harmonic ?? 1.0));
      const shift = this.currentParams.shift ?? 0;
      const keyTrack = Math.max(0.0, Math.min(1.0, this.currentParams.keyTrack ?? 1.0));

      // Key tracking interpolation between baseFreq and scale rawFreq
      const trackingFreq = baseFreq + (rawFreq - baseFreq) * keyTrack;

      // Compound pitch multiplier (Octave * 1200 + Semi * 100 + Cent + Jitter)
      const totalCents = octave * 1200 + semi * 100 + cent + pitchJitterCents;
      const pitchMultiplier = harmonic * Math.pow(2, totalCents / 1200);
      const effectiveFreq = Math.max(20, Math.min(16000, (trackingFreq * pitchMultiplier) + shift));

      // Direction determination
      const dirMode = this.currentParams.direction ?? 'forward';
      const reverseChance = this.currentParams.reverseChance ?? 0.12;
      let isReverse = false;

      if (dirMode === 'reverse') {
        isReverse = true;
      } else if (dirMode === 'pingpong') {
        this.pingPongState = !this.pingPongState;
        isReverse = this.pingPongState;
      } else {
        isReverse = Math.random() < reverseChance;
      }

      // Check if real sample playback is available
      const hasReversedBuffer = Boolean(this.currentReversedBuffer && this.currentReversedBuffer.duration > 0.05);
      if (!hasReversedBuffer) {
        isReverse = false;
      }

      const targetBuffer = isReverse && this.currentReversedBuffer
        ? this.currentReversedBuffer
        : this.currentSampleBuffer;

      // Phase Plant 第一性原理：粒子的播放速度与音调永远是固定的（1.0x 基准原速），纯粹由音高驱动
      const playbackRate = Math.max(0.05, Math.min(16.0, effectiveFreq / sampleRootFreq));
      const nominalDuration = Math.max(0.02, Math.min(10.0, cfg.duration ?? 0.245));

      let oscNode: OscillatorNode | undefined;
      let bufSourceNode: AudioBufferSourceNode | undefined;
      let sampleOffsetNorm = this.currentParams.position ?? 0.25;
      let grainSpanNorm = 0.05;
      let sampleOffsetSec = 0.0;
      let effectiveGrainDuration = nominalDuration;

      // Phase & Phase Jitter (Phase Plant PHASE 0° ±0°)
      const basePhaseDeg = this.currentParams.phase ?? 0;
      const phaseJitterDeg = (Math.random() * 2 - 1) * (this.currentParams.phaseJitter ?? 0);
      const effPhaseDeg = (basePhaseDeg + phaseJitterDeg + 3600) % 360;
      const wavePeriodSec = 1.0 / effectiveFreq;
      const phaseOffsetSec = (effPhaseDeg / 360.0) * wavePeriodSec;

      if (targetBuffer && targetBuffer.duration > 0.05) {
        // Mode A: High-Fidelity AudioBuffer Slice Playback
        // Position with Jitter & Range Cropping (Phase Plant Range & Position Wander)
        const rangeStart = Math.max(0.0, Math.min(0.95, this.currentParams.rangeStart ?? 0.0));
        const rangeEnd = Math.max(rangeStart + 0.02, Math.min(1.0, this.currentParams.rangeEnd ?? 1.0));
        const rangeSpan = Math.max(0.02, rangeEnd - rangeStart);

        // Position base + random jitter: 忠实以当前 Position 为基准起点
        const basePos = Math.max(rangeStart, Math.min(rangeEnd, this.currentParams.position ?? 0.25));
        const posJitter = (Math.random() * 2 - 1) * (this.currentParams.positionJitter ?? 0.0);
        sampleOffsetNorm = Math.max(rangeStart, Math.min(rangeEnd - 0.005, basePos + posJitter * rangeSpan));

        if (isReverse) {
          // Mirrored slice offset within reversed buffer
          const mirroredNorm = Math.max(0.0, Math.min(1.0 - 0.005, 1.0 - sampleOffsetNorm));
          sampleOffsetSec = Math.max(0.0, Math.min(targetBuffer.duration - 0.005, mirroredNorm * targetBuffer.duration + phaseOffsetSec));
        } else {
          sampleOffsetSec = Math.max(0.0, Math.min(targetBuffer.duration - 0.005, sampleOffsetNorm * targetBuffer.duration + phaseOffsetSec));
        }

        // Phase Plant 核心物理法则：【采样边界自适应包络约束】
        // Forward mode plays forward towards rangeEnd * duration
        // Reverse mode plays forward in the reversed buffer towards (1.0 - rangeStart) * duration
        const boundaryLimitSec = isReverse
          ? (1.0 - rangeStart) * targetBuffer.duration
          : rangeEnd * targetBuffer.duration;
        const remainingBufferSec = Math.max(0.005, boundaryLimitSec - sampleOffsetSec - 0.005);
        const maxPlayableOutputSec = remainingBufferSec / playbackRate;

        // 若切片靠近采样末尾导致剩余时间不足，包络生命周期自适应等比收拢，绝不在有声时撞到采样末端悬崖
        effectiveGrainDuration = Math.max(0.015, Math.min(nominalDuration, maxPlayableOutputSec));

        // 动态物理跨度：Grain Length (秒) * 播放速率 对应的采样物理跨度比例，随 Grain Length 动态延展
        const sampleSpanSec = effectiveGrainDuration * playbackRate;
        const rawGrainSpanNorm = Math.min(rangeSpan, Math.max(0.005, sampleSpanSec / targetBuffer.duration));
        grainSpanNorm = Math.max(0.005, Math.min(rawGrainSpanNorm, rangeEnd - sampleOffsetNorm));
      }

      // Micro Grain Envelope (Attack, Hold, Release) - 基于自适应收拢后的有效生命周期精准塑形
      const envCfg = this.currentParams.grainEnvelope ?? {
        attack: 0.10,
        hold: 0.45,
        release: 0.45,
        shape: 'trapezoid'
      };

      const inAtt = Math.max(0.001, envCfg.attack ?? 0.10);
      const inHold = Math.max(0.0, envCfg.hold ?? 0.45);
      const inRel = Math.max(0.001, envCfg.release ?? 0.45);
      const sumRatios = Math.max(0.001, inAtt + inHold + inRel);
      const normAtt = inAtt / sumRatios;
      const normRel = inRel / sumRatios;

      let rawAttack = Math.max(0.002, effectiveGrainDuration * normAtt);
      let rawRelease = Math.max(0.003, effectiveGrainDuration * normRel);
      if (rawAttack + rawRelease > effectiveGrainDuration - 0.001) {
        const scale = Math.max(0.1, (effectiveGrainDuration - 0.001) / (rawAttack + rawRelease));
        rawAttack *= scale;
        rawRelease *= scale;
      }
      const rawHold = Math.max(0.0, effectiveGrainDuration - rawAttack - rawRelease);

      // Reverse Swell: Invert attack and release when reversed to create iconic swelling reverse grains
      const attackTime = isReverse ? rawRelease : rawAttack;
      const releaseTime = isReverse ? rawAttack : rawRelease;
      const holdTime = rawHold;

      // Level with jitter (Phase Plant LEVEL Jitter)
      const levelJitter = this.currentParams.levelJitter ?? 0.0;
      const randomLevelMult = 1.0 - Math.random() * Math.max(0, Math.min(1, levelJitter)) * 0.85;
      const baseLevel = Math.max(0, Math.min(1, this.currentParams.level ?? 1.0));
      const peakGain = Math.max(0.0001, baseLevel * randomLevelMult * 0.96);

      // Phase Plant 纯粹窗函数平滑塑形：严格从零平滑升起，并在结束点以微斜坡彻底归零 (0.0000)，消除任何机械截断与噼啪声
      const envStartTime = startTime;
      const envPeakStartTime = envStartTime + attackTime;
      const envPeakEndTime = envPeakStartTime + holdTime;
      const envEndTime = envStartTime + effectiveGrainDuration;

      vca.gain.setValueAtTime(0.0, envStartTime);
      const startMicroRamp = Math.min(0.001, attackTime * 0.5);
      vca.gain.linearRampToValueAtTime(0.0001, envStartTime + startMicroRamp); // 无缝平滑起步锚点
      if (envCfg.shape === 'sine' || envCfg.shape === 'hann' || envCfg.shape === 'gaussian') {
        vca.gain.exponentialRampToValueAtTime(peakGain, envPeakStartTime);
      } else {
        vca.gain.linearRampToValueAtTime(peakGain, envPeakStartTime);
      }
      if (holdTime > 0.0005) {
        vca.gain.setValueAtTime(peakGain, envPeakEndTime);
      }

      // 释音阶段：平滑指数衰减，并在最后 2ms 严密线性归零至 0.0，杜绝任何直流跳变与爆音
      const declickRampTime = Math.min(0.003, Math.max(0.001, releaseTime * 0.2));
      const expRampTargetTime = Math.max(envPeakEndTime + 0.0005, envEndTime - declickRampTime);
      vca.gain.exponentialRampToValueAtTime(0.0001, expRampTargetTime);
      vca.gain.linearRampToValueAtTime(0.0, envEndTime);

      // totalStopTime 设定在 VCA 彻底绝对静音 15ms 之后，杜绝任何节点停止或断开时的电平突变
      const totalStopTime = envEndTime + 0.015;

      // Stereo Panner (Phase Plant PAN knob: ±100% random spread)
      const panSpread = this.currentParams.panJitter ?? this.currentParams.randomPan ?? cfg.randomPan ?? 1.0;
      const panAmount = (Math.random() * 2 - 1) * Math.max(0, Math.min(1.0, panSpread));
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panAmount)), startTime);

      // Routing
      vca.connect(panner);
      panner.connect(this.particleBus);

      if (targetBuffer && targetBuffer.duration > 0.05) {
        // Mode A: High-Fidelity AudioBuffer Slice Playback
        bufSourceNode = ctx.createBufferSource();
        bufSourceNode.buffer = targetBuffer;
        bufSourceNode.playbackRate.setValueAtTime(playbackRate, startTime);
        bufSourceNode.connect(vca);

        // Phase Plant 第一性原理：彻底切除硬截断参数 safeDuration，微粒发声与结束 100% 由 VCA 自适应包络自然接管
        bufSourceNode.start(startTime, sampleOffsetSec);
        bufSourceNode.stop(totalStopTime);
      } else {
        // Mode B: PeriodicWave Wavetable Synthesis Fallback
        oscNode = ctx.createOscillator();
        oscNode.frequency.setValueAtTime(effectiveFreq, startTime);

        const baseWT = Math.floor(this.currentParams.wavetableIndex ?? 0);
        const wtJitterRange = Math.max(0, Math.min(8, Math.round(cfg.wavetableJitter ?? 2)));
        const wtOffset = wtJitterRange > 0 ? Math.round((Math.random() * 2 - 1) * wtJitterRange) : 0;
        const wtIndex = Math.max(0, Math.min(23, baseWT + wtOffset));

        if (this.waves[wtIndex]) {
          oscNode.setPeriodicWave(this.waves[wtIndex]);
        } else if (this.waves[baseWT]) {
          oscNode.setPeriodicWave(this.waves[baseWT]);
        }

        oscNode.connect(vca);
        oscNode.start(startTime);
        oscNode.stop(totalStopTime);
      }

      const voiceRecord: ActiveParticleVoice = {
        osc: oscNode,
        bufferSource: bufSourceNode,
        vcaGain: vca,
        panner,
        stopTime: totalStopTime
      };

      this.activeVoices.add(voiceRecord);

      // Record visual telemetry for Phase Plant Scope
      this.grainIdCounter++;
      const visualGrain: ParticleVisualGrain = {
        id: this.grainIdCounter,
        freq: effectiveFreq,
        pan: panAmount,
        startTime,
        attack: attackTime,
        decay: attackTime + holdTime,
        sustain: 1.0,
        release: releaseTime,
        peakGain,
        totalStopTime,
        sampleOffset: sampleOffsetNorm,
        isReverse,
        duration: effectiveGrainDuration,
        playbackRate,
        grainSpanNorm
      };

      if (this.visualGrains.length >= 128) {
        this.visualGrains.shift();
      }
      this.visualGrains.push(visualGrain);
      this.onParticleTrigger?.(visualGrain);
    } catch {
      // Audio engine scheduling safeguard
    }
  }

  // 0ms 硬切所有当前在播语音节点，重置增益并断开连接，清空视觉微粒缓存
  private purgeActiveVoices(): void {
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      try {
        voice.vcaGain.gain.cancelScheduledValues(now);
        voice.vcaGain.gain.setValueAtTime(0.0, now);
        voice.osc?.stop(now);
        voice.bufferSource?.stop(now);
        voice.osc?.disconnect();
        voice.bufferSource?.disconnect();
        voice.vcaGain.disconnect();
        voice.panner.disconnect();
      } catch {
        // Disconnect safeguard
      }
    }
    this.activeVoices.clear();
    this.visualGrains = [];
  }

  // 统一音频源硬切接口：瞬间消音在播微粒，保障效果链重排零残留
  public purge(): void {
    if (this.isDisposed) return;
    this.isPurged = true;
    this.stopParticleScheduler();
    this.purgeActiveVoices();
  }

  // 统一音频源恢复接口：重置时间基准并重新拉起微粒调度循环
  public restore(): void {
    if (this.isDisposed) return;
    this.isPurged = false;
    if (this.isStarted && !this.currentParams.bypass) {
      this.nextParticleTime = this.ctx.currentTime + 0.01;
      this.startParticleScheduler();
    }
  }

  // 终极资源销毁：清理调度器、硬切语音并断开全部总线节点
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isStarted = false;

    this.stopParticleScheduler();
    this.purgeActiveVoices();

    try {
      this.channelGain.disconnect();
      this.channelPanner.disconnect();
      this.activeOutGain.disconnect();
      this.particleBus.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Node disconnection safeguard
    }
  }
}
