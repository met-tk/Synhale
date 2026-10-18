import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockAudioContext,
  MockAudioParam,
  MockGainNode,
  MockOscillatorNode,
  MockBiquadFilterNode,
  MockWaveShaperNode,
  MockDelayNode,
  MockConvolverNode,
  MockAudioBuffer,
} from './webAudioMock';

describe('Deterministic Web Audio Mock Harness', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 48000 });
  });

  afterEach(() => {
    MockAudioContext.restoreGlobal();
  });

  describe('MockAudioContext Lifecycle & Creation', () => {
    it('initializes with suspended state and sampleRate', () => {
      expect(ctx.state).toBe('suspended');
      expect(ctx.currentTime).toBe(0);
      expect(ctx.sampleRate).toBe(48000);
      expect(ctx.destination).toBeDefined();
    });

    it('handles state transitions: resume, suspend, close', async () => {
      await ctx.resume();
      expect(ctx.state).toBe('running');

      await ctx.suspend();
      expect(ctx.state).toBe('suspended');

      await ctx.close();
      expect(ctx.state).toBe('closed');
    });

    it('creates all essential Web Audio nodes', () => {
      const gain = ctx.createGain();
      expect(gain).toBeInstanceOf(MockGainNode);
      expect(gain.gain.value).toBe(1.0);

      const osc = ctx.createOscillator();
      expect(osc).toBeInstanceOf(MockOscillatorNode);
      expect(osc.frequency.value).toBe(440);

      const filter = ctx.createBiquadFilter();
      expect(filter).toBeInstanceOf(MockBiquadFilterNode);
      expect(filter.frequency.value).toBe(350);

      const shaper = ctx.createWaveShaper();
      expect(shaper).toBeInstanceOf(MockWaveShaperNode);

      const delay = ctx.createDelay(2.0);
      expect(delay).toBeInstanceOf(MockDelayNode);
      expect(delay.maxDelayTime).toBe(2.0);

      const convolver = ctx.createConvolver();
      expect(convolver).toBeInstanceOf(MockConvolverNode);
    });

    it('installs and restores global AudioContext', () => {
      MockAudioContext.installGlobal();
      expect(globalThis.AudioContext).toBe(MockAudioContext);

      MockAudioContext.restoreGlobal();
      expect(globalThis.AudioContext).not.toBe(MockAudioContext);
    });
  });

  describe('Virtual Clock & advanceTime()', () => {
    it('advances currentTime deterministically', () => {
      expect(ctx.currentTime).toBe(0);
      ctx.advanceTime(0.5);
      expect(ctx.currentTime).toBe(0.5);
      ctx.advanceTime(1.25);
      expect(ctx.currentTime).toBeCloseTo(1.75);
    });

    it('throws when attempting to advance time backwards', () => {
      expect(() => ctx.advanceTime(-0.1)).toThrow('Cannot advance time backwards');
    });
  });

  describe('MockAudioParam Automation Curves', () => {
    let param: MockAudioParam;

    beforeEach(() => {
      param = new MockAudioParam(100, 0, 1000);
    });

    it('handles setValueAtTime', () => {
      param.setValueAtTime(200, 1.0);
      expect(param.getValueAtTime(0.5)).toBe(100);
      expect(param.getValueAtTime(1.0)).toBe(200);
      expect(param.getValueAtTime(2.0)).toBe(200);
    });

    it('computes linearRampToValueAtTime interpolation accurately', () => {
      param.setValueAtTime(100, 1.0);
      param.linearRampToValueAtTime(300, 3.0);

      expect(param.getValueAtTime(1.0)).toBe(100);
      expect(param.getValueAtTime(2.0)).toBe(200); // 50% between 100 and 300
      expect(param.getValueAtTime(2.5)).toBe(250); // 75%
      expect(param.getValueAtTime(3.0)).toBe(300);
      expect(param.getValueAtTime(4.0)).toBe(300);
    });

    it('computes exponentialRampToValueAtTime curve accurately', () => {
      param.setValueAtTime(10, 1.0);
      param.exponentialRampToValueAtTime(1000, 3.0);

      expect(param.getValueAtTime(1.0)).toBe(10);
      // At t=2.0 (midway on log scale), value = sqrt(10 * 1000) = 100
      expect(param.getValueAtTime(2.0)).toBeCloseTo(100, 1);
      expect(param.getValueAtTime(3.0)).toBe(1000);
    });

    it('computes setTargetAtTime exponential decay', () => {
      param.setValueAtTime(100, 1.0);
      // Target 0 with timeConstant = 0.5s starting at t=1.0s
      param.setTargetAtTime(0, 1.0, 0.5);

      expect(param.getValueAtTime(1.0)).toBe(100);
      // At t = 1.0 + 0.5 = 1.5s, 1 time constant has elapsed, value should be 100 * e^-1 ~ 36.78
      expect(param.getValueAtTime(1.5)).toBeCloseTo(100 * Math.exp(-1), 1);
      // At t = 1.0 + 1.0 = 2.0s, 2 time constants, value ~ 100 * e^-2 ~ 13.53
      expect(param.getValueAtTime(2.0)).toBeCloseTo(100 * Math.exp(-2), 1);
    });

    it('computes setValueCurveAtTime multi-point array interpolation', () => {
      const curve = new Float32Array([0, 50, 100]);
      param.setValueCurveAtTime(curve, 1.0, 2.0); // from t=1.0 to t=3.0

      expect(param.getValueAtTime(1.0)).toBe(0);
      expect(param.getValueAtTime(2.0)).toBe(50);
      expect(param.getValueAtTime(3.0)).toBe(100);
      expect(param.getValueAtTime(4.0)).toBe(100);
    });

    it('cancels scheduled values after cancelTime', () => {
      param.setValueAtTime(100, 1.0);
      param.linearRampToValueAtTime(500, 3.0);
      param.cancelScheduledValues(2.0);

      expect(param.getValueAtTime(1.0)).toBe(100);
      // Future ramp at t=3.0 was cancelled, so at t=2.5 value remains 100
      expect(param.getValueAtTime(2.5)).toBe(100);
    });

    it('cancels and holds value at cancelTime', () => {
      param.setValueAtTime(100, 0);
      param.linearRampToValueAtTime(300, 2.0); // at t=1.0, value is 200
      param.cancelAndHoldAtTime(1.0);

      expect(param.getValueAtTime(1.0)).toBe(200);
      expect(param.getValueAtTime(3.0)).toBe(200);
    });

    it('clamps values to min and max bounds', () => {
      const boundedParam = new MockAudioParam(0.5, 0.0, 1.0);
      boundedParam.setValueAtTime(1.5, 0);
      expect(boundedParam.getValueAtTime(0)).toBe(1.0);

      boundedParam.setValueAtTime(-0.5, 1.0);
      expect(boundedParam.getValueAtTime(1.0)).toBe(0.0);
    });

    it('updates parameter value automatically during ctx.advanceTime()', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.0, 0);
      gain.gain.linearRampToValueAtTime(0.0, 2.0);

      expect(gain.gain.value).toBe(1.0);
      ctx.advanceTime(1.0);
      expect(gain.gain.value).toBeCloseTo(0.5);
      ctx.advanceTime(1.0);
      expect(gain.gain.value).toBeCloseTo(0.0);
    });
  });

  describe('MockBiquadFilterNode DSP Calculations', () => {
    it('calculates genuine lowpass frequency response (pass low, attenuate high)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.707; // Butterworth Q

      const testFreqs = new Float32Array([100, 1000, 10000]);
      const magResponse = new Float32Array(3);
      const phaseResponse = new Float32Array(3);

      filter.getFrequencyResponse(testFreqs, magResponse, phaseResponse);

      // Low frequency (100 Hz): close to 1.0 gain (0 dB)
      expect(magResponse[0]).toBeGreaterThan(0.95);
      // Cutoff frequency (1000 Hz): approx -3 dB (0.707)
      expect(magResponse[1]).toBeCloseTo(0.707, 1);
      // High frequency (10000 Hz): significantly attenuated (< 0.1)
      expect(magResponse[2]).toBeLessThan(0.05);
    });

    it('calculates genuine highpass frequency response (attenuate low, pass high)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.707;

      const testFreqs = new Float32Array([100, 1000, 10000]);
      const magResponse = new Float32Array(3);
      const phaseResponse = new Float32Array(3);

      filter.getFrequencyResponse(testFreqs, magResponse, phaseResponse);

      // Low frequency (100 Hz): significantly attenuated (< 0.05)
      expect(magResponse[0]).toBeLessThan(0.05);
      // Cutoff frequency (1000 Hz): approx 0.707
      expect(magResponse[1]).toBeCloseTo(0.707, 1);
      // High frequency (10000 Hz): close to 1.0
      expect(magResponse[2]).toBeGreaterThan(0.95);
    });
  });

  describe('Audio Graph Node Connections', () => {
    it('connects audio nodes into an audio processing graph', () => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const delay = ctx.createDelay(1.0);
      const gain = ctx.createGain();

      osc.connect(filter);
      filter.connect(shaper);
      shaper.connect(delay);
      delay.connect(gain);
      gain.connect(ctx.destination);

      expect(osc.connectedNodes).toContain(filter);
      expect(filter.connectedNodes).toContain(shaper);
      expect(shaper.connectedNodes).toContain(delay);
      expect(delay.connectedNodes).toContain(gain);
      expect(gain.connectedNodes).toContain(ctx.destination);
    });

    it('supports disconnecting all or specific nodes', () => {
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();

      gain1.connect(gain2);
      gain1.connect(gain3);
      expect(gain1.connectedNodes.length).toBe(2);

      gain1.disconnect(gain2);
      expect(gain1.connectedNodes).toEqual([gain3]);

      gain1.disconnect();
      expect(gain1.connectedNodes.length).toBe(0);
    });
  });

  describe('Scheduled Audio Sources & Lifecycle', () => {
    it('triggers onended callback and event when source stop time is reached', () => {
      const osc = ctx.createOscillator();
      let endedTriggered = false;

      osc.onended = () => {
        endedTriggered = true;
      };

      osc.start(0);
      osc.stop(1.5);

      expect(endedTriggered).toBe(false);
      ctx.advanceTime(1.0);
      expect(endedTriggered).toBe(false);

      ctx.advanceTime(0.6); // currentTime now 1.6 > 1.5
      expect(endedTriggered).toBe(true);
    });

    it('throws error when starting or stopping oscillator more than once', () => {
      const osc = ctx.createOscillator();
      osc.start(0);
      expect(() => osc.start(1)).toThrow('OscillatorNode cannot be started more than once');

      osc.stop(2);
      expect(() => osc.stop(3)).toThrow('OscillatorNode cannot be stopped more than once');
    });
  });

  describe('AudioBuffer & Convolver Support', () => {
    it('creates and manipulates AudioBuffer channels', () => {
      const buffer = ctx.createBuffer(2, 1024, 48000);
      expect(buffer).toBeInstanceOf(MockAudioBuffer);
      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.length).toBe(1024);
      expect(buffer.sampleRate).toBe(48000);
      expect(buffer.duration).toBeCloseTo(1024 / 48000);

      const ch0 = buffer.getChannelData(0);
      ch0[0] = 0.75;
      expect(buffer.getChannelData(0)[0]).toBe(0.75);

      const convolver = ctx.createConvolver();
      convolver.buffer = buffer;
      expect(convolver.buffer).toBe(buffer);
    });
  });

  describe('0ms Zero-Residue Hard Cut Simulation', () => {
    it('simulates 2.5ms micro-ramp hard cut to absolute silence', () => {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, 0);

      // Perform a 2.5ms micro-ramp to 0 (hard cut anti-click ramp)
      const cutStartTime = 0.5;
      const rampDuration = 0.0025; // 2.5ms
      masterGain.gain.setValueAtTime(0.8, cutStartTime);
      masterGain.gain.linearRampToValueAtTime(0.0, cutStartTime + rampDuration);

      // Advance to just before hard cut
      ctx.advanceTime(0.49);
      expect(masterGain.gain.value).toBe(0.8);

      // Advance to cut mid-point (1.25ms into the ramp)
      ctx.advanceTime(0.01 + 0.00125); // t = 0.50125
      expect(masterGain.gain.value).toBeCloseTo(0.4, 2);

      // Advance past the 2.5ms ramp
      ctx.advanceTime(0.002); // t = 0.50325
      expect(masterGain.gain.value).toBe(0.0);
    });
  });
});
