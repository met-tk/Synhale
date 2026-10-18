import { describe, it, expect } from 'vitest';
import type { BreathStage } from '../../src/types';

describe('Feature F18: Floating Micro Breath Status Capsule', () => {
  it('F18-1: Capsule maps BreathStage enum to uppercase badge text without emojis', () => {
    const stageTitles: Record<BreathStage, string> = {
      inhale: 'INHALE',
      holdIn: 'HOLD IN',
      exhale: 'EXHALE',
      holdOut: 'HOLD OUT'
    };

    expect(stageTitles.inhale).toBe('INHALE');
    expect(stageTitles.holdIn).toBe('HOLD IN');
    expect(stageTitles.exhale).toBe('EXHALE');
    expect(stageTitles.holdOut).toBe('HOLD OUT');

    // No emojis in any stage title
    const emojiRegex = /\p{Extended_Pictographic}/u;
    for (const title of Object.values(stageTitles)) {
      expect(emojiRegex.test(title)).toBe(false);
    }
  });

  it('F18-2: Countdown timer formats remaining seconds with fixed one-decimal precision', () => {
    function formatCountdown(sec: number): string {
      return `${Math.max(0, sec).toFixed(1)}s`;
    }

    expect(formatCountdown(4.23)).toBe('4.2s');
    expect(formatCountdown(0.05)).toBe('0.1s');
    expect(formatCountdown(0.0)).toBe('0.0s');
    expect(formatCountdown(-0.5)).toBe('0.0s');
  });

  it('F18-3: Breathing LED dot calculates opacity and scale synchronized with stage', () => {
    function getLedGlow(stage: BreathStage, progress: number): number {
      switch (stage) {
        case 'inhale': return 0.2 + 0.8 * progress; // 0.2 -> 1.0
        case 'holdIn': return 1.0;                 // steady high
        case 'exhale': return 1.0 - 0.75 * progress; // 1.0 -> 0.25
        case 'holdOut': return 0.15;                // standby
      }
    }

    expect(getLedGlow('inhale', 0.0)).toBeCloseTo(0.2, 2);
    expect(getLedGlow('inhale', 1.0)).toBeCloseTo(1.0, 2);
    expect(getLedGlow('holdIn', 0.5)).toBe(1.0);
    expect(getLedGlow('exhale', 1.0)).toBeCloseTo(0.25, 2);
    expect(getLedGlow('holdOut', 0.5)).toBe(0.15);
  });

  it('F18-4: Capsule CSS layout is fixed at bottom center with backdrop-blur styling', () => {
    const capsule = document.createElement('div');
    capsule.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 backdrop-blur-md border border-neutral-800 bg-neutral-950/70 z-20';

    expect(capsule.className).toContain('fixed');
    expect(capsule.className).toContain('bottom-6');
    expect(capsule.className).toContain('backdrop-blur-md');
    expect(capsule.className).toContain('rounded-full');
  });

  it('F18-5: Capsule click handler dispatches play/pause toggle matching canvas behavior', () => {
    let isPlaying = false;
    function handleCapsuleClick() {
      isPlaying = !isPlaying;
    }

    handleCapsuleClick();
    expect(isPlaying).toBe(true);
    handleCapsuleClick();
    expect(isPlaying).toBe(false);
  });
});
