import { describe, it, expect, beforeEach } from 'vitest';
import { AdsrModule, DEFAULT_ADSR_PARAMS } from '../../../src/audio/nodes/AdsrModule';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { SOUND_PRESETS } from '../../../src/audio/presets/soundPresets';

describe('AdsrModule & Envelope Engine', () => {
  let ctx: MockAudioContext;
  let adsr: AdsrModule;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    adsr = new AdsrModule(ctx as unknown as BaseAudioContext);
  });

  it('initializes with default acoustic ADSR parameters and valid nodes', () => {
    const params = adsr.getParams();
    expect(params.attack).toBe(DEFAULT_ADSR_PARAMS.attack);
    expect(params.decay).toBe(DEFAULT_ADSR_PARAMS.decay);
    expect(params.sustain).toBe(DEFAULT_ADSR_PARAMS.sustain);
    expect(params.release).toBe(DEFAULT_ADSR_PARAMS.release);
    expect(params.bypass).toBe(false);

    expect(adsr.inputNode).toBeDefined();
    expect(adsr.outputNode).toBeDefined();
    expect(adsr.envelopeGain).toBeDefined();
  });

  it('clamps and updates parameters safely via setParams', () => {
    adsr.setParams({
      attack: 25.0, // should clamp to 15.0
      decay: 0.001, // should clamp to 0.005
      sustain: 1.5, // should clamp to 1.0
      release: 20.0 // should clamp to 15.0
    });

    const updated = adsr.getParams();
    expect(updated.attack).toBe(15.0);
    expect(updated.decay).toBe(0.005);
    expect(updated.sustain).toBe(1.0);
    expect(updated.release).toBe(15.0);
  });

  it('bypasses envelope smoothly setting gain to 1.0', () => {
    adsr.setParams({ bypass: true });
    expect(adsr.getParams().bypass).toBe(true);
    expect(adsr.envelopeGain.gain.value).toBe(1.0);

    adsr.triggerAttack(1.0);
    expect(adsr.envelopeGain.gain.value).toBe(1.0);
  });

  it('triggers attack and release ramps correctly in normal mode', () => {
    adsr.setParams({ attack: 0.5, decay: 1.0, sustain: 0.6, release: 2.0 });

    // Attack
    adsr.triggerAttack(1.0, 4.0);
    expect(adsr.envelopeGain.gain.cancelScheduledValues).toBeDefined();

    // Hold
    adsr.triggerHold(1.0);

    // Release
    adsr.triggerRelease(4.0);

    // Quiet
    adsr.triggerQuiet();
  });

  it('supports 0ms hard-cut purge and instant restore', () => {
    adsr.setParams({ sustain: 0.7 });
    adsr.purge();
    expect(adsr.envelopeGain.gain.value).toBe(0.0);

    adsr.restore();
    expect(adsr.envelopeGain.gain.value).toBeCloseTo(0.7, 1);
  });

  it('disposes cleanly without leaving active audio graph connections', () => {
    adsr.dispose();
    // Subsequent calls should not throw
    adsr.triggerAttack();
    adsr.purge();
    adsr.restore();
  });

  describe('AudioEngine ADSR Integration', () => {
    let engine: AudioEngine;

    beforeEach(async () => {
      engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();
    });

    it('initializes AudioEngine with AdsrModule connected and functional', () => {
      expect(engine.adsr).toBeDefined();
      const fx = engine.getEffectsParams();
      expect(fx.adsr).toBeDefined();
      expect(fx.adsr?.sustain).toBeGreaterThan(0);
    });

    it('updates adsr parameters dynamically through updateEffects', () => {
      engine.updateEffects({
        adsr: {
          attack: 1.25,
          decay: 2.0,
          sustain: 0.8
        }
      });

      const fx = engine.getEffectsParams();
      expect(fx.adsr?.attack).toBeCloseTo(1.25, 2);
      expect(fx.adsr?.decay).toBeCloseTo(2.0, 2);
      expect(fx.adsr?.sustain).toBeCloseTo(0.8, 2);
    });

    it('triggers envelope state changes during updateBreathModulation', () => {
      // Inhale
      engine.updateBreathModulation(0.5, 'inhale', 0.5);
      // Hold In
      engine.updateBreathModulation(1.0, 'holdIn', 0.2);
      // Exhale
      engine.updateBreathModulation(0.6, 'exhale', 0.4);
      // Hold Out
      engine.updateBreathModulation(0.0, 'holdOut', 0.0);
    });

    it('purges adsr upon 0ms hard cut and restores upon resume', async () => {
      engine.executeZeroResidueHardCut();
      expect(engine.adsr.envelopeGain.gain.value).toBe(0.0);

      await engine.resume();
      expect(engine.adsr.envelopeGain.gain.value).toBeGreaterThan(0.0);
    });

    it('monophonic breath gate triggers attack on inhale onset and release on exhale', () => {
      engine.updateEffects({
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.0, release: 0.5 }
      });
      // Transition from holdOut to inhale triggers Attack
      engine.updateBreathModulation(0.0, 'holdOut', 0.0);
      engine.updateBreathModulation(0.3, 'inhale', 0.1);
      // Transition from inhale to exhale triggers Release
      engine.updateBreathModulation(0.5, 'exhale', 0.2);
    });
  });

  describe('Sound Presets ADSR Synchronization', () => {
    it('all 5 curated sound presets include tailored ADSR parameters', () => {
      for (const preset of Object.values(SOUND_PRESETS)) {
        expect(preset.effects.adsr).toBeDefined();
        const adsr = preset.effects.adsr!;
        expect(adsr.attack).toBeGreaterThan(0);
        expect(adsr.decay).toBeGreaterThan(0);
        expect(adsr.sustain).toBeGreaterThan(0);
        expect(adsr.sustain).toBeLessThanOrEqual(1.0);
        expect(adsr.release).toBeGreaterThan(0);
      }
    });

    it('Tibetan bowl has shorter attack and long release compared to Oceanic Drift', () => {
      const tibetan = SOUND_PRESETS.tibetanBowl.effects.adsr!;
      const oceanic = SOUND_PRESETS.oceanicDrift.effects.adsr!;

      // Tibetan bowl strike is fast initial onset
      expect(tibetan.attack).toBeLessThan(oceanic.attack);
      // Oceanic drift is slow tidal swell
      expect(oceanic.attack).toBeGreaterThan(1.5);
      // Both maintain rich resonant release
      expect(tibetan.release).toBeGreaterThan(3.0);
      expect(oceanic.release).toBeGreaterThan(3.0);
    });
  });
});
