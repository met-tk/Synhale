import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { OscAChannel } from '../../../src/audio/nodes/OscAChannel';
import { OscBChannel } from '../../../src/audio/nodes/OscBChannel';
import { DroneChannel } from '../../../src/audio/nodes/DroneChannel';
import { MultimodeFilter } from '../../../src/audio/nodes/MultimodeFilter';
import { DriveModule } from '../../../src/audio/nodes/DriveModule';
import { StereoDelay } from '../../../src/audio/nodes/StereoDelay';
import { ConvolverReverb } from '../../../src/audio/nodes/ConvolverReverb';
import { GainModule } from '../../../src/audio/nodes/GainModule';

describe('Audio Nodes & Channel Strip Units', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  describe('OscAChannel', () => {
    it('initializes dual wavetable oscillators, responds to params and 5ms bypass', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.start(0);

      // Verify default parameters
      const initial = oscA.getParams();
      expect(initial.gain).toBe(0.8);
      expect(initial.wavetableIndex).toBe(0);
      expect(initial.bypass).toBe(false);

      // Connect to a destination
      const dest = ctx.createGain();
      oscA.connect(dest as unknown as AudioNode);

      // Update parameters
      oscA.setParams({
        gain: 0.5,
        detune: 15,
        wavetableIndex: 4.5,
        harmonics: 0.6,
        warmth: 0.7,
        unison: 0.5,
        unisonVoices: 8,
        spread: 0.8
      });

      const updated = oscA.getParams();
      expect(updated.gain).toBe(0.5);
      expect(updated.detune).toBe(15);
      expect(updated.wavetableIndex).toBe(4.5);
      expect(updated.harmonics).toBe(0.6);
      expect(updated.warmth).toBe(0.7);
      expect(updated.unison).toBe(0.5);
      expect(updated.unisonVoices).toBe(8);
      expect(updated.spread).toBe(0.8);

      // Advance clock and test 5ms bypass transition
      ctx.advanceTime(0.01);
      oscA.setParams({ bypass: true });
      expect(oscA.getParams().bypass).toBe(true);

      ctx.advanceTime(0.005); // After 5ms ramp
      oscA.setParams({ bypass: false });
      expect(oscA.getParams().bypass).toBe(false);

      oscA.dispose();
    });

    it('handles Serum 12-TET tuning (octave, semi, fine) and calculates correct fundamental frequencies', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.start(0);

      // Default baseFreq is 216Hz
      oscA.setParams({
        octave: 1, // +1 Octave -> 216 * 2 = 432Hz
        semi: 0,
        fine: 0
      });
      ctx.advanceTime(0.1);

      const params = oscA.getParams();
      expect(params.octave).toBe(1);
      expect(params.semi).toBe(0);
      expect(params.fine).toBe(0);

      // Verify oscillator frequency received target
      const osc1 = (oscA as any).osc1 as OscillatorNode;
      expect(osc1.frequency.value).toBeCloseTo(432, 1);

      // Test semitone and fine cents tuning: +7 semitones (perfect fifth)
      oscA.setParams({
        octave: 0,
        semi: 7,
        fine: 50 // +50 cents
      });
      ctx.advanceTime(0.2);

      const expectedFreq = 216 * Math.pow(2, 7.5 / 12);
      expect(osc1.frequency.value).toBeCloseTo(expectedFreq, 0);

      oscA.dispose();
    });

    it('computes 4x oversampled non-linear warp shaping curves for PWM, Sync, Bend, and Mirror', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      const warpShaper = (oscA as any).warpShaper as WaveShaperNode;

      expect(warpShaper.oversample).toBe('4x');
      expect(warpShaper.curve).toBeNull(); // Default warpMode 'off'

      // PWM mode
      oscA.setParams({ warp: 0.5, warpMode: 'pwm' });
      expect(warpShaper.curve).not.toBeNull();
      expect(warpShaper.curve!.length).toBe(2048);
      // Curve values bounded to [-1, 1]
      expect(Math.abs(warpShaper.curve![0])).toBeLessThanOrEqual(1.0);
      expect(Math.abs(warpShaper.curve![2047])).toBeLessThanOrEqual(1.0);

      // Sync mode
      oscA.setParams({ warp: 0.8, warpMode: 'sync' });
      expect(warpShaper.curve!.length).toBe(2048);

      // Bend mode
      oscA.setParams({ warp: 0.6, warpMode: 'bend' });
      expect(warpShaper.curve!.length).toBe(2048);

      // Mirror mode
      oscA.setParams({ warp: 0.7, warpMode: 'mirror' });
      expect(warpShaper.curve!.length).toBe(2048);

      // Off mode resets curve to null for optimal performance
      oscA.setParams({ warpMode: 'off' });
      expect(warpShaper.curve).toBeNull();

      oscA.dispose();
    });

    it('activates 4-voice polyphonic Chord Mode across all 9 musical interval sets', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      oscA.start(0);

      const chordTypes = [
        'octave',
        'fifth',
        'major',
        'minor',
        'sus4',
        'dom7',
        'maj7',
        'min7',
        'sacred'
      ] as const;

      for (const chordType of chordTypes) {
        oscA.setParams({
          chordMode: true,
          chordType,
          baseFreq: 216
        });
        ctx.advanceTime(0.1);

        const params = oscA.getParams();
        expect(params.chordMode).toBe(true);
        expect(params.chordType).toBe(chordType);

        // Voice 1, 2, 3 frequencies must be finite positive numbers
        const f1 = ((oscA as any).oscVoice1 as OscillatorNode).frequency.value;
        const f2 = ((oscA as any).oscVoice2 as OscillatorNode).frequency.value;
        const f3 = ((oscA as any).oscVoice3 as OscillatorNode).frequency.value;

        expect(Number.isFinite(f1)).toBe(true);
        expect(Number.isFinite(f2)).toBe(true);
        expect(Number.isFinite(f3)).toBe(true);
        expect(f1).toBeGreaterThanOrEqual(216);
        expect(f2).toBeGreaterThanOrEqual(216);
        expect(f3).toBeGreaterThanOrEqual(216);

        // Voice 1 gain should be active in chord mode
        const g1 = ((oscA as any).gainVoice1 as GainNode).gain.value;
        expect(g1).toBeGreaterThan(0.0);
      }

      // Disabling chord mode reverts back to Unison mode
      oscA.setParams({ chordMode: false });
      ctx.advanceTime(0.1);
      expect(oscA.getParams().chordMode).toBe(false);

      oscA.dispose();
    });

    it('smoothly schedules channel stereo panning and unison detune', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      const panner = (oscA as any).channelPanner as StereoPannerNode;

      oscA.setParams({ pan: -0.75, unisonDetune: 0.6 });
      ctx.advanceTime(0.1);
      expect(oscA.getParams().pan).toBe(-0.75);
      expect(oscA.getParams().unisonDetune).toBe(0.6);
      expect(panner.pan.value).toBeCloseTo(-0.75, 2);

      oscA.setParams({ pan: 0.8 });
      ctx.advanceTime(0.1);
      expect(panner.pan.value).toBeCloseTo(0.8, 2);

      oscA.dispose();
    });

    it('calibrates channel track gain range so 100% UI level corresponds to 50% physical gain', () => {
      const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
      const trackGain = (oscA as any).trackGain as GainNode;

      // 1. Initial default gain (0.8) scaled to 0.4 physical gain
      expect(trackGain.gain.value).toBeCloseTo(0.8 * 0.5, 3);
      expect(oscA.getParams().gain).toBe(0.8);

      // 2. Setting 100% (1.0) gain scales to 0.5 physical gain
      oscA.setParams({ gain: 1.0 });
      ctx.advanceTime(0.05);
      expect(trackGain.gain.value).toBeCloseTo(0.5, 2);
      expect(oscA.getParams().gain).toBe(1.0);

      // 3. Setting 50% (0.5) gain scales to 0.25 physical gain
      oscA.setParams({ gain: 0.5 });
      ctx.advanceTime(0.05);
      expect(trackGain.gain.value).toBeCloseTo(0.25, 2);
      expect(oscA.getParams().gain).toBe(0.5);

      // 4. Clamping and boundary checks
      oscA.setParams({ gain: 0.0 });
      ctx.advanceTime(0.05);
      expect(trackGain.gain.value).toBeCloseTo(0.0, 2);
      expect(oscA.getParams().gain).toBe(0.0);

      oscA.dispose();
    });
  });

  describe('OscBChannel', () => {
    it('loops pink noise buffer and modulates formant filter color, friction, motion and bypass', () => {
      const oscB = new OscBChannel(ctx as unknown as BaseAudioContext);
      oscB.start(0);

      const dest = ctx.createGain();
      oscB.connect(dest as unknown as AudioNode);

      oscB.setParams({
        color: 0.8,
        friction: 0.75,
        motion: 0.65,
        gain: 0.6
      });

      const params = oscB.getParams();
      expect(params.color).toBe(0.8);
      expect(params.friction).toBe(0.75);
      expect(params.motion).toBe(0.65);
      expect(params.gain).toBe(0.6);

      // Test bypass
      oscB.setParams({ bypass: true });
      expect(oscB.getParams().bypass).toBe(true);
      ctx.advanceTime(0.006);

      oscB.dispose();
    });
  });

  describe('DroneChannel', () => {
    it('sets 432Hz sub fundamental, runs 0.05Hz drift LFO, and supports 5ms bypass', () => {
      const drone = new DroneChannel(ctx as unknown as BaseAudioContext);
      drone.start(0);

      const params = drone.getParams();
      expect(params.baseFreq).toBe(54); // 432 / 8
      expect(params.pitchDrift).toBe(0.5);

      drone.setParams({
        baseFreq: 108,
        pitchDrift: 0.8,
        gain: 0.5
      });

      const updated = drone.getParams();
      expect(updated.baseFreq).toBe(108);
      expect(updated.pitchDrift).toBe(0.8);
      expect(updated.gain).toBe(0.5);

      drone.setParams({ bypass: true });
      expect(drone.getParams().bypass).toBe(true);
      ctx.advanceTime(0.006);

      drone.dispose();
    });
  });

  describe('MultimodeFilter', () => {
    it('implements 24dB/oct cascaded dual biquad with LP/HP/BP modes, split Q and smooth bypass', () => {
      const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);
      const dest = ctx.createGain();
      filter.connect(dest as unknown as AudioNode);

      expect(filter.getParams().type).toBe('lowpass');
      expect(filter.getParams().cutoff).toBe(2000);

      // Update to Bandpass mode
      filter.setParams({
        type: 'bandpass',
        cutoff: 1200,
        resonance: 4.0
      });

      const updated = filter.getParams();
      expect(updated.type).toBe('bandpass');
      expect(updated.cutoff).toBe(1200);
      expect(updated.resonance).toBe(4.0);

      // Update to Highpass mode
      filter.setParams({ type: 'highpass' });
      expect(filter.getParams().type).toBe('highpass');

      // Update to Notch, Peak, and Ladder modes
      filter.setParams({ type: 'notch' });
      expect(filter.getParams().type).toBe('notch');

      filter.setParams({ type: 'peak' });
      expect(filter.getParams().type).toBe('peak');

      filter.setParams({ type: 'ladder' });
      expect(filter.getParams().type).toBe('ladder');

      // Test hardware bypass relay
      filter.setParams({ bypass: true });
      expect(filter.getParams().bypass).toBe(true);
      ctx.advanceTime(0.005);

      filter.setParams({ bypass: false });
      expect(filter.getParams().bypass).toBe(false);

      filter.dispose();
    });
  });

  describe('DriveModule', () => {
    it('configures 4x oversampling, auto-makeup gain, and smooth bypass', () => {
      const drive = new DriveModule(ctx as unknown as BaseAudioContext);
      const dest = ctx.createGain();
      drive.connect(dest as unknown as AudioNode);

      expect(drive.getParams().amount).toBe(0.0);
      expect(drive.getParams().tone).toBe(0.5);

      drive.setParams({ amount: 0.65, tone: 0.8 });
      expect(drive.getParams().amount).toBe(0.65);
      expect(drive.getParams().tone).toBe(0.8);

      drive.setParams({ bypass: true });
      expect(drive.getParams().bypass).toBe(true);
      ctx.advanceTime(0.005);

      drive.dispose();
    });
  });

  describe('StereoDelay', () => {
    it('manages ping-pong delay feedback, damping, equal-power mix, and instant purge', () => {
      const delay = new StereoDelay(ctx as unknown as BaseAudioContext);
      const dest = ctx.createGain();
      delay.connect(dest as unknown as AudioNode);

      delay.setParams({
        time: 0.45,
        feedback: 0.6,
        damping: 3000,
        mix: 0.4
      });

      const params = delay.getParams();
      expect(params.time).toBe(0.45);
      expect(params.feedback).toBe(0.6);
      expect(params.damping).toBe(3000);
      expect(params.mix).toBe(0.4);

      // Test instant purge for 0ms hard cut
      delay.purge();
      expect(delay.delayInGain.gain.value).toBe(0);
      expect(delay.feedbackGainL.gain.value).toBe(0);
      expect(delay.feedbackGainR.gain.value).toBe(0);

      // Test restore
      delay.restore();
      expect(delay.delayInGain.gain.value).toBe(1.0);
      expect(delay.feedbackGainL.gain.value).toBe(0.6);
      expect(delay.feedbackGainR.gain.value).toBe(0.6);

      delay.dispose();
    });
  });

  describe('ConvolverReverb', () => {
    it('generates synthetic IR, adapts decay and damping, equal-power mix, and instant purge', () => {
      const reverb = new ConvolverReverb(ctx as unknown as BaseAudioContext);
      const dest = ctx.createGain();
      reverb.connect(dest as unknown as AudioNode);

      reverb.setParams({
        decayTime: 4.5,
        damping: 0.6,
        mix: 0.5
      });
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.

      const params = reverb.getParams();
      expect(params.decayTime).toBe(4.5);
      expect(params.damping).toBe(0.6);
      expect(params.mix).toBe(0.5);

      // Test instant purge
      reverb.purge();
      expect(reverb.reverbInGain.gain.value).toBe(0);
      expect(reverb.wetGain.gain.value).toBe(0);

      // Test restore
      reverb.restore();
      ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
      expect(reverb.reverbInGain.gain.value).toBe(1.0);
      expect(reverb.wetGain.gain.value).toBeCloseTo(Math.SQRT1_2, 4);

      reverb.dispose();
    });
  });

  describe('GainModule', () => {
    it('manages analog-modeled dB gain, soft-clipping toggle, clamping, and 5ms hardware bypass', () => {
      const gainMod = new GainModule(ctx as unknown as BaseAudioContext);
      const dest = ctx.createGain();
      gainMod.connect(dest as unknown as AudioNode);

      // Verify default parameters
      const initial = gainMod.getParams();
      expect(initial.value).toBe(0.0);
      expect(initial.bypass).toBe(false);
      expect(initial.softClip).toBe(true);

      // Set clean boost (+12 dB)
      gainMod.setParams({ value: 12.0 });
      expect(gainMod.getParams().value).toBe(12.0);

      // Test clamping boundary [-12 dB, +24 dB]
      gainMod.setParams({ value: 36.0 });
      expect(gainMod.getParams().value).toBe(24.0);
      gainMod.setParams({ value: -20.0 });
      expect(gainMod.getParams().value).toBe(-12.0);

      // Toggle soft-clipping
      gainMod.setParams({ softClip: false });
      expect(gainMod.getParams().softClip).toBe(false);
      gainMod.setParams({ softClip: true });
      expect(gainMod.getParams().softClip).toBe(true);

      // Test hardware bypass transition
      ctx.advanceTime(0.01);
      gainMod.setParams({ bypass: true });
      expect(gainMod.getParams().bypass).toBe(true);

      ctx.advanceTime(0.005);
      gainMod.setParams({ bypass: false });
      expect(gainMod.getParams().bypass).toBe(false);

      // Cleanup
      gainMod.dispose();
    });
  });
});

