/**
 * Synhale 2 - User Custom Sound Preset Storage
 * 
 * LocalStorage persistence for user-created sound therapy presets:
 * - Load, save, overwrite, delete
 * - Runtime defensive validation and boundary sanitization
 * - Zero emoji compliance
 */

import { SoundPreset, migratePreset } from '../presets/soundPresets';

const STORAGE_KEY = 'synhale_user_presets_v1';

/**
 * Recursively removes prototype pollution keys (__proto__, constructor, prototype)
 */
function sanitizeObjectDeep<T>(obj: T, depth = 0): T {
  if (!obj || typeof obj !== 'object' || depth > 8) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectDeep(item, depth + 1)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizeObjectDeep((obj as Record<string, any>)[key], depth + 1);
  }
  return clean as T;
}

function sanitizeSafeString(val: any, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

/**
 * Validate and sanitize a sound preset from untrusted storage with lossless migration
 */
function sanitizePreset(raw: any): SoundPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;

  try {
    const id = sanitizeSafeString(raw.id, '', 64);
    if (!id) return null;

    const basePreset: SoundPreset = {
      id,
      name: sanitizeSafeString(raw.name, '自定义预设', 64),
      nameEn: sanitizeSafeString(raw.nameEn || raw.name, 'Custom Preset', 64),
      category: 'User',
      description: sanitizeSafeString(raw.description, '用户自定声学物理参数配置', 256),
      badge: sanitizeSafeString(raw.badge, 'User Custom', 32),
      channelStrip: sanitizeObjectDeep(raw.channelStrip && typeof raw.channelStrip === 'object' ? raw.channelStrip : {}),
      effects: sanitizeObjectDeep(raw.effects && typeof raw.effects === 'object' ? raw.effects : {}),
      modulationRoutes: raw.modulationRoutes && typeof raw.modulationRoutes === 'object' ? sanitizeObjectDeep(raw.modulationRoutes) : undefined
    };
    return migratePreset(basePreset);
  } catch {
    return null;
  }
}

/**
 * Load all user-saved presets from localStorage
 */
export function getUserPresets(): SoundPreset[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizePreset).filter((p): p is SoundPreset => p !== null);
  } catch (err) {
    console.warn('[UserPresets] Failed to read from localStorage:', err);
    return [];
  }
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
    description: sanitizeSafeString(preset.description, '用户自定义调谐声学参数快照', 256),
    badge: sanitizeSafeString(preset.badge, 'User Preset', 32),
    channelStrip,
    effects: sanitizeObjectDeep(preset.effects || {}),
    modulationRoutes: preset.modulationRoutes ? sanitizeObjectDeep(preset.modulationRoutes) : undefined
  };

  const filtered = existing.filter(p => p.id !== id);
  const updated = [newPreset, ...filtered];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[UserPresets] Failed to save to localStorage:', err);
    }
  }

  return newPreset;
}

/**
 * Delete a user preset by ID
 */
export function deleteUserPreset(id: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const existing = getUserPresets();
    const updated = existing.filter(p => p.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.warn('[UserPresets] Failed to delete from localStorage:', err);
    return false;
  }
}

/**
 * Overwrite / update an existing user preset's acoustic parameters
 */
export function updateUserPreset(id: string, partial: UserPresetUpdateInput): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const existing = getUserPresets();
    const targetIdx = existing.findIndex(p => p.id === id);
    if (targetIdx === -1) return false;

    const updatedChannelStrip = partial.channelStrip ? sanitizeObjectDeep(partial.channelStrip) : existing[targetIdx].channelStrip;
    const updatedEffects = partial.effects ? sanitizeObjectDeep(partial.effects) : existing[targetIdx].effects;
    const updatedRoutes = partial.modulationRoutes ? sanitizeObjectDeep(partial.modulationRoutes) : existing[targetIdx].modulationRoutes;

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

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (err) {
    console.warn('[UserPresets] Failed to update preset in localStorage:', err);
    return false;
  }
}

/**
 * Rename an existing user preset
 */
export function renameUserPreset(id: string, newName: string): boolean {
  const trimmed = newName.trim();
  if (!trimmed) return false;
  return updateUserPreset(id, { name: trimmed, nameEn: trimmed });
}
