import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_PREFERENCES,
  SESSION_PREFERENCES_KEY,
  loadSessionPreferences,
  repairSessionPreferences,
  saveSessionPreferences,
  visualGroupIndexOf
} from '../../../src/storage/sessionPreferences';

describe('sessionPreferences persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns factory defaults when storage is empty', () => {
    expect(loadSessionPreferences()).toEqual({
      ...DEFAULT_SESSION_PREFERENCES,
      updatedAt: undefined
    });
  });

  it('round-trips valid preferences and stamps updatedAt', () => {
    expect(saveSessionPreferences({
      visualPreset: 'coronaOrbit',
      activeRhythmKey: 'coherent',
      activeSoundPresetKey: 'zenGarden'
    })).toBe(true);

    const loaded = loadSessionPreferences();
    expect(loaded.visualPreset).toBe('coronaOrbit');
    expect(loaded.activeRhythmKey).toBe('coherent');
    expect(loaded.activeSoundPresetKey).toBe('zenGarden');
    expect(loaded.visualGroupIndex).toBe(1);
    expect(typeof loaded.updatedAt).toBe('number');
  });

  it('merges partial updates into previously stored values', () => {
    saveSessionPreferences({ visualPreset: 'zenWaves', activeRhythmKey: 'sleep' });
    saveSessionPreferences({ activeRhythmKey: 'prana' });
    const loaded = loadSessionPreferences();
    expect(loaded.visualPreset).toBe('zenWaves');
    expect(loaded.activeRhythmKey).toBe('prana');
  });

  it('repairs invalid stored payloads safely', () => {
    expect(repairSessionPreferences(null)).toEqual({ ...DEFAULT_SESSION_PREFERENCES, updatedAt: undefined });
    expect(repairSessionPreferences('__proto__ payload').visualPreset).toBe(DEFAULT_SESSION_PREFERENCES.visualPreset);

    const bad = repairSessionPreferences({
      visualPreset: 'notAPreset',
      visualGroupIndex: 99,
      activeRhythmKey: '__proto__',
      activeSoundPresetKey: 42
    });
    expect(bad.visualPreset).toBe('spacetimeWarp');
    expect(bad.visualGroupIndex).toBe(2);
    expect(bad.activeRhythmKey).toBe('box');
    expect(bad.activeSoundPresetKey).toBe('tibetanBowl');

    localStorage.setItem(SESSION_PREFERENCES_KEY, '{{{malformed');
    expect(loadSessionPreferences().visualPreset).toBe('spacetimeWarp');
  });

  it('derives group index from visual preset id', () => {
    expect(visualGroupIndexOf('minimalRing')).toBe(0);
    expect(visualGroupIndexOf('magneticFlux')).toBe(1);
    expect(visualGroupIndexOf('hopfFibration')).toBe(2);
    expect(visualGroupIndexOf('unknown' as any)).toBe(2);
  });

  it('survives storage write failures gracefully', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(saveSessionPreferences({ visualPreset: 'zenWaves' })).toBe(false);
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});
