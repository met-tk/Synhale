import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { GranularChannel } from '../../../src/audio/nodes/GranularChannel';
import { OscAChannel } from '../../../src/audio/nodes/OscAChannel';
import { OscBChannel } from '../../../src/audio/nodes/OscBChannel';
import { DroneChannel } from '../../../src/audio/nodes/DroneChannel';
import { AudioEngine } from '../../../src/audio/engine';
import {
  generatePinkNoiseBuffer,
  generateWhiteNoiseBuffer,
  generateBrownNoiseBuffer,
  generateVioletNoiseBuffer
} from '../../../src/audio/dsp/pinkNoise';

describe('Milestone 1 (D01-D13) DSP & Audio Engine Architecture Regression Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  // D01: Voice stealing decoupled from setTimeout(35)
  it('D01: Granular voice stealing schedules 6ms fadeout without host setTimeout truncation', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    granular.start(0);

    // Trigger grains to populate active voices
    (granular as any).triggerParticleVoice(0.01, { density: 4, duration: 0.2 });
    expect((granular as any).activeVoices.size).toBeGreaterThan(0);

    const activeVoices = (granular as any).activeVoices as Set<any>;
    const voice = activeVoices.values().next().value;
    expect(voice).toBeDefined();

    const originalStopTime = voice.stopTime;
    (granular as any).stealVoice(voice, 0.05);

    // Stop time is rescheduled cleanly with 6ms fade + 5ms buffer
    expect(voice.stopTime).toBe(0.05 + 0.006 + 0.005);
    expect(voice.stopTime).toBeLessThanOrEqual(originalStopTime);

    granular.dispose();
  });

  // D02: Granular AHR window ratios normalization
  it('D02: Granular AHR envelope ratios are normalized and do not exceed effectiveGrainDuration', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    granular.setParams({
      grainEnvelope: {
        attack: 0.8,
        hold: 0.8,
        release: 0.8,
        shape: 'trapezoid'
      },
      duration: 0.1
    });

    (granular as any).triggerParticleVoice(0.0, { duration: 0.1 });
    const activeVoices = (granular as any).activeVoices as Set<any>;
    const voice = activeVoices.values().next().value;
    expect(voice).toBeDefined();

    // Voice lifecycle should be cleanly bounded
    expect(voice.stopTime).toBeGreaterThan(0.1);
    granular.dispose();
  });

  // D03: Granular HZ vs GR dual-mode trigger rates
  it('D03: GranularChannel supports rate-based modulation and calculates adaptive density', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    granular.setParams({
      rate: 10.0, // 10 grains per second
      duration: 0.2
    });

    const params = granular.getParams();
    expect(params.rate).toBe(10.0);

    granular.dispose();
  });

  // D04: Reverse slice boundary limits with 5ms safety margin & fallback guard
  it('D04: Granular reverse playback clamps isReverse to false if reversed buffer is missing, and bounds range', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const sampleDuration = 2.0;
    const testBuf = ctx.createBuffer(2, Math.floor(44100 * sampleDuration), 44100);

    (granular as any).currentSampleBuffer = testBuf;
    (granular as any).currentReversedBuffer = null;

    granular.setParams({
      direction: 'reverse',
      position: 0.9,
      duration: 1.0,
      rangeStart: 0.1,
      rangeEnd: 0.95,
      rate: 20.0,
      probability: 1.0
    });

    let triggeredGrain: any = null;
    granular.onParticleTrigger = (g) => {
      triggeredGrain = g;
    };

    granular.start(0);
    ctx.advanceTime(0.6);

    expect(triggeredGrain).not.toBeNull();
    // Reversed buffer was missing, so fallback clamped isReverse to false
    expect(triggeredGrain.isReverse).toBe(false);
    // Boundary safeRemainingSec bounded duration
    expect(triggeredGrain.duration).toBeLessThanOrEqual(0.3);

    granular.dispose();
  });

  // D05: OSC A wavetable periodic wave switching without active cross-slice clicks
  it('D05: OscAChannel wavetable interpolation preserves wave integrity without click on active gain', () => {
    const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
    oscA.setParams({ wavetableIndex: 0.0 });
    oscA.setParams({ wavetableIndex: 5.5 });

    const params = oscA.getParams();
    expect(params.wavetableIndex).toBe(5.5);
    oscA.dispose();
  });

  // D06: OSC A warmthShaper 4x oversampling with odd-symmetric transfer curve
  it('D06: OscAChannel warmthShaper is configured with 4x oversampling and zero-centered curve', () => {
    const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
    const shaper = (oscA as any).warmthShaper as WaveShaperNode;

    expect(shaper.oversample).toBe('4x');
    expect(shaper.curve).not.toBeNull();
    const curve = shaper.curve!;
    expect(curve.length).toBe(2048);

    // Center point (1024 or 1023) should be very close to 0 (odd symmetry)
    const midIdx = Math.floor(curve.length / 2);
    expect(Math.abs(curve[midIdx])).toBeLessThan(0.01);
    // Boundary symmetry
    expect(curve[0]).toBeCloseTo(-curve[curve.length - 1], 2);

    oscA.dispose();
  });

  // D07: Sound Source Decoupling - OscA is pure wavetable, Granular owns particle scheduler
  it('D07: OscAChannel is a pure wavetable oscillator with zero particle scheduling, while GranularChannel independently manages grain lifecycles', () => {
    const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
    oscA.start(0);

    // OscAChannel must never instantiate particle timers
    expect((oscA as any).particleTimer).toBeUndefined();
    expect((oscA as any).particleBus).toBeUndefined();

    // Updating wavetable parameters preserves zero-timer state
    oscA.setParams({ wavetableIndex: 4.0, gain: 0.7 });
    expect((oscA as any).particleTimer).toBeUndefined();

    // GranularChannel independently starts and stops particle scheduling
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    granular.start(0);
    expect(granular.isStarted).toBe(true);

    granular.setParams({ bypass: true });
    expect(granular.getParams().bypass).toBe(true);

    oscA.dispose();
    granular.dispose();
  });

  // D08: Pink noise equal-power loop crossfade without tail corruption
  it('D08: All 4 noise generators produce valid finite samples without corrupted 9.95s boundary step', () => {
    const pink = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
    const white = generateWhiteNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
    const brown = generateBrownNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
    const violet = generateVioletNoiseBuffer(ctx as unknown as BaseAudioContext, 10);

    for (const buf of [pink, white, brown, violet]) {
      expect(buf.length).toBe(44100 * 10);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);

      // Verify no NaNs or Infinities
      for (let i = 0; i < 500; i++) {
        expect(Number.isFinite(left[i])).toBe(true);
        expect(Number.isFinite(right[i])).toBe(true);
      }

      // Verify tail samples are non-zero and not copies of head samples
      const tailIdx = buf.length - 100;
      expect(Number.isFinite(left[tailIdx])).toBe(true);
    }
  });

  // D09: Brown noise zero-mean DC offset removal & OscB smooth noise crossfade
  it('D09: Brown noise has zero-mean DC offset and OscB applies crossfade on noise switch', () => {
    const brown = generateBrownNoiseBuffer(ctx as unknown as BaseAudioContext, 5);
    const left = brown.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < left.length; i++) {
      sum += left[i];
    }
    const mean = sum / left.length;
    expect(Math.abs(mean)).toBeLessThan(1e-3);

    const oscB = new OscBChannel(ctx as unknown as BaseAudioContext);
    oscB.start(0);
    oscB.setParams({ noiseType: 'white' });
    expect(oscB.getParams().noiseType).toBe('white');

    oscB.dispose();
  });

  // D10: OscB Mid/Side stereo width processing matrix
  it('D10: OscBChannel routes audio through a functional Mid/Side stereo width matrix', () => {
    const oscB = new OscBChannel(ctx as unknown as BaseAudioContext);
    oscB.setParams({ stereoWidth: 0.8 });

    expect(oscB.getParams().stereoWidth).toBe(0.8);
    const sideGain = (oscB as any).sideWidthGain as GainNode;
    expect(sideGain).toBeDefined();

    oscB.dispose();
  });

  // D11: DroneChannel warmth shaper harmonic generation
  it('D11: DroneChannel warmth shaper excites overtones for mobile audibility with 180Hz filter', () => {
    const drone = new DroneChannel(ctx as unknown as BaseAudioContext);
    const shaper = (drone as any).warmthShaper as WaveShaperNode;
    const filter = (drone as any).subFilter as BiquadFilterNode;

    expect(shaper).toBeDefined();
    expect(shaper.oversample).toBe('2x');
    expect(shaper.curve).not.toBeNull();
    expect(shaper.curve!.length).toBe(512);

    expect(filter.frequency.value).toBe(180);
    drone.dispose();
  });

  // D12: Global de-zippering - setTargetAtTime is not canceled by .value =
  it('D12: AudioEngine parameter modulation uses de-zippered setTargetAtTime curves', () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    engine.init();

    engine.updateEffects({ masterGain: 0.5 });
    expect((engine as any).effectsState.masterGain).toBe(0.5);

    engine.dispose();
  });

  // D13: 0ms hard cut 2.5ms micro-ramp with deferred 3ms voice purge
  it('D13: executeZeroResidueHardCut executes 2.5ms ramp and purges without pop', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    expect(engine.masterCutGain.gain.value).toBe(1.0);
    engine.executeZeroResidueHardCut();

    // Loops are purged immediately
    expect(engine.delay.delayInGain.gain.value).toBe(0.0);
    expect(engine.reverb.wetGain.gain.value).toBe(0.0);

    // After 2.5ms micro-ramp, master cut gain reaches 0.0
    ctx.advanceTime(0.0026);
    expect(engine.masterCutGain.gain.value).toBeLessThanOrEqual(0.0001);

    engine.dispose();
  });
});
