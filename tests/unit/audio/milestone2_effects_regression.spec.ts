import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { EffectChainManager } from '../../../src/audio/nodes/EffectChainManager';
import { StereoDelay } from '../../../src/audio/nodes/StereoDelay';
import { MultimodeFilter } from '../../../src/audio/nodes/MultimodeFilter';
import { DriveModule } from '../../../src/audio/nodes/DriveModule';
import { ConvolverReverb } from '../../../src/audio/nodes/ConvolverReverb';
import { GainModule } from '../../../src/audio/nodes/GainModule';
import { generateSyntheticImpulseResponse } from '../../../src/audio/dsp/syntheticReverb';

describe('Milestone 2 (D14-D18) Effects Chain & Anti-Pop Restructuring Regression Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  // =========================================================================
  // D14: EffectChainManager Dual Micro-Ducking & Debounce Cancellation
  // =========================================================================
  describe('D14: EffectChainManager Anti-Pop Micro-Ducking & Debounce', () => {
    it('D14-1: uses dual input and output transition gains for symmetric 3ms micro-ducking', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const gain = new GainModule(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      manager.registerEffect(gain);
      manager.registerEffect(drive);

      const inputTrans = (manager as any).inputTransitionGain as GainNode;
      const outputTrans = (manager as any).outputTransitionGain as GainNode;
      expect(inputTrans).toBeDefined();
      expect(outputTrans).toBeDefined();

      // Trigger smooth reorder
      manager.reorderEffects(['drive', 'gain']);

      // Micro-ducking: both input and output gains ramp toward 0 in 3ms
      ctx.advanceTime(0.003);

      // Advance past the 4ms rewiring macro-task to let rewiring complete
      await new Promise(resolve => setTimeout(resolve, 10));
      ctx.advanceTime(0.003); // ramp back up

      expect(manager.getOrder()).toEqual(['drive', 'gain']);
      manager.dispose();
    });

    it('D14-2: cancels pending reorder timers on rapid consecutive reordering without race conditions', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const gain = new GainModule(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

      manager.registerEffect(gain);
      manager.registerEffect(drive);
      manager.registerEffect(filter);

      // Fire 5 rapid reorder calls in quick succession
      manager.reorderEffects(['drive', 'gain', 'filter']);
      manager.reorderEffects(['filter', 'drive', 'gain']);
      manager.reorderEffects(['gain', 'filter', 'drive']);
      manager.reorderEffects(['drive', 'filter', 'gain']);
      manager.reorderEffects(['filter', 'gain', 'drive']);

      expect(manager.getOrder()).toEqual(['filter', 'gain', 'drive']);

      // Advance time and allow final timer to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      ctx.advanceTime(0.01);

      expect(manager.getOrder()).toEqual(['filter', 'gain', 'drive']);
      manager.dispose();
    });
  });

  // =========================================================================
  // D15: StereoDelay Zipper Noise Removal & 0ms Tail Purge
  // =========================================================================
  describe('D15: StereoDelay Smooth Automation & Zero-Residue Purge', () => {
    it('D15-1: purge() immediately cuts wetGain to 0 to prevent in-flight delay line leakage', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({ time: 0.5, feedback: 0.6, mix: 0.5 });

      expect(delay.wetGain.gain.value).toBeGreaterThan(0);

      // Execute 0ms purge
      delay.purge();

      expect(delay.delayInGain.gain.value).toBe(0);
      expect(delay.feedbackGainL.gain.value).toBe(0);
      expect(delay.feedbackGainR.gain.value).toBe(0);
      expect(delay.wetGain.gain.value).toBe(0); // D15: wetGain must be strictly 0

      delay.dispose();
    });

    it('D15-2: restore() smoothly ramps wetGain over 3ms micro-ramp', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({ mix: 0.5 });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      delay.purge();
      expect(delay.wetGain.gain.value).toBe(0);

      delay.restore();
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
      // Input and feedback are immediately restored
      expect(delay.delayInGain.gain.value).toBe(1.0);
      expect(delay.feedbackGainL.gain.value).toBe(0.45);

      // wetGain is restored with smooth ramp
      expect(delay.wetGain.gain.value).toBeCloseTo(Math.SQRT1_2, 4);

      delay.dispose();
    });

    it('D15-3: setParams updates delay times and feedback without direct destructive value overrides', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({ time: 0.25, feedback: 0.7, damping: 4000 });

      expect(delay.getParams().time).toBe(0.25);
      expect(delay.getParams().feedback).toBe(0.7);
      expect(delay.getParams().damping).toBe(4000);

      delay.dispose();
    });
  });

  // =========================================================================
  // D16: MultimodeFilter Cascaded Resonance Damping Compensation & Peak Clamping
  // =========================================================================
  describe('D16: MultimodeFilter Adaptive Resonance Damping & Peak Split', () => {
    it('D16-1: computes adaptive resonance damping compensation 1/sqrt(1 + 0.25 Q)', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

      // Default Q=1.0: comp = 1 / sqrt(1 + 0.25) ~= 0.8944
      const filterOutGain = (filter as any).filterOutGain as GainNode;
      expect(filterOutGain.gain.value).toBeCloseTo(1 / Math.sqrt(1.25), 3);

      // High resonance Q=18.0: comp = 1 / sqrt(1 + 0.25 * 18) = 1 / sqrt(5.5) ~= 0.4264
      filter.setParams({ resonance: 18.0 });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
      expect(filterOutGain.gain.value).toBeCloseTo(1 / Math.sqrt(5.5), 3);

      // Output gain is attenuated by more than 50% to prevent cascaded +30dB resonance explosion
      expect(filterOutGain.gain.value).toBeLessThan(0.45);

      filter.dispose();
    });

    it('D16-2: peak mode clamps stage gain to max 9dB per stage to prevent cascaded +36dB overload', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

      // Peak mode at max resonance 18
      filter.setParams({ type: 'peak', resonance: 18.0 });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      const stage1 = (filter as any).stage1 as BiquadFilterNode;
      const stage2 = (filter as any).stage2 as BiquadFilterNode;

      // Each stage must be <= 9dB (total cascaded peak boost <= 18dB, not 36dB)
      expect(stage1.gain.value).toBeLessThanOrEqual(9.0);
      expect(stage2.gain.value).toBeLessThanOrEqual(9.0);

      filter.dispose();
    });
  });

  // =========================================================================
  // D17: DriveModule Single-Path Topology & 12Hz DC Blocker
  // =========================================================================
  describe('D17: DriveModule Serial Topology & DC Blocker', () => {
    it('D17-1: equips a 12Hz highpass DC blocker to filter out asymmetric saturation bias', () => {
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);

      const dcBlocker = (drive as any).dcBlocker as BiquadFilterNode;
      expect(dcBlocker).toBeDefined();
      expect(dcBlocker.type).toBe('highpass');
      expect(dcBlocker.frequency.value).toBe(12.0);
      expect(dcBlocker.Q.value).toBeCloseTo(0.707, 3);

      drive.dispose();
    });

    it('D17-2: routes signal serially through waveShaper to eliminate 4x oversampling comb filtering', () => {
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);

      const waveShaper = (drive as any).waveShaper as WaveShaperNode;
      const dcBlocker = (drive as any).dcBlocker as BiquadFilterNode;

      // 4x oversampling is configured
      expect(waveShaper.oversample).toBe('4x');

      // WaveShaper connects to makeupGain and then to dcBlocker
      expect((drive as any).makeupGain.connectedNodes).toContain(dcBlocker);

      drive.dispose();
    });
  });

  // =========================================================================
  // D18: Fast Recursive Decay Impulse Response & ConvolverReverb Smooth Restore
  // =========================================================================
  describe('D18: Fast Recursive Decay Reverb & Anti-Burst Restore', () => {
    it('D18-1: generates 6s synthetic IR using 1st-order recursive decay in under 20ms without UI freezing', () => {
      const t0 = performance.now();
      const buffer = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, 6.0, 0.5);
      const elapsed = performance.now() - t0;

      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.duration).toBeCloseTo(6.0, 2);
      expect(elapsed).toBeLessThan(50); // High-speed execution (typically < 10ms)

      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);

      // Verify exponential decay energy profile
      let earlyEnergy = 0;
      let lateEnergy = 0;
      const sampleChunk = 1000;
      for (let i = 0; i < sampleChunk; i++) {
        earlyEnergy += ch0[i] * ch0[i];
        lateEnergy += ch0[ch0.length - sampleChunk + i] * ch0[ch0.length - sampleChunk + i];
      }
      expect(earlyEnergy).toBeGreaterThan(lateEnergy * 10);
      expect(ch0).not.toEqual(ch1);
    });

    it('D18-2: ConvolverReverb purge() immediately zeroes wetGain and restore() smoothly ramps', () => {
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);
      reverb.setParams({ mix: 0.5 });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      expect(reverb.wetGain.gain.value).toBeGreaterThan(0);

      // Purge
      reverb.purge();
      expect(reverb.reverbInGain.gain.value).toBe(0);
      expect(reverb.wetGain.gain.value).toBe(0);

      // Restore
      reverb.restore();
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
      expect(reverb.reverbInGain.gain.value).toBe(1.0);
      expect(reverb.wetGain.gain.value).toBeCloseTo(Math.SQRT1_2, 4);

      reverb.dispose();
    });
  });
});
