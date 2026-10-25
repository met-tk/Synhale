import type { BreathRhythmConfig, ParameterAutomationConfig } from '../types';
import { isRecord, readStoredJson, requireStoredJson, writeStoredJson } from '../audio/storage/safeStorage';
import { BREATH_STAGES } from '../audio/storage/curveValidation';

export interface FactoryRhythm extends BreathRhythmConfig {
  id: string;
  name: string;
  description?: string;
}

/**
 * 5 Canonical Factory Rhythm Presets per R2 specification
 */
export const FACTORY_RHYTHMS: Record<string, FactoryRhythm> = {
  box: {
    id: 'box-4-4-4-4',
    name: 'Box 4-4-4-4',
    description: 'Equal 4-stage box breathing for mental calm and focus',
    inhale: 4.0,
    holdIn: 4.0,
    exhale: 4.0,
    holdOut: 4.0
  },
  sleep: {
    id: 'relax-4-7-8-0',
    name: 'Relax 4-7-8',
    description: 'Dr. Andrew Weil relaxing sleep rhythm with extended exhale',
    inhale: 4.0,
    holdIn: 7.0,
    exhale: 8.0,
    holdOut: 0.0
  },
  coherent: {
    id: 'coherent-55',
    name: 'Coherent 5.5s',
    description: '0.1Hz HRV cardiovascular resonance breathing',
    inhale: 5.5,
    holdIn: 0.0,
    exhale: 5.5,
    holdOut: 0.0
  },
  prana: {
    id: 'prana-energize',
    name: 'Prana Energize',
    description: 'Prana awakening rhythm for alertness and oxygenation',
    inhale: 4.0,
    holdIn: 4.0,
    exhale: 2.0,
    holdOut: 0.0
  },
  calm: {
    id: 'deep-calm-4-2-6-2',
    name: 'Deep Calm',
    description: 'Deep calm sound healing and singing bowl practice',
    inhale: 4.0,
    holdIn: 2.0,
    exhale: 6.0,
    holdOut: 2.0
  }
};

/**
 * 4 Factory Parameter Automation Configs for core acoustic nodes
 */
export const FACTORY_AUTOMATIONS: ParameterAutomationConfig[] = [
  {
    targetParam: 'filterCutoff',
    inhale: { startVal: 0.1, endVal: 0.95, tension: -0.5 },
    holdIn: { startVal: 0.95, endVal: 0.95, tension: 0.0 },
    exhale: { startVal: 0.95, endVal: 0.15, tension: 0.4 },
    holdOut: { startVal: 0.15, endVal: 0.1, tension: 0.0 }
  },
  {
    targetParam: 'filterResonance',
    inhale: { startVal: 0.2, endVal: 0.8, tension: 0.3 },
    holdIn: { startVal: 0.8, endVal: 0.7, tension: 0.0 },
    exhale: { startVal: 0.7, endVal: 0.2, tension: -0.2 },
    holdOut: { startVal: 0.2, endVal: 0.1, tension: 0.0 }
  },
  {
    targetParam: 'noiseGain',
    inhale: { startVal: 0.0, endVal: 0.8, tension: 0.6 },
    holdIn: { startVal: 0.0, endVal: 0.0, tension: 0.0 },
    exhale: { startVal: 0.4, endVal: 0.0, tension: -0.4 },
    holdOut: { startVal: 0.0, endVal: 0.0, tension: 0.0 }
  },
  {
    targetParam: 'reverbWet',
    inhale: { startVal: 0.2, endVal: 0.45, tension: 0.0 },
    holdIn: { startVal: 0.65, endVal: 0.70, tension: 0.0 },
    exhale: { startVal: 0.50, endVal: 0.20, tension: -0.3 },
    holdOut: { startVal: 0.10, endVal: 0.10, tension: 0.0 }
  }
];

/** Validates each stage and detaches stored data from mutable factory defaults. */
export function validateAndRepairAutomations(raw: unknown): ParameterAutomationConfig[] {
  const source = Array.isArray(raw) ? raw : FACTORY_AUTOMATIONS;
  return source.slice(0, 256).flatMap((config): ParameterAutomationConfig[] => {
    if (!isRecord(config) || typeof config.targetParam !== 'string' || !config.targetParam.trim()
      || ['__proto__', 'constructor', 'prototype'].includes(config.targetParam)) return [];
    const result = { targetParam: config.targetParam.slice(0, 128) } as ParameterAutomationConfig;
    for (const stage of BREATH_STAGES) {
      const curve = isRecord(config[stage]) ? config[stage] : {};
      const finite = (value: unknown, fallback: number, min: number, max: number) =>
        typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
      result[stage] = {
        startVal: finite(curve.startVal, 0, 0, 1),
        endVal: finite(curve.endVal, 0, 0, 1),
        tension: finite(curve.tension, 0, -1, 1)
      };
    }
    return [result];
  });
}

export interface SynhaleStoragePayload {
  schemaVersion: 2;
  activePreset: string;
  customRhythm: BreathRhythmConfig & { id?: string; name?: string };
  automations?: ParameterAutomationConfig[];
  updatedAt?: number;
}

export const STORAGE_KEY_CONFIG = 'synhale_config';
export const STORAGE_KEY_CUSTOM_RHYTHM = 'synhale_custom_rhythm';

/**
 * Validates and repairs arbitrary input into a safe, bounded BreathRhythmConfig
 */
export function validateAndRepairRhythm(raw: any): BreathRhythmConfig & { id?: string; name?: string } {
  const fallback = FACTORY_RHYTHMS.box;
  if (!isRecord(raw)) {
    return { ...fallback };
  }

  const clampActiveStage = (v: any, fallbackVal: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0.1, Math.min(60.0, v)) : fallbackVal;

  const clampHold = (v: any, fallbackVal: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0.0, Math.min(60.0, v)) : fallbackVal;

  return {
    id: typeof raw.id === 'string' ? raw.id.slice(0, 64) : fallback.id,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 64) : fallback.name,
    inhale: clampActiveStage(raw.inhale, fallback.inhale),
    holdIn: clampHold(raw.holdIn, fallback.holdIn),
    exhale: clampActiveStage(raw.exhale, fallback.exhale),
    holdOut: clampHold(raw.holdOut, fallback.holdOut)
  };
}

/**
 * Safely saves configuration payload to LocalStorage with schemaVersion: 2
 */
export function saveBreathConfig(
  activePreset: string,
  customRhythm: BreathRhythmConfig,
  automations: ParameterAutomationConfig[] = FACTORY_AUTOMATIONS
): boolean {

  const payload: SynhaleStoragePayload = {
    schemaVersion: 2,
    activePreset: typeof activePreset === 'string' && activePreset ? activePreset.slice(0, 64) : 'box-4-4-4-4',
    customRhythm: validateAndRepairRhythm(customRhythm),
    automations: validateAndRepairAutomations(automations),
    updatedAt: Date.now()
  };

  return writeStoredJson(STORAGE_KEY_CONFIG, payload);
}

/**
 * Safely loads configuration payload from LocalStorage, with fallback to factory defaults
 */
export function loadBreathConfig(): SynhaleStoragePayload {
  const defaultPayload: SynhaleStoragePayload = {
    schemaVersion: 2,
    activePreset: 'box-4-4-4-4',
    customRhythm: { ...FACTORY_RHYTHMS.box },
    automations: validateAndRepairAutomations(FACTORY_AUTOMATIONS),
    updatedAt: Date.now()
  };

  try {
    const parsed = readStoredJson(STORAGE_KEY_CONFIG);
    if (isRecord(parsed) && parsed.schemaVersion === 2) {
      return {
        schemaVersion: 2,
        activePreset: typeof parsed.activePreset === 'string' ? parsed.activePreset.slice(0, 64) : 'box-4-4-4-4',
        customRhythm: validateAndRepairRhythm(parsed.customRhythm),
        automations: validateAndRepairAutomations(parsed.automations),
        updatedAt: typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : Date.now()
      };
    }

    // Version mismatch or invalid schema
    return defaultPayload;
  } catch {
    // Malformed JSON
    return defaultPayload;
  }
}

/**
 * Safely saves a custom rhythm to LocalStorage
 */
export function saveCustomRhythm(rhythm: BreathRhythmConfig): boolean {
  return writeStoredJson(STORAGE_KEY_CUSTOM_RHYTHM, validateAndRepairRhythm(rhythm));
}

/** Safely loads custom rhythm with fallback. */
export function loadCustomRhythm(): BreathRhythmConfig & { id?: string; name?: string } {
  return validateAndRepairRhythm(readStoredJson(STORAGE_KEY_CUSTOM_RHYTHM));
}

/**
 * Resolves rhythm preset by id or alias (supporting both factory and user-defined rhythms)
 */
export function getRhythmPreset(keyOrId: string): FactoryRhythm | UserRhythmConfig {
  if (typeof keyOrId !== 'string') return FACTORY_RHYTHMS.box;
  if (typeof keyOrId === 'string' && Object.prototype.hasOwnProperty.call(FACTORY_RHYTHMS, keyOrId)) {
    return FACTORY_RHYTHMS[keyOrId];
  }

  for (const preset of Object.values(FACTORY_RHYTHMS)) {
    if (preset.id === keyOrId || preset.name.toLowerCase() === keyOrId.toLowerCase()) {
      return preset;
    }
  }

  const userRhythms = getUserRhythms();
  const matchedUser = userRhythms.find(r => r.id === keyOrId || r.name.toLowerCase() === keyOrId.toLowerCase());
  if (matchedUser) {
    return matchedUser;
  }

  return FACTORY_RHYTHMS.box;
}

export interface UserRhythmConfig extends BreathRhythmConfig {
  id: string;
  name: string;
  description?: string;
  createdAt?: number;
}

export const STORAGE_KEY_USER_RHYTHMS = 'synhale_user_rhythms_v1';

/**
 * Safely loads all user custom breath rhythms from LocalStorage
 */
export function getUserRhythms(): UserRhythmConfig[] {
  try {
    const parsed = readStoredJson(STORAGE_KEY_USER_RHYTHMS);
    if (!Array.isArray(parsed) || parsed.length > 100) return [];
    const results: UserRhythmConfig[] = [];
    for (const [index, item] of parsed.entries()) {
      if (!isRecord(item)) continue;
      const repaired = validateAndRepairRhythm(item);
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 64) : `user-rhythm-recovered-${index}`;
      const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 64) : '自定义节律';
      const description = typeof item.description === 'string' ? item.description.trim().slice(0, 256) : undefined;
      results.push({
        id,
        name,
        description: description || `自定义呼吸 · 吸${repaired.inhale}s 屏${repaired.holdIn}s 呼${repaired.exhale}s 停${repaired.holdOut}s`,
        inhale: repaired.inhale,
        holdIn: repaired.holdIn,
        exhale: repaired.exhale,
        holdOut: repaired.holdOut,
        createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Saves or updates a user custom breath rhythm in LocalStorage
 */
export function saveUserRhythm(
  rhythm: Omit<UserRhythmConfig, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): UserRhythmConfig {
  const existing = getUserRhythms();
  const rawId = typeof rhythm.id === 'string' && rhythm.id.trim() ? rhythm.id.trim() : `user-rhythm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const id = rawId.slice(0, 64);
  const rawName = typeof rhythm.name === 'string' && rhythm.name.trim() ? rhythm.name.trim() : '自定义节律';
  const name = rawName.slice(0, 64);
  const repaired = validateAndRepairRhythm(rhythm);
  const total = Number((repaired.inhale + repaired.holdIn + repaired.exhale + repaired.holdOut).toFixed(1));
  const rawDesc = typeof rhythm.description === 'string' && rhythm.description.trim()
    ? rhythm.description.trim()
    : `自定义节律 · ${repaired.inhale}-${repaired.holdIn}-${repaired.exhale}-${repaired.holdOut} (${total}s)`;
  const description = rawDesc.slice(0, 256);

  const newConfig: UserRhythmConfig = {
    id,
    name,
    description,
    inhale: repaired.inhale,
    holdIn: repaired.holdIn,
    exhale: repaired.exhale,
    holdOut: repaired.holdOut,
    createdAt: typeof rhythm.createdAt === 'number' && Number.isFinite(rhythm.createdAt) ? rhythm.createdAt : Date.now()
  };

  const index = existing.findIndex(r => r.id === id);
  let updatedList: UserRhythmConfig[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = newConfig;
  } else {
    updatedList = [...existing, newConfig];
  }

  if (updatedList.length > 100) throw new Error('节律已达上限');
  requireStoredJson(STORAGE_KEY_USER_RHYTHMS, updatedList);

  return newConfig;
}

/**
 * Deletes a user custom breath rhythm by id from LocalStorage
 */
export function deleteUserRhythm(id: string): boolean {
  return writeStoredJson(STORAGE_KEY_USER_RHYTHMS, getUserRhythms().filter(r => r.id !== id));
}
