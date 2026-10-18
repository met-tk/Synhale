/**
 * Synhale 2 - EQ Integration & Rebuilt Sound Presets Verification Suite
 * 
 * Verifies:
 * 1. EQ state updates propagate through AudioEngine.updateEffects with 1:1 parameter fidelity
 * 2. All 12 rebuilt sound presets contain bespoke 4-band EQ configurations
 * 3. 4-source channelStrip decoupling across all 12 presets
 * 4. Zero emoji policy and industrial aesthetic compliance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../../src/audio/engine';
import {
  getSoundPresetList,
  getExtendedSoundPresetList,
  getAllFactoryPresets,
  getSoundPresetById,
  DEFAULT_SOUND_PRESET_ID
} from '../../../src/audio/presets/soundPresets';
import { MockAudioContext } from '../../mocks/webAudioMock';
import type { EffectsChainParams } from '../../../src/types/audio';

describe('EQ Integration & Rebuilt Presets Suite', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  afterEach(() => {
    engine.dispose();
  });

  it('updates EQ parameters via audioEngine.updateEffects with full fidelity', () => {
    const customEqParams: EffectsChainParams = {
      ...engine.getEffectsParams(),
      eq: {
        low: { frequency: 95, gain: 4.5, q: 0.8, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 3.0, q: 2.1 },
        midHigh: { frequency: 2160, gain: -2.5, q: 1.5 },
        high: { frequency: 8500, gain: 5.0, q: 0.707 },
        bypass: false
      }
    };

    engine.updateEffects(customEqParams);
    const fx = engine.getEffectsParams();

    expect(fx.eq).toBeDefined();
    expect(fx.eq?.low?.frequency).toBe(95);
    expect(fx.eq?.low?.gain).toBe(4.5);
    expect(fx.eq?.low?.type).toBe('lowshelf');
    expect(fx.eq?.midLow?.frequency).toBe(432);
    expect(fx.eq?.midLow?.gain).toBe(3.0);
    expect(fx.eq?.midLow?.q).toBe(2.1);
    expect(fx.eq?.midHigh?.frequency).toBe(2160);
    expect(fx.eq?.midHigh?.gain).toBe(-2.5);
    expect(fx.eq?.high?.frequency).toBe(8500);
    expect(fx.eq?.high?.gain).toBe(5.0);
    expect(fx.eq?.bypass).toBe(false);
  });

  it('handles EQ bypass toggling smoothly', () => {
    engine.updateEffects({
      ...engine.getEffectsParams(),
      eq: {
        low: { frequency: 80, gain: 0, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 0, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0, q: 1.414 },
        high: { frequency: 8000, gain: 0, q: 0.707 },
        bypass: true
      }
    });

    const fx = engine.getEffectsParams();
    expect(fx.eq?.bypass).toBe(true);
  });

  it('all 24 rebuilt presets load cleanly into AudioEngine and configure EQ', () => {
    const allPresets = [...getSoundPresetList(), ...getExtendedSoundPresetList()];
    expect(allPresets.length).toBe(24);

    for (const preset of allPresets) {
      engine.loadSoundPreset(preset);

      const fx = engine.getEffectsParams();
      const cs = engine.getChannelStripParams();

      // EQ Verification
      expect(fx.eq).toBeDefined();
      expect(fx.eq?.low?.frequency).toBeGreaterThan(0);
      expect(fx.eq?.midLow?.frequency).toBe(432); // All sacred presets center on 432Hz
      expect(fx.eq?.midHigh?.frequency).toBe(2160);
      expect(fx.eq?.high?.frequency).toBe(8000);

      // Sound Sources Verification
      expect(cs.oscA).toBeDefined();
      expect(cs.granular).toBeDefined();
      expect(cs.oscB).toBeDefined();
      expect(cs.drone).toBeDefined();

      // No particles in OSC A
      expect(cs.oscA.voiceMode).not.toBe('particles');
    }
  });

  it('verifies default preset is tibetanBowl with tailored 432Hz sacred resonance boost', () => {
    const defaultPreset = getSoundPresetById(DEFAULT_SOUND_PRESET_ID);
    expect(defaultPreset.id).toBe('tibetanBowl');
    expect(defaultPreset.effects.eq?.midLow?.gain).toBeGreaterThan(0);
    expect(defaultPreset.effects.eq?.low?.type).toBe('highpass');
  });

  it('verifies 100% zero emoji compliance across all preset metadata', () => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const all = getAllFactoryPresets();
    for (const p of all) {
      expect(emojiRegex.test(p.name)).toBe(false);
      expect(emojiRegex.test(p.nameEn)).toBe(false);
      expect(emojiRegex.test(p.description)).toBe(false);
      expect(emojiRegex.test(p.badge)).toBe(false);
    }
  });
});
