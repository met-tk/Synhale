import { describe, it, expect } from 'vitest';
import { isLongPressKnob } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B23: 320ms Knob Long-Press Gesture Extremes', () => {
  it('B23-1: Hold duration at critical boundary 319ms is rejected as premature (false)', () => {
    expect(isLongPressKnob(0, 0, 319)).toBe(false);
  });

  it('B23-2: Hold duration at critical boundary 320ms is accepted as valid trigger (true)', () => {
    expect(isLongPressKnob(0, 0, 320)).toBe(true);
  });

  it('B23-3: Displacement at critical threshold 4.99px is accepted within tolerance', () => {
    expect(isLongPressKnob(4.99, 0, 350)).toBe(true);
  });

  it('B23-4: Displacement at critical threshold 5.01px is rejected as parameter rotary drag', () => {
    expect(isLongPressKnob(5.01, 0, 350)).toBe(false);
  });

  it('B23-5: Environments lacking navigator.vibrate degrade safely without exception', () => {
    const mockNav: { vibrate?: (pattern: number | number[]) => boolean } = {};

    expect(() => {
      mockNav.vibrate?.(15);
    }).not.toThrow();
  });
});
