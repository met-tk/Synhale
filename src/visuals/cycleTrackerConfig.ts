import { isRecord, readStoredJson, writeStoredJson } from '../audio/storage/safeStorage';

/**
 * Synhale 2 - Breath Cycle Bead Strand Configuration & Persistence
 *
 * Ambient, number-free cycle progress rendered as a vertical bead strand
 * ("breath mala") along the left edge of the playback stage. Each completed
 * breath cycle lights up one bead; when the storable capacity is reached the
 * session concludes itself and playback pauses softly.
 */

export const CYCLE_CAPACITY_MIN = 4;
export const CYCLE_CAPACITY_MAX = 48;

export type CycleBeadPosition = 'left' | 'top';

export interface CycleTrackerSettings {
  visible: boolean;
  capacity: number; // CYCLE_CAPACITY_MIN .. CYCLE_CAPACITY_MAX (default 12)
  position: CycleBeadPosition; // vertical mala on left edge, or horizontal strand across the top
}

/** Touch devices (Android) default to the top strand; desktop keeps the left edge. */
export function defaultCycleBeadPosition(): CycleBeadPosition {
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return 'top';
  }
  return 'left';
}

export const DEFAULT_CYCLE_TRACKER_SETTINGS: CycleTrackerSettings = {
  visible: true,
  capacity: 12,
  position: 'left'
};

const STORAGE_KEY = 'synhale_cycle_tracker_v1';

/** Clamps a bead-count input to a safe integer capacity (4..48). */
export function clampCycleCapacity(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_CYCLE_TRACKER_SETTINGS.capacity;
  }
  return Math.max(CYCLE_CAPACITY_MIN, Math.min(CYCLE_CAPACITY_MAX, Math.round(val)));
}

function repairCycleTrackerSettings(raw: unknown): CycleTrackerSettings {
  const parsed = isRecord(raw) ? raw : {};
  const fallbackPosition = defaultCycleBeadPosition();
  return {
    visible: typeof parsed.visible === 'boolean' ? parsed.visible : DEFAULT_CYCLE_TRACKER_SETTINGS.visible,
    capacity: clampCycleCapacity(parsed.capacity),
    position: parsed.position === 'left' || parsed.position === 'top' ? parsed.position : fallbackPosition
  };
}

/** Loads persisted strand settings with silent fallback to defaults. */
export function loadCycleTrackerSettings(): CycleTrackerSettings {
  return repairCycleTrackerSettings(readStoredJson(STORAGE_KEY));
}

export function saveCycleTrackerSettings(settings: CycleTrackerSettings): void {
  writeStoredJson(STORAGE_KEY, repairCycleTrackerSettings(settings));
}
