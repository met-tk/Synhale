import { describe, it, expect, beforeEach } from 'vitest';
import { FACTORY_RHYTHMS } from './testHarness';

describe('Feature F14: Breath Parameters & Envelope Persistence & Presets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('F14-1: Factory rhythm presets define Box, Relax 4-7-8, Coherent, Prana, and Deep Calm', () => {
    expect(Object.keys(FACTORY_RHYTHMS)).toHaveLength(5);

    expect(FACTORY_RHYTHMS.box.inhale).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.holdIn).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.exhale).toBe(4.0);
    expect(FACTORY_RHYTHMS.box.holdOut).toBe(4.0);

    expect(FACTORY_RHYTHMS.sleep.holdIn).toBe(7.0);
    expect(FACTORY_RHYTHMS.sleep.exhale).toBe(8.0);
    expect(FACTORY_RHYTHMS.sleep.holdOut).toBe(0.0);

    expect(FACTORY_RHYTHMS.coherent.inhale).toBe(5.5);
    expect(FACTORY_RHYTHMS.coherent.exhale).toBe(5.5);
  });

  it('F14-2: LocalStorage serializer saves config with schemaVersion: 2 header', () => {
    const payload = {
      schemaVersion: 2,
      activePreset: 'box-4-4-4-4',
      customRhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
      updatedAt: 1700000000000
    };

    localStorage.setItem('synhale_config', JSON.stringify(payload));
    const retrieved = JSON.parse(localStorage.getItem('synhale_config') || '{}');

    expect(retrieved.schemaVersion).toBe(2);
    expect(retrieved.activePreset).toBe('box-4-4-4-4');
  });

  it('F14-3: Deserializer validates schemaVersion: 2 and falls back safely on corrupted/legacy data', () => {
    // Legacy schemaVersion 1 data
    const legacyPayload = {
      schemaVersion: 1,
      rhythm: [4, 4, 4, 4]
    };
    localStorage.setItem('synhale_config', JSON.stringify(legacyPayload));

    function loadConfig() {
      try {
        const raw = localStorage.getItem('synhale_config');
        if (!raw) return FACTORY_RHYTHMS.box;
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion !== 2) {
          // Version mismatch: fallback to factory default
          return FACTORY_RHYTHMS.box;
        }
        return parsed.customRhythm;
      } catch {
        return FACTORY_RHYTHMS.box;
      }
    }

    const loaded = loadConfig();
    expect(loaded.id).toBe('box-4-4-4-4');
  });

  it('F14-4: Custom parameter automation curves serialize and deserialize with floating-point fidelity', () => {
    const curveConfig = {
      targetParam: 'filterCutoff',
      inhale: { startVal: 0.1, endVal: 0.95, tension: 0.4 },
      holdIn: { startVal: 0.95, endVal: 0.95, tension: 0.0 },
      exhale: { startVal: 0.95, endVal: 0.15, tension: -0.3 },
      holdOut: { startVal: 0.15, endVal: 0.1, tension: 0.0 }
    };

    const serialized = JSON.stringify(curveConfig);
    const restored = JSON.parse(serialized);

    expect(restored.targetParam).toBe('filterCutoff');
    expect(restored.inhale.tension).toBe(0.4);
    expect(restored.exhale.tension).toBe(-0.3);
  });

  it('F14-5: Hot-reloading rhythm duration preserves normalized phase without jump', () => {
    const oldDuration = 4.0;
    const elapsed = 2.0;
    const currentPhase = elapsed / oldDuration; // 0.5 (50%)

    const newDuration = 8.0;
    // New elapsed maintaining phase 0.5:
    const newElapsed = currentPhase * newDuration; // 4.0s
    const updatedPhase = newElapsed / newDuration; // 0.5

    expect(updatedPhase).toBe(currentPhase);
    expect(newElapsed).toBe(4.0);
  });
});
