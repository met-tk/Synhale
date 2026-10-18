import { describe, it, expect, beforeEach } from 'vitest';
import {
  CUE_PRESETS,
  CUE_PRESET_LIST,
  DEFAULT_CUE_SETTINGS,
  loadCueSettings,
  saveCueSettings,
  type BreathCueSettings
} from '../../../src/audio/cue/breathCueConfig';
import { playCueSound, resolveSafeSampleUrl } from '../../../src/audio/cue/breathCuePlayer';

describe('Breath Cue Configuration & Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides 5 curated soothing cue sound presets with relative URLs for Electron', () => {
    expect(CUE_PRESET_LIST.length).toBe(5);
    expect(Object.keys(CUE_PRESETS).length).toBe(5);
    const presetIds = CUE_PRESET_LIST.map(p => p.id);
    expect(presetIds).toEqual([
      'singingBowl',
      'zenWaterDrop',
      'woodenTemple',
      'crystalHarmonics',
      'deepSubPing'
    ]);

    CUE_PRESET_LIST.forEach(preset => {
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.tag).toBeDefined();
      expect(preset.sampleUrl).toMatch(/^\.\/audio\/cues\//);
      expect(CUE_PRESETS[preset.id]).toEqual(preset);
    });
  });

  it('resolves safe sample URLs across web and electron file protocol', () => {
    expect(resolveSafeSampleUrl('/audio/cues/singingBowl.ogg')).toBe('./audio/cues/singingBowl.ogg');
    expect(resolveSafeSampleUrl('./audio/cues/singingBowl.ogg')).toBe('./audio/cues/singingBowl.ogg');
    expect(resolveSafeSampleUrl('https://example.com/sound.ogg')).toBe('https://example.com/sound.ogg');
    expect(resolveSafeSampleUrl('')).toBe('');
  });

  it('loads default cue settings when storage is empty', () => {
    const settings = loadCueSettings();
    expect(settings).toEqual(DEFAULT_CUE_SETTINGS);
    expect(settings.enabled).toBe(true);
    expect(settings.preset).toBe('singingBowl');
    expect(settings.volume).toBe(0.35);
    expect(settings.nodes.exhale_to_inhale).toBe(true);
    expect(settings.nodes.inhale_to_holdIn).toBe(false);
  });

  it('persists and retrieves updated cue settings from localStorage', () => {
    const customSettings: BreathCueSettings = {
      enabled: false,
      preset: 'zenWaterDrop',
      volume: 0.5,
      nodes: {
        exhale_to_inhale: true,
        inhale_to_holdIn: true,
        holdIn_to_exhale: false,
        exhale_to_holdOut: true
      }
    };

    saveCueSettings(customSettings);
    const retrieved = loadCueSettings();
    expect(retrieved.enabled).toBe(false);
    expect(retrieved.preset).toBe('zenWaterDrop');
    expect(retrieved.volume).toBe(0.5);
    expect(retrieved.nodes.inhale_to_holdIn).toBe(true);
    expect(retrieved.nodes.exhale_to_holdOut).toBe(true);
  });
});

describe('Breath Cue Audio Synthesizer', () => {
  it('synthesizes all 5 cue presets safely without throwing errors', () => {
    CUE_PRESET_LIST.forEach(preset => {
      expect(() => {
        playCueSound(preset.id, 0.4);
      }).not.toThrow();
    });
  });

  it('clamps volume to safe range [0, 1] without error', () => {
    expect(() => {
      playCueSound('singingBowl', -0.5);
      playCueSound('singingBowl', 2.5);
      playCueSound('singingBowl', 0.0);
    }).not.toThrow();
  });
});
