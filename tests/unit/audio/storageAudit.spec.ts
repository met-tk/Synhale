import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllFactoryPresets } from '../../../src/audio/presets/soundPresets';
import { getUserPresets, saveUserPreset, updateUserPreset, deleteUserPreset } from '../../../src/audio/storage/userPresets';
import { getUserCurvePresets, saveUserCurvePreset } from '../../../src/audio/storage/curvePresets';
import { sanitizeBreathCurveData } from '../../../src/audio/storage/curveValidation';
import { MAX_STORAGE_CHARS, readStoredJson } from '../../../src/audio/storage/safeStorage';
import { getUserRhythms, saveUserRhythm, loadBreathConfig, FACTORY_AUTOMATIONS, FACTORY_RHYTHMS } from '../../../src/breath/storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Audit: stored input and persistence failures', () => {
  it('falls back safely when the storage getter itself is denied', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(getUserPresets()).toEqual([]);
    expect(getUserCurvePresets()).toEqual([]);
    expect(getUserRhythms()).toEqual([]);
    expect(loadBreathConfig().customRhythm).toEqual(FACTORY_RHYTHMS.box);
    expect(() => saveUserPreset({ name: 'keep me', channelStrip: {}, effects: {} })).toThrow('无法保存');
  });

  it('reports quota failures and leaves the stored preset unchanged', () => {
    const saved = saveUserPreset({ name: 'original', channelStrip: {}, effects: {} });
    const original = localStorage.getItem('synhale_user_presets_v1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(updateUserPreset(saved.id, { name: 'changed' })).toBe(false);
    expect(deleteUserPreset(saved.id)).toBe(false);
    expect(() => saveUserCurvePreset('curve', sanitizeBreathCurveData({}))).toThrow('无法保存');
    expect(() => saveUserRhythm({ ...FACTORY_RHYTHMS.box, name: 'rhythm' })).toThrow('无法保存');
    expect(localStorage.getItem('synhale_user_presets_v1')).toBe(original);
  });

  it('rejects oversized serialized input before parsing it', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(' '.repeat(MAX_STORAGE_CHARS + 1));
    const parse = vi.spyOn(JSON, 'parse');
    expect(readStoredJson('huge')).toBeUndefined();
    expect(parse).not.toHaveBeenCalled();
  });

  it('repairs wrong primitive types and unsafe routing without losing a valid preset', () => {
    localStorage.setItem('synhale_user_presets_v1', JSON.stringify([{
      id: 'broken', name: 'Recovered',
      channelStrip: { oscA: { gain: 'loud', bypass: 'false', warpMode: '__proto__' } },
      effects: { laneAOrder: ['gain', 'gain', '__proto__'], laneBOrder: ['gain', 'delay'], sourceRoutes: { oscA: 'unknown' } },
      modulationRoutes: { 'oscA-gain': { source: 'breathMacro', target: 'oscA-gain', depth: 100,
        bipolar: 'false', stageMultipliers: { inhale: 'loud', exhale: -4, holdIn: 10, holdOut: 0.3 } } }
    }]));
    const [preset] = getUserPresets();
    expect(typeof preset.channelStrip.oscA.gain).toBe('number');
    expect(typeof preset.channelStrip.oscA.bypass).toBe('boolean');
    expect(preset.channelStrip.oscA.warpMode).toBe('off');
    expect(preset.effects.laneAOrder).toEqual(['gain']);
    expect(preset.effects.laneBOrder).toEqual(['delay']);
    expect(preset.effects.sourceRoutes?.oscA).toBe('laneA');
    expect(preset.modulationRoutes?.['oscA-gain']).toMatchObject({ depth: 1, bipolar: false,
      stageMultipliers: { inhale: 1, exhale: 0, holdIn: 1, holdOut: 0.3 } });
  });

  it('round-trips every factory sound without changing its supplied acoustic parameters', () => {
    for (const preset of getAllFactoryPresets()) {
      localStorage.clear();
      saveUserPreset(preset);
      const [restored] = getUserPresets();
      expect(restored.channelStrip, preset.id).toMatchObject(preset.channelStrip);
      expect(restored.effects, preset.id).toMatchObject(preset.effects);
      if (preset.modulationRoutes) expect(restored.modulationRoutes, preset.id).toMatchObject(preset.modulationRoutes);
    }
  });

  it('strips prototype keys and cycles before writing without modifying the caller', () => {
    const input = JSON.parse('{"oscA":{"__proto__":{"polluted":true},"gain":0.2}}');
    input.cycle = input;
    expect(() => saveUserPreset({ name: 'safe', channelStrip: input, effects: {} })).not.toThrow();
    expect(localStorage.getItem('synhale_user_presets_v1')).not.toContain('__proto__');
    expect(input.cycle).toBe(input);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('repairs curve points, orders endpoints and detaches returned defaults', () => {
    const curve = sanitizeBreathCurveData({ inhale: { points: [
      { id: 'same', time: 0.8, value: 4, tension: Infinity },
      { id: 'same', time: 0.2, value: -2, tension: 8 },
      { time: NaN, value: 1 }
    ] } });
    expect(curve.inhale.points.map(point => point.time)).toEqual([0, 0.2, 0.8, 1]);
    expect(new Set(curve.inhale.points.map(point => point.id)).size).toBe(4);
    expect(curve.inhale.points.every(point => point.value >= 0 && point.value <= 1 && Number.isFinite(point.tension))).toBe(true);
    curve.holdIn.points[0].value = 999;
    expect(sanitizeBreathCurveData({}).holdIn.points[0].value).not.toBe(999);
  });

  it('does not silently evict a saved rhythm when the collection is full', () => {
    localStorage.setItem('synhale_user_rhythms_v1', JSON.stringify(Array.from({ length: 100 }, (_, i) => ({
      ...FACTORY_RHYTHMS.box, id: `saved-${i}`
    }))));
    expect(() => saveUserRhythm({ ...FACTORY_RHYTHMS.box, id: 'new' })).toThrow('上限');
    expect(getUserRhythms()).toHaveLength(100);
    expect(getUserRhythms()[0].id).toBe('saved-0');
  });

  it('does not leak mutable factory automation objects through load', () => {
    const before = FACTORY_AUTOMATIONS[0].inhale.startVal;
    const loaded = loadBreathConfig();
    loaded.automations![0].inhale.startVal = 999;
    expect(FACTORY_AUTOMATIONS[0].inhale.startVal).toBe(before);
    expect(loadBreathConfig().automations![0].inhale.startVal).toBe(before);
  });
});
