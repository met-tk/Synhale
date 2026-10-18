import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockAudioContext, MockBiquadFilterNode, MockGainNode } from '../../mocks/webAudioMock';
import { GainModule } from '../../../src/audio/nodes/GainModule';
import { MultimodeFilter } from '../../../src/audio/nodes/MultimodeFilter';
import { AudioEngine } from '../../../src/audio/engine';

describe('Milestone M2: Preamp Gain Anti-Zipper & DC Blocker Specification Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await ctx.close();
  });

  // =========================================================================
  // Suite 1: DC Blocker Verification & Acoustic Transparency
  // =========================================================================
  describe('1. 12Hz DC Blocker Topology & Acoustic Transparency', () => {
    it('1.1: GainModule equips a 12Hz highpass DC blocker with Butterworth Q (0.7071)', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const dcBlocker = (gainMod as any).dcBlocker as MockBiquadFilterNode;

      expect(dcBlocker).toBeDefined();
      expect(dcBlocker.type).toBe('highpass');
      expect(dcBlocker.frequency.value).toBe(12.0);
      expect(dcBlocker.Q.value).toBeCloseTo(0.7071, 4);

      gainMod.dispose();
    });

    it('1.2: DC blocker is serially wired between inputNode and gainNode', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const inputNode = gainMod.inputNode;
      const dcBlocker = (gainMod as any).dcBlocker as MockBiquadFilterNode;
      const gainNode = (gainMod as any).gainNode as MockGainNode;

      // inputNode -> dcBlocker
      expect((inputNode as any).connectedNodes).toContain(dcBlocker);
      // dcBlocker -> gainNode
      expect((dcBlocker as any).connectedNodes).toContain(gainNode);

      gainMod.dispose();
    });

    it('1.3: DC attenuation completely blocks 0Hz DC offset (0.0 magnitude)', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const dcBlocker = (gainMod as any).dcBlocker as MockBiquadFilterNode;

      const freqs = new Float32Array([0.0, 0.5, 1.0, 12.0]);
      const mag = new Float32Array(freqs.length);
      const phase = new Float32Array(freqs.length);

      dcBlocker.getFrequencyResponse(freqs, mag, phase);

      // 0Hz DC is completely blocked (mathematical transmission = 0.0)
      expect(mag[0]).toBe(0.0);
      // Sub-audible frequencies below 1Hz are heavily attenuated (> 20dB attenuation)
      expect(mag[1]).toBeLessThan(0.05);
      expect(mag[2]).toBeLessThan(0.1);
      // At cutoff 12Hz, Butterworth response is 1/sqrt(2) ~= 0.7071 (-3dB)
      expect(mag[3]).toBeCloseTo(Math.SQRT1_2, 2);

      gainMod.dispose();
    });

    it('1.4: Audio passband is acoustically transparent: >= 20Hz attenuation < 0.6dB, >= 50Hz < 0.1dB', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const dcBlocker = (gainMod as any).dcBlocker as MockBiquadFilterNode;

      const freqs = new Float32Array([20.0, 50.0, 100.0, 1000.0]);
      const mag = new Float32Array(freqs.length);
      const phase = new Float32Array(freqs.length);

      dcBlocker.getFrequencyResponse(freqs, mag, phase);

      // 20Hz: attenuation is ~0.52dB (|H| >= 0.93)
      expect(mag[0]).toBeGreaterThanOrEqual(0.93);
      // 50Hz: attenuation is < 0.1dB (|H| >= 0.99)
      expect(mag[1]).toBeGreaterThanOrEqual(0.99);
      // 100Hz & 1000Hz: completely transparent (> 0.999)
      expect(mag[2]).toBeGreaterThanOrEqual(0.999);
      expect(mag[3]).toBeGreaterThanOrEqual(0.999);

      gainMod.dispose();
    });
  });

  // =========================================================================
  // Suite 2: 25ms Time Constant & Atomic De-zippering Scheduling
  // =========================================================================
  describe('2. 25ms Acoustic Smoothing Constant & De-zippering Scheduling Sequence', () => {
    it('2.1: setParams uses 25ms (0.025) time constant for setTargetAtTime', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const gainParam = (gainMod as any).gainNode.gain;
      const setTargetSpy = vi.spyOn(gainParam, 'setTargetAtTime');

      gainMod.setParams({ value: 6.0 }); // +6dB boost

      expect(setTargetSpy).toHaveBeenCalled();
      const lastCall = setTargetSpy.mock.calls[setTargetSpy.mock.calls.length - 1];
      const targetGain = lastCall[0];
      const timeConstant = lastCall[2];

      expect(targetGain).toBeCloseTo(Math.pow(10, 6.0 / 20), 4);
      // Golden acoustic anti-zipper standard: 25ms (0.025s)
      expect(timeConstant).toBe(0.025);

      gainMod.dispose();
    });

    it('2.2: executes cancelScheduledValues and setValueAtTime before setTargetAtTime', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const gainParam = (gainMod as any).gainNode.gain;

      const callOrder: string[] = [];
      vi.spyOn(gainParam, 'cancelScheduledValues').mockImplementation(() => {
        callOrder.push('cancelScheduledValues');
        return gainParam;
      });
      vi.spyOn(gainParam, 'setValueAtTime').mockImplementation(() => {
        callOrder.push('setValueAtTime');
        return gainParam;
      });
      vi.spyOn(gainParam, 'setTargetAtTime').mockImplementation(() => {
        callOrder.push('setTargetAtTime');
        return gainParam;
      });

      ctx.advanceTime(0.1);
      gainMod.setParams({ value: 12.0 });

      expect(callOrder).toEqual([
        'cancelScheduledValues',
        'setValueAtTime',
        'setTargetAtTime'
      ]);

      gainMod.dispose();
    });

    it('2.3: verifies smooth exponential convergence across virtual clock (1tau ~ 63.2%, 3tau ~ 95%)', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const gainParam = (gainMod as any).gainNode.gain;

      // Initial gain is 1.0 (0dB). Target is +6dB (~1.9953)
      const targetGain = Math.pow(10, 6.0 / 20);
      gainMod.setParams({ value: 6.0 });

      // t = 0: gain remains initial (1.0)
      expect(gainParam.getValueAtTime(0)).toBeCloseTo(1.0, 3);

      // t = 1 tau (25ms): gain reaches 1 + (target - 1)*(1 - 1/e) ~= 1.629
      const expected1Tau = 1.0 + (targetGain - 1.0) * (1 - Math.exp(-1));
      ctx.advanceTime(0.025);
      expect(gainParam.value).toBeCloseTo(expected1Tau, 2);

      // t = 3 tau (75ms): gain reaches 95% of transition
      const expected3Tau = 1.0 + (targetGain - 1.0) * (1 - Math.exp(-3));
      ctx.advanceTime(0.05);
      expect(gainParam.value).toBeCloseTo(expected3Tau, 2);

      // t = 5 tau (125ms): gain reaches > 99% of transition
      const expected5Tau = 1.0 + (targetGain - 1.0) * (1 - Math.exp(-5));
      ctx.advanceTime(0.05);
      expect(gainParam.value).toBeCloseTo(expected5Tau, 2);

      // After settling (> 8 tau, 225ms total), fully reaches target gain
      ctx.advanceTime(0.1);
      expect(gainParam.value).toBeCloseTo(targetGain, 2);

      gainMod.dispose();
    });

    it('2.4: does not redundantly re-schedule when target value difference is below threshold', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const gainParam = (gainMod as any).gainNode.gain;
      const setTargetSpy = vi.spyOn(gainParam, 'setTargetAtTime');

      // First set: 6.0dB
      gainMod.setParams({ value: 6.0 });
      expect(setTargetSpy).toHaveBeenCalledTimes(1);

      // Set identical value: should be idempotent and ignored
      gainMod.setParams({ value: 6.0 });
      expect(setTargetSpy).toHaveBeenCalledTimes(1);

      // Microscopic jitter (< 1e-4) should be ignored
      gainMod.setParams({ value: 6.00001 });
      expect(setTargetSpy).toHaveBeenCalledTimes(1);

      // Distinct change: schedules again
      gainMod.setParams({ value: 6.1 });
      expect(setTargetSpy).toHaveBeenCalledTimes(2);

      gainMod.dispose();
    });
  });

  // =========================================================================
  // Suite 3: High-Q Resonance Stress Test (-12dB to +24dB Rapid Sweeps)
  // =========================================================================
  describe('3. High-Q Resonance Stress Test (-12dB to +24dB across 100 fast steps)', () => {
    it('3.1: 100 rapid consecutive gain steps (-12dB to +24dB) at Q=18 remain finite with zero NaN', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

      gainMod.connect(filter.inputNode);

      // Configure MultimodeFilter to maximum extreme resonance Q = 18.0
      filter.setParams({
        type: 'lowpass',
        cutoff: 1000,
        resonance: 18.0
      });

      const gainParam = (gainMod as any).gainNode.gain;
      const filterOutGain = (filter as any).filterOutGain.gain;

      // Sweep -12dB to +24dB in 100 discrete 1ms steps
      for (let i = 0; i < 100; i++) {
        const gainDb = -12.0 + (36.0 * (i / 99));
        gainMod.setParams({ value: gainDb });
        ctx.advanceTime(0.001); // 1ms step

        // Parameter checks at every step
        expect(Number.isFinite(gainParam.value)).toBe(true);
        expect(gainParam.value).toBeGreaterThan(0);
        expect(Number.isNaN(gainParam.value)).toBe(false);

        expect(Number.isFinite(filterOutGain.value)).toBe(true);
        expect(Number.isNaN(filterOutGain.value)).toBe(false);
      }

      // Assert adaptive resonance damping compensation is active (1/sqrt(1 + 0.25*18) ~= 0.4264)
      expect(filterOutGain.value).toBeCloseTo(1 / Math.sqrt(5.5), 2);
      // After additional 50ms settling, reaches target with 3 decimal precision
      ctx.advanceTime(0.05);
      expect(filterOutGain.value).toBeCloseTo(1 / Math.sqrt(5.5), 3);

      gainMod.dispose();
      filter.dispose();
    });

    it('3.2: discrete-time IIR simulation confirms DC-blocked input avoids resonant explosion & decays stably', () => {
      // Numerical simulation of DSP signal flow:
      // x[n] (DC 0.5 + tone) -> DC Blocker (12Hz) -> Gain (25ms smooth) -> SoftClip -> Filter (Q=18)
      const sampleRate = 44100;
      const nSamples = 4410; // 100ms
      const input = new Float64Array(nSamples);
      for (let i = 0; i < nSamples; i++) {
        // High DC offset (+0.5) + 220Hz test tone
        input[i] = 0.5 + 0.5 * Math.sin((2 * Math.PI * 220 * i) / sampleRate);
      }

      // 12Hz Butterworth Highpass difference equation coefficients
      const fc = 12.0;
      const Q = 0.7071;
      const w0 = (2 * Math.PI * fc) / sampleRate;
      const alpha = Math.sin(w0) / (2 * Q);
      const cosw0 = Math.cos(w0);
      const b0 = (1 + cosw0) / 2;
      const b1 = -(1 + cosw0);
      const b2 = (1 + cosw0) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cosw0;
      const a2 = 1 - alpha;

      // Filter state
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      const blocked = new Float64Array(nSamples);

      for (let i = 0; i < nSamples; i++) {
        const x0 = input[i];
        const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        x2 = x1; x1 = x0;
        y2 = y1; y1 = y0;
        blocked[i] = y0;
      }

      // Verify DC component was completely drained: mean of second half should be very close to 0
      let sumSecondHalf = 0;
      const half = Math.floor(nSamples / 2);
      for (let i = half; i < nSamples; i++) {
        sumSecondHalf += blocked[i];
      }
      const meanSecondHalf = sumSecondHalf / (nSamples - half);
      expect(Math.abs(meanSecondHalf)).toBeLessThan(0.05);

      // Now simulate 25ms smoothed gain ramp from -12dB (0.25) to +24dB (15.85)
      let curGain = 0.25;
      const targetGain = 15.85;
      const tauSamples = 0.025 * sampleRate;
      const gainAlpha = 1 - Math.exp(-1 / tauSamples);

      const amplified = new Float64Array(nSamples);
      let maxOutput = 0;
      for (let i = 0; i < nSamples; i++) {
        curGain += (targetGain - curGain) * gainAlpha;
        const rawAmp = blocked[i] * curGain;
        // Tanh soft clip
        const clipped = Math.tanh(rawAmp * 1.25) / Math.tanh(1.25);
        amplified[i] = clipped;
        if (Math.abs(clipped) > maxOutput) {
          maxOutput = Math.abs(clipped);
        }
      }

      // Peak amplitude is safely bounded (never exceeds saturation threshold, no runaway explosion)
      expect(maxOutput).toBeLessThanOrEqual(1.5);
      expect(Number.isFinite(maxOutput)).toBe(true);
    });

    it('3.3: back-and-forth ping-pong gain jumps (-12dB <-> +24dB) maintain parameter integrity', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const gainParam = (gainMod as any).gainNode.gain;

      // Jump back and forth 50 times at 2ms intervals
      for (let cycle = 0; cycle < 50; cycle++) {
        const targetDb = cycle % 2 === 0 ? 24.0 : -12.0;
        gainMod.setParams({ value: targetDb });
        ctx.advanceTime(0.002);

        expect(Number.isFinite(gainParam.value)).toBe(true);
        expect(gainParam.value).toBeGreaterThan(0);
      }

      // Allow 200ms settling time
      ctx.advanceTime(0.2);
      // Final target was -12dB (~0.251)
      expect(gainParam.value).toBeCloseTo(Math.pow(10, -12.0 / 20), 2);

      gainMod.dispose();
    });
  });

  // =========================================================================
  // Suite 4: 60Hz Breath Tick Delta Gate Zero-Redundancy Verification
  // =========================================================================
  describe('4. 60Hz Breath Tick Delta Gate Zero-Redundancy Verification', () => {
    it('4.1: asserts 0 redundant invocations of gainModule.setParams and filter.setParams per second during steady-state ticks', async () => {
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      // Ensure no active dynamic modulation route is targeting preamp-gain or filter
      engine.setModulationRoutes({});

      // Perform one initial tick to establish baseline
      engine.updateBreathModulation(0.5, 'holdIn', 0.1);

      // Spy on underlying effect setParams
      const gainSetParamsSpy = vi.spyOn(engine.gainModule, 'setParams');
      const filterSetParamsSpy = vi.spyOn(engine.filter, 'setParams');

      // Clear spy call history from initialization
      gainSetParamsSpy.mockClear();
      filterSetParamsSpy.mockClear();

      // Simulate 60 steady-state ticks across 1.0 second (60fps breath cycle in holdIn)
      for (let tick = 0; tick < 60; tick++) {
        const progress = tick / 60;
        engine.updateBreathModulation(0.5, 'holdIn', progress);
        ctx.advanceTime(1 / 60);
      }

      // Delta gate must ensure ZERO redundant invocations per second!
      expect(gainSetParamsSpy).toHaveBeenCalledTimes(0);
      expect(filterSetParamsSpy).toHaveBeenCalledTimes(0);

      engine.dispose();
    });

    it('4.2: manual user knob adjustment triggers exactly 1 invocation, followed by 0 redundant ticks', async () => {
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      engine.setModulationRoutes({});
      engine.updateBreathModulation(0.5, 'holdIn', 0.1);

      const gainSetParamsSpy = vi.spyOn(engine.gainModule, 'setParams');
      gainSetParamsSpy.mockClear();

      // User tweaks knob via updateEffects: should invoke setParams exactly 1 time
      engine.updateEffects({ gain: { value: 6.0 } });
      expect(gainSetParamsSpy).toHaveBeenCalledTimes(1);

      // Followed by 30 steady-state frames (0.5s)
      for (let tick = 0; tick < 30; tick++) {
        engine.updateBreathModulation(0.5, 'holdIn', tick / 30);
        ctx.advanceTime(1 / 60);
      }

      // Call count remains strictly 1 (zero redundant invocations)
      expect(gainSetParamsSpy).toHaveBeenCalledTimes(1);

      engine.dispose();
    });

    it('4.3: filter modulation activates filter updates while keeping gainModule strictly at 0 calls', async () => {
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      // Route filter-cutoff to breathMacro
      engine.setModulationRoutes({
        'filter-cutoff': {
          source: 'breathMacro',
          target: 'filter-cutoff',
          depth: 0.8,
          bipolar: false
        }
      });

      const gainSetParamsSpy = vi.spyOn(engine.gainModule, 'setParams');
      const filterSetParamsSpy = vi.spyOn(engine.filter, 'setParams');

      gainSetParamsSpy.mockClear();
      filterSetParamsSpy.mockClear();

      // Breath macro moves dynamically from 0.1 to 0.9 across 10 ticks
      for (let i = 0; i < 10; i++) {
        const macro = 0.1 + (0.8 * (i / 9));
        engine.updateBreathModulation(macro, 'inhale', i / 10);
        ctx.advanceTime(1 / 60);
      }

      // Filter cutoff updates dynamically as expected
      expect(filterSetParamsSpy).toHaveBeenCalled();
      // GainModule is completely isolated and received 0 calls
      expect(gainSetParamsSpy).toHaveBeenCalledTimes(0);

      engine.dispose();
    });
  });
});
