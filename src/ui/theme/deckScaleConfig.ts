import { isRecord, readStoredJson, writeStoredJson } from '../../audio/storage/safeStorage';

/**
 * Synhale 2 - Hardware Deck Content Scale Configuration & Persistence
 *
 * Zoom control scoped strictly to the Hardware Deck (console) contents.
 * Applies a CSS transform scale to the deck surface so knob/fader hardware
 * density can be adapted to small Android screens or high-DPI desktop
 * monitors without touching the global chrome (top bar, stage, modals).
 */

export const DECK_SCALE_MIN = 60;
export const DECK_SCALE_MAX = 130;
export const DEFAULT_DECK_SCALE = 100;

const STORAGE_KEY = 'synhale_deck_scale_v1';

/** Clamps a deck-scale input to a safe integer percentage (60..130). */
export function clampDeckScale(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_DECK_SCALE;
  }
  return Math.max(DECK_SCALE_MIN, Math.min(DECK_SCALE_MAX, Math.round(val)));
}

function repairDeckScale(raw: unknown): number {
  const parsed = isRecord(raw) ? raw : {};
  return clampDeckScale(parsed.scale);
}

/** Loads persisted deck scale with silent fallback to 100%. */
export function loadDeckScale(): number {
  return repairDeckScale(readStoredJson(STORAGE_KEY));
}

/** Saves the deck scale to localStorage (60..130). */
export function saveDeckScale(scale: number): void {
  writeStoredJson(STORAGE_KEY, { scale: clampDeckScale(scale) });
}
