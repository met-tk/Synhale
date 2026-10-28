import { isRecord, readStoredJson, writeStoredJson } from '../audio/storage/safeStorage';
import type { VisualPresetId } from '../types';

/**
 * Session-level user preference persistence: which visual preset / group,
 * which rhythm and which sound preset the user last selected, so a restart
 * resumes the same experience instead of falling back to factory defaults.
 */

export const SESSION_PREFERENCES_KEY = 'synhale_session_prefs_v1';
export const SESSION_PREFERENCES_SCHEMA_VERSION = 1;

const VISUAL_PRESET_IDS: readonly VisualPresetId[] = [
  'minimalRing', 'sacredGeometry', 'zenWaves', 'calmFocus',
  'coronaOrbit', 'hyperMetatron', 'lissajousKnot', 'magneticFlux',
  'spacetimeWarp', 'keplerRosette', 'tesseract4D', 'hopfFibration'
];

export interface SessionPreferences {
  schemaVersion: number;
  visualPreset: VisualPresetId;
  visualGroupIndex: 0 | 1 | 2;
  activeRhythmKey: string;
  activeSoundPresetKey: string;
  updatedAt?: number;
}

export const DEFAULT_SESSION_PREFERENCES: SessionPreferences = {
  schemaVersion: SESSION_PREFERENCES_SCHEMA_VERSION,
  visualPreset: 'spacetimeWarp',
  visualGroupIndex: 2,
  activeRhythmKey: 'box',
  activeSoundPresetKey: 'tibetanBowl',
  updatedAt: undefined
};

function safeId(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  if (['__proto__', 'constructor', 'prototype'].includes(value)) return fallback;
  return value.trim().slice(0, 64);
}

/** Validates and repairs arbitrary stored data into safe SessionPreferences. */
export function repairSessionPreferences(raw: unknown): SessionPreferences {
  if (!isRecord(raw)) return { ...DEFAULT_SESSION_PREFERENCES };

  const visualPreset = VISUAL_PRESET_IDS.includes(raw.visualPreset as VisualPresetId)
    ? (raw.visualPreset as VisualPresetId)
    : DEFAULT_SESSION_PREFERENCES.visualPreset;

  const groupRaw = typeof raw.visualGroupIndex === 'number' && Number.isFinite(raw.visualGroupIndex)
    ? Math.max(0, Math.min(2, Math.trunc(raw.visualGroupIndex)))
    : DEFAULT_SESSION_PREFERENCES.visualGroupIndex;

  return {
    schemaVersion: SESSION_PREFERENCES_SCHEMA_VERSION,
    visualPreset,
    visualGroupIndex: groupRaw as 0 | 1 | 2,
    activeRhythmKey: safeId(raw.activeRhythmKey, DEFAULT_SESSION_PREFERENCES.activeRhythmKey),
    activeSoundPresetKey: safeId(raw.activeSoundPresetKey, DEFAULT_SESSION_PREFERENCES.activeSoundPresetKey),
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : undefined
  };
}

export function loadSessionPreferences(): SessionPreferences {
  return repairSessionPreferences(readStoredJson(SESSION_PREFERENCES_KEY));
}

export function saveSessionPreferences(prefs: Partial<SessionPreferences>): boolean {
  const merged = repairSessionPreferences({ ...loadSessionPreferences(), ...prefs });
  const normalized: SessionPreferences = {
    ...merged,
    visualGroupIndex: visualGroupIndexOf(merged.visualPreset)
  };
  return writeStoredJson(SESSION_PREFERENCES_KEY, { ...normalized, updatedAt: Date.now() });
}

/** Derives the group index for a visual preset id (0 classic / 1 optical / 2 cosmic). */
export function visualGroupIndexOf(presetId: VisualPresetId): 0 | 1 | 2 {
  const idx = VISUAL_PRESET_IDS.indexOf(presetId);
  if (idx < 0) return 2;
  return Math.floor(idx / 4) as 0 | 1 | 2;
}
