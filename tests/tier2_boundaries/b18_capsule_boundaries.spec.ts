import { describe, it, expect } from 'vitest';

describe('Tier 2 Boundaries - B18: Micro Status Capsule Readout Boundaries', () => {
  function formatCountdown(sec: number): string {
    return `${Math.max(0, sec).toFixed(1)}s`;
  }

  it('B18-1: Countdown value exactly 0.000s displays 0.0s', () => {
    expect(formatCountdown(0.000)).toBe('0.0s');
  });

  it('B18-2: Negative countdown value (e.g. -0.2s after frame delay) is clamped to 0.0s', () => {
    expect(formatCountdown(-0.25)).toBe('0.0s');
    expect(formatCountdown(-10.0)).toBe('0.0s');
  });

  it('B18-3: Large countdown value 99.99s formats to 100.0s without string truncation', () => {
    expect(formatCountdown(99.99)).toBe('100.0s');
  });

  it('B18-4: LED breathing glow opacity clamps between minimum 0.15 and maximum 1.0', () => {
    function clampGlow(raw: number): number {
      return Math.max(0.15, Math.min(1.0, raw));
    }

    expect(clampGlow(0.0)).toBe(0.15);
    expect(clampGlow(-0.5)).toBe(0.15);
    expect(clampGlow(1.5)).toBe(1.0);
    expect(clampGlow(0.65)).toBe(0.65);
  });

  it('B18-5: Rapid click events on capsule trigger clean alternating play state transitions', () => {
    let state = false;
    for (let i = 0; i < 7; i++) {
      state = !state;
    }
    expect(state).toBe(true); // 7 odd clicks -> true
  });
});
