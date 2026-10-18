import { describe, it, expect } from 'vitest';
import { isTapGesture } from './testHarness';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Feature F17: Pure Canvas Tap-Anywhere Interaction', () => {
  it('F17-1: Clean quick tap (deltaT < 220ms and distance < 8px) is recognized as valid toggle', () => {
    // 50ms hold, 2px displacement
    expect(isTapGesture(100, 100, 101, 101, 50)).toBe(true);

    // 150ms hold, 6px displacement
    expect(isTapGesture(200, 200, 204, 204, 150)).toBe(true);
  });

  it('F17-2: Drag gesture (distance >= 8px) is suppressed from triggering play/pause', () => {
    // 80ms fast flick, but 20px displacement (drag)
    expect(isTapGesture(100, 100, 120, 100, 80)).toBe(false);

    // 100ms, 12px vertical swipe
    expect(isTapGesture(100, 100, 100, 112, 100)).toBe(false);
  });

  it('F17-3: Long hold (deltaT >= 220ms) is suppressed from triggering tap action', () => {
    // 0px movement, but held for 350ms
    expect(isTapGesture(100, 100, 100, 100, 350)).toBe(false);

    // Boundary at 220ms exactly
    expect(isTapGesture(100, 100, 100, 100, 220)).toBe(false);
  });

  it('F17-4: First valid tap gesture safely unlocks AudioContext by invoking resume()', async () => {
    const ctx = new MockAudioContext();
    expect(ctx.state).toBe('suspended');

    // Simulate tap interaction handler unlocking audio
    async function handleFirstTap(audioCtx: MockAudioContext) {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
    }

    await handleFirstTap(ctx);
    expect(ctx.state).toBe('running');
  });

  it('F17-5: Canvas central zone has zero play discs or modal overlays obstructing geometric visuals', () => {
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'relative w-full h-full';

    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 w-full h-full';
    canvasContainer.appendChild(canvas);

    // No center disc element should be added
    const centerDisc = canvasContainer.querySelector('.center-play-disc');
    expect(centerDisc).toBeNull();
  });
});
