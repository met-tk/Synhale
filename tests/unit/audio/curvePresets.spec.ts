import { describe, it, expect, beforeEach } from 'vitest';
import {
  FACTORY_CURVE_PRESETS,
  getAllCurvePresets,
  getUserCurvePresets,
  saveUserCurvePreset,
  updateUserCurvePreset,
  renameUserCurvePreset,
  deleteUserCurvePreset,
  getCurvePresetById
} from '../../../src/audio/storage/curvePresets';
import { createDefaultBreathCurveData } from '../../../src/audio/dsp/curveMath';

describe('Breath Curve Presets Manager & Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides 8 built-in factory curve presets', () => {
    expect(FACTORY_CURVE_PRESETS.length).toBe(8);

    const presetIds = FACTORY_CURVE_PRESETS.map(p => p.id);
    expect(presetIds).toContain('factory-natural-breath');
    expect(presetIds).toContain('factory-heroic-apex');
    expect(presetIds).toContain('factory-square-pulse');
    expect(presetIds).toContain('factory-zen-stillness');
    expect(presetIds).toContain('factory-pluck-strike');
    expect(presetIds).toContain('factory-gentle-breeze');
    expect(presetIds).toContain('factory-rhythmic-steps');
    expect(presetIds).toContain('factory-reverse-swell');

    // Validate that each preset contains valid 4-stage data
    for (const preset of FACTORY_CURVE_PRESETS) {
      expect(preset.category).toBe('factory');
      expect(preset.curveData.inhale.points.length).toBeGreaterThanOrEqual(2);
      expect(preset.curveData.holdIn.points.length).toBeGreaterThanOrEqual(2);
      expect(preset.curveData.exhale.points.length).toBeGreaterThanOrEqual(2);
      expect(preset.curveData.holdOut.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('saves, retrieves, updates, renames, and deletes user custom curve presets via localStorage', () => {
    const customData = createDefaultBreathCurveData();
    // Add custom modification
    customData.inhale.points.push({
      id: 'custom-pt',
      time: 0.5,
      value: 0.9,
      tension: 0.5
    });

    // Save custom preset
    const created = saveUserCurvePreset('My Deep Meditation', customData);
    expect(created.id.startsWith('user-curve-')).toBe(true);
    expect(created.name).toBe('My Deep Meditation');
    expect(created.category).toBe('user');

    // Retrieve via getUserCurvePresets
    const userPresets = getUserCurvePresets();
    expect(userPresets.length).toBe(1);
    expect(userPresets[0].id).toBe(created.id);
    expect(userPresets[0].name).toBe('My Deep Meditation');

    // Update custom preset curve data
    const updatedData = createDefaultBreathCurveData();
    updatedData.exhale.points.push({ id: 'ex-pt', time: 0.7, value: 0.2, tension: -0.4 });
    const updateOk = updateUserCurvePreset(created.id, updatedData);
    expect(updateOk).toBe(true);

    const userPresetsAfterUpdate = getUserCurvePresets();
    expect(userPresetsAfterUpdate[0].curveData.exhale.points.length).toBe(
      updatedData.exhale.points.length
    );

    // Rename custom preset
    const renameOk = renameUserCurvePreset(created.id, 'Renamed Meditation Preset');
    expect(renameOk).toBe(true);
    const userPresetsAfterRename = getUserCurvePresets();
    expect(userPresetsAfterRename[0].name).toBe('Renamed Meditation Preset');

    // Retrieve via getAllCurvePresets
    const allPresets = getAllCurvePresets();
    expect(allPresets.length).toBe(FACTORY_CURVE_PRESETS.length + 1);

    // Retrieve by ID
    const found = getCurvePresetById(created.id);
    expect(found?.name).toBe('Renamed Meditation Preset');

    // Delete custom preset
    deleteUserCurvePreset(created.id);
    expect(getUserCurvePresets().length).toBe(0);
    expect(getCurvePresetById(created.id)).toBeUndefined();
  });

  it('retrieves factory presets by ID', () => {
    const natural = getCurvePresetById('factory-natural-breath');
    expect(natural).toBeDefined();
    expect(natural?.name).toContain('自然潮汐');

    const breeze = getCurvePresetById('factory-gentle-breeze');
    expect(breeze).toBeDefined();
    expect(breeze?.name).toContain('慢速微风');
  });
});
