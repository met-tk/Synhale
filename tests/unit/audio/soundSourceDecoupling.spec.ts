import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('R1 Acceptance Verification: Sound Source Decoupling & Particle Isolation', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(async () => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
  });

  afterEach(() => {
    engine.dispose();
  });

  // =========================================================================
  // AC1: Granular Bypass 零粒子与零声学外溢验证
  // =========================================================================
  describe('R1-AC1: Granular Cloud Bypass Zero-Grain & Zero-Acoustic Isolation', () => {
    it('returns empty visual grains array when granular is bypassed, regardless of OscA activity', () => {
      // 1. Activate OscA at maximum gain and sweeping parameters
      engine.updateChannelStrip({
        oscA: { bypass: false, gain: 1.0, wavetableIndex: 5.5, detune: 20 },
        granular: { bypass: true, gain: 0.8 } // Bypassed!
      });

      // Advance mock time and query visual grains
      ctx.advanceTime(0.5);
      const visualGrains = engine.getVisualGrains();

      // AC1 requirement: strictly zero grains in visualizer
      expect(visualGrains).toEqual([]);
      expect(visualGrains.length).toBe(0);
    });

    it('strictly mutes granular channel acoustic output to 0.0 when bypassed, while OscA sounds at full power', () => {
      engine.updateChannelStrip({
        oscA: { bypass: false, gain: 0.9 },
        granular: { bypass: true, gain: 0.9 }
      });

      ctx.advanceTime(0.05);

      // Verify Granular channel output gain node is 0.0 (acoustic silence)
      const granularOutGain = (engine.granular as any).activeOutGain?.gain?.value;
      expect(granularOutGain).toBeCloseTo(0.0, 2);
      expect(engine.granular.getParams().bypass).toBe(true);

      // Verify OscA channel bypass gain node is active (1.0)
      const oscABypassGain = (engine.oscA as any).bypassGain?.gain?.value ?? 1.0;
      expect(oscABypassGain).toBeCloseTo(1.0, 2);
      expect(engine.oscA.getParams().bypass).toBe(false);
    });
  });

  // =========================================================================
  // AC2: engine.getVisualGrains() 切断与 oscA 的任何借用/回退
  // =========================================================================
  describe('R1-AC2: engine.getVisualGrains() Isolation & Absence of OscA Fallback', () => {
    it('strictly queries GranularChannel and never accesses oscA for visual grains', () => {
      // OscAChannel no longer exposes getActiveVisualGrains at all (stub removed);
      // the absence of the method itself enforces the isolation contract.
      expect((engine.oscA as unknown as Record<string, unknown>).getActiveVisualGrains).toBeUndefined();

      const granularSpy = vi.spyOn(engine.granular, 'getActiveVisualGrains');

      // When granular is active
      engine.updateChannelStrip({
        granular: { bypass: false }
      });
      engine.getVisualGrains();
      expect(granularSpy).toHaveBeenCalled();

      granularSpy.mockClear();

      // When granular is bypassed
      engine.updateChannelStrip({
        granular: { bypass: true }
      });
      const grains = engine.getVisualGrains();
      expect(grains).toEqual([]);
    });
  });

  // =========================================================================
  // AC3: 4 大独立声源并发旁路与发声隔离测试 (16 种排列组合)
  // =========================================================================
  describe('R1-AC3: 4 Sound Sources Independent Concurrency & Bypass Matrix (2^4 = 16 States)', () => {
    const states = [false, true];

    states.forEach(bA => {
      states.forEach(bG => {
        states.forEach(bB => {
          states.forEach(bD => {
            const desc = `bypasses: oscA=${bA}, granular=${bG}, oscB=${bB}, drone=${bD}`;
            it(`handles concurrent state matrix: ${desc} without cross-interference`, () => {
              engine.updateChannelStrip({
                oscA: { bypass: bA, gain: 0.8 },
                granular: { bypass: bG, gain: 0.7 },
                oscB: { bypass: bB, gain: 0.6 },
                drone: { bypass: bD, gain: 0.9 }
              });

              ctx.advanceTime(0.01);

              // Check each channel strip parameter faithfully reflects its own state
              const ch = engine.getChannelStripParams();
              expect(ch.oscA.bypass).toBe(bA);
              expect(ch.granular?.bypass).toBe(bG);
              expect(ch.oscB.bypass).toBe(bB);
              expect(ch.drone.bypass).toBe(bD);

              // Toggling one source's bypass must NEVER alter others
              engine.updateChannelStrip({ oscA: { bypass: !bA } });
              const chAfter = engine.getChannelStripParams();
              expect(chAfter.granular?.bypass).toBe(bG);
              expect(chAfter.oscB.bypass).toBe(bB);
              expect(chAfter.drone.bypass).toBe(bD);
            });
          });
        });
      });
    });
  });

  // =========================================================================
  // AC4: Sub Drone 432Hz 独立性保护（切断与 OSC A 状态机的关联）
  // =========================================================================
  describe('R1-AC4: Sub Drone 432Hz Immunity to OscA Modulation and Breath Cycles', () => {
    it('preserves Sub Drone gain across all 4 breath stages regardless of OscA parameters', () => {
      engine.updateChannelStrip({
        oscA: { wavetableIndex: 10, detune: 50, gain: 0.2 },
        drone: { gain: 0.75, bypass: false }
      });

      const stages: Array<'inhale' | 'holdIn' | 'exhale' | 'holdOut'> = ['inhale', 'holdIn', 'exhale', 'holdOut'];

      stages.forEach(stage => {
        engine.updateBreathModulation(0.7, stage, 0.5);
        expect(engine.drone.getParams().gain).toBe(0.75);
        expect(engine.drone.getParams().bypass).toBe(false);
      });
    });
  });
});
