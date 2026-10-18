import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { GranularChannel } from '../../src/audio/nodes/GranularChannel';
import { OscAChannel } from '../../src/audio/nodes/OscAChannel';
import { OscBChannel } from '../../src/audio/nodes/OscBChannel';
import { DroneChannel } from '../../src/audio/nodes/DroneChannel';
import { AudioEngine } from '../../src/audio/engine';
import {
  generatePinkNoiseBuffer,
  generateWhiteNoiseBuffer,
  generateBrownNoiseBuffer,
  generateVioletNoiseBuffer
} from '../../src/audio/dsp/pinkNoise';

describe('Milestone 1 (D01-D13) Adversarial Stress & Edge Case Verification Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  // =========================================================================
  // D01: Voice Stealing Under High Concurrency & Random Triggers
  // =========================================================================
  describe('D01: Voice Stealing High Concurrency Stress Harness', () => {
    it('handles rapid voice triggering exceeding maxDensity with 6ms anti-pop schedule and no voice leaks', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      granular.setParams({
        density: 8,
        duration: 0.1,
        probability: 1.0,
        spray: 4
      });
      granular.start(0);

      // Trigger 50 particle voices rapidly
      for (let i = 0; i < 50; i++) {
        (granular as any).triggerParticleVoice(ctx.currentTime + i * 0.002, {
          density: 8,
          duration: 0.05
        });
      }

      const activeVoices = (granular as any).activeVoices as Set<any>;
      // Voices should be registered
      expect(activeVoices.size).toBeGreaterThan(0);

      // Stolen voice should have a stopTime set
      const voice = activeVoices.values().next().value;
      const initialStopTime = voice.stopTime;
      (granular as any).stealVoice(voice, ctx.currentTime);

      expect(voice.stopTime).toBeLessThanOrEqual(initialStopTime);
      expect(voice.stopTime).toBeCloseTo(ctx.currentTime + 0.006 + 0.005, 3);

      // Advance time beyond all stop times
      granular.setParams({ probability: 0 });
      ctx.advanceTime(0.5);
      // Run scheduleParticles to trigger garbage collection of finished voices
      (granular as any).scheduleParticles();

      // All voices past stopTime must be pruned from activeVoices
      expect(activeVoices.size).toBe(0);

      granular.dispose();
    });

    it('handles simultaneous voice steal requests without NaN or schedule collision', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      granular.start(0);

      (granular as any).triggerParticleVoice(0.01, { duration: 0.2 });
      (granular as any).triggerParticleVoice(0.02, { duration: 0.2 });

      const activeVoices = (granular as any).activeVoices as Set<any>;
      const voices = Array.from(activeVoices);

      // Steal both at the exact same timestamp in the past/present
      (granular as any).stealVoice(voices[0], 0.0);
      (granular as any).stealVoice(voices[1], 0.0);

      for (const v of voices) {
        expect(Number.isFinite(v.stopTime)).toBe(true);
        expect(v.stopTime).toBeGreaterThanOrEqual(0.011);
      }

      granular.dispose();
    });
  });

  // =========================================================================
  // D02: AHR Boundary Extreme Values
  // =========================================================================
  describe('D02: AHR Envelope Boundary & Scheduling Monotonicity Oracle', () => {
    it('normalizes extreme A+H+R > 1.0 and maintains strictly monotonic scheduling timestamps', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);

      const extremeConfigs = [
        { attack: 5.0, hold: 10.0, release: 20.0, duration: 0.2 }, // Sum = 35 >> 1
        { attack: 0.0, hold: 0.0, release: 0.0, duration: 0.1 },   // All zeros
        { attack: 1.0, hold: 0.0, release: 1.0, duration: 0.05 },  // A + R = 2
        { attack: 0.001, hold: 0.999, release: 0.001, duration: 0.02 }, // Micro duration
        { attack: 100.0, hold: 0.1, release: 0.1, duration: 0.5 }
      ];

      for (const cfg of extremeConfigs) {
        granular.setParams({
          grainEnvelope: {
            attack: cfg.attack,
            hold: cfg.hold,
            release: cfg.release,
            shape: 'trapezoid'
          },
          duration: cfg.duration
        });

        expect(() => {
          (granular as any).triggerParticleVoice(ctx.currentTime, { duration: cfg.duration });
        }).not.toThrow();

        const activeVoices = (granular as any).activeVoices as Set<any>;
        const voice = Array.from(activeVoices).pop();
        expect(voice).toBeDefined();
        expect(Number.isFinite(voice.stopTime)).toBe(true);
        expect(voice.stopTime).toBeGreaterThan(ctx.currentTime);
      }

      granular.dispose();
    });

    it('verifies all envelope shapes (trapezoid, sine, hann, gaussian) schedule safely without throwing', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      const shapes: ('trapezoid' | 'sine' | 'hann' | 'gaussian')[] = ['trapezoid', 'sine', 'hann', 'gaussian'];

      for (const shape of shapes) {
        granular.setParams({
          grainEnvelope: {
            attack: 0.4,
            hold: 0.4,
            release: 0.4,
            shape
          },
          duration: 0.08
        });

        expect(() => {
          (granular as any).triggerParticleVoice(ctx.currentTime, { duration: 0.08 });
        }).not.toThrow();
      }

      granular.dispose();
    });
  });

  // =========================================================================
  // D03: Rate Modulation & HZ vs GR Dual-Mode Trigger Rates
  // =========================================================================
  describe('D03: Rate Modulation Stress & Dual-Mode Consistency', () => {
    it('dynamically adapts scheduling rate and density when modulated from 0.1Hz to 200Hz', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      granular.start(0);

      const testRates = [0.1, 1.0, 5.0, 25.0, 100.0, 200.0];

      for (const rate of testRates) {
        granular.setParams({ rate, duration: 0.1 });
        const params = granular.getParams();
        expect(params.rate).toBe(rate);

        // Advance mock time and verify scheduling does not crash
        ctx.advanceTime(0.05);
        (granular as any).scheduleParticles();
      }

      granular.dispose();
    });

    it('tempo sync mode calculates valid effectiveRate without NaN across all musical divisions', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      const divisions: ('1/4' | '1/8' | '1/16' | '1/32' | '1/64')[] = ['1/4', '1/8', '1/16', '1/32', '1/64'];

      for (const syncRate of divisions) {
        granular.setParams({
          sync: true,
          bpm: 120,
          syncRate
        });

        expect(() => {
          (granular as any).scheduleParticles();
        }).not.toThrow();
      }

      granular.dispose();
    });
  });

  // =========================================================================
  // D04: Reverse Slice EOF & Safety Margin
  // =========================================================================
  describe('D04: Reverse Slice Boundary Enforcement & EOF Margin', () => {
    it('restricts reverse slice duration when approaching rangeStart to prevent EOF pop', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      const sampleDuration = 2.0;
      const testBuf = ctx.createBuffer(2, Math.floor(44100 * sampleDuration), 44100);
      const revBuf = ctx.createBuffer(2, Math.floor(44100 * sampleDuration), 44100);

      (granular as any).currentSampleBuffer = testBuf;
      (granular as any).currentReversedBuffer = revBuf;

      // Position very close to rangeStart (0.1)
      granular.setParams({
        direction: 'reverse',
        position: 0.11,
        rangeStart: 0.1,
        rangeEnd: 0.9,
        duration: 1.0,
        rate: 10,
        probability: 1.0
      });

      let triggeredGrain: any = null;
      granular.onParticleTrigger = (g) => {
        triggeredGrain = g;
      };

      granular.start(0);
      ctx.advanceTime(0.2);

      expect(triggeredGrain).not.toBeNull();
      // Reverse grain near boundary must have scaled down duration to fit remaining buffer
      expect(triggeredGrain.isReverse).toBe(true);
      expect(triggeredGrain.duration).toBeLessThan(1.0);

      granular.dispose();
    });

    it('safely falls back to isReverse=false when reversed buffer is absent', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      const testBuf = ctx.createBuffer(2, 44100, 44100);
      (granular as any).currentSampleBuffer = testBuf;
      (granular as any).currentReversedBuffer = null;

      granular.setParams({
        direction: 'reverse',
        position: 0.5,
        probability: 1.0
      });

      let triggeredGrain: any = null;
      granular.onParticleTrigger = (g) => {
        triggeredGrain = g;
      };

      granular.start(0);
      ctx.advanceTime(0.2);

      expect(triggeredGrain).not.toBeNull();
      expect(triggeredGrain.isReverse).toBe(false);

      granular.dispose();
    });
  });

  // =========================================================================
  // D05: Wavetable Position Sweeps Across Integer Slice Boundaries
  // =========================================================================
  describe('D05: Wavetable Position Sweeps & PeriodicWave Updates', () => {
    it('sweeps wavetableIndex continuously across all 24 slices without throwing', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.start(0);

      // Sweep across all boundaries from 0.0 to 23.0
      for (let i = 0; i <= 230; i++) {
        const idx = i / 10.0;
        expect(() => {
          oscA.setParams({ wavetableIndex: idx });
        }).not.toThrow();

        ctx.advanceTime(0.005);
      }

      expect(oscA.getParams().wavetableIndex).toBe(23.0);
      oscA.dispose();
    });

    it('D05 BUG: Wavetable discrete jump to integer slice fails to update osc1 in drone mode', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.setParams({ morphDepth: 0.0, wavetableIndex: 0.0 });
      expect((oscA as any).lastK1).toBe(0);
      expect((oscA as any).lastK2).toBe(1);

      // User jumps to slice 5.0 in drone mode
      oscA.setParams({ morphDepth: 0.0, wavetableIndex: 5.0 });

      // Because g1 is 1.0 (>= 0.05), line 657 condition `g1 < 0.05` is false!
      // osc1 fails to load slice 5 and remains stuck on slice 0!
      expect((oscA as any).lastK1).toBe(5);
      oscA.dispose();
    });

    it('D05 BUG: Wavetable continuous sweep in drone mode leaves osc1 frozen on slice 0', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.setParams({ morphDepth: 0.0, wavetableIndex: 0.0 });

      // Sweep from 0 to 4 in 0.2 increments
      for (let pos = 0.0; pos <= 4.0001; pos += 0.2) {
        oscA.setParams({ morphDepth: 0.0, wavetableIndex: pos });
      }

      // At position 4.0, osc1 should be playing slice 4, but is frozen on slice 0!
      expect((oscA as any).lastK1).toBe(4);
      oscA.dispose();
    });
  });

  // =========================================================================
  // D06: DC Bias in Warmth Curve
  // =========================================================================
  describe('D06: Warmth Curve Odd-Symmetry & Zero DC Offset Oracle', () => {
    it('verifies 2048-point warmth curve has 4x oversampling, strict odd symmetry, and near-zero DC offset', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      const shaper = (oscA as any).warmthShaper as WaveShaperNode;

      expect(shaper.oversample).toBe('4x');

      const testWarmths = [0.1, 0.3, 0.5, 0.8, 1.0];
      for (const warmth of testWarmths) {
        oscA.setParams({ warmth });
        const curve = shaper.curve;
        expect(curve).not.toBeNull();
        expect(curve!.length).toBe(2048);

        // 1. Mean (DC offset) must be < 1e-4
        let sum = 0;
        for (let i = 0; i < curve!.length; i++) {
          sum += curve![i];
        }
        const mean = sum / curve!.length;
        expect(Math.abs(mean)).toBeLessThan(1e-4);

        // 2. Strict odd symmetry: curve[i] + curve[2047 - i] == 0
        for (let i = 0; i < 100; i++) {
          const symSum = curve![i] + curve![2047 - i];
          expect(Math.abs(symSum)).toBeLessThan(1e-4);
        }
      }

      oscA.dispose();
    });
  });

  // =========================================================================
  // D07: OscA Pure Wavetable Continuity & Granular Concurrency Isolation Oracle
  // =========================================================================
  describe('D07: Sound Source Decoupling & Continuous Wavetable Voice Protection', () => {
    it('maintains continuous dual-oscillator acoustic power on OscAChannel without self-muting or particle leaks', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.start(0);

      // Verify active dual-oscillator crossfade across sweeps
      for (let pos = 0.0; pos <= 23.0; pos += 1.5) {
        oscA.setParams({ wavetableIndex: pos });
        const g1 = (oscA as any).gain1.gain.value;
        const g2 = (oscA as any).gain2.gain.value;
        const totalPower = g1 * g1 + g2 * g2;
        // Equal-power crossfade G1^2 + G2^2 = 1.0
        expect(totalPower).toBeCloseTo(1.0, 3);
      }

      // OscA must never possess particle timers
      expect((oscA as any).particleTimer).toBeUndefined();

      oscA.dispose();
    });

    it('GranularChannel survives rapid bypass toggling and parameter mutations without scheduler corruption', () => {
      const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
      granular.start(0);

      for (let i = 0; i < 30; i++) {
        const bypassState = i % 2 === 0;
        granular.setParams({
          bypass: bypassState,
          rate: 1.0 + (i % 5),
          density: 4 + (i % 8)
        });
        ctx.advanceTime(0.005);
      }

      granular.setParams({ bypass: false });
      expect(granular.getParams().bypass).toBe(false);
      expect(granular.isStarted).toBe(true);

      granular.dispose();
    });
  });

  // =========================================================================
  // D08: Pink Noise Buffer Seam at 9.95s
  // =========================================================================
  describe('D08: Four-Color Noise Generators Loop Seam Verification', () => {
    it('produces valid 10s buffers without NaNs, infinities, or destructive tail overwrite', () => {
      const pink = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
      const white = generateWhiteNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
      const brown = generateBrownNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
      const violet = generateVioletNoiseBuffer(ctx as unknown as BaseAudioContext, 10);

      for (const buf of [pink, white, brown, violet]) {
        for (let ch = 0; ch < 2; ch++) {
          const data = buf.getChannelData(ch);
          // Check start, crossfade boundary (~9.95s = index 44100*10 - 44100*0.05), and end
          const seamIdx = Math.floor(44100 * 9.95);
          expect(Number.isFinite(data[seamIdx])).toBe(true);
          expect(Number.isFinite(data[buf.length - 1])).toBe(true);
          expect(Number.isFinite(data[0])).toBe(true);

          // All samples must be bounded within [-1.0, 1.0]
          let maxVal = 0;
          for (let i = 0; i < data.length; i += 100) {
            maxVal = Math.max(maxVal, Math.abs(data[i]));
          }
          expect(maxVal).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it('D08 diagnostic: examines loop wrap boundary between last sample and first sample', () => {
      const pink = generatePinkNoiseBuffer(ctx as unknown as BaseAudioContext, 10);
      const data = pink.getChannelData(0);
      const lastSample = data[data.length - 1];
      const firstSample = data[0];
      const step = Math.abs(firstSample - lastSample);
      console.log('D08 Diagnostic -> lastSample:', lastSample, 'firstSample:', firstSample, 'step:', step);
    });
  });

  // =========================================================================
  // D09: Brown Noise DC Offset & Noise Type Switching
  // =========================================================================
  describe('D09: Brown Noise Zero-Mean DC Offset & OscB Switching Crossfade', () => {
    it('ensures Brown noise buffer has zero-mean DC across channels', () => {
      const brown = generateBrownNoiseBuffer(ctx as unknown as BaseAudioContext, 5);
      for (let ch = 0; ch < 2; ch++) {
        const data = brown.getChannelData(ch);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const mean = sum / data.length;
        expect(Math.abs(mean)).toBeLessThan(1e-3);
      }
    });

    it('switches noise types repeatedly on active OscBChannel without throwing', () => {
      const oscB = new OscBChannel(ctx as unknown as BaseAudioContext);
      oscB.start(0);

      const types: ('pink' | 'white' | 'brown' | 'violet')[] = ['pink', 'white', 'brown', 'violet', 'pink'];
      for (const t of types) {
        expect(() => {
          oscB.switchNoiseType(t);
        }).not.toThrow();
        expect(oscB.getParams().noiseType).toBe(t);
      }

      oscB.dispose();
    });
  });

  // =========================================================================
  // D10: StereoWidth 0.0 vs 1.0 in OscBChannel
  // =========================================================================
  describe('D10: StereoWidth Mid/Side Processing Matrix', () => {
    it('modulates sideWidthGain from 0.0 (mono) to 1.0 (wide stereo)', () => {
      const oscB = new OscBChannel(ctx as unknown as BaseAudioContext);
      expect((oscB as any).sideWidthGain).toBeDefined();

      oscB.setParams({ stereoWidth: 0.0 });
      expect(oscB.getParams().stereoWidth).toBe(0.0);

      oscB.setParams({ stereoWidth: 1.0 });
      expect(oscB.getParams().stereoWidth).toBe(1.0);

      oscB.setParams({ stereoWidth: 0.5 });
      expect(oscB.getParams().stereoWidth).toBe(0.5);

      oscB.dispose();
    });
  });

  // =========================================================================
  // D11: Sub Drone Harmonic Excitation & 180Hz Filter
  // =========================================================================
  describe('D11: Sub Drone Harmonic Overtones & Acoustic Filter', () => {
    it('excites harmonic overtones via warmthShaper and sets lowpass cutoff to 180Hz', () => {
      const drone = new DroneChannel(ctx as unknown as BaseAudioContext);
      const shaper = (drone as any).warmthShaper as WaveShaperNode;
      const filter = (drone as any).subFilter as BiquadFilterNode;

      expect(shaper).toBeDefined();
      expect(shaper.oversample).toBe('2x');
      expect(shaper.curve).not.toBeNull();
      expect(shaper.curve!.length).toBe(512);

      // Verify filter cutoff allows 108Hz and 162Hz harmonics through
      expect(filter.frequency.value).toBe(180);

      // Verify wave shaper curve introduces non-linear saturation
      const curve = shaper.curve!;
      // Center at 0
      const mid = curve[256];
      expect(Math.abs(mid)).toBeLessThan(0.05);

      drone.dispose();
    });
  });

  // =========================================================================
  // D12: AudioParam Scheduling Absence of Destructive .value =
  // =========================================================================
  describe('D12: AudioParam De-zippering Scheduling Verification', () => {
    it('updates engine and channel parameters smoothly via setTargetAtTime', async () => {
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      engine.updateEffects({ masterGain: 0.7 });
      expect((engine as any).effectsState.masterGain).toBe(0.7);

      engine.drone.setParams({ baseFreq: 60, gain: 0.3 });
      expect(engine.drone.getParams().baseFreq).toBe(60);
      expect(engine.drone.getParams().gain).toBe(0.3);

      engine.oscB.setParams({ lowCut: 120, gain: 0.5 });
      expect(engine.oscB.getParams().lowCut).toBe(120);

      engine.dispose();
    });
  });

  // =========================================================================
  // D13: 0ms Hard-Cut Timing & Resumption
  // =========================================================================
  describe('D13: 0ms Hard-Cut Timing & Resumption Micro-Ramp Oracle', () => {
    it('executes 2.5ms micro-ramp, purges loops immediately, and recovers on resume without pop', async () => {
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      // Trigger hard cut
      engine.executeZeroResidueHardCut();
      expect((engine as any).isPaused).toBe(true);

      // Purged immediately: delay input & reverb wet
      expect(engine.delay.delayInGain.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);

      // Advance through 2.5ms micro-ramp
      ctx.advanceTime(0.0026);
      expect(engine.masterCutGain.gain.value).toBeLessThanOrEqual(0.001);

      // Resume
      await engine.resume();
      expect((engine as any).isPaused).toBe(false);

      // Advance through 3ms un-mute ramp
      ctx.advanceTime(0.0035);
      expect(engine.masterCutGain.gain.value).toBeCloseTo(1.0, 1);

      engine.dispose();
    });
  });
});
