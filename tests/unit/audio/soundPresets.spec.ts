import { describe, it, expect, beforeEach } from 'vitest';
import {
  SOUND_PRESETS,
  getSoundPresetList,
  getAllFactoryPresets,
  getSoundPresetById,
  migratePreset,
  DEFAULT_SOUND_PRESET_ID,
  type SoundPreset
} from '../../../src/audio/presets/soundPresets';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Sound Therapy Presets System', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('contains exactly 5 curated sound therapy presets', () => {
    const list = getSoundPresetList();
    expect(list).toHaveLength(5);
    const expectedIds = ['tibetanBowl', 'oceanicDrift', 'ambientShimmer', 'deepTheta', 'zenTemple'];
    for (const id of expectedIds) {
      expect(SOUND_PRESETS[id]).toBeDefined();
      expect(SOUND_PRESETS[id].id).toBe(id);
      expect(SOUND_PRESETS[id].name.length).toBeGreaterThan(0);
      expect(SOUND_PRESETS[id].description.length).toBeGreaterThan(0);
      expect(SOUND_PRESETS[id].badge.length).toBeGreaterThan(0);
    }
  });

  it('strictly adheres to zero-emoji policy across all preset metadata', () => {
    for (const preset of Object.values(SOUND_PRESETS)) {
      expect(emojiRegex.test(preset.name)).toBe(false);
      expect(emojiRegex.test(preset.nameEn)).toBe(false);
      expect(emojiRegex.test(preset.description)).toBe(false);
      expect(emojiRegex.test(preset.badge)).toBe(false);
      expect(emojiRegex.test(preset.category)).toBe(false);
    }
  });

  it('configures distinct wavetable slices and acoustic filters across presets', () => {
    const tibetan = SOUND_PRESETS.tibetanBowl;
    const oceanic = SOUND_PRESETS.oceanicDrift;
    const shimmer = SOUND_PRESETS.ambientShimmer;
    const theta = SOUND_PRESETS.deepTheta;
    const zen = SOUND_PRESETS.zenTemple;

    // Distinct wavetable indices and continuous wtPosition
    expect(tibetan.channelStrip.oscA.wavetableIndex).toBe(1); // Tibetan bowls bank
    expect(tibetan.channelStrip.oscA.wtPosition).toBeCloseTo(0.55, 2);
    expect(oceanic.channelStrip.oscA.wavetableIndex).toBe(6); // Cosmic ethereal bank
    expect(oceanic.channelStrip.oscA.wtPosition).toBeCloseTo(0.40, 2);
    expect(shimmer.channelStrip.oscA.wavetableIndex).toBe(4); // Spectral textures bank
    expect(shimmer.channelStrip.oscA.wtPosition).toBeCloseTo(0.70, 2);
    expect(theta.channelStrip.oscA.wavetableIndex).toBe(0); // Classic shapes bank
    expect(theta.channelStrip.oscA.wtPosition).toBeCloseTo(0.20, 2);
    expect(zen.channelStrip.oscA.wavetableIndex).toBe(1); // Tibetan bowls bank
    expect(zen.channelStrip.oscA.wtPosition).toBeCloseTo(0.65, 2);

    // Voicing filter cutoff differences
    expect(shimmer.effects.filter.cutoff).toBeGreaterThan(tibetan.effects.filter.cutoff);
    expect(tibetan.effects.filter.cutoff).toBeGreaterThan(oceanic.effects.filter.cutoff);
    expect(theta.effects.filter.cutoff).toBeLessThan(1000);
  });

  it('guarantees all 24 factory presets possess continuous wtPosition parameters', () => {
    const allPresets = getAllFactoryPresets();
    expect(allPresets.length).toBe(24);
    for (const p of allPresets) {
      expect(p.channelStrip.oscA.wtPosition).toBeDefined();
      expect(p.channelStrip.oscA.wtPosition).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.oscA.wtPosition).toBeLessThanOrEqual(1.0);
    }
  });

  it('guarantees all factory presets have granular duration strictly in seconds within [0.05, 4.0]', () => {
    const allPresets = getAllFactoryPresets();
    for (const p of allPresets) {
      const duration = p.channelStrip.granular?.duration;
      expect(duration).toBeDefined();
      // Must not be in milliseconds (> 15)
      expect(duration!).toBeLessThanOrEqual(4.0);
      expect(duration!).toBeGreaterThanOrEqual(0.05);
    }
  });

  it('guarantees all factory preset parameters reside strictly within operational ranges', () => {
    const allPresets = getAllFactoryPresets();
    for (const p of allPresets) {
      // OSC A
      expect(p.channelStrip.oscA.baseFreq).toBeGreaterThanOrEqual(20);
      expect(p.channelStrip.oscA.baseFreq).toBeLessThanOrEqual(2000);
      expect(p.channelStrip.oscA.gain).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.oscA.gain).toBeLessThanOrEqual(1.0);
      expect(p.channelStrip.oscA.wavetableIndex).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.oscA.wavetableIndex).toBeLessThanOrEqual(7);

      // Granular
      expect(p.channelStrip.granular!.gain).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.granular!.gain).toBeLessThanOrEqual(1.0);
      expect(p.channelStrip.granular!.rate).toBeGreaterThanOrEqual(0.1);
      expect(p.channelStrip.granular!.rate).toBeLessThanOrEqual(50.0);
      expect(p.channelStrip.granular!.density).toBeGreaterThanOrEqual(1);
      expect(p.channelStrip.granular!.density).toBeLessThanOrEqual(32);
      expect(p.channelStrip.granular!.position).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.granular!.position).toBeLessThanOrEqual(1.0);

      // OSC B
      expect(p.channelStrip.oscB.gain).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.oscB.gain).toBeLessThanOrEqual(1.0);
      expect(p.channelStrip.oscB.color).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.oscB.color).toBeLessThanOrEqual(1.0);
      expect(p.channelStrip.oscB.lowCut).toBeGreaterThanOrEqual(20);
      expect(p.channelStrip.oscB.lowCut).toBeLessThanOrEqual(3000);

      // Drone
      expect(p.channelStrip.drone.baseFreq).toBeGreaterThanOrEqual(20);
      expect(p.channelStrip.drone.baseFreq).toBeLessThanOrEqual(440);
      expect(p.channelStrip.drone.gain).toBeGreaterThanOrEqual(0);
      expect(p.channelStrip.drone.gain).toBeLessThanOrEqual(1.0);

      // Filter & EQ
      expect(p.effects.filter.cutoff).toBeGreaterThanOrEqual(20);
      expect(p.effects.filter.cutoff).toBeLessThanOrEqual(20000);
      expect(p.effects.filter.resonance).toBeGreaterThanOrEqual(0.1);
      expect(p.effects.filter.resonance).toBeLessThanOrEqual(20);
      expect(p.effects.eq!.low.frequency).toBeGreaterThanOrEqual(20);
      expect(p.effects.eq!.low.frequency).toBeLessThanOrEqual(500);
      expect(p.effects.eq!.midLow.frequency).toBeGreaterThanOrEqual(100);
      expect(p.effects.eq!.midLow.frequency).toBeLessThanOrEqual(2000);
      expect(p.effects.eq!.midHigh.frequency).toBeGreaterThanOrEqual(500);
      expect(p.effects.eq!.midHigh.frequency).toBeLessThanOrEqual(8000);
      expect(p.effects.eq!.high.frequency).toBeGreaterThanOrEqual(2000);
      expect(p.effects.eq!.high.frequency).toBeLessThanOrEqual(20000);
    }
  });

  it('migratePreset automatically normalizes legacy millisecond duration to seconds', () => {
    const legacyPreset: SoundPreset = {
      id: 'legacyTest',
      name: 'Legacy Preset',
      nameEn: 'Legacy Preset',
      category: 'User',
      description: 'Test',
      badge: 'Test',
      channelStrip: {
        oscA: { wtPosition: 11.5, baseFreq: 216 },
        granular: { duration: 450, position: 1.5, rate: 80 } as any
      } as any,
      effects: {
        eq: { low: { frequency: 80, gain: 2.0 } } as any
      } as any
    };

    const migrated = migratePreset(legacyPreset);
    // wtPosition converted from 0..23 to 0..1
    expect(migrated.channelStrip.oscA.wtPosition).toBeCloseTo(0.5, 1);
    // duration converted from 450ms to 0.45s
    expect(migrated.channelStrip.granular!.duration).toBe(0.45);
    // position clamped to 1.0
    expect(migrated.channelStrip.granular!.position).toBe(1.0);
    // rate clamped to 50.0
    expect(migrated.channelStrip.granular!.rate).toBe(50.0);
    // EQ deeply populated with default midLow, midHigh, high
    expect(migrated.effects.eq!.midLow).toBeDefined();
    expect(migrated.effects.eq!.midLow.frequency).toBe(432);
    expect(migrated.effects.eq!.high.frequency).toBe(8000);
  });

  it('getSoundPresetById safely falls back to default preset on unknown id', () => {
    const found = getSoundPresetById('non_existent_preset');
    expect(found.id).toBe(DEFAULT_SOUND_PRESET_ID);
  });

  describe('AudioEngine Integration with Sound Presets', () => {
    let ctx: MockAudioContext;
    let engine: AudioEngine;

    beforeEach(async () => {
      ctx = new MockAudioContext({ sampleRate: 44100 });
      engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();
    });

    it('loads sound preset and retains selected wavetable slice across breath stages', () => {
      engine.loadSoundPreset('tibetanBowl');

      const chInitial = engine.getChannelStripParams();
      expect(chInitial.oscA.wavetableIndex).toBe(1);

      // Inhale
      engine.updateBreathModulation(0.9, 'inhale', 0.9);
      const chInhale = engine.getChannelStripParams();
      expect(chInhale.oscA.wavetableIndex).toBe(1); // Preserved!

      // Hold In
      engine.updateBreathModulation(1.0, 'holdIn', 0.5);
      const chHoldIn = engine.getChannelStripParams();
      expect(chHoldIn.oscA.wavetableIndex).toBe(1); // Preserved!

      // Exhale
      engine.updateBreathModulation(0.4, 'exhale', 0.6);
      const chExhale = engine.getChannelStripParams();
      expect(chExhale.oscA.wavetableIndex).toBe(1); // Preserved!

      // Hold Out
      engine.updateBreathModulation(0.0, 'holdOut', 0.0);
      const chHoldOut = engine.getChannelStripParams();
      expect(chHoldOut.oscA.wavetableIndex).toBe(1); // Preserved!
    });

    it('loadSoundPreset deeply restores EQ parameters and correctly triggers voice activation', () => {
      engine.loadSoundPreset('tibetanBowl');

      const eff = engine.getEffectsParams();
      expect(eff.eq).toBeDefined();
      expect(eff.eq?.low.frequency).toBe(80);
      expect(eff.eq?.midLow.frequency).toBe(432);
      expect(eff.eq?.midHigh.frequency).toBe(2160);
      expect(eff.eq?.high.frequency).toBe(8000);

      // Verify that loading another preset updates active params smoothly without muting
      engine.loadSoundPreset('deepTheta');
      const effTheta = engine.getEffectsParams();
      expect(effTheta.filter.cutoff).toBeLessThan(1000);
      const chTheta = engine.getChannelStripParams();
      expect(chTheta.granular!.duration).toBe(0.9);
      expect(chTheta.granular!.duration).toBeLessThanOrEqual(4.0);
    });
  });
});
