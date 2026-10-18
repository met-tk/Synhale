import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BreathEngine } from '../../../src/breath/engine';
import { FACTORY_RHYTHMS } from '../../../src/breath/storage';
import type { BreathClockSnapshot, BreathStage } from '../../../src/types';

describe('BreathEngine Unit Tests', () => {
  let engine: BreathEngine;

  beforeEach(() => {
    localStorage.clear();
    engine = new BreathEngine({
      rhythm: { inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 }
    });
  });

  afterEach(() => {
    engine.dispose();
  });

  it('implements BreathEngineApi interface correctly', () => {
    expect(typeof engine.start).toBe('function');
    expect(typeof engine.pause).toBe('function');
    expect(typeof engine.toggle).toBe('function');
    expect(typeof engine.setRhythm).toBe('function');
    expect(typeof engine.setAutomation).toBe('function');
    expect(typeof engine.getSnapshot).toBe('function');
    expect(typeof engine.onTick).toBe('function');
  });

  it('starts in paused state with initial snapshot values', () => {
    const snap = engine.getSnapshot();
    expect(snap.isPlaying).toBe(false);
    expect(snap.currentStage).toBe('inhale');
    expect(snap.stageProgress).toBe(0.0);
    expect(snap.cycleCount).toBe(0);
    expect(snap.stageRemainingSeconds).toBe(4.0);
  });

  it('transitions state on start, pause, resume, and toggle', () => {
    expect(engine.getSnapshot().isPlaying).toBe(false);

    engine.start();
    expect(engine.getSnapshot().isPlaying).toBe(true);

    engine.pause();
    expect(engine.getSnapshot().isPlaying).toBe(false);

    engine.resume();
    expect(engine.getSnapshot().isPlaying).toBe(true);

    engine.toggle();
    expect(engine.getSnapshot().isPlaying).toBe(false);

    engine.toggle();
    expect(engine.getSnapshot().isPlaying).toBe(true);
  });

  it('stop() pauses and resets clock to beginning of Inhale', () => {
    engine.start();
    engine.tick(6.0); // into holdIn
    expect(engine.getSnapshot().currentStage).toBe('holdIn');

    engine.stop();
    const snap = engine.getSnapshot();
    expect(snap.isPlaying).toBe(false);
    expect(snap.currentStage).toBe('inhale');
    expect(snap.stageProgress).toBe(0.0);
    expect(snap.cycleCount).toBe(0);
  });

  it('notifies onTick subscribers with immutable snapshots and supports unsubscription', () => {
    const receivedSnapshots: BreathClockSnapshot[] = [];
    const unsubscribe = engine.onTick((snapshot) => {
      receivedSnapshots.push(snapshot);
    });

    engine.start();
    engine.tick(1.0);
    expect(receivedSnapshots.length).toBeGreaterThan(0);
    const lastSnap = receivedSnapshots[receivedSnapshots.length - 1];
    expect(lastSnap.stageProgress).toBeCloseTo(0.25, 3);
    expect(Object.isFrozen(lastSnap)).toBe(true);

    const countBeforeUnsub = receivedSnapshots.length;
    unsubscribe();
    engine.tick(1.0);
    expect(receivedSnapshots.length).toBe(countBeforeUnsub);
  });

  it('notifies onStageChange subscribers on stage transitions', () => {
    const transitions: Array<{ newStage: BreathStage; oldStage: BreathStage; cycle: number }> = [];
    engine.onStageChange((newStage, oldStage, cycle) => {
      transitions.push({ newStage, oldStage, cycle });
    });

    engine.start();
    engine.tick(4.0); // inhale -> holdIn
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toEqual({ newStage: 'holdIn', oldStage: 'inhale', cycle: 0 });

    engine.tick(4.0); // holdIn -> exhale
    expect(transitions).toHaveLength(2);
    expect(transitions[1]).toEqual({ newStage: 'exhale', oldStage: 'holdIn', cycle: 0 });
  });

  it('notifies onCycleComplete subscribers when a full 4-stage cycle finishes', () => {
    let completedCycles = 0;
    engine.onCycleComplete((cycleCount) => {
      completedCycles = cycleCount;
    });

    engine.start();
    engine.tick(16.0); // 1 full cycle
    expect(completedCycles).toBe(1);

    engine.tick(16.0); // 2nd full cycle
    expect(completedCycles).toBe(2);
  });

  it('updates rhythm dynamically via setRhythm and broadcasts new snapshot', () => {
    let tickCount = 0;
    engine.onTick(() => {
      tickCount++;
    });

    engine.setRhythm(FACTORY_RHYTHMS.coherent);
    const rhythm = engine.getRhythm();
    expect(rhythm.inhale).toBe(5.5);
    expect(rhythm.exhale).toBe(5.5);
    expect(tickCount).toBeGreaterThan(0);
  });

  it('sets and retrieves parameter automations', () => {
    const customAuto = [
      {
        targetParam: 'filterCutoff',
        inhale: { startVal: 0.2, endVal: 0.9, tension: 0.1 },
        holdIn: { startVal: 0.9, endVal: 0.9, tension: 0.0 },
        exhale: { startVal: 0.9, endVal: 0.2, tension: -0.1 },
        holdOut: { startVal: 0.2, endVal: 0.2, tension: 0.0 }
      }
    ];

    engine.setAutomation(customAuto);
    const retrieved = engine.getAutomation();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].targetParam).toBe('filterCutoff');
    expect(retrieved[0].inhale.startVal).toBe(0.2);
  });

  it('handles dispose cleanly by stopping loop and clearing subscribers', () => {
    const tickSpy = vi.fn();
    engine.onTick(tickSpy);

    engine.start();
    expect(engine.getSnapshot().isPlaying).toBe(true);

    engine.dispose();
    expect(engine.getSnapshot().isPlaying).toBe(false);

    // After dispose, start should do nothing
    engine.start();
    expect(engine.getSnapshot().isPlaying).toBe(false);
  });
});
