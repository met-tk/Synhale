import { describe, it, expect, vi } from 'vitest';
import {
  isTapGesture,
  createCanvasPointerHandlers,
  TAP_MAX_DURATION_MS,
  TAP_MAX_DISTANCE_PX
} from '../../../src/visuals/gestureHandler';

describe('gestureHandler Unit Tests', () => {
  describe('isTapGesture', () => {
    it('accepts fast taps with small displacement', () => {
      // 50ms hold, 2px displacement
      expect(isTapGesture(100, 100, 101, 101, 50)).toBe(true);
      // 150ms hold, 6px displacement (sqrt(4^2 + 4^2) ~= 5.65px < 8px)
      expect(isTapGesture(200, 200, 204, 204, 150)).toBe(true);
    });

    it('rejects drag gestures where displacement is >= 8.0px', () => {
      // 80ms fast flick, 20px displacement
      expect(isTapGesture(100, 100, 120, 100, 80)).toBe(false);
      // Exactly 8.0px displacement
      expect(isTapGesture(100, 100, 108.0, 100, 100)).toBe(false);
      // 8.01px displacement
      expect(isTapGesture(100, 100, 108.01, 100, 100)).toBe(false);
    });

    it('accepts displacement right below 8.0px threshold', () => {
      expect(isTapGesture(100, 100, 107.99, 100, 100)).toBe(true);
    });

    it('rejects long holds where duration is >= 220ms', () => {
      // 0px movement, held for 350ms
      expect(isTapGesture(100, 100, 100, 100, 350)).toBe(false);
      // Exactly 220ms
      expect(isTapGesture(100, 100, 100, 100, 220)).toBe(false);
    });

    it('accepts hold right below 220ms threshold', () => {
      expect(isTapGesture(100, 100, 100, 100, 219)).toBe(true);
    });

    it('handles negative coordinates and origin properly', () => {
      expect(isTapGesture(-50, -50, -48, -48, 80)).toBe(true);
      expect(isTapGesture(0, 0, 0, 0, 50)).toBe(true);
      expect(isTapGesture(-100, -100, 100, 100, 50)).toBe(false);
    });

    it('exports standard constants', () => {
      expect(TAP_MAX_DURATION_MS).toBe(220);
      expect(TAP_MAX_DISTANCE_PX).toBe(8.0);
    });
  });

  describe('createCanvasPointerHandlers', () => {
    it('dispatches onTap and unlocks audio on valid clean tap sequence', () => {
      const onTap = vi.fn();
      const onFirstAudioUnlock = vi.fn();
      const handlers = createCanvasPointerHandlers(onTap, onFirstAudioUnlock);

      let mockTime = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      // Pointer down at (100, 100)
      handlers.onPointerDown({ clientX: 100, clientY: 100 });

      // Advance time by 80ms
      mockTime = 1080;

      // Pointer up at (102, 103) -> dist = sqrt(2^2 + 3^2) ~= 3.6px < 8px
      handlers.onPointerUp({ clientX: 102, clientY: 103 });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onFirstAudioUnlock).toHaveBeenCalledTimes(1);

      // Subsequent tap: onTap should be called again, but onFirstAudioUnlock should NOT
      mockTime = 2000;
      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      mockTime = 2050;
      handlers.onPointerUp({ clientX: 100, clientY: 100 });

      expect(onTap).toHaveBeenCalledTimes(2);
      expect(onFirstAudioUnlock).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });

    it('suppresses onTap when pointer is dragged beyond 8px', () => {
      const onTap = vi.fn();
      const handlers = createCanvasPointerHandlers(onTap);

      let mockTime = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      mockTime = 1050;
      handlers.onPointerUp({ clientX: 130, clientY: 100 }); // 30px displacement

      expect(onTap).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('suppresses onTap when pointer is held >= 220ms', () => {
      const onTap = vi.fn();
      const handlers = createCanvasPointerHandlers(onTap);

      let mockTime = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      mockTime = 1250; // 250ms duration
      handlers.onPointerUp({ clientX: 100, clientY: 100 });

      expect(onTap).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('cleans up tracking state on pointer cancel', () => {
      const onTap = vi.fn();
      const handlers = createCanvasPointerHandlers(onTap);

      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      handlers.onPointerCancel();
      handlers.onPointerUp({ clientX: 100, clientY: 100 });

      expect(onTap).not.toHaveBeenCalled();
    });
  });
});
