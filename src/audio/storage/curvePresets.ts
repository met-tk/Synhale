import { CurvePreset, FullBreathCurveData } from '../../types';
import { createDefaultBreathCurveData } from '../dsp/curveMath';
import { sanitizeBreathCurveData } from './curveValidation';
import { isRecord, MAX_USER_PRESETS, readStoredJson, requireStoredJson, writeStoredJson } from './safeStorage';

const USER_PRESETS_STORAGE_KEY = 'synhale_user_curve_presets_v1';

export const FACTORY_CURVE_PRESETS: CurvePreset[] = [
  {
    id: 'factory-natural-breath',
    name: '自然潮汐 (Natural Breath)',
    category: 'factory',
    curveData: createDefaultBreathCurveData()
  },
  {
    id: 'factory-heroic-apex',
    name: '爆发跃升 (Heroic Apex)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.1, tension: 0.6 }, // Sharp exponential climb
          { id: 'p2', time: 0.7, value: 0.95, tension: -0.2 },
          { id: 'p3', time: 1.0, value: 1.0, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'p4', time: 0.0, value: 1.0, tension: 0.0 },
          { id: 'p5', time: 1.0, value: 0.95, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'p6', time: 0.0, value: 0.95, tension: 0.7 }, // Dramatic steep drop
          { id: 'p7', time: 0.4, value: 0.2, tension: -0.3 },
          { id: 'p8', time: 1.0, value: 0.05, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'p9', time: 0.0, value: 0.05, tension: 0.0 },
          { id: 'p10', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-square-pulse',
    name: '方波脉冲 (Square Pulse)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.0, tension: 0.0 },
          { id: 'p2', time: 0.05, value: 1.0, tension: 0.0 },
          { id: 'p3', time: 1.0, value: 1.0, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'p4', time: 0.0, value: 1.0, tension: 0.0 },
          { id: 'p5', time: 1.0, value: 1.0, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'p6', time: 0.0, value: 1.0, tension: 0.0 },
          { id: 'p7', time: 0.05, value: 0.0, tension: 0.0 },
          { id: 'p8', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'p9', time: 0.0, value: 0.0, tension: 0.0 },
          { id: 'p10', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-zen-stillness',
    name: '禅定微澜 (Zen Stillness)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.35, tension: 0.0 },
          { id: 'p2', time: 0.5, value: 0.55, tension: 0.0 },
          { id: 'p3', time: 1.0, value: 0.65, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'p4', time: 0.0, value: 0.65, tension: 0.0 },
          { id: 'p5', time: 1.0, value: 0.60, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'p6', time: 0.0, value: 0.60, tension: 0.0 },
          { id: 'p7', time: 0.5, value: 0.40, tension: 0.0 },
          { id: 'p8', time: 1.0, value: 0.35, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'p9', time: 0.0, value: 0.35, tension: 0.0 },
          { id: 'p10', time: 1.0, value: 0.35, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-pluck-strike',
    name: '弹拨包络 (Pluck Strike)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'p1', time: 0.0, value: 0.0, tension: 0.0 },
          { id: 'p2', time: 0.02, value: 1.0, tension: 0.6 }, // Ultra fast pluck strike
          { id: 'p3', time: 0.4, value: 0.3, tension: -0.3 },
          { id: 'p4', time: 1.0, value: 0.05, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'p5', time: 0.0, value: 0.05, tension: 0.0 },
          { id: 'p6', time: 1.0, value: 0.02, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'p7', time: 0.0, value: 0.02, tension: 0.0 },
          { id: 'p8', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'p9', time: 0.0, value: 0.0, tension: 0.0 },
          { id: 'p10', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-gentle-breeze',
    name: '慢速微风 (Gentle Breeze)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'gb-1', time: 0.0, value: 0.15, tension: 0.3 },
          { id: 'gb-2', time: 0.5, value: 0.55, tension: -0.2 },
          { id: 'gb-3', time: 1.0, value: 0.85, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'gb-4', time: 0.0, value: 0.85, tension: 0.0 },
          { id: 'gb-5', time: 1.0, value: 0.80, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'gb-6', time: 0.0, value: 0.80, tension: -0.3 },
          { id: 'gb-7', time: 0.5, value: 0.40, tension: 0.2 },
          { id: 'gb-8', time: 1.0, value: 0.15, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'gb-9', time: 0.0, value: 0.15, tension: 0.0 },
          { id: 'gb-10', time: 1.0, value: 0.15, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-rhythmic-steps',
    name: '阶梯跳跃 (Rhythmic Steps)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'rs-1', time: 0.0, value: 0.25, tension: 0.0 },
          { id: 'rs-2', time: 0.5, value: 0.25, tension: 0.0 },
          { id: 'rs-3', time: 0.51, value: 0.75, tension: 0.0 },
          { id: 'rs-4', time: 1.0, value: 0.75, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'rs-5', time: 0.0, value: 1.0, tension: 0.0 },
          { id: 'rs-6', time: 1.0, value: 1.0, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'rs-7', time: 0.0, value: 0.65, tension: 0.0 },
          { id: 'rs-8', time: 0.5, value: 0.65, tension: 0.0 },
          { id: 'rs-9', time: 0.51, value: 0.25, tension: 0.0 },
          { id: 'rs-10', time: 1.0, value: 0.25, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'rs-11', time: 0.0, value: 0.0, tension: 0.0 },
          { id: 'rs-12', time: 1.0, value: 0.0, tension: 0.0 }
        ]
      }
    }
  },
  {
    id: 'factory-reverse-swell',
    name: '反向膨胀 (Reverse Swell)',
    category: 'factory',
    curveData: {
      inhale: {
        stage: 'inhale',
        points: [
          { id: 'rv-1', time: 0.0, value: 0.05, tension: -0.6 },
          { id: 'rv-2', time: 0.8, value: 0.35, tension: 0.7 },
          { id: 'rv-3', time: 1.0, value: 1.0, tension: 0.0 }
        ]
      },
      holdIn: {
        stage: 'holdIn',
        points: [
          { id: 'rv-4', time: 0.0, value: 1.0, tension: 0.0 },
          { id: 'rv-5', time: 1.0, value: 0.95, tension: 0.0 }
        ]
      },
      exhale: {
        stage: 'exhale',
        points: [
          { id: 'rv-6', time: 0.0, value: 0.95, tension: 0.5 },
          { id: 'rv-7', time: 0.2, value: 0.15, tension: -0.4 },
          { id: 'rv-8', time: 1.0, value: 0.05, tension: 0.0 }
        ]
      },
      holdOut: {
        stage: 'holdOut',
        points: [
          { id: 'rv-9', time: 0.0, value: 0.05, tension: 0.0 },
          { id: 'rv-10', time: 1.0, value: 0.05, tension: 0.0 }
        ]
      }
    }
  }
];

export function getUserCurvePresets(): CurvePreset[] {
  const parsed = readStoredJson(USER_PRESETS_STORAGE_KEY);
  if (!Array.isArray(parsed) || parsed.length > MAX_USER_PRESETS) return [];
  const ids = new Set<string>();
  return parsed.flatMap((raw): CurvePreset[] => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || !isRecord(raw.curveData)) return [];
    const id = raw.id.trim().slice(0, 64);
    if (ids.has(id)) return [];
    ids.add(id);
    return [{ id, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 64) : '自定义曲线',
      category: 'user', curveData: sanitizeBreathCurveData(raw.curveData) }];
  });
}

export function saveUserCurvePreset(name: string, curveData: FullBreathCurveData): CurvePreset {
  const newPreset: CurvePreset = {
    id: `user-curve-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 64) : '自定义曲线',
    category: 'user',
    curveData: sanitizeBreathCurveData(curveData)
  };
  const existing = getUserCurvePresets();
  if (existing.length >= MAX_USER_PRESETS) throw new Error('预设数量已达上限，请先删除不再使用的预设。');
  requireStoredJson(USER_PRESETS_STORAGE_KEY, [...existing, newPreset]);
  return newPreset;
}

export function updateUserCurvePreset(id: string, curveData: FullBreathCurveData): boolean {
  const existing = getUserCurvePresets();
  const targetIndex = existing.findIndex(p => p.id === id);
  if (targetIndex === -1) return false;
  existing[targetIndex] = { ...existing[targetIndex], curveData: sanitizeBreathCurveData(curveData) };
  return writeStoredJson(USER_PRESETS_STORAGE_KEY, existing);
}

export function renameUserCurvePreset(id: string, newName: string): boolean {
  const trimmed = typeof newName === 'string' ? newName.trim().slice(0, 64) : '';
  if (!trimmed) return false;
  const existing = getUserCurvePresets();
  const targetIndex = existing.findIndex(p => p.id === id);
  if (targetIndex === -1) return false;
  existing[targetIndex] = { ...existing[targetIndex], name: trimmed };
  return writeStoredJson(USER_PRESETS_STORAGE_KEY, existing);
}

export function deleteUserCurvePreset(id: string): boolean {
  return writeStoredJson(USER_PRESETS_STORAGE_KEY, getUserCurvePresets().filter(p => p.id !== id));
}

export function getAllCurvePresets(): CurvePreset[] {
  return [...FACTORY_CURVE_PRESETS, ...getUserCurvePresets()];
}

export function getCurvePresetById(id: string): CurvePreset | undefined {
  return getAllCurvePresets().find(p => p.id === id);
}
