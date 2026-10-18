import { describe, it, expect, beforeEach } from 'vitest';
import { DualLfoModule, DEFAULT_LFO1_PARAMS, DEFAULT_LFO2_PARAMS } from '../../../src/audio/nodes/DualLfoModule';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Dual LFO System & Acoustic Modulation', () => {
  let ctx: MockAudioContext;
  let dualLfo: DualLfoModule;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    dualLfo = new DualLfoModule(ctx as unknown as AudioContext);
  });

  it('initializes with default LFO1 and LFO2 parameters', () => {
    const lfo1 = dualLfo.getLfo1Params();
    const lfo2 = dualLfo.getLfo2Params();

    expect(lfo1.rate).toBeCloseTo(DEFAULT_LFO1_PARAMS.rate, 2);
    expect(lfo1.depth).toBeCloseTo(DEFAULT_LFO1_PARAMS.depth, 2);
    expect(lfo1.bypass).toBe(false);

    expect(lfo2.rate).toBeCloseTo(DEFAULT_LFO2_PARAMS.rate, 2);
    expect(lfo2.filterMod).toBeCloseTo(DEFAULT_LFO2_PARAMS.filterMod!, 2);
    expect(lfo2.panMod).toBeCloseTo(DEFAULT_LFO2_PARAMS.panMod!, 2);
    expect(lfo2.bypass).toBe(false);
  });

  it('updates LFO1 parameters with rate and depth clamping', () => {
    dualLfo.setLfo1Params({ rate: 5.5, depth: 0.8, shape: 'triangle' });
    const params = dualLfo.getLfo1Params();

    expect(params.rate).toBe(5.5);
    expect(params.depth).toBe(0.8);
    expect(params.shape).toBe('triangle');

    // Clamping checks
    dualLfo.setLfo1Params({ rate: 999, depth: -1 });
    const clamped = dualLfo.getLfo1Params();
    expect(clamped.rate).toBe(30);
    expect(clamped.depth).toBe(0);
  });

  it('updates LFO2 parameters for filter swell, stereo pan and tremolo', () => {
    dualLfo.setLfo2Params({
      rate: 0.1,
      depth: 0.5,
      filterMod: 0.4,
      panMod: 0.6,
      tremoloMod: 0.2
    });

    const params = dualLfo.getLfo2Params();
    expect(params.rate).toBe(0.1);
    expect(params.filterMod).toBe(0.4);
    expect(params.panMod).toBe(0.6);
    expect(params.tremoloMod).toBe(0.2);
  });

  it('handles purge and restore for 0ms zero-residue hard cut without error', () => {
    dualLfo.start(0);
    expect(() => dualLfo.purge()).not.toThrow();
    expect(() => dualLfo.restore()).not.toThrow();
  });

  describe('AudioEngine Dual LFO Integration', () => {
    let engine: AudioEngine;

    beforeEach(async () => {
      engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();
    });

    it('integrates dual LFO in AudioEngine and reflects in getEffectsParams', () => {
      const fx = engine.getEffectsParams();
      expect(fx.lfo1).toBeDefined();
      expect(fx.lfo2).toBeDefined();
      expect(fx.lfo1?.rate).toBeGreaterThan(0);
      expect(fx.lfo2?.rate).toBeGreaterThan(0);
    });

    it('updates LFO settings via updateEffects', () => {
      engine.updateEffects({
        lfo1: { rate: 0.2, depth: 0.35, bypass: false },
        lfo2: { rate: 0.05, filterMod: 0.5, panMod: 0.4 }
      });

      const fx = engine.getEffectsParams();
      expect(fx.lfo1?.rate).toBe(0.2);
      expect(fx.lfo1?.depth).toBe(0.35);
      expect(fx.lfo2?.rate).toBe(0.05);
      expect(fx.lfo2?.filterMod).toBe(0.5);
    });

    it('executes zero-residue hard cut and resumes with active LFOs', async () => {
      engine.executeZeroResidueHardCut();
      await engine.resume();
      const fx = engine.getEffectsParams();
      expect(fx.lfo1?.bypass).toBe(false);
    });
  });
});
