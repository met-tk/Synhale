import { describe, it, expect, vi } from 'vitest';
import { isWithinGeometry, createCanvasPointerHandlers } from '../../../src/visuals/gestureHandler';

describe('Geometry Hit Test & Pointer Filtering', () => {
  const canvasRect = {
    left: 0,
    top: 0,
    width: 1000,
    height: 1000
  };
  // Center is (500, 500), minDim is 1000, default maxRadius is 440px

  it('correctly accepts taps within the central geometric breathing area', () => {
    // Exact center
    expect(isWithinGeometry(500, 500, canvasRect, 0.44)).toBe(true);
    // Inner boundary: distance = 200px < 440px
    expect(isWithinGeometry(700, 500, canvasRect, 0.44)).toBe(true);
    // Right near boundary: 500 + 439 = 939
    expect(isWithinGeometry(939, 500, canvasRect, 0.44)).toBe(true);
  });

  it('rejects taps outside the geometric breathing area (blank canvas space)', () => {
    // Outside boundary: 500 + 441 = 941 > 440px
    expect(isWithinGeometry(941, 500, canvasRect, 0.44)).toBe(false);
    // Far corner (e.g. 50, 50): distance ~= 636px > 440px
    expect(isWithinGeometry(50, 50, canvasRect, 0.44)).toBe(false);
    // Bottom corner (980, 980)
    expect(isWithinGeometry(980, 980, canvasRect, 0.44)).toBe(false);
  });

  it('createCanvasPointerHandlers respects filter callback', () => {
    const onTap = vi.fn();
    const filter = vi.fn((e) => isWithinGeometry(e.clientX, e.clientY, canvasRect, 0.44));
    const handlers = createCanvasPointerHandlers(onTap, undefined, filter);

    // Tap outside -> should not call onTap
    handlers.onPointerDown({ clientX: 50, clientY: 50 });
    handlers.onPointerUp({ clientX: 50, clientY: 50 });
    expect(onTap).not.toHaveBeenCalled();

    // Tap inside central circle -> should call onTap
    handlers.onPointerDown({ clientX: 500, clientY: 500 });
    handlers.onPointerUp({ clientX: 500, clientY: 500 });
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
