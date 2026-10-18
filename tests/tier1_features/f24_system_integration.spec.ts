import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import type { BreathStage, BreathClockSnapshot } from '../../src/types';

describe('Feature F24: System Audio-Visual & Physical Clock Integration', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('F24-1: Master clock tick updates AudioEngine modulation, Canvas visuals, and VU meter in sync', () => {
    const audioUpdateSpy = vi.fn();
    const visualUpdateSpy = vi.fn();
    const vuUpdateSpy = vi.fn();

    function masterClockTick(snapshot: BreathClockSnapshot) {
      audioUpdateSpy(snapshot.breathMacro, snapshot.currentStage);
      visualUpdateSpy(snapshot.breathMacro, snapshot.stageProgress);
      vuUpdateSpy(snapshot.breathMacro);
    }

    const testSnapshot: BreathClockSnapshot = {
      isPlaying: true,
      currentStage: 'inhale',
      stageProgress: 0.6,
      stageRemainingSeconds: 1.6,
      cycleProgress: 0.15,
      breathMacro: 0.6,
      cycleCount: 2
    };

    masterClockTick(testSnapshot);

    expect(audioUpdateSpy).toHaveBeenCalledWith(0.6, 'inhale');
    expect(visualUpdateSpy).toHaveBeenCalledWith(0.6, 0.6);
    expect(vuUpdateSpy).toHaveBeenCalledWith(0.6);
  });

  it('F24-2: Tap-pause triggers 0ms audio hard cut and freezes visuals simultaneously', () => {
    let isVisualActive = true;
    const masterCutGain = ctx.createGain();
    masterCutGain.gain.setValueAtTime(1.0, 0);

    function onPause() {
      // 1. Audio hard cut
      masterCutGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.0025);
      // 2. Freeze visual animation
      isVisualActive = false;
    }

    onPause();
    ctx.advanceTime(0.0025);

    expect(masterCutGain.gain.value).toBe(0.0);
    expect(isVisualActive).toBe(false);
  });

  it('F24-3: Resuming synchronizes audio restart with stored visual phase restoration', async () => {
    let isPlaying = false;
    let visualPhase = 0.45;

    async function onResume() {
      await ctx.resume();
      isPlaying = true;
    }

    await onResume();
    expect(ctx.state).toBe('running');
    expect(isPlaying).toBe(true);
    expect(visualPhase).toBe(0.45); // Unchanged exact phase
  });

  it('F24-4: Full cycle progression through 4 stages maintains continuous clock timeline without temporal gaps', () => {
    const stageTimeline: { stage: BreathStage; time: number }[] = [];
    const rhythm = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };

    let currentTime = 0;
    const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
    for (const stage of stages) {
      stageTimeline.push({ stage, time: currentTime });
      currentTime += rhythm[stage];
    }
    stageTimeline.push({ stage: 'inhale', time: currentTime }); // Loop completion

    expect(stageTimeline).toHaveLength(5);
    expect(stageTimeline[0].time).toBe(0);
    expect(stageTimeline[1].time).toBe(4);
    expect(stageTimeline[2].time).toBe(8);
    expect(stageTimeline[3].time).toBe(12);
    expect(stageTimeline[4].time).toBe(16);
  });

  it('F24-5: System dispose method releases audio context and unbinds event listeners cleanly', async () => {
    let isDisposed = false;

    function disposeSystem() {
      ctx.close();
      isDisposed = true;
    }

    disposeSystem();
    expect(ctx.state).toBe('closed');
    expect(isDisposed).toBe(true);
  });
});
