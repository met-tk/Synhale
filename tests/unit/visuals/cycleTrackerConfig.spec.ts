import { describe, it, expect, beforeEach } from 'vitest';
import {
  CYCLE_CAPACITY_MAX,
  CYCLE_CAPACITY_MIN,
  DEFAULT_CYCLE_TRACKER_SETTINGS,
  clampCycleCapacity,
  loadCycleTrackerSettings,
  saveCycleTrackerSettings
} from '../../../src/visuals/cycleTrackerConfig';

const STORAGE_KEY = 'synhale_cycle_tracker_v1';

describe('Cycle Bead Strand Config Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const settings = loadCycleTrackerSettings();
    expect(settings).toEqual({ visible: true, capacity: 12 });
    expect(DEFAULT_CYCLE_TRACKER_SETTINGS.capacity).toBe(12);
    expect(CYCLE_CAPACITY_MIN).toBeLessThan(CYCLE_CAPACITY_MAX);
  });

  it('clamps capacity to the 4..48 integer range with default fallback', () => {
    expect(clampCycleCapacity(2)).toBe(CYCLE_CAPACITY_MIN);
    expect(clampCycleCapacity(0)).toBe(CYCLE_CAPACITY_MIN);
    expect(clampCycleCapacity(-10)).toBe(CYCLE_CAPACITY_MIN);
    expect(clampCycleCapacity(100)).toBe(CYCLE_CAPACITY_MAX);
    expect(clampCycleCapacity(12.7)).toBe(13);
    expect(clampCycleCapacity(12.2)).toBe(12);
    expect(clampCycleCapacity(Number.NaN)).toBe(DEFAULT_CYCLE_TRACKER_SETTINGS.capacity);
    expect(clampCycleCapacity('not-a-number' as unknown)).toBe(DEFAULT_CYCLE_TRACKER_SETTINGS.capacity);
    expect(clampCycleCapacity(null)).toBe(DEFAULT_CYCLE_TRACKER_SETTINGS.capacity);
  });

  it('round-trips valid settings through localStorage', () => {
    saveCycleTrackerSettings({ visible: false, capacity: 21 });
    const loaded = loadCycleTrackerSettings();
    expect(loaded).toEqual({ visible: false, capacity: 21 });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"capacity":21');
  });

  it('repairs out-of-range or invalid persisted values on save and load', () => {
    saveCycleTrackerSettings({ visible: true, capacity: 9999 });
    expect(loadCycleTrackerSettings().capacity).toBe(CYCLE_CAPACITY_MAX);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible: 'yes', capacity: -5 }));
    expect(loadCycleTrackerSettings()).toEqual({ visible: true, capacity: CYCLE_CAPACITY_MIN });

    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(loadCycleTrackerSettings()).toEqual(DEFAULT_CYCLE_TRACKER_SETTINGS);
  });

  it('falls back to defaults on corrupt storage payloads', () => {
    localStorage.setItem(STORAGE_KEY, '{corrupted json!!');
    expect(loadCycleTrackerSettings()).toEqual(DEFAULT_CYCLE_TRACKER_SETTINGS);
  });
});
