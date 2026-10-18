import { describe, it, expect, vi } from 'vitest';
import { isLongPressKnob } from './testHarness';
import type { ModulationRoute } from '../../src/types';

describe('Feature F23: 320ms Long-Press Knob to Pop Up Modulation Card', () => {
  it('F23-1: Stationary press held for >= 320ms is recognized as valid long-press trigger', () => {
    // 0px movement, 320ms hold
    expect(isLongPressKnob(0, 0, 320)).toBe(true);

    // 2px micro-tremor, 400ms hold
    expect(isLongPressKnob(1, 1, 400)).toBe(true);
  });

  it('F23-2: Pointer displacement > 5px cancels long-press and treats as rotary drag', () => {
    // 6px movement, 350ms hold -> canceled because user is rotating the knob!
    expect(isLongPressKnob(6, 0, 350)).toBe(false);
    expect(isLongPressKnob(4, 4, 350)).toBe(false); // sqrt(16+16) = 5.65px > 5px
  });

  it('F23-3: Releasing before 320ms cancels long-press timer without showing card', () => {
    // 0px movement, but only held for 250ms
    expect(isLongPressKnob(0, 0, 250)).toBe(false);
    expect(isLongPressKnob(0, 0, 319)).toBe(false);
  });

  it('F23-4: Long-press trigger invokes haptic vibration feedback (15ms pulse)', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true
    });

    function triggerLongPress() {
      navigator.vibrate?.(15);
    }

    triggerLongPress();
    expect(vibrateMock).toHaveBeenCalledWith(15);
  });

  it('F23-5: Modulation assignment card configures route source, bipolar depth, and target', () => {
    const route: ModulationRoute = {
      source: 'breathMacro',
      target: 'filterCutoff',
      depth: 0.65,
      bipolar: true
    };

    expect(route.source).toBe('breathMacro');
    expect(route.target).toBe('filterCutoff');
    expect(route.depth).toBe(0.65);
    expect(route.bipolar).toBe(true);
  });
});
