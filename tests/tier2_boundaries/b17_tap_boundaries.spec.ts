import { describe, it, expect } from 'vitest';
import { isTapGesture } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B17: Canvas Tap-Anywhere Gesture Boundaries', () => {
  it('B17-1: Tap hold duration at critical boundary 219ms is accepted as valid', () => {
    expect(isTapGesture(100, 100, 102, 102, 219)).toBe(true);
  });

  it('B17-2: Tap hold duration at critical boundary 220ms is rejected as hold', () => {
    expect(isTapGesture(100, 100, 102, 102, 220)).toBe(false);
  });

  it('B17-3: Tap Euclidean displacement at critical boundary 7.99px is accepted', () => {
    // 7.99px along X axis, 0 along Y
    expect(isTapGesture(100, 100, 107.99, 100, 100)).toBe(true);
  });

  it('B17-4: Tap Euclidean displacement at critical boundary 8.00px is rejected as drag', () => {
    // Exactly 8.00px
    expect(isTapGesture(100, 100, 108.0, 100, 100)).toBe(false);
  });

  it('B17-5: Negative and zero coordinates compute valid Euclidean distances without underflow', () => {
    // Negative start coordinate to negative end coordinate
    expect(isTapGesture(-50, -50, -48, -48, 80)).toBe(true);
    // Origin (0, 0) to (0, 0)
    expect(isTapGesture(0, 0, 0, 0, 50)).toBe(true);
  });
});
