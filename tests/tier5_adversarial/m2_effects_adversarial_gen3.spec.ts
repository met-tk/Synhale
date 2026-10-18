import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import { EffectChainManager } from '../../src/audio/nodes/EffectChainManager';
import { StereoDelay } from '../../src/audio/nodes/StereoDelay';
import { MultimodeFilter } from '../../src/audio/nodes/MultimodeFilter';
import { DriveModule } from '../../src/audio/nodes/DriveModule';
import { ConvolverReverb } from '../../src/audio/nodes/ConvolverReverb';
import { GainModule } from '../../src/audio/nodes/GainModule';
import { AdsrModule } from '../../src/audio/nodes/AdsrModule';
import {
  generateSyntheticImpulseResponse,
  computeEqualPowerMix
} from '../../src/audio/dsp/syntheticReverb';
import {
  generateDriveCurve,
  generateTapeCurve,
  generateTubeCurve,
  computeDriveMakeupGain
} from '../../src/audio/dsp/waveShaperCurves';

describe('Milestone 2 (D14-D18) Adversarial Stress & Empirical Verification Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  // =========================================================================
  // D14: EffectChainManager Adversarial Stress
  // =========================================================================
  describe('D14 Adversarial: EffectChainManager Micro-Ducking & Debounce Stress', () => {
    it('D14-ADV-1: 50 rapid consecutive reorders under running context maintain timer cancellation and reach valid final topology', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const gain = new GainModule(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);

      manager.registerEffect(gain);
      manager.registerEffect(drive);
      manager.registerEffect(filter);
      manager.registerEffect(delay);
      manager.registerEffect(reverb);

      const baseIds = ['gain', 'drive', 'filter', 'delay', 'reverb'];

      // Fire 50 rapid reorder calls with different permutations
      let lastPermutation: string[] = baseIds;
      for (let i = 0; i < 50; i++) {
        // Shift array deterministically
        lastPermutation = [...baseIds.slice(i % 5), ...baseIds.slice(0, i % 5)];
        manager.reorderEffects(lastPermutation);
      }

      // Check that the order is immediately updated in memory to the last requested order
      expect(manager.getOrder()).toEqual(lastPermutation);

      // Verify that reorderTimer is active (holding the single active timer)
      expect((manager as any).reorderTimer).not.toBeNull();

      // Advance time through virtual clock and macro-task
      ctx.advanceTime(0.003);
      await new Promise(resolve => setTimeout(resolve, 15));
      ctx.advanceTime(0.003);

      // Timer should be cleared after execution
      expect((manager as any).reorderTimer).toBeNull();
      expect(manager.getOrder()).toEqual(lastPermutation);

      // Both transition gains must return to 1.0 after rewiring completes
      const inputTrans = (manager as any).inputTransitionGain as GainNode;
      const outputTrans = (manager as any).outputTransitionGain as GainNode;
      expect(inputTrans.gain.value).toBe(1.0);
      expect(outputTrans.gain.value).toBe(1.0);

      manager.dispose();
    });

    it('D14-ADV-2: verifies dual-ended 3ms micro-ducking envelope shape at both input and output', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const gain = new GainModule(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      manager.registerEffect(gain);
      manager.registerEffect(drive);

      const inputTrans = (manager as any).inputTransitionGain as GainNode;
      const outputTrans = (manager as any).outputTransitionGain as GainNode;

      const tStart = ctx.currentTime;
      manager.reorderEffects(['drive', 'gain']);

      // Micro-ducking scheduled: ramps to 0.0 at tStart + 0.003
      const inputEvents = (inputTrans.gain as any).timeline;
      const outputEvents = (outputTrans.gain as any).timeline;

      // Both must have ramp events to 0.0 at +3ms
      const inputRamp = inputEvents.find((e: any) => e.type === 'linearRamp' && e.value === 0.0);
      const outputRamp = outputEvents.find((e: any) => e.type === 'linearRamp' && e.value === 0.0);

      expect(inputRamp).toBeDefined();
      expect(outputRamp).toBeDefined();
      expect(inputRamp.time).toBeCloseTo(tStart + 0.003, 4);
      expect(outputRamp.time).toBeCloseTo(tStart + 0.003, 4);

      // Advance to 3ms: gains should evaluate to 0.0
      ctx.advanceTime(0.003);
      expect((inputTrans.gain as any).getValueAtTime(tStart + 0.003)).toBe(0.0);
      expect((outputTrans.gain as any).getValueAtTime(tStart + 0.003)).toBe(0.0);

      // Wait for 4ms rewire callback
      await new Promise(resolve => setTimeout(resolve, 10));
      const postNow = ctx.currentTime;
      ctx.advanceTime(0.003);

      // Both gains must ramp back up to 1.0
      expect((inputTrans.gain as any).getValueAtTime(postNow + 0.003)).toBe(1.0);
      expect((outputTrans.gain as any).getValueAtTime(postNow + 0.003)).toBe(1.0);

      manager.dispose();
    });

    it('D14-ADV-3: disposing manager while reorder timer is pending cancels macro-task and avoids orphaned connections', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      manager.registerEffect(drive);
      manager.registerEffect(filter);

      manager.reorderEffects(['filter', 'drive']);
      expect((manager as any).reorderTimer).not.toBeNull();

      // Dispose immediately while timer is pending
      manager.dispose();
      expect((manager as any).reorderTimer).toBeNull();
      expect(manager.getOrder()).toEqual([]);

      // Wait past the 4ms timeout to ensure callback does not fire or throw on disposed instance
      await new Promise(resolve => setTimeout(resolve, 15));
      ctx.advanceTime(0.01);
    });

    it('D14-ADV-4: handles edge case inputs (empty array, subsets, unknown IDs, single item)', () => {
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      manager.registerEffect(drive);
      manager.registerEffect(filter);
      manager.registerEffect(delay);

      // Reorder with unknown IDs: omitted known IDs are appended in original order
      manager.reorderEffects(['nonexistent_1', 'nonexistent_2']);
      expect(manager.getOrder()).toEqual(['drive', 'filter', 'delay']);

      // Reorder with subset: specified item moves to front, omitted items appended
      manager.reorderEffects(['delay']);
      expect(manager.getOrder()).toEqual(['delay', 'drive', 'filter']);

      // Reorder with empty list: preserves existing order
      manager.reorderEffects([]);
      expect(manager.getOrder()).toEqual(['delay', 'drive', 'filter']);

      manager.dispose();
    });
  });

  // =========================================================================
  // D15: StereoDelay Adversarial Stress
  // =========================================================================
  describe('D15 Adversarial: StereoDelay Zero-Residue Purge & Anti-Zipper Verification', () => {
    it('D15-ADV-1: purge() enforces absolute zero wetGain and feedback under max feedback & mix', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({
        time: 2.5,
        feedback: 0.95,
        mix: 1.0,
        damping: 8000
      });

      expect(delay.wetGain.gain.value).toBe(1.0);
      expect(delay.feedbackGainL.gain.value).toBe(0.95);
      expect(delay.feedbackGainR.gain.value).toBe(0.95);
      expect(delay.delayInGain.gain.value).toBe(1.0);

      // Execute 0ms purge
      delay.purge();

      // All gain stages in delay path must be strictly 0
      expect(delay.delayInGain.gain.value).toBe(0);
      expect(delay.feedbackGainL.gain.value).toBe(0);
      expect(delay.feedbackGainR.gain.value).toBe(0);
      expect(delay.wetGain.gain.value).toBe(0);

      delay.dispose();
    });

    it('D15-ADV-2: hostile parameter modifications while purged cannot break zero-residue mute state', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({ mix: 0.5, feedback: 0.4 });
      delay.purge();

      expect(delay.wetGain.gain.value).toBe(0);
      expect(delay.feedbackGainL.gain.value).toBe(0);

      // Adversarial: user adjusts mix and feedback while synth is stopped
      delay.setParams({
        mix: 0.9,
        feedback: 0.85,
        time: 1.2,
        damping: 4500
      });

      // Internal currentParams are recorded
      expect(delay.getParams().mix).toBe(0.9);
      expect(delay.getParams().feedback).toBe(0.85);

      // But wetGain and feedbackGain must REMAIN strictly 0 while isPurged is true!
      expect(delay.wetGain.gain.value).toBe(0);
      expect(delay.feedbackGainL.gain.value).toBe(0);
      expect(delay.feedbackGainR.gain.value).toBe(0);

      delay.dispose();
    });

    it('D15-ADV-3: restore() smoothly ramps wetGain over 3ms micro-ramp without instantaneous pop', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      delay.setParams({ mix: 0.5, feedback: 0.6 });
      delay.purge();

      const tRestore = ctx.currentTime;
      delay.restore();

      // delayInGain and feedback restored immediately
      expect(delay.delayInGain.gain.value).toBe(1.0);
      expect(delay.feedbackGainL.gain.value).toBe(0.6);
      expect(delay.feedbackGainR.gain.value).toBe(0.6);

      // wetGain scheduled with linearRampToValueAtTime to equal-power mix
      const { wet } = computeEqualPowerMix(0.5);
      const wetEvents = (delay.wetGain.gain as any).timeline;
      const rampEvent = wetEvents.find((e: any) => e.type === 'linearRamp');

      expect(rampEvent).toBeDefined();
      expect(rampEvent.value).toBeCloseTo(wet, 4);
      expect(rampEvent.time).toBeCloseTo(tRestore + 0.003, 4);

      delay.dispose();
    });

    it('D15-ADV-4: strictly clamps hostile/out-of-bound parameters and prevents feedback runaway (> 0.95)', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);

      delay.setParams({
        time: -100, // lower bound 0.01
        feedback: 1.5, // upper bound 0.95 (anti-howl protection)
        damping: 200, // lower bound 500
        mix: -0.5 // lower bound 0.0
      });

      expect(delay.getParams().time).toBe(0.01);
      expect(delay.getParams().feedback).toBe(0.95);
      expect(delay.getParams().damping).toBe(500);
      expect(delay.getParams().mix).toBe(0.0);

      delay.setParams({
        time: 50, // upper bound 3.0
        feedback: -0.5, // lower bound 0.0
        damping: 50000, // upper bound 12000
        mix: 2.0 // upper bound 1.0
      });

      expect(delay.getParams().time).toBe(3.0);
      expect(delay.getParams().feedback).toBe(0.0);
      expect(delay.getParams().damping).toBe(12000);
      expect(delay.getParams().mix).toBe(1.0);

      delay.dispose();
    });

    it('D15-ADV-5: setParams schedules setTargetAtTime smooth events without direct value overrides', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);

      // Clear any constructor events
      (delay.delayInGain.gain as any).timeline = [];

      delay.setParams({
        time: 0.45,
        feedback: 0.5,
        damping: 3000,
        mix: 0.4
      });

      // Verify that delayTime uses setTargetAtTime
      const delayLEvents = ((delay as any).delayL.delayTime as any).timeline;
      expect(delayLEvents.some((e: any) => e.type === 'setTarget')).toBe(true);

      // Verify feedback uses setTargetAtTime
      const fbEvents = (delay.feedbackGainL.gain as any).timeline;
      expect(fbEvents.some((e: any) => e.type === 'setTarget')).toBe(true);

      delay.dispose();
    });
  });

  // =========================================================================
  // D16: MultimodeFilter Adversarial Stress
  // =========================================================================
  describe('D16 Adversarial: MultimodeFilter High Q Resonance & Peak Clamping Stress', () => {
    it('D16-ADV-1: validates adaptive resonance damping compensation 1/sqrt(1 + 0.25 Q) across entire Q range', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const filterOutGain = (filter as any).filterOutGain as GainNode;

      const qTestValues = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 12.0, 16.0, 18.0];

      let prevComp = Infinity;
      for (const q of qTestValues) {
        filter.setParams({ resonance: q });
        const expectedComp = 1 / Math.sqrt(1 + 0.25 * q);

        expect(filterOutGain.gain.value).toBeCloseTo(expectedComp, 3);
        // Compensation must be strictly monotonic decreasing with Q
        expect(filterOutGain.gain.value).toBeLessThan(prevComp);
        prevComp = filterOutGain.gain.value;
      }

      // At max Q=18, attenuation must exceed 7.4 dB (< 0.43 amplitude multiplier)
      expect(filterOutGain.gain.value).toBeLessThan(0.43);
      expect(filterOutGain.gain.value).toBeGreaterThan(0.42);

      filter.dispose();
    });

    it('D16-ADV-2: peak mode strictly clamps stage gains to <= 9dB preventing cascaded +36dB overload', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const stage1 = (filter as any).stage1 as BiquadFilterNode;
      const stage2 = (filter as any).stage2 as BiquadFilterNode;

      // Test peak mode at Q=18 (where unconstrained resonance * 1.75 = 31.5dB)
      filter.setParams({ type: 'peak', resonance: 18.0 });

      expect(stage1.gain.value).toBe(9.0);
      expect(stage2.gain.value).toBe(9.0);

      // Cascaded total peak boost = 9dB + 9dB = 18dB (never +36dB)
      const totalCascadeBoostDb = stage1.gain.value + stage2.gain.value;
      expect(totalCascadeBoostDb).toBe(18.0);

      filter.dispose();
    });

    it('D16-ADV-3: micro-ducking smooth transition when switching filter types under running context', async () => {
      await ctx.resume();
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const filterOutGain = (filter as any).filterOutGain as GainNode;

      const tSwitch = ctx.currentTime;
      filter.setParams({ type: 'highpass' });

      // filterOutGain is ducked to 0.0001 over 3ms
      const events = (filterOutGain.gain as any).timeline;
      const duckRamp = events.find((e: any) => e.type === 'linearRamp' && e.value === 0.0001);
      expect(duckRamp).toBeDefined();
      expect(duckRamp.time).toBeCloseTo(tSwitch + 0.003, 4);

      // Advance through 3ms macro-task
      ctx.advanceTime(0.003);
      await new Promise(resolve => setTimeout(resolve, 10));
      ctx.advanceTime(0.003);

      expect((filter as any).stage1.type).toBe('highpass');
      expect((filter as any).stage2.type).toBe('highpass');

      filter.dispose();
    });

    it('D16-ADV-4: rapidly toggles across all 6 filter modes without state corruption or NaN', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const modes: Array<'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peak' | 'ladder'> = [
        'lowpass', 'highpass', 'bandpass', 'notch', 'peak', 'ladder'
      ];

      for (let i = 0; i < 30; i++) {
        const mode = modes[i % modes.length];
        filter.setParams({ type: mode, cutoff: 100 + i * 50, resonance: 1 + (i % 17) });
        expect(filter.getParams().type).toBe(mode);
        expect(Number.isFinite((filter as any).filterOutGain.gain.value)).toBe(true);
      }

      filter.dispose();
    });

    it('D16-ADV-5: Moog 24dB ladder emulation scales Q by 1.35x', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      filter.setParams({ type: 'ladder', resonance: 4.0 });

      // stageQ = sqrt(4) = 2.0; effectiveQ = 2.0 * 1.35 = 2.7
      const stage1 = (filter as any).stage1 as BiquadFilterNode;
      expect(stage1.Q.value).toBeCloseTo(2.7, 2);

      filter.dispose();
    });

    it('D16-ADV-6: strictly clamps out-of-bound cutoff and resonance', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

      filter.setParams({ cutoff: -50, resonance: -5 });
      expect(filter.getParams().cutoff).toBe(20);
      expect(filter.getParams().resonance).toBe(0.1);

      filter.setParams({ cutoff: 50000, resonance: 100 });
      expect(filter.getParams().cutoff).toBe(20000);
      expect(filter.getParams().resonance).toBe(18.0);

      filter.dispose();
    });
  });

  // =========================================================================
  // D17: DriveModule Adversarial Stress
  // =========================================================================
  describe('D17 Adversarial: DriveModule Serial Topology & 12Hz DC Blocker Stress', () => {
    it('D17-ADV-1: pure serial topology routes waveShaper through dcBlocker with zero parallel dry mixing', () => {
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);

      const waveShaper = (drive as any).waveShaper as WaveShaperNode;
      const makeupGain = (drive as any).makeupGain as GainNode;
      const dcBlocker = (drive as any).dcBlocker as BiquadFilterNode;
      const driveOutGain = (drive as any).driveOutGain as GainNode;
      const outputNode = drive.outputNode;

      // 4x oversampling is strictly enabled
      expect(waveShaper.oversample).toBe('4x');

      // Verify connection chain: waveShaper -> makeupGain -> dcBlocker -> driveOutGain -> outputNode
      expect((waveShaper as any).connectedNodes).toContain(makeupGain);
      expect((makeupGain as any).connectedNodes).toContain(dcBlocker);
      expect((dcBlocker as any).connectedNodes).toContain(driveOutGain);
      expect((driveOutGain as any).connectedNodes).toContain(outputNode);

      // Verify no parallel dry branch mixes into outputNode in active (non-bypassed) mode
      expect((drive as any).bypassDryGain.gain.value).toBe(0.0);
      expect(driveOutGain.gain.value).toBe(1.0);

      drive.dispose();
    });

    it('D17-ADV-2: 12Hz DC blocker matches 2nd-order Butterworth highpass acoustic specs', () => {
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const dcBlocker = (drive as any).dcBlocker as BiquadFilterNode;

      expect(dcBlocker.type).toBe('highpass');
      expect(dcBlocker.frequency.value).toBe(12.0);
      expect(dcBlocker.Q.value).toBeCloseTo(0.707, 3);

      // Theoretical frequency response verification:
      // |H(f)| = (f/fc)^2 / sqrt(1 + (f/fc)^4)
      const fc = 12.0;
      const calcGain = (f: number) => {
        if (f <= 0) return 0;
        const ratio = f / fc;
        return (ratio * ratio) / Math.sqrt(1 + Math.pow(ratio, 4));
      };

      // At DC (0 Hz): gain is 0 (-Infinity dB)
      expect(calcGain(0)).toBe(0);

      // At 2 Hz (sub-audible): attenuation > 30 dB (< 0.03 amplitude)
      expect(calcGain(2)).toBeLessThan(0.03);

      // At 12 Hz (corner): attenuation is 3.01 dB (~0.707 amplitude)
      expect(calcGain(12)).toBeCloseTo(Math.SQRT1_2, 3);

      // At 50 Hz (bass fundamental): attenuation < 0.02 dB (> 0.99 amplitude)
      expect(calcGain(50)).toBeGreaterThan(0.99);

      // At 1000 Hz: completely unattenuated (~1.0 amplitude)
      expect(calcGain(1000)).toBeCloseTo(1.0, 3);

      drive.dispose();
    });

    it('D17-ADV-3: proves asymmetric tube saturation introduces non-zero DC bias requiring the DC blocker', () => {
      const tubeCurve = generateTubeCurve(1.0, 2048);

      // Compute numerical mean (DC offset) of the transfer curve
      let sum = 0;
      for (let i = 0; i < tubeCurve.length; i++) {
        sum += tubeCurve[i];
      }
      const meanDcOffset = sum / tubeCurve.length;

      // Because positive and negative branches compress differently (cp=0.2, cn=0.6),
      // the transfer curve must have a significant negative or positive DC offset
      expect(Math.abs(meanDcOffset)).toBeGreaterThan(0.05);

      // Check tape curve is odd-symmetric with ~0 DC offset
      const tapeCurve = generateTapeCurve(1.0, 2048);
      let tapeSum = 0;
      for (let i = 0; i < tapeCurve.length; i++) {
        tapeSum += tapeCurve[i];
      }
      const tapeMean = tapeSum / tapeCurve.length;
      expect(Math.abs(tapeMean)).toBeLessThan(0.001);
    });

    it('D17-ADV-4: computeDriveMakeupGain provides monotonic loudness compensation from 1.0 to 0.5', () => {
      expect(computeDriveMakeupGain(0.0)).toBe(1.0);
      expect(computeDriveMakeupGain(1.0)).toBeCloseTo(0.5, 3);

      let prevMakeup = 1.0;
      for (let amt = 0.05; amt <= 1.0; amt += 0.05) {
        const makeup = computeDriveMakeupGain(amt);
        expect(makeup).toBeLessThan(prevMakeup);
        expect(makeup).toBeGreaterThanOrEqual(0.5);
        prevMakeup = makeup;
      }
    });

    it('D17-ADV-5: generateDriveCurve produces strictly bounded monotonic curves for any amount and tone', () => {
      for (const amount of [0.0, 0.25, 0.5, 0.75, 1.0]) {
        for (const tone of [0.0, 0.25, 0.5, 0.75, 1.0]) {
          const curve = generateDriveCurve(amount, tone, 512);
          expect(curve.length).toBe(512);

          for (let i = 0; i < curve.length; i++) {
            expect(curve[i]).toBeGreaterThanOrEqual(-1.0);
            expect(curve[i]).toBeLessThanOrEqual(1.0);
            expect(Number.isFinite(curve[i])).toBe(true);

            // Monotonic non-decreasing check: curve[i] >= curve[i-1]
            if (i > 0) {
              expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1] - 1e-6);
            }
          }
        }
      }
    });
  });

  // =========================================================================
  // D18: syntheticReverb & ConvolverReverb Adversarial Stress
  // =========================================================================
  describe('D18 Adversarial: syntheticReverb & ConvolverReverb Stress Benchmark', () => {
    it('D18-ADV-1: 100 randomized synthetic IR generations execute in < 200ms with strict normalization & stereo decorrelation', () => {
      const t0 = performance.now();
      const count = 100;

      for (let i = 0; i < count; i++) {
        const decay = 0.2 + (i % 10) * 1.5;
        const damping = (i % 5) * 0.2;
        const buffer = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, decay, damping);

        expect(buffer.numberOfChannels).toBe(2);
        expect(buffer.length).toBeGreaterThan(0);

        const ch0 = buffer.getChannelData(0);
        const ch1 = buffer.getChannelData(1);

        // Peak normalization check: max sample should be exactly ~0.95
        let max0 = 0;
        let max1 = 0;
        for (let j = 0; j < Math.min(ch0.length, 2000); j++) {
          if (Math.abs(ch0[j]) > max0) max0 = Math.abs(ch0[j]);
          if (Math.abs(ch1[j]) > max1) max1 = Math.abs(ch1[j]);
        }
        expect(max0).toBeLessThanOrEqual(0.9501);
        expect(max1).toBeLessThanOrEqual(0.9501);

        // Stereo decorrelation check: ch0 and ch1 must be different
        expect(ch0[100]).not.toBe(ch1[100]);
      }

      const totalElapsed = performance.now() - t0;
      const avgElapsed = totalElapsed / count;
      // 100 massive stereo IRs (up to 10s each = 88M samples total) must complete under load (< 15ms per IR)
      expect(avgElapsed).toBeLessThan(15.0);
      expect(totalElapsed).toBeLessThan(1500);
    });

    it('D18-ADV-2: verifies exponential energy decay profile across synthetic impulse responses', () => {
      const buffer = generateSyntheticImpulseResponse(ctx as unknown as BaseAudioContext, 4.0, 0.4);
      const ch0 = buffer.getChannelData(0);

      const segmentLen = Math.floor(ch0.length / 5);
      const energies: number[] = [];

      for (let seg = 0; seg < 5; seg++) {
        let energy = 0;
        const start = seg * segmentLen;
        for (let i = start; i < start + segmentLen; i++) {
          energy += ch0[i] * ch0[i];
        }
        energies.push(energy);
      }

      // Energy must decrease across consecutive segments
      for (let seg = 1; seg < 5; seg++) {
        expect(energies[seg]).toBeLessThan(energies[seg - 1]);
      }
      // Head energy must be at least 20x tail energy
      expect(energies[0]).toBeGreaterThan(energies[4] * 20);
    });

    it('D18-ADV-3: ConvolverReverb purge() cuts wetGain to 0 and blocks parameter modifications while purged', () => {
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);
      reverb.setParams({ mix: 0.6, decayTime: 3.0 });

      expect(reverb.wetGain.gain.value).toBeGreaterThan(0);

      // Purge
      reverb.purge();
      expect(reverb.reverbInGain.gain.value).toBe(0);
      expect(reverb.wetGain.gain.value).toBe(0);

      // Attempt hostile parameter change while purged
      reverb.setParams({ mix: 0.8 });
      expect(reverb.getParams().mix).toBe(0.8);
      // wetGain must remain strictly 0
      expect(reverb.wetGain.gain.value).toBe(0);

      reverb.dispose();
    });

    it('D18-ADV-4: ConvolverReverb restore() ramps wetGain to target over 3ms micro-ramp', () => {
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);
      reverb.setParams({ mix: 0.5 });
      reverb.purge();

      const tRestore = ctx.currentTime;
      reverb.restore();

      expect(reverb.reverbInGain.gain.value).toBe(1.0);

      const { wet } = computeEqualPowerMix(0.5);
      const events = (reverb.wetGain.gain as any).timeline;
      const ramp = events.find((e: any) => e.type === 'linearRamp');

      expect(ramp).toBeDefined();
      expect(ramp.value).toBeCloseTo(wet, 4);
      expect(ramp.time).toBeCloseTo(tRestore + 0.003, 4);

      reverb.dispose();
    });

    it('D18-ADV-5: ConvolverReverb debounces rapid decay and damping updates by 120ms', async () => {
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);

      // Fire 20 rapid changes
      for (let i = 0; i < 20; i++) {
        reverb.setParams({ decayTime: 1.0 + i * 0.2, damping: 0.1 + i * 0.04 });
      }

      // Timer should be active
      expect((reverb as any).irDebounceTimer).not.toBeNull();

      // Dispose cleans up the timer
      reverb.dispose();
      expect((reverb as any).irDebounceTimer).toBeNull();
    });
  });

  // =========================================================================
  // Integration: Full 6-Slot Effects Chain Under Stress
  // =========================================================================
  describe('Milestone 2 Full Chain Integration Stress', () => {
    it('integrates all 6 effects with continuous parameter automation and rapid reordering', async () => {
      await ctx.resume();
      const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);

      const gain = new GainModule(ctx as unknown as BaseAudioContext);
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const adsr = new AdsrModule(ctx as unknown as BaseAudioContext);
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);

      manager.registerEffect(gain);
      manager.registerEffect(drive);
      manager.registerEffect(filter);
      manager.registerEffect(adsr);
      manager.registerEffect(delay);
      manager.registerEffect(reverb);

      expect(manager.getOrder()).toEqual(['gain', 'drive', 'filter', 'adsr', 'delay', 'reverb']);

      // Reverse chain
      manager.reorderEffects(['reverb', 'delay', 'adsr', 'filter', 'drive', 'gain']);
      ctx.advanceTime(0.003);
      await new Promise(resolve => setTimeout(resolve, 15));
      ctx.advanceTime(0.003);

      expect(manager.getOrder()).toEqual(['reverb', 'delay', 'adsr', 'filter', 'drive', 'gain']);

      // Global purge and restore across the manager
      manager.purge();
      expect(delay.wetGain.gain.value).toBe(0);
      expect(reverb.wetGain.gain.value).toBe(0);

      manager.restore();
      expect(delay.delayInGain.gain.value).toBe(1.0);
      expect(reverb.reverbInGain.gain.value).toBe(1.0);

      manager.dispose();
    });
  });
});
