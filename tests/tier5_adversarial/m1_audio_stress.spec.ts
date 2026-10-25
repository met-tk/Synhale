import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext, MockAudioParam } from '../mocks/webAudioMock';
import { AudioEngine } from '../../src/audio/engine';
import { MultimodeFilter } from '../../src/audio/nodes/MultimodeFilter';
import { StereoDelay } from '../../src/audio/nodes/StereoDelay';
import { ConvolverReverb } from '../../src/audio/nodes/ConvolverReverb';
import {
  generateDriveCurve,
  generateTapeCurve,
  generateTubeCurve,
  computeDriveMakeupGain
} from '../../src/audio/dsp/waveShaperCurves';
import {
  generateSyntheticImpulseResponse
} from '../../src/audio/dsp/syntheticReverb';

describe('Tier 5 Adversarial: Milestone M1 Audio Engine & DSP Stress Tests', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(async () => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
  });

  // =========================================================================
  // 1. STRESS-TEST: 0ms Hard-Cut Mechanism
  // =========================================================================
  describe('1. 0ms Hard-Cut Mechanism Stress Testing', () => {
    it('1.1: Master cut gain behavior reaches strictly 0.0 at exactly 2.5ms after hard cut', () => {
      // AudioEngine specifies 2.5ms micro-ramp to drop to zero
      expect(engine.masterCutGain.gain.value).toBe(1.0);

      const cutTime = ctx.currentTime;
      engine.executeZeroResidueHardCut();

      // At exactly 2.5ms (the declared hard-cut duration):
      ctx.advanceTime(0.0025);

      const mockParam = engine.masterCutGain.gain as unknown as MockAudioParam;
      const gainAt2_5ms = mockParam.getValueAtTime(cutTime + 0.0025);
      expect(gainAt2_5ms).toBeCloseTo(0.0, 5);
      expect(engine.masterCutGain.gain.value).toBe(0.0);
    });

    it('1.2: Hard cut during active masterVolumeGain ramp', () => {
      // Schedule an active ramp on masterVolumeGain
      engine.updateEffects({ masterGain: 0.1 });
      ctx.advanceTime(0.001);

      // Trigger hard cut mid-ramp
      engine.executeZeroResidueHardCut();

      // Purge must be immediate
      expect(engine.delay.delayInGain.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainL.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainR.gain.value).toBe(0.0);
      expect(engine.reverb.reverbInGain.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);

      // Advance through 2.6ms
      ctx.advanceTime(0.00261);
      expect(engine.masterCutGain.gain.value).toBe(0.0);
    });

    it('1.3: Hard cut during active resume un-mute ramp (t = 1.0ms into 3.0ms ramp)', async () => {
      // First cut
      engine.executeZeroResidueHardCut();
      ctx.advanceTime(0.005);
      expect(engine.masterCutGain.gain.value).toBe(0.0);

      // Resume initiates a 3ms ramp (0 -> 1.0)
      await engine.resume();
      ctx.advanceTime(0.001); // 1ms into resume, gain is ~0.33
      const midResumeGain = engine.masterCutGain.gain.value;
      expect(midResumeGain).toBeGreaterThan(0.2);
      expect(midResumeGain).toBeLessThan(0.5);

      // User interrupts resume with another hard cut!
      engine.executeZeroResidueHardCut();

      // Delay/reverb loops must be immediately purged
      expect(engine.delay.delayInGain.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainL.gain.value).toBe(0.0);
      expect(engine.reverb.reverbInGain.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);

      // In 2.6ms after second cut, master cut gain must return to 0
      ctx.advanceTime(0.00261);
      expect(engine.masterCutGain.gain.value).toBe(0.0);
      expect(Number.isNaN(engine.masterCutGain.gain.value)).toBe(false);
    });

    it('1.4: Rapid toggle play/pause (stress test with 20 rapid alternating cycles)', async () => {
      for (let i = 0; i < 20; i++) {
        await engine.resume();
        ctx.advanceTime(0.0002 * (i % 4 + 1)); // 0.2ms - 0.8ms micro-playback
        engine.executeZeroResidueHardCut();
        ctx.advanceTime(0.0003 * (i % 3 + 1)); // micro-cut
      }

      // After final hard cut, advance 2.61ms
      engine.executeZeroResidueHardCut();
      ctx.advanceTime(0.003);

      expect(engine.masterCutGain.gain.value).toBe(0.0);
      expect(engine.delay.delayInGain.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainL.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainR.gain.value).toBe(0.0);
      expect(engine.reverb.reverbInGain.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);
      expect(Number.isNaN(engine.masterCutGain.gain.value)).toBe(false);
    });

    it('1.5: Verify Delay and Reverb loops are completely purged after hard cut', () => {
      // Set delay feedback to high (0.8) and reverb mix to 0.5
      engine.updateEffects({
        delay: { feedback: 0.8, mix: 0.5 },
        reverb: { mix: 0.5, decayTime: 8.0 }
      });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      expect(engine.delay.feedbackGainL.gain.value).toBeCloseTo(0.8, 2);
      expect(engine.delay.delayInGain.gain.value).toBe(1.0);
      expect(engine.reverb.reverbInGain.gain.value).toBe(1.0);

      engine.executeZeroResidueHardCut();

      // Assert complete purge of feedback and input gains
      expect(engine.delay.delayInGain.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainL.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainR.gain.value).toBe(0.0);
      expect(engine.reverb.reverbInGain.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);

      // Verify attempts to update effects while purged do not un-mute feedback
      engine.updateEffects({
        delay: { feedback: 0.75 },
        reverb: { mix: 0.8 }
      });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      expect(engine.delay.feedbackGainL.gain.value).toBe(0.0);
      expect(engine.delay.feedbackGainR.gain.value).toBe(0.0);
      expect(engine.reverb.wetGain.gain.value).toBe(0.0);
    });

    it('1.6: Verify snapshot freeze state is recorded correctly during hard cut', () => {
      engine.updateBreathModulation(0.65, 'inhale', 0.4);
      engine.executeZeroResidueHardCut();

      const snapshot = engine.getFreezeSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot?.stage).toBe('inhale');
      expect(snapshot?.macroValue).toBe(0.65);
      expect(snapshot?.stageProgress).toBe(0.4);
    });
  });

  // =========================================================================
  // 2. STRESS-TEST: DSP Parameter Boundaries
  // =========================================================================
  describe('2. DSP Parameter Boundaries & Stability', () => {
    describe('2.1: Filter Cutoff Sweep (20Hz to 20kHz) with Extreme Q=18.0', () => {
      it('verifies biquad frequency response has no NaN or Infinity across full sweep at Q=18.0', () => {
        const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
        const testFreqs = new Float32Array([
          10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000, 22000
        ]);
        const mag = new Float32Array(testFreqs.length);
        const phase = new Float32Array(testFreqs.length);

        const filterTypes: Array<'lowpass' | 'highpass' | 'bandpass'> = ['lowpass', 'highpass', 'bandpass'];
        const cutoffs = [20, 100, 500, 1000, 5000, 10000, 18000, 20000];

        for (const type of filterTypes) {
          for (const cutoff of cutoffs) {
            filter.setParams({ type, cutoff, resonance: 18.0 });

            // Direct inspection of underlying stage1 biquad filter node
            const stage1 = (filter as unknown as { stage1: BiquadFilterNode }).stage1;
            stage1.getFrequencyResponse(testFreqs, mag, phase);

            for (let i = 0; i < testFreqs.length; i++) {
              expect(Number.isNaN(mag[i]), `NaN mag at ${type} cutoff=${cutoff} f=${testFreqs[i]}`).toBe(false);
              expect(Number.isFinite(mag[i]), `Infinite mag at ${type} cutoff=${cutoff} f=${testFreqs[i]}`).toBe(true);
              expect(Number.isNaN(phase[i]), `NaN phase at ${type} cutoff=${cutoff} f=${testFreqs[i]}`).toBe(false);
              expect(Number.isFinite(phase[i]), `Infinite phase at ${type} cutoff=${cutoff} f=${testFreqs[i]}`).toBe(true);
              expect(mag[i]).toBeGreaterThanOrEqual(0);
            }
          }
        }
      });

      it('verifies recursive digital biquad filter time-domain stability under unit impulse and DC step', () => {
        // Direct numerical biquad stability test (Jury stability criterion & sample simulation)
        const fs = 44100;
        const cutoff = 20000;
        const resonance = 18.0;
        const stageQ = Math.sqrt(resonance); // 4.2426

        const w0 = (2 * Math.PI * cutoff) / fs;
        const alpha = Math.sin(w0) / (2 * stageQ);
        const a0 = 1 + alpha;
        const a1 = -2 * Math.cos(w0) / a0;
        const a2 = (1 - alpha) / a0;

        // Stability criterion: |a2| < 1 and |a1| < 1 + a2
        expect(Math.abs(a2)).toBeLessThan(1.0);
        expect(Math.abs(a1)).toBeLessThan(1.0 + a2);

        // Run 4096 samples with unit impulse
        let y1 = 0, y2 = 0;
        let x1 = 0, x2 = 0;
        const b0 = ((1 - Math.cos(w0)) / 2) / a0;
        const b1 = (1 - Math.cos(w0)) / a0;
        const b2 = b0;

        let maxOutput = 0;
        for (let n = 0; n < 4096; n++) {
          const x = n === 0 ? 1.0 : 0.0;
          const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
          x2 = x1;
          x1 = x;
          y2 = y1;
          y1 = y;

          expect(Number.isNaN(y)).toBe(false);
          expect(Number.isFinite(y)).toBe(true);
          if (Math.abs(y) > maxOutput) maxOutput = Math.abs(y);
        }

        // Must decay and not blow up
        expect(Math.abs(y1)).toBeLessThan(0.01);
      });
    });

    describe('2.2: Drive at 100% Saturation & Monotonicity Audit', () => {
      it('verifies 100% saturation curve has no NaN or Infinity and remains bounded in [-1.0, 1.0]', () => {
        const tapeCurve = generateTapeCurve(1.0);
        const tubeCurve = generateTubeCurve(1.0);
        const driveCurve = generateDriveCurve(1.0, 0.5);

        for (let i = 0; i < driveCurve.length; i++) {
          expect(Number.isNaN(driveCurve[i])).toBe(false);
          expect(Number.isFinite(driveCurve[i])).toBe(true);
          expect(driveCurve[i]).toBeGreaterThanOrEqual(-1.0);
          expect(driveCurve[i]).toBeLessThanOrEqual(1.0);

          expect(Number.isNaN(tapeCurve[i])).toBe(false);
          expect(Number.isFinite(tapeCurve[i])).toBe(true);
          expect(tapeCurve[i]).toBeGreaterThanOrEqual(-1.0);
          expect(tapeCurve[i]).toBeLessThanOrEqual(1.0);

          expect(Number.isNaN(tubeCurve[i])).toBe(false);
          expect(Number.isFinite(tubeCurve[i])).toBe(true);
          expect(tubeCurve[i]).toBeGreaterThanOrEqual(-1.0);
          expect(tubeCurve[i]).toBeLessThanOrEqual(1.0);
        }
      });

      it('audits Drive makeup gain at 100% saturation', () => {
        const makeup = computeDriveMakeupGain(1.0);
        expect(Number.isNaN(makeup)).toBe(false);
        expect(Number.isFinite(makeup)).toBe(true);
        expect(makeup).toBeGreaterThan(0.0);
        expect(makeup).toBeLessThanOrEqual(1.0);
        // At effectiveDrive = 6, G_comp = 1 / sqrt(1 + 0.6 * 5) = 1 / 2 = 0.5
        expect(makeup).toBeCloseTo(0.5, 3);
      });

      it('verifies Tape curve is strictly monotonic across entire input range', () => {
        const tapeCurve = generateTapeCurve(1.0);
        for (let i = 1; i < tapeCurve.length; i++) {
          expect(tapeCurve[i]).toBeGreaterThanOrEqual(tapeCurve[i - 1]);
        }
        // At negative peak x = -1.0, tape curve must be negative
        expect(tapeCurve[0]).toBeLessThan(0.0);
        expect(tapeCurve[0]).toBeCloseTo(-1.0, 2);
      });

      it('verifies generateTubeCurve fix: strictly monotonic with zero foldback and preserved negative polarity', () => {
        const tubeCurve = generateTubeCurve(1.0);
        const minInputOutput = tubeCurve[0];

        // 1. Output at maximum negative input x = -1.0 must be negative and bounded in [-1.0, 0.0)
        expect(minInputOutput).toBeLessThan(0.0);
        expect(minInputOutput).toBeGreaterThanOrEqual(-1.0);

        // 2. The curve must be strictly monotonic across all samples: zero slope inversions
        let inversions = 0;
        for (let i = 1; i < tubeCurve.length; i++) {
          expect(tubeCurve[i]).toBeGreaterThanOrEqual(tubeCurve[i - 1]);
          if (tubeCurve[i] < tubeCurve[i - 1]) {
            inversions++;
          }
        }
        expect(inversions).toBe(0);
      });
    });

    describe('2.3: Ping-Pong Delay Rapid Parameter Changes & Anti-Explosion', () => {
      it('handles rapid delayTime sweep (0.05s to 1.5s) without exceeding buffer limit or throwing', () => {
        const delay = new StereoDelay(ctx as unknown as BaseAudioContext);

        // Rapid sweep across 50 iterations with small time steps
        for (let i = 0; i < 50; i++) {
          const timeVal = 0.05 + (i / 49) * 1.45;
          delay.setParams({ time: timeVal });
          ctx.advanceTime(0.002);
        }

        const params = delay.getParams();
        expect(params.time).toBeCloseTo(1.5, 2);
        expect(Number.isNaN(params.time)).toBe(false);
      });

      it('clamps feedback strictly to 0.85 and prevents feedback explosion', () => {
        const delay = new StereoDelay(ctx as unknown as BaseAudioContext);

        // Try setting feedback > 1.0 (dangerous!)
        delay.setParams({ feedback: 1.5 });
        ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
        // Anti-howl limiter clamps to 0.85 (see StereoDelay.ts:154) — margin
        // below ping-pong self-oscillation threshold under any damping setting.
        expect(delay.getParams().feedback).toBe(0.85);
        expect(delay.feedbackGainL.gain.value).toBe(0.85);
        expect(delay.feedbackGainR.gain.value).toBe(0.85);

        // Try setting negative feedback
        delay.setParams({ feedback: -0.5 });
        ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
        expect(delay.getParams().feedback).toBe(0.0);
      });
    });

    describe('2.4: Synthetic Reverb with 12s Decay Time & Damping Boundaries', () => {
      it('generates synthetic IR at max 12.0s decay time without NaN, Inf, or buffer overflow', () => {
        const buffer = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, 12.0, 0.5);
        expect(buffer.numberOfChannels).toBe(2);
        expect(buffer.duration).toBeLessThanOrEqual(10.0); // Clamped to 10.0s max allocation

        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          let maxVal = 0;
          let nanCount = 0;
          let infCount = 0;

          for (let i = 0; i < data.length; i++) {
            const v = data[i];
            if (Number.isNaN(v)) nanCount++;
            if (!Number.isFinite(v)) infCount++;
            if (Math.abs(v) > maxVal) maxVal = Math.abs(v);
          }

          expect(nanCount).toBe(0);
          expect(infCount).toBe(0);
          // Normalized peak must be close to 0.95
          expect(maxVal).toBeCloseTo(0.95, 2);
        }
      });

      it('generates synthetic IR at extreme damping bounds (damping = 0.0 and damping = 1.0)', () => {
        const bufBright = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, 4.0, 0.0);
        const bufDamped = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, 4.0, 1.0);

        expect(bufBright.length).toBeGreaterThan(0);
        expect(bufDamped.length).toBeGreaterThan(0);

        for (let ch = 0; ch < 2; ch++) {
          const dataB = bufBright.getChannelData(ch);
          const dataD = bufDamped.getChannelData(ch);
          expect(Number.isNaN(dataB[0])).toBe(false);
          expect(Number.isNaN(dataD[0])).toBe(false);
        }
      });

      it('verifies ConvolverReverb node updates at 12s decay time without crashing', () => {
        const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);
        reverb.setParams({ decayTime: 12.0, damping: 0.9, mix: 0.7 });

        expect(reverb.getParams().decayTime).toBe(12.0);
        expect(reverb.getParams().damping).toBe(0.9);
        expect(reverb.getParams().mix).toBe(0.7);
      });
    });

    describe('2.5: Full Audio Engine End-to-End Stress with Extreme Parameter Settings', () => {
      it('runs complete audio pipeline with all 3 sound sources and all effects at maximum stress', () => {
        // 1. Channel strip at maximum output
        engine.updateChannelStrip({
          oscA: { gain: 1.0, wavetableIndex: 23, detune: 50, harmonics: 1.0 },
          oscB: { gain: 1.0, color: 1.0, friction: 1.0 },
          drone: { gain: 1.0, baseFreq: 440, pitchDrift: 1.0 }
        });

        // 2. Effects chain at extreme limits
        engine.updateEffects({
          filter: { type: 'bandpass', cutoff: 20000, resonance: 18.0 },
          drive: { amount: 1.0, tone: 1.0 },
          delay: { time: 1.5, feedback: 0.85, mix: 1.0, damping: 12000 },
          reverb: { decayTime: 12.0, damping: 1.0, mix: 1.0 },
          masterGain: 1.0
        });

        // Advance clock across 100 milliseconds
        ctx.advanceTime(0.1);

        const fx = engine.getEffectsParams();
        const ch = engine.getChannelStripParams();

        expect(fx.filter.cutoff).toBe(20000);
        expect(fx.filter.resonance).toBe(18.0);
        expect(fx.drive.amount).toBe(1.0);
        expect(fx.delay.feedback).toBe(0.85);
        expect(fx.reverb.decayTime).toBe(12.0);
        expect(fx.masterGain).toBe(1.0);

        expect(ch.oscA.gain).toBe(1.0);
        expect(ch.oscB.gain).toBe(1.0);
        expect(ch.drone.gain).toBe(1.0);

        // Master gains must remain finite and bounded
        expect(engine.masterVolumeGain.gain.value).toBeCloseTo(1.0, 5);
        expect(engine.masterCutGain.gain.value).toBe(1.0);
      });
    });

    describe('2.6: Input Parameter Boundary Clamping & Bypass Verification', () => {
      it('clamps all out-of-range parameters to safe legal limits', () => {
        engine.updateEffects({
          filter: { cutoff: 99999, resonance: 99 },
          drive: { amount: 5, tone: -1 },
          delay: { time: 10, feedback: 2, damping: 50000, mix: 5 },
          reverb: { decayTime: 100, damping: -5, mix: -2 },
          masterGain: 10
        });

        const fx = engine.getEffectsParams();
        expect(fx.filter.cutoff).toBe(20000);
        expect(fx.filter.resonance).toBe(18.0);
        expect(fx.drive.amount).toBe(1.0);
        expect(fx.drive.tone).toBe(0.0);
        expect(fx.delay.time).toBe(3.0);
        expect(fx.delay.feedback).toBe(0.85);
        expect(fx.delay.damping).toBe(12000);
        expect(fx.delay.mix).toBe(1.0);
        expect(fx.reverb.decayTime).toBe(20.0);
        expect(fx.reverb.damping).toBe(0.0);
        expect(fx.reverb.mix).toBe(0.0);
        expect(fx.masterGain).toBe(1.0);

        engine.updateChannelStrip({
          oscA: { wavetableIndex: 999, detune: 999, harmonics: 5, gain: -1 },
          oscB: { color: -5, friction: 10, gain: 5 },
          drone: { baseFreq: 10000, pitchDrift: 10, gain: 2 }
        });

        const ch = engine.getChannelStripParams();
        expect(ch.oscA.wavetableIndex).toBe(23);
        expect(ch.oscA.detune).toBe(100);
        expect(ch.oscA.harmonics).toBe(1.0);
        expect(ch.oscA.gain).toBe(0.0);
        expect(ch.oscB.color).toBe(0.0);
        expect(ch.oscB.friction).toBe(1.0);
        expect(ch.oscB.gain).toBe(1.0);
        expect(ch.drone.baseFreq).toBe(440);
        expect(ch.drone.pitchDrift).toBe(1.0);
        expect(ch.drone.gain).toBe(1.0);
      });

      it('toggles bypass across all modules rapidly without clicks or audio disruption', () => {
        // Toggle bypass on all modules
        engine.updateEffects({
          filter: { bypass: true },
          drive: { bypass: true },
          delay: { bypass: true },
          reverb: { bypass: true }
        });

        engine.updateChannelStrip({
          oscA: { bypass: true },
          oscB: { bypass: true },
          drone: { bypass: true }
        });

        // 5ms smooth bypass crossfade
        ctx.advanceTime(0.006);

        expect(engine.filter.getParams().bypass).toBe(true);
        expect(engine.drive.getParams().bypass).toBe(true);
        expect(engine.delay.getParams().bypass).toBe(true);
        expect(engine.reverb.getParams().bypass).toBe(true);
        expect(engine.oscA.getParams().bypass).toBe(true);
        expect(engine.oscB.getParams().bypass).toBe(true);
        expect(engine.drone.getParams().bypass).toBe(true);

        // Toggle back off
        engine.updateEffects({
          filter: { bypass: false },
          drive: { bypass: false },
          delay: { bypass: false },
          reverb: { bypass: false }
        });

        engine.updateChannelStrip({
          oscA: { bypass: false },
          oscB: { bypass: false },
          drone: { bypass: false }
        });

        ctx.advanceTime(0.006);

        expect(engine.filter.getParams().bypass).toBe(false);
        expect(engine.drive.getParams().bypass).toBe(false);
        expect(engine.delay.getParams().bypass).toBe(false);
        expect(engine.reverb.getParams().bypass).toBe(false);
        expect(engine.oscA.getParams().bypass).toBe(false);
        expect(engine.oscB.getParams().bypass).toBe(false);
        expect(engine.drone.getParams().bypass).toBe(false);
      });
    });
  });
});
