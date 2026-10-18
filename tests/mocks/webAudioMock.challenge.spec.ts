import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockAudioContext,
  MockAudioParam,
} from './webAudioMock';

describe('Empirical Adversarial Challenge Suite - Web Audio Mock Harness', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 48000 });
  });

  describe('Challenge 1: Parameter Automation Curves Under Extreme Conditions', () => {
    it('1.1: setValueCurveAtTime with empty array is guarded and does not produce NaN', () => {
      const param = new MockAudioParam(100, 0, 1000);
      // Passing empty curve array []
      param.setValueCurveAtTime([], 1.0, 1.0);
      const val = param.getValueAtTime(1.5);
      // Guard verification: empty array is ignored and does not produce NaN
      expect(Number.isNaN(val)).toBe(false);
      expect(val).toBe(100);
    });

    it('1.2: setValueCurveAtTime with zero duration skips curve and falls back to end value', () => {
      const param = new MockAudioParam(100, 0, 1000);
      param.setValueCurveAtTime([10, 50, 90], 1.0, 0);
      const valAt1 = param.getValueAtTime(1.0);
      expect(valAt1).toBe(90);
    });

    it('1.3: linearRampToValueAtTime without prior setValueAtTime smoothly ramps from initial value', () => {
      const param = new MockAudioParam(100, 0, 1000);
      // Scheduling linear ramp from current state to 300 at t=2.0 without explicit setValueAtTime
      param.linearRampToValueAtTime(300, 2.0);

      // In standard W3C Web Audio, this smoothly interpolates from 100 at t=0 to 300 at t=2.0 (midway = 200).
      const valAtHalfway = param.getValueAtTime(1.0);
      const valJustBeforeEnd = param.getValueAtTime(1.999);
      const valAtEnd = param.getValueAtTime(2.0);

      expect(valAtHalfway).toBe(200);
      expect(valJustBeforeEnd).toBeCloseTo(299.9, 1);
      expect(valAtEnd).toBe(300);
    });

    it('1.4: exponentialRampToValueAtTime without prior setValueAtTime smoothly ramps from initial value', () => {
      const param = new MockAudioParam(10, 0, 1000);
      param.exponentialRampToValueAtTime(1000, 2.0);

      // At t=1.0, geometric mean should be 100.
      const valAtHalfway = param.getValueAtTime(1.0);
      expect(valAtHalfway).toBeCloseTo(100, 1);
      expect(param.getValueAtTime(2.0)).toBe(1000);
    });

    it('1.5: linearRampToValueAtTime following setTargetAtTime links smoothly without discontinuous jump', () => {
      const param = new MockAudioParam(100, 0, 1000);
      param.setValueAtTime(100, 0);
      // Target 0 with timeConstant = 1.0s. At t=1.0s, value has decayed to 100 * e^-1 ~ 36.788
      param.setTargetAtTime(0, 0, 1.0);
      expect(param.getValueAtTime(1.0)).toBeCloseTo(36.788, 2);

      // Schedule linear ramp from t=1.0s to 200 at t=2.0s
      param.linearRampToValueAtTime(200, 2.0);

      // Smooth transition from ~36.79 onwards without discontinuous jump
      const valJustAfter1 = param.getValueAtTime(1.001);
      expect(valJustAfter1).toBeCloseTo(36.95, 1);
      expect(valJustAfter1).toBeLessThan(40);
    });

    it('1.6: linearRampToValueAtTime following setValueCurveAtTime correctly calculates interpolation interval', () => {
      const param = new MockAudioParam(0, 0, 1000);
      param.setValueCurveAtTime([10, 20, 30], 0, 1.0); // Curve ends at t=1.0 with value 30
      expect(param.getValueAtTime(1.0)).toBe(30);

      // Ramp to 100 at t=2.0
      param.linearRampToValueAtTime(100, 2.0);

      // Ramp starts at t=1.0 from 30 to 100 at t=2.0. So at t=1.5, value = 30 + 70*0.5 = 65.
      const valAt1_5 = param.getValueAtTime(1.5);
      expect(valAt1_5).toBe(65);
    });

    it('1.7: cancelScheduledValues in the past retroactively rewrites history and corrupts current value', () => {
      const param = new MockAudioParam(0, 0, 100);
      param.setValueAtTime(10, 0);
      param.setValueAtTime(50, 1.0);
      param.setValueAtTime(90, 2.0);

      ctx.advanceTime(2.5);
      expect(param.getValueAtTime(2.5)).toBe(90);

      // Calling cancelScheduledValues with a time in the past (t=1.5)
      param.cancelScheduledValues(1.5);

      // Defect verification: the event at t=2.0 was erased even though it already occurred in the past!
      // Now at t=2.5, value reverts to 50 instead of remaining 90.
      expect(param.getValueAtTime(2.5)).toBe(50);
    });

    it('1.8: cancelScheduledValues during active ramp snaps to value before ramp instead of current value', () => {
      const param = new MockAudioParam(0, 0, 100);
      param.setValueAtTime(10, 0);
      param.linearRampToValueAtTime(90, 2.0);

      // At t=1.0, value is 50
      expect(param.getValueAtTime(1.0)).toBe(50);

      // Cancel at t=1.0
      param.cancelScheduledValues(1.0);

      // Because cancelScheduledValues purges events >= 1.0 without holding the value,
      // the value at t=1.0 snaps back to 10.
      expect(param.getValueAtTime(1.0)).toBe(10);
    });

    it('1.9: simultaneous ramps scheduled at identical endTime eclipse intermediate events', () => {
      const param = new MockAudioParam(0, 0, 100);
      param.setValueAtTime(0, 0);
      param.linearRampToValueAtTime(40, 1.0);
      param.linearRampToValueAtTime(80, 1.0);

      // At t=0.5, it interpolates towards the first ramp (40), reaching 20
      expect(param.getValueAtTime(0.5)).toBe(20);
      // At t=1.0, it snaps to the second ramp (80)
      expect(param.getValueAtTime(1.0)).toBe(80);
    });

    it('1.10: direct property assignment updates baseline and is preserved across advanceTime', () => {
      const gain = ctx.createGain();
      // setValueAtTime does NOT update param.value immediately
      gain.gain.setValueAtTime(0.8, 0);
      expect(gain.gain.value).toBe(1.0);

      // Only advanceTime updates param.value
      ctx.advanceTime(0);
      expect(gain.gain.value).toBe(0.8);

      // Developer directly assigns property value
      gain.gain.value = 0.42;
      expect(gain.gain.value).toBe(0.42);

      // advanceTime runs updateValue, preserving direct mutation
      ctx.advanceTime(1.0);
      expect(gain.gain.value).toBe(0.42);
    });

    it('1.11: exponentialRampToValueAtTime with negative values clamps to 1e-6 causing sign discontinuity', () => {
      const param = new MockAudioParam(0, -100, 100);
      param.setValueAtTime(-50, 0);
      param.exponentialRampToValueAtTime(50, 1.0);

      // In MockAudioParam, v0 = Math.max(1e-6, -50) = 1e-6.
      // So at t=0.0001, value instantly jumps from -50 to ~1e-6.
      const valNearStart = param.getValueAtTime(0.0001);
      expect(valNearStart).toBeGreaterThan(0);
      expect(valNearStart).toBeLessThan(0.01);
    });
  });

  describe('Challenge 2: 2.5ms Micro-Ramp Hard-Cut Simulation & Numerical Stability', () => {
    it('2.1: 2.5ms micro-ramp hard-cut without prior setValueAtTime smoothly ramps down', () => {
      const gain = ctx.createGain(); // default gain.value = 1.0
      // User triggers hard cut immediately at t=0 by scheduling linear ramp to 0 over 2.5ms
      gain.gain.linearRampToValueAtTime(0.0, 0.0025);

      // Midway through the micro-ramp (1.25ms): gain is 0.5
      const valMidRamp = gain.gain.getValueAtTime(0.00125);
      expect(valMidRamp).toBeCloseTo(0.5, 2);

      // Snaps to 0.0 only at t=0.0025
      expect(gain.gain.getValueAtTime(0.0025)).toBe(0.0);
    });

    it('2.2: 2.5ms micro-ramp hard-cut with exponential ramp to 0.0 clamps to 1e-6 and never reaches 0.0 during ramp', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.0, 0);
      // Attempting exponential ramp to 0.0 (hard cut)
      gain.gain.exponentialRampToValueAtTime(0.0, 0.0025);

      // At 2.499ms (right before the end of the ramp):
      // Value should be clamped to 1e-6 rather than reaching true silence
      const valNearEnd = gain.gain.getValueAtTime(0.002499);
      expect(valNearEnd).toBeGreaterThan(0);
      expect(valNearEnd).toBeLessThan(0.001);

      // At t=0.0025, it abruptly steps from 1e-6 down to 0.0
      expect(gain.gain.getValueAtTime(0.0025)).toBe(0.0);
    });

    it('2.3: 2.5ms cosine micro-ramp via setValueCurveAtTime executes cleanly without NaN or Infinity', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.0, 0);

      // Generate 2.5ms raised cosine (Hann half-wave) curve
      const N = 16;
      const cosineCurve = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        cosineCurve[i] = 0.5 * (1 + Math.cos((Math.PI * i) / (N - 1)));
      }

      const cutTime = 0.1;
      const rampDuration = 0.0025;
      gain.gain.setValueCurveAtTime(cosineCurve, cutTime, rampDuration);

      // Test points across and beyond the curve
      const t0 = gain.gain.getValueAtTime(cutTime);
      const tMid = gain.gain.getValueAtTime(cutTime + rampDuration / 2);
      const tEnd = gain.gain.getValueAtTime(cutTime + rampDuration);
      const tAfter = gain.gain.getValueAtTime(cutTime + rampDuration * 2);

      expect(t0).toBeCloseTo(1.0, 5);
      expect(tMid).toBeCloseTo(0.5, 2);
      expect(tEnd).toBeCloseTo(0.0, 5);
      expect(tAfter).toBe(0.0);

      // Verify no NaN or Infinity across multiple sample evaluation points
      for (let step = 0; step <= 20; step++) {
        const evalTime = cutTime + (rampDuration * step) / 20;
        const val = gain.gain.getValueAtTime(evalTime);
        expect(Number.isNaN(val)).toBe(false);
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('2.4: 2.5ms hard-cut without cancelScheduledValues leaks ghost audio from future ramps', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, 0);
      gain.gain.linearRampToValueAtTime(0.8, 1.0);

      ctx.advanceTime(0.5); // value is 0.5
      expect(gain.gain.value).toBe(0.5);

      // Caller performs 2.5ms hard-cut without canceling future values
      gain.gain.setValueAtTime(gain.gain.value, 0.5);
      gain.gain.linearRampToValueAtTime(0.0, 0.5025);

      ctx.advanceTime(0.0025);
      expect(gain.gain.value).toBe(0.0);

      // Advance further: future ramp at t=1.0 pulls the gain back up!
      ctx.advanceTime(0.2); // t = 0.7025
      expect(gain.gain.value).toBeGreaterThan(0.3); // Defect: ghost audio leaks!
    });

    it('2.5: 2.5ms hard-cut with cancelScheduledValues guarantees permanent silence', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, 0);
      gain.gain.linearRampToValueAtTime(0.8, 1.0);

      ctx.advanceTime(0.5);
      expect(gain.gain.value).toBe(0.5);

      // Proper mitigation: cancel future scheduled values before micro-ramp
      const currentVal = gain.gain.value;
      gain.gain.cancelScheduledValues(0.5);
      gain.gain.setValueAtTime(currentVal, 0.5);
      gain.gain.linearRampToValueAtTime(0.0, 0.5025);

      ctx.advanceTime(0.0025);
      expect(gain.gain.value).toBe(0.0);

      ctx.advanceTime(0.2);
      expect(gain.gain.value).toBe(0.0); // Permanently silent
    });

    it('2.6: extreme evaluation times (NaN, Infinity, -Infinity) do not crash getValueAtTime', () => {
      const param = new MockAudioParam(0.5, 0, 1);
      param.setValueAtTime(0.8, 1.0);

      expect(param.getValueAtTime(NaN)).toBe(0.5);
      expect(param.getValueAtTime(Infinity)).toBe(0.8);
      expect(param.getValueAtTime(-Infinity)).toBe(0.5);
    });
  });

  describe('Challenge 3: MockBiquadFilterNode DSP Numerical Stability & NaN Generation', () => {
    it('3.1: getFrequencyResponse with frequency.value = 0 handles 0 Hz (DC Singularity) without NaN', () => {
      const filter = ctx.createBiquadFilter();
      const magResponse = new Float32Array(1);
      const phaseResponse = new Float32Array(1);
      const zeroFreq = new Float32Array([0]);

      // Direct assignment to frequency.value = 0 bypasses clamp
      filter.frequency.value = 0;

      const filterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking'];
      for (const fType of filterTypes) {
        filter.type = fType;
        filter.getFrequencyResponse(zeroFreq, magResponse, phaseResponse);
        // Robustness verification: denominator singularity handled gracefully without NaN
        expect(Number.isNaN(magResponse[0])).toBe(false);
        expect(Number.isFinite(magResponse[0])).toBe(true);
        expect(Number.isNaN(phaseResponse[0])).toBe(false);
        expect(Number.isFinite(phaseResponse[0])).toBe(true);
      }
    });

    it('3.2: getFrequencyResponse at Nyquist frequency (24000Hz at fs=48000) attenuates lowpass cleanly without NaN', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 24000;
      filter.Q.value = 1.0;

      const freqs = new Float32Array([24000]);
      const magResponse = new Float32Array(1);
      const phaseResponse = new Float32Array(1);

      filter.getFrequencyResponse(freqs, magResponse, phaseResponse);

      expect(Number.isNaN(magResponse[0])).toBe(false);
      expect(magResponse[0]).toBe(0);
    });

    it('3.3: getFrequencyResponse with maximum Q (1000) remains finite without overflow', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      filter.Q.value = 1000; // Maximum supported Q

      const freqs = new Float32Array([1000]);
      const magResponse = new Float32Array(1);
      const phaseResponse = new Float32Array(1);

      filter.getFrequencyResponse(freqs, magResponse, phaseResponse);

      expect(Number.isNaN(magResponse[0])).toBe(false);
      expect(Number.isFinite(magResponse[0])).toBe(true);
      expect(magResponse[0]).toBeCloseTo(1000, 0);
    });
  });

  describe('Challenge 4: Virtual Clock and Scheduled Sources Under Stress', () => {
    it('4.1: advanceTime(0) executes without advancing time and evaluates params', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, 0);
      expect(ctx.currentTime).toBe(0);
      ctx.advanceTime(0);
      expect(ctx.currentTime).toBe(0);
      expect(gain.gain.value).toBe(0.5);
    });

    it('4.2: multiple scheduled sources stopped at the same timestamp all fire onended', () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      let osc1Ended = false;
      let osc2Ended = false;

      osc1.onended = () => { osc1Ended = true; };
      osc2.onended = () => { osc2Ended = true; };

      osc1.start(0);
      osc1.stop(1.0);
      osc2.start(0);
      osc2.stop(1.0);

      ctx.advanceTime(1.0);
      expect(osc1Ended).toBe(true);
      expect(osc2Ended).toBe(true);
    });

    it('4.3: large time advance (1e9 seconds) evaluates correctly without overflow', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.75, 100);
      ctx.advanceTime(1e9);
      expect(ctx.currentTime).toBe(1e9);
      expect(gain.gain.value).toBe(0.75);
    });

    it('4.4: source with stopTime in the past triggers onended upon next advanceTime', () => {
      ctx.advanceTime(2.0);
      const osc = ctx.createOscillator();
      let ended = false;
      osc.onended = () => { ended = true; };
      osc.start(0);
      osc.stop(1.0); // stopTime is 1.0 < currentTime (2.0)

      expect(ended).toBe(false);
      ctx.advanceTime(0.1);
      expect(ended).toBe(true);
    });
  });
});
