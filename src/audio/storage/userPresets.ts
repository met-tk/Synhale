/**
 * Synhale 2 - User Custom Sound Preset Storage
 * 
 * LocalStorage persistence for user-created sound therapy presets:
 * - Load, save, overwrite, delete
 * - Runtime defensive validation and boundary sanitization
 * - Zero emoji compliance
 */

import { SoundPreset, migratePreset, getSoundPresetById, DEFAULT_SOUND_PRESET_ID } from '../presets/soundPresets';
import { DEFAULT_PARTICLE_PARAMS, DEFAULT_LFO1_PARAMS, DEFAULT_LFO2_PARAMS, DEFAULT_SOURCE_ROUTES, DEFAULT_LANE_A_ORDER, DEFAULT_LANE_B_ORDER, EFFECT_MODULE_RULES, getEffectModuleType, getDefaultEffectParams } from '../../types/audio';
import { isRecord, MAX_USER_PRESETS, readStoredJson, requireStoredJson, writeStoredJson } from './safeStorage';
import { BREATH_STAGES, sanitizeBreathCurveData } from './curveValidation';

const STORAGE_KEY = 'synhale_user_presets_v1';

/**
 * Recursively removes prototype pollution keys (__proto__, constructor, prototype)
 */
function sanitizeObjectDeep<T>(obj: T): T {
  const seen = new WeakSet<object>();
  let remaining = 20_000;
  const visit = (value: unknown, depth: number): unknown => {
    if (--remaining < 0 || depth > 16) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') return value.slice(0, 4096);
    if (typeof value === 'boolean' || value === null) return value;
    if (typeof value !== 'object' || seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
      const result = value.slice(0, 1024).map(item => visit(item, depth + 1)).filter(item => item !== undefined);
      seen.delete(value);
      return result;
    }
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(value).slice(0, 1024)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const next = visit((value as Record<string, unknown>)[key], depth + 1);
      if (next !== undefined) clean[key] = next;
    }
    seen.delete(value);
    return clean;
  };
  return visit(obj, 0) as T;
}

function sanitizeRoutes(raw: unknown): SoundPreset['modulationRoutes'] {
  if (!isRecord(raw)) return undefined;
  const result: NonNullable<SoundPreset['modulationRoutes']> = {};
  for (const [key, value] of Object.entries(raw).slice(0, 256)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !isRecord(value)) continue;
    if (!['breathMacro', 'lfo1', 'lfo2', 'adsr', 'stageProgress', 'manual'].includes(String(value.source))) continue;
    const route = sanitizeObjectDeep(value);
    result[key] = {
      ...route,
      target: typeof route.target === 'string' ? route.target.slice(0, 128) : key,
      source: route.source as NonNullable<SoundPreset['modulationRoutes']>[string]['source'],
      depth: typeof route.depth === 'number' && Number.isFinite(route.depth) ? Math.max(-1, Math.min(1, route.depth)) : 0,
      bipolar: route.bipolar === true,
      stageMultipliers: isRecord(route.stageMultipliers) ? {
        ...Object.fromEntries(BREATH_STAGES.map(stage => {
          const value = (route.stageMultipliers as Record<string, unknown>)[stage];
          return [stage, typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1];
        })) as Record<typeof BREATH_STAGES[number], number>,
        curve: ['smooth', 'linear', 'step'].includes(String(route.stageMultipliers.curve))
          ? route.stageMultipliers.curve as 'smooth' | 'linear' | 'step' : 'smooth'
      } : undefined,
      ...(route.curveData ? { curveData: sanitizeBreathCurveData(route.curveData) } : {})
    };
  }
  return result;
}

function sanitizeSafeString(val: unknown, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

/**
 * Validate and sanitize a sound preset from untrusted storage with lossless migration
 */
function sanitizePreset(raw: unknown): SoundPreset | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;

  try {
    const id = sanitizeSafeString(raw.id, '', 64);
    if (!id) return null;

    const defaults = getSoundPresetById(DEFAULT_SOUND_PRESET_ID);
    const channelStrip = repairShape(sanitizeObjectDeep(raw.channelStrip), {
      ...defaults.channelStrip,
      oscA: { ...defaults.channelStrip.oscA, particles: DEFAULT_PARTICLE_PARAMS },
      oscB: { ...defaults.channelStrip.oscB, noiseType: 'pink' },
      granular: { ...defaults.channelStrip.granular, bypass: true }
    });
    const effects = repairShape(sanitizeObjectDeep(raw.effects), {
      ...defaults.effects,
      lfo1: { ...DEFAULT_LFO1_PARAMS, ...defaults.effects.lfo1 },
      lfo2: { ...DEFAULT_LFO2_PARAMS, ...defaults.effects.lfo2 },
      masterPan: 0, busMix: 0.5, busLevelA: 1, busLevelB: 1
    });
    const routes = isRecord(effects.sourceRoutes) ? effects.sourceRoutes : {};
    effects.sourceRoutes = Object.fromEntries(Object.entries(DEFAULT_SOURCE_ROUTES).map(([source, lane]) => [
      source, ['laneA', 'laneB', 'thru'].includes(String(routes[source])) ? routes[source] : lane
    ]));
    const used = new Set<string>();
    const orders = [effects.laneAOrder, effects.laneBOrder].map((order, lane) => {
      const candidates = Array.isArray(order) ? order : lane === 0 ? DEFAULT_LANE_A_ORDER : DEFAULT_LANE_B_ORDER;
      const counts = new Map<string, number>();
      return candidates.filter((id): id is string => {
        if (typeof id !== 'string' || id.length > 80 || !/^(gain|filter|drive|eq|delay|reverb|adsr|lfo)(_[\w-]+)?$/.test(id) || used.has(id)) return false;
        const type = getEffectModuleType(id);
        const count = (counts.get(type) ?? 0) + 1;
        if (count > EFFECT_MODULE_RULES[type].maxInstancesPerLane) return false;
        counts.set(type, count);
        used.add(id);
        return true;
      });
    });
    [effects.laneAOrder, effects.laneBOrder] = orders;
    const rawInstances = isRecord(effects.instances) ? effects.instances : {};
    effects.instances = Object.fromEntries([...used].flatMap(id => {
      const rawInstance = rawInstances[id] ?? effects[id];
      return isRecord(rawInstance) ? [[id, repairShape(rawInstance, getDefaultEffectParams(getEffectModuleType(id)))]] : [];
    }));
    const basePreset: SoundPreset = {
      id,
      name: sanitizeSafeString(raw.name, '自定义预设', 64),
      nameEn: sanitizeSafeString(raw.nameEn || raw.name, 'Custom Preset', 64),
      category: 'User',
      description: sanitizeSafeString(raw.description, '用户自定声学物理参数配置', 256),
      badge: sanitizeSafeString(raw.badge, 'User Custom', 32),
      channelStrip: channelStrip as unknown as SoundPreset['channelStrip'],
      effects: effects as SoundPreset['effects'],
      modulationRoutes: sanitizeRoutes(raw.modulationRoutes)
    };
    return migratePreset(basePreset);
  } catch {
    return null;
  }
}

/** Repair primitive types before sliders and AudioParams consume persisted values. */
function repairShape(raw: unknown, defaults: object): Record<string, any> {
  const input = isRecord(raw) ? raw : {};
  const output: Record<string, any> = { ...input };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = input[key];
    if (isRecord(fallback)) output[key] = repairShape(value, fallback);
    else if (typeof fallback === 'number') output[key] = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    else if (typeof fallback === 'boolean') output[key] = typeof value === 'boolean' ? value : fallback;
    else if (typeof fallback === 'string') output[key] = typeof value === 'string' ? value : fallback;
    else if (Array.isArray(fallback)) output[key] = Array.isArray(value) ? value : [...fallback];
  }
  const enums: Record<string, string[]> = {
    noiseType: ['pink', 'white', 'brown', 'violet'],
    warpMode: ['off', 'pwm', 'sync', 'bend', 'mirror'],
    chordType: ['octave', 'fifth', 'major', 'minor', 'sus4', 'dom7', 'maj7', 'min7', 'sacred'],
    voiceMode: ['drone', 'arp', 'particles'],
    scale: ['pentatonic', 'dorian', 'lydian', 'solfeggio', 'minor'],
    direction: ['forward', 'reverse', 'pingpong'],
    polarity: ['bipolar', 'unipolar'],
    type: ['lowpass', 'highpass', 'bandpass', 'notch', 'peak', 'ladder', 'lowshelf', 'highshelf', 'peaking'],
    shape: ['sine', 'triangle', 'sawtooth', 'square', 'random', 'gaussian', 'trapezoid', 'hann', 'smooth']
  };
  for (const [key, allowed] of Object.entries(enums)) {
    if (key in output && !allowed.includes(output[key])) output[key] = (defaults as Record<string, unknown>)[key] ?? allowed[0];
  }
  return output;
}

/**
 * Load all user-saved presets from localStorage
 */
export function getUserPresets(): SoundPreset[] {
  const parsed = readStoredJson(STORAGE_KEY);
  if (!Array.isArray(parsed) || parsed.length > MAX_USER_PRESETS) return [];
  const ids = new Set<string>();
  return parsed.map(sanitizePreset).filter((p): p is SoundPreset => {
    if (!p || ids.has(p.id)) return false;
    ids.add(p.id);
    return true;
  });
}

export interface UserPresetSaveInput {
  id?: string;
  name: string;
  nameEn?: string;
  category?: string;
  description?: string;
  badge?: string;
  channelStrip: any;
  effects: any;
  modulationRoutes?: any;
}

export interface UserPresetUpdateInput {
  name?: string;
  nameEn?: string;
  description?: string;
  badge?: string;
  channelStrip?: any;
  effects?: any;
  modulationRoutes?: any;
}

/**
 * Save or overwrite a user preset in localStorage
 */
export function saveUserPreset(preset: UserPresetSaveInput): SoundPreset {
  const existing = getUserPresets();
  const rawId = preset.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const id = sanitizeSafeString(rawId, `user_${Date.now()}`, 64);

  // Clean decoupled channelStrip persistence without legacy oscA.particles pollution
  const channelStrip = sanitizeObjectDeep(preset.channelStrip ? { ...preset.channelStrip } : {});

  const newPreset: SoundPreset = {
    id,
    name: sanitizeSafeString(preset.name, `自定义预设 ${existing.length + 1}`, 64),
    nameEn: sanitizeSafeString(preset.nameEn || preset.name, `Custom Preset ${existing.length + 1}`, 64),
    category: 'User',
    description: sanitizeSafeString(preset.description, '自定义参数快照', 256),
    badge: sanitizeSafeString(preset.badge, 'User Preset', 32),
    channelStrip,
    effects: sanitizeObjectDeep(preset.effects || {}),
    modulationRoutes: sanitizeRoutes(preset.modulationRoutes)
  };

  const filtered = existing.filter(p => p.id !== id);
  const updated = [newPreset, ...filtered];

  if (updated.length > MAX_USER_PRESETS) throw new Error('预设数量已达上限，请先删除不再使用的预设。');
  requireStoredJson(STORAGE_KEY, updated);

  return newPreset;
}

/**
 * Delete a user preset by ID
 */
export function deleteUserPreset(id: string): boolean {

  try {
    const existing = getUserPresets();
    const updated = existing.filter(p => p.id !== id);
    return writeStoredJson(STORAGE_KEY, updated);
  } catch (err) {
    console.warn('[UserPresets] Failed to delete from localStorage:', err);
    return false;
  }
}

/**
 * Overwrite / update an existing user preset's acoustic parameters
 */
export function updateUserPreset(id: string, partial: UserPresetUpdateInput): boolean {

  try {
    const existing = getUserPresets();
    const targetIdx = existing.findIndex(p => p.id === id);
    if (targetIdx === -1) return false;

    const updatedChannelStrip = partial.channelStrip ? sanitizeObjectDeep(partial.channelStrip) : existing[targetIdx].channelStrip;
    const updatedEffects = partial.effects ? sanitizeObjectDeep(partial.effects) : existing[targetIdx].effects;
    const updatedRoutes = partial.modulationRoutes ? sanitizeRoutes(partial.modulationRoutes) : existing[targetIdx].modulationRoutes;

    existing[targetIdx] = {
      ...existing[targetIdx],
      ...(partial.name !== undefined ? { name: sanitizeSafeString(partial.name, existing[targetIdx].name, 64) } : {}),
      ...(partial.nameEn !== undefined ? { nameEn: sanitizeSafeString(partial.nameEn, existing[targetIdx].nameEn, 64) } : {}),
      ...(partial.description !== undefined ? { description: sanitizeSafeString(partial.description, existing[targetIdx].description, 256) } : {}),
      ...(partial.badge !== undefined ? { badge: sanitizeSafeString(partial.badge, existing[targetIdx].badge, 32) } : {}),
      channelStrip: updatedChannelStrip,
      effects: updatedEffects,
      modulationRoutes: updatedRoutes,
      id, // Preserve immutable ID
      category: 'User'
    };

    return writeStoredJson(STORAGE_KEY, existing);
  } catch (err) {
    console.warn('[UserPresets] Failed to update preset in localStorage:', err);
    return false;
  }
}

/**
 * Rename an existing user preset
 */
export function renameUserPreset(id: string, newName: string): boolean {
  const trimmed = typeof newName === 'string' ? newName.trim() : '';
  if (!trimmed) return false;
  return updateUserPreset(id, { name: trimmed, nameEn: trimmed });
}
