import { afterEach, describe, expect, it, vi } from 'vitest';
import { BreathEngine } from '../../../src/breath/engine';
import { BreathStateMachine } from '../../../src/breath/stateMachine';

afterEach(() => vi.unstubAllGlobals());

describe('Audit: breathing clock integrity', () => {
  it('ignores invalid and backwards timestamps without double-counting time', () => {
    const clock = new BreathStateMachine();
    clock.start(1000);
    clock.updateTimestamp(2000);
    for (const timestamp of [NaN, Infinity, 1500]) clock.updateTimestamp(timestamp);
    expect(clock.updateTimestamp(3000).stageProgress).toBe(0.5);
  });

  it.each(['pause', 'dispose'] as const)('does not reschedule after a subscriber calls %s inside a frame', action => {
    const pending = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      pending.set(++id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (key: number) => pending.delete(key));
    const engine = new BreathEngine();
    engine.start();
    engine.onTick(() => engine[action]());
    const [frameId, frame] = [...pending][0];
    pending.delete(frameId);
    frame(16);
    expect(pending.size).toBe(0);
    expect(engine.getSnapshot().isPlaying).toBe(false);
    engine.dispose();
  });
});
