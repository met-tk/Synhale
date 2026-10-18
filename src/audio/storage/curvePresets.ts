import { CurvePreset, FullBreathCurveData } from '../../types';
import { createDefaultBreathCurveData } from '../dsp/curveMath';

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
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserCurvePreset(name: string, curveData: FullBreathCurveData): CurvePreset {
  const trimmed = name.trim() || '自定义曲线';
  const newPreset: CurvePreset = {
    id: `user-curve-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    category: 'user',
    curveData: JSON.parse(JSON.stringify(curveData))
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    const existing = getUserCurvePresets();
    existing.push(newPreset);
    window.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  }

  return newPreset;
}

export function updateUserCurvePreset(id: string, curveData: FullBreathCurveData): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const existing = getUserCurvePresets();
  const targetIndex = existing.findIndex(p => p.id === id);
  if (targetIndex === -1) return false;

  existing[targetIndex] = {
    ...existing[targetIndex],
    curveData: JSON.parse(JSON.stringify(curveData))
  };
  window.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  return true;
}

export function renameUserCurvePreset(id: string, newName: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const trimmed = newName.trim();
  if (!trimmed) return false;
  const existing = getUserCurvePresets();
  const targetIndex = existing.findIndex(p => p.id === id);
  if (targetIndex === -1) return false;

  existing[targetIndex] = {
    ...existing[targetIndex],
    name: trimmed
  };
  window.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  return true;
}

export function deleteUserCurvePreset(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const existing = getUserCurvePresets().filter(p => p.id !== id);
  window.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(existing));
}

export function getAllCurvePresets(): CurvePreset[] {
  return [...FACTORY_CURVE_PRESETS, ...getUserCurvePresets()];
}

export function getCurvePresetById(id: string): CurvePreset | undefined {
  return getAllCurvePresets().find(p => p.id === id);
}
