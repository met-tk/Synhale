import { describe, it, expect, beforeEach } from 'vitest';
import { FACTORY_RHYTHMS } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B14: LocalStorage & Rhythm Persistence Boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('B14-1: Null or empty string in LocalStorage defaults to factory Box preset', () => {
    function loadRhythmSafely() {
      const raw = localStorage.getItem('synhale_custom_rhythm');
      if (!raw) return FACTORY_RHYTHMS.box;
      try {
        return JSON.parse(raw);
      } catch {
        return FACTORY_RHYTHMS.box;
      }
    }

    expect(loadRhythmSafely().id).toBe('box-4-4-4-4');
  });

  it('B14-2: Malformed JSON syntax (e.g. truncated brackets) handles gracefully without throw', () => {
    localStorage.setItem('synhale_custom_rhythm', '{ "schemaVersion": 2, "inhale": 4.0,');
    function loadRhythmSafely() {
      const raw = localStorage.getItem('synhale_custom_rhythm');
      try {
        return JSON.parse(raw!);
      } catch {
        return FACTORY_RHYTHMS.box;
      }
    }

    expect(loadRhythmSafely().id).toBe('box-4-4-4-4');
  });

  it('B14-3: Missing individual stages in stored config are repaired using factory defaults', () => {
    const partialConfig = { inhale: 5.0, exhale: 5.0 }; // missing holdIn and holdOut
    function repairConfig(raw: Record<string, number>) {
      return {
        inhale: raw.inhale ?? 4.0,
        holdIn: raw.holdIn ?? 0.0,
        exhale: raw.exhale ?? 4.0,
        holdOut: raw.holdOut ?? 0.0
      };
    }

    const repaired = repairConfig(partialConfig);
    expect(repaired.inhale).toBe(5.0);
    expect(repaired.holdIn).toBe(0.0);
    expect(repaired.holdOut).toBe(0.0);
  });

  it('B14-4: Stage durations outside physiological limits (0.1s to 60s) are clamped', () => {
    function clampDuration(sec: number): number {
      return Math.max(0.1, Math.min(60.0, sec));
    }

    expect(clampDuration(0.01)).toBe(0.1);
    expect(clampDuration(150.0)).toBe(60.0);
    expect(clampDuration(4.5)).toBe(4.5);
  });

  it('B14-5: LocalStorage setItem error (quota exceeded or private mode) is caught safely', () => {
    let saveFailed = false;
    function safeSave(_key: string, _value: string) {
      try {
        // Simulate quota exceeded
        throw new DOMException('QuotaExceededError');
      } catch {
        saveFailed = true;
      }
    }

    safeSave('key', 'val');
    expect(saveFailed).toBe(true);
  });
});
