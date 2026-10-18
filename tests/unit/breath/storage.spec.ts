import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FACTORY_RHYTHMS,
  FACTORY_AUTOMATIONS,
  validateAndRepairRhythm,
  saveBreathConfig,
  loadBreathConfig,
  saveCustomRhythm,
  loadCustomRhythm,
  getRhythmPreset,
  STORAGE_KEY_CONFIG,
  STORAGE_KEY_CUSTOM_RHYTHM,
  getUserRhythms,
  saveUserRhythm,
  deleteUserRhythm
} from '../../../src/breath/storage';

describe('Storage & Presets Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides the 5 canonical factory rhythm presets with valid proportions', () => {
    expect(STORAGE_KEY_CONFIG).toBe('synhale_config');
    expect(STORAGE_KEY_CUSTOM_RHYTHM).toBe('synhale_custom_rhythm');
    expect(Object.keys(FACTORY_RHYTHMS)).toHaveLength(5);
    expect(FACTORY_RHYTHMS.box.inhale).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.holdIn).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.exhale).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.holdOut).toBe(4.0);

    expect(FACTORY_RHYTHMS.sleep.holdIn).toBe(7.0);
    expect(FACTORY_RHYTHMS.sleep.exhale).toBe(8.0);
    expect(FACTORY_RHYTHMS.sleep.holdOut).toBe(0.0);

    expect(FACTORY_RHYTHMS.coherent.inhale).toBe(5.5);
    expect(FACTORY_RHYTHMS.coherent.exhale).toBe(5.5);

    expect(FACTORY_RHYTHMS.prana.exhale).toBe(2.0);
    expect(FACTORY_RHYTHMS.calm.exhale).toBe(6.0);
  });

  it('resolves rhythm presets by key, id, or name with fallback', () => {
    expect(getRhythmPreset('box').id).toBe('box-4-4-4-4');
    expect(getRhythmPreset('relax-4-7-8-0').name).toBe('Relax 4-7-8');
    expect(getRhythmPreset('Coherent 5.5s').id).toBe('coherent-55');
    expect(getRhythmPreset('non-existent-key').id).toBe('box-4-4-4-4');
  });

  it('provides 4 core factory parameter automations', () => {
    expect(FACTORY_AUTOMATIONS).toHaveLength(4);
    const params = FACTORY_AUTOMATIONS.map((a) => a.targetParam);
    expect(params).toContain('filterCutoff');
    expect(params).toContain('filterResonance');
    expect(params).toContain('noiseGain');
    expect(params).toContain('reverbWet');
  });

  it('saves and loads configuration with schemaVersion: 2 header', () => {
    const customRhythm = { inhale: 4.5, holdIn: 2.0, exhale: 4.5, holdOut: 1.0 };
    const saved = saveBreathConfig('custom', customRhythm);
    expect(saved).toBe(true);

    const loaded = loadBreathConfig();
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.activePreset).toBe('custom');
    expect(loaded.customRhythm.inhale).toBe(4.5);
    expect(loaded.customRhythm.holdOut).toBe(1.0);
  });

  it('falls back safely to default Box preset on legacy schemaVersion 1 data', () => {
    const legacy = {
      schemaVersion: 1,
      rhythm: [4, 4, 4, 4]
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(legacy));

    const loaded = loadBreathConfig();
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.activePreset).toBe('box-4-4-4-4');
    expect(loaded.customRhythm.id).toBe('box-4-4-4-4');
  });

  it('falls back safely on corrupted or truncated JSON', () => {
    localStorage.setItem(STORAGE_KEY_CONFIG, '{"schemaVersion": 2, "activePreset": "box", "custom');
    const loaded = loadBreathConfig();
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.activePreset).toBe('box-4-4-4-4');
  });

  it('falls back safely when LocalStorage is empty', () => {
    const loaded = loadBreathConfig();
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.customRhythm.inhale).toBe(4.0);
  });

  it('repairs missing fields in partial rhythm config using factory defaults', () => {
    const partial = { inhale: 6.0, exhale: 6.0 };
    const repaired = validateAndRepairRhythm(partial);

    expect(repaired.inhale).toBe(6.0);
    expect(repaired.holdIn).toBe(4.0); // default box holdIn
    expect(repaired.exhale).toBe(6.0);
    expect(repaired.holdOut).toBe(4.0); // default box holdOut
  });

  it('clamps stage durations to physiological bounds (0.1s to 60s)', () => {
    const extreme = {
      inhale: 0.001,
      holdIn: -5.0,
      exhale: 120.0,
      holdOut: 150.0
    };
    const validated = validateAndRepairRhythm(extreme);

    expect(validated.inhale).toBe(0.1);
    expect(validated.holdIn).toBe(0.0);
    expect(validated.exhale).toBe(60.0);
    expect(validated.holdOut).toBe(60.0);
  });

  it('saves and loads custom rhythm cleanly', () => {
    const custom = { inhale: 3.5, holdIn: 1.5, exhale: 5.0, holdOut: 0.5 };
    saveCustomRhythm(custom);

    const loaded = loadCustomRhythm();
    expect(loaded.inhale).toBe(3.5);
    expect(loaded.holdIn).toBe(1.5);
    expect(loaded.exhale).toBe(5.0);
    expect(loaded.holdOut).toBe(0.5);
  });

  it('catches and handles LocalStorage quota exceeded errors without crashing', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const success = saveBreathConfig('box', FACTORY_RHYTHMS.box);
    expect(success).toBe(false);

    const customSuccess = saveCustomRhythm(FACTORY_RHYTHMS.box);
    expect(customSuccess).toBe(false);

    setItemSpy.mockRestore();
  });

  it('manages user custom breath rhythms with full CRUD and repair capabilities', () => {
    // 1. Initially empty
    expect(getUserRhythms()).toEqual([]);

    // 2. Save a custom rhythm
    const created = saveUserRhythm({
      name: '4-2-8-2 深度放松',
      inhale: 4.0,
      holdIn: 2.0,
      exhale: 8.0,
      holdOut: 2.0
    });

    expect(created.id).toContain('user-rhythm-');
    expect(created.name).toBe('4-2-8-2 深度放松');
    expect(created.inhale).toBe(4.0);
    expect(created.holdIn).toBe(2.0);
    expect(created.exhale).toBe(8.0);
    expect(created.holdOut).toBe(2.0);

    const list = getUserRhythms();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    // 3. getRhythmPreset should resolve user rhythm
    const resolved = getRhythmPreset(created.id);
    expect(resolved.name).toBe('4-2-8-2 深度放松');

    // 4. Update the custom rhythm
    const updated = saveUserRhythm({
      id: created.id,
      name: '4-2-8-2 重命名',
      inhale: 4.5,
      holdIn: 2.0,
      exhale: 8.5,
      holdOut: 2.0
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('4-2-8-2 重命名');
    expect(getUserRhythms()).toHaveLength(1);
    expect(getUserRhythms()[0].inhale).toBe(4.5);

    // 5. Delete the custom rhythm
    const deleted = deleteUserRhythm(created.id);
    expect(deleted).toBe(true);
    expect(getUserRhythms()).toHaveLength(0);
  });
});
