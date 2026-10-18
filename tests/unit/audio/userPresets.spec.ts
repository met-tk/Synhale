import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserPresets,
  saveUserPreset,
  updateUserPreset,
  renameUserPreset,
  deleteUserPreset
} from '../../../src/audio/storage/userPresets';

describe('User Custom Sound Presets Storage & Lifecycle', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  beforeEach(() => {
    localStorage.clear();
  });

  it('initially returns empty list when no user presets exist', () => {
    const list = getUserPresets();
    expect(list).toEqual([]);
  });

  it('saves new user presets with generated ID and persists to localStorage', () => {
    const saved = saveUserPreset({
      name: '极简冥想流',
      nameEn: 'Minimal Meditation',
      channelStrip: { oscA: { wavetableIndex: 2 } },
      effects: { filter: { cutoff: 800 } }
    });

    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('极简冥想流');
    expect(saved.category).toBe('User');

    const all = getUserPresets();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
    expect(all[0].name).toBe('极简冥想流');
  });

  it('updates / overwrites existing user preset parameters without mutating ID', () => {
    const saved = saveUserPreset({
      name: '原初音色',
      channelStrip: { oscA: { wavetableIndex: 0 } },
      effects: { filter: { cutoff: 600 } }
    });

    const updateSuccess = updateUserPreset(saved.id, {
      name: '微调后音色',
      effects: { filter: { cutoff: 1200 } }
    });

    expect(updateSuccess).toBe(true);

    const all = getUserPresets();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
    expect(all[0].name).toBe('微调后音色');
    expect((all[0].effects as any).filter.cutoff).toBe(1200);
  });

  it('renames user preset cleanly', () => {
    const saved = saveUserPreset({
      name: '未命名预设',
      channelStrip: {},
      effects: {}
    });

    const renameSuccess = renameUserPreset(saved.id, '深邃次八度');
    expect(renameSuccess).toBe(true);

    const all = getUserPresets();
    expect(all[0].name).toBe('深邃次八度');
    expect(all[0].nameEn).toBe('深邃次八度');

    // Reject empty string rename
    const emptyRename = renameUserPreset(saved.id, '   ');
    expect(emptyRename).toBe(false);
  });

  it('deletes user preset by ID', () => {
    const p1 = saveUserPreset({ name: '预设 1', channelStrip: {}, effects: {} });
    const p2 = saveUserPreset({ name: '预设 2', channelStrip: {}, effects: {} });

    expect(getUserPresets()).toHaveLength(2);

    const deleteSuccess = deleteUserPreset(p1.id);
    expect(deleteSuccess).toBe(true);

    const remaining = getUserPresets();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(p2.id);
  });

  it('defensively sanitizes corrupted localStorage data', () => {
    localStorage.setItem('synhale_user_presets_v1', 'invalid-json-string');
    expect(getUserPresets()).toEqual([]);

    localStorage.setItem('synhale_user_presets_v1', JSON.stringify([{ notAValidPreset: 123 }]));
    expect(getUserPresets()).toEqual([]);
  });

  it('complies strictly with zero emoji rule', () => {
    const saved = saveUserPreset({
      name: '纯净声学音色',
      description: '无干扰纯正频率',
      channelStrip: {},
      effects: {}
    });

    expect(emojiRegex.test(saved.name)).toBe(false);
    expect(emojiRegex.test(saved.nameEn)).toBe(false);
    expect(emojiRegex.test(saved.description)).toBe(false);
    expect(emojiRegex.test(saved.badge)).toBe(false);
  });
});
