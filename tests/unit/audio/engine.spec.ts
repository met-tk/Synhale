import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';

describe('AudioEngine Full Pipeline & 0ms Zero-Residue Hard Cut', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(async () => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
  });

  it('initializes the full 4-source channel strip, analog effects chain, and master output bus', () => {
    expect(engine.oscA).toBeDefined();
    expect(engine.granular).toBeDefined();
    expect(engine.oscB).toBeDefined();
    expect(engine.drone).toBeDefined();
    expect(engine.preMixBus).toBeDefined();
    expect(engine.drive).toBeDefined();
    expect(engine.filter).toBeDefined();
    expect(engine.delay).toBeDefined();
    expect(engine.reverb).toBeDefined();
    expect(engine.masterCutGain).toBeDefined();
    expect(engine.masterVolumeGain).toBeDefined();

    // Verify initial master gain
    expect(engine.masterVolumeGain.gain.value).toBeCloseTo(0.85, 2);
    expect(engine.masterCutGain.gain.value).toBe(1.0);
  });

  it('updates channel strip parameters independently for Osc A, Granular, Osc B, and Drone', () => {
    engine.updateChannelStrip({
      oscA: { gain: 0.6, detune: 20, wavetableIndex: 3 },
      granular: { gain: 0.8, density: 8, scale: 'lydian' },
      oscB: { color: 0.7, friction: 0.8 },
      drone: { baseFreq: 64, pitchDrift: 0.9 }
    });

    const channelParams = engine.getChannelStripParams();
    expect(channelParams.oscA.gain).toBe(0.6);
    expect(channelParams.oscA.detune).toBe(20);
    expect(channelParams.oscA.wavetableIndex).toBe(3);
    expect(channelParams.granular?.gain).toBe(0.8);
    expect(channelParams.granular?.density).toBe(8);
    expect(channelParams.granular?.scale).toBe('lydian');
    expect(channelParams.oscB.color).toBe(0.7);
    expect(channelParams.oscB.friction).toBe(0.8);
    expect(channelParams.drone.baseFreq).toBe(64);
    expect(channelParams.drone.pitchDrift).toBe(0.9);
  });

  it('updates effects parameters for Filter, Drive, Delay, Reverb, Gain, and Master Gain', () => {
    engine.updateEffects({
      gain: { value: 6.0, softClip: false, bypass: false },
      filter: { type: 'bandpass', cutoff: 1800, resonance: 3.5 },
      drive: { amount: 0.5, tone: 0.75 },
      delay: { time: 0.5, feedback: 0.6, damping: 2500, mix: 0.4 },
      reverb: { decayTime: 5.0, damping: 0.3, mix: 0.45 },
      masterGain: 0.7
    });

    const fxParams = engine.getEffectsParams();
    expect(fxParams.gain?.value).toBe(6.0);
    expect(fxParams.gain?.softClip).toBe(false);
    expect(fxParams.gain?.bypass).toBe(false);
    expect(fxParams.filter.type).toBe('bandpass');
    expect(fxParams.filter.cutoff).toBe(1800);
    expect(fxParams.filter.resonance).toBe(3.5);
    expect(fxParams.drive.amount).toBe(0.5);
    expect(fxParams.delay.feedback).toBe(0.6);
    expect(fxParams.reverb.decayTime).toBe(5.0);
    expect(fxParams.masterGain).toBe(0.7);
  });

  it('executes 0ms Zero-Residue Instant Hard Cut: 2.5ms micro-ramp to 0 and purges delay/reverb loops', () => {
    // Set feedback and reverb mix to high values
    engine.updateEffects({
      delay: { feedback: 0.75, mix: 0.5 },
      reverb: { mix: 0.5 }
    });

    // Verify initial values
    expect(engine.masterCutGain.gain.value).toBe(1.0);
    expect(engine.delay.feedbackGainL.gain.value).toBe(0.75);

    // Trigger instant hard cut
    engine.executeZeroResidueHardCut();

    // 1. Delay & reverb loops purged immediately to 0 (no ghost echo circulation)
    expect(engine.delay.delayInGain.gain.value).toBe(0);
    expect(engine.delay.feedbackGainL.gain.value).toBe(0);
    expect(engine.delay.feedbackGainR.gain.value).toBe(0);
    expect(engine.reverb.reverbInGain.gain.value).toBe(0);
    expect(engine.reverb.wetGain.gain.value).toBe(0);

    // 2. Advance time 2.5ms: master cut gain drops to 0 without speaker pop
    ctx.advanceTime(0.0026);
    expect(engine.masterCutGain.gain.value).toBeLessThanOrEqual(0.0001);

    // 3. Freeze snapshot exists
    const snapshot = engine.getFreezeSnapshot();
    expect(snapshot).not.toBeNull();
  });

  it('resumes playback seamlessly with 3ms anti-pop ramp and restored delay/reverb loops', async () => {
    engine.executeZeroResidueHardCut();
    ctx.advanceTime(0.005);
    expect(engine.masterCutGain.gain.value).toBe(0.0);

    // Resume
    await engine.resume();

    // Loops are restored
    expect(engine.delay.delayInGain.gain.value).toBe(1.0);
    expect(engine.delay.feedbackGainL.gain.value).toBeCloseTo(0.4, 2);
    expect(engine.reverb.reverbInGain.gain.value).toBe(1.0);

    // Advance 3ms for un-mute ramp
    ctx.advanceTime(0.0035);
    expect(engine.masterCutGain.gain.value).toBeCloseTo(1.0, 2);
  });

  it('modulates physical sound parameters across the 4 breath stages (Inhale, HoldIn, Exhale, HoldOut)', () => {
    // Configure standard modulation routes for filter cutoff and oscB gain
    engine.setModulationRoute('filter-cutoff', {
      target: 'filter-cutoff',
      source: 'breathMacro',
      depth: 0.6,
      bipolar: true
    });
    engine.setModulationRoute('oscb-gain', {
      target: 'oscb-gain',
      source: 'breathMacro',
      depth: 0.8,
      bipolar: false
    });

    // 1. Inhale: opens filter cutoff, increases noise airflow
    engine.updateBreathModulation(0.8, 'inhale', 0.8);
    expect(engine.filter.getParams().cutoff).toBeGreaterThan(4000);
    expect(engine.oscB.getParams().gain).toBeGreaterThan(0.2);

    // 2. Exhale: sweeps cutoff down
    engine.updateBreathModulation(0.2, 'exhale', 0.7);
    expect(engine.filter.getParams().cutoff).toBeLessThan(3500);

    // 3. HoldOut: void stillness, noise attenuated
    engine.updateBreathModulation(0.0, 'holdOut', 0.0);
    expect(engine.oscB.getParams().gain).toBeLessThan(0.2);
  });

  it('modulates preamp-gain smoothly via breathMacro route', () => {
    engine.setModulationRoute('preamp-gain', {
      target: 'preamp-gain',
      source: 'breathMacro',
      depth: 0.5,
      bipolar: true
    });

    engine.updateBreathModulation(1.0, 'inhale', 1.0);
    expect(engine.gainModule.getParams().value).toBeGreaterThan(0.0);

    engine.updateBreathModulation(0.0, 'holdOut', 0.0);
    expect(engine.gainModule.getParams().value).toBeLessThan(0.0);
  });

  it('manages dynamic effect chain reordering, addition, and removal', () => {
    expect(engine.effectChain).toBeDefined();
    expect(engine.getEffectOrder()).toEqual(['gain', 'drive', 'filter', 'eq', 'adsr', 'lfo', 'delay', 'reverb']);

    // Reorder effects
    engine.reorderEffects(['filter', 'gain', 'drive', 'eq', 'adsr', 'lfo', 'reverb', 'delay']);
    expect(engine.getEffectOrder()).toEqual(['filter', 'gain', 'drive', 'eq', 'adsr', 'lfo', 'reverb', 'delay']);

    // Remove an effect
    engine.removeEffect('drive');
    expect(engine.getEffectOrder()).toEqual(['filter', 'gain', 'eq', 'adsr', 'lfo', 'reverb', 'delay']);
  });

  it('handles suspend and dispose without errors and safely closes AudioContext', async () => {
    await engine.suspend();
    expect(ctx.state).toBe('suspended');

    engine.dispose();
    expect(ctx.state).toBe('closed');
  });
});
