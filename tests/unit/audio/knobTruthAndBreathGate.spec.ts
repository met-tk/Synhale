import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';
import { createDefaultBreathCurveData } from '../../../src/audio/dsp/curveMath';
import type { ModulationRoute } from '../../../src/types/ui';

describe('Knob-Truth Principle & Monophonic Breath Gate Lifecycle Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Knob-Truth Principle: parameters without modulation routes strictly retain their knob values across all breath stages', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Set initial effects knob values
    const initialCutoff = 1850;
    const initialResonance = 4.2;
    const initialReverbMix = 0.35;
    const initialOscBGain = 0.45;

    engine.updateEffects({
      filter: { cutoff: initialCutoff, resonance: initialResonance },
      reverb: { mix: initialReverbMix }
    });
    engine.updateChannelStrip({
      oscB: { gain: initialOscBGain }
    });

    // Clear all modulation routes to verify unmodulated stability
    engine.setModulationRoutes({});

    // Simulate stepping through all 4 breath stages at various progress points
    const stages: Array<'inhale' | 'holdIn' | 'exhale' | 'holdOut'> = [
      'inhale',
      'holdIn',
      'exhale',
      'holdOut'
    ];
    const progresses = [0.0, 0.3, 0.7, 1.0];

    for (const stage of stages) {
      for (const progress of progresses) {
        engine.updateBreathModulation(0.5, stage, progress);

        // Assert filter cutoff strictly stayed at initialCutoff
        expect(engine.filter.getParams().cutoff).toBe(initialCutoff);

        // Assert filter resonance strictly stayed at initialResonance
        expect(engine.filter.getParams().resonance).toBe(initialResonance);

        // Assert reverb wet mix strictly stayed at initialReverbMix
        expect(engine.reverb.getParams().mix).toBeCloseTo(initialReverbMix, 3);

        // Assert OSC B gain strictly stayed at initialOscBGain
        expect(engine.oscB.getParams().gain).toBeCloseTo(initialOscBGain, 3);
      }
    }

    engine.dispose();
  });

  it('Monophonic Breath Gate: single breath cycle maps to Attack on inhale, Sustain during holdIn/exhale, Release on holdOut', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();


    // Spy on ADSR triggers
    const triggerAttackSpy = vi.spyOn(engine.adsr, 'triggerAttack');
    const triggerReleaseSpy = vi.spyOn(engine.adsr, 'triggerRelease');

    // 0. Establish baseline rest state (holdOut) prior to breath cycle start
    engine.updateBreathModulation(0.0, 'holdOut', 0.0);
    triggerAttackSpy.mockClear();
    triggerReleaseSpy.mockClear();

    // 1. Inhale onset: should trigger Note On (Attack)
    engine.updateBreathModulation(0.1, 'inhale', 0.05);
    expect(triggerAttackSpy).toHaveBeenCalledTimes(1);

    // 2. Progression through inhale and into holdIn: sustain continues, no additional attack or premature release
    engine.updateBreathModulation(0.8, 'inhale', 0.9);
    engine.updateBreathModulation(0.9, 'holdIn', 0.1);
    engine.updateBreathModulation(0.9, 'holdIn', 0.8);
    expect(triggerAttackSpy).toHaveBeenCalledTimes(1);
    expect(triggerReleaseSpy).toHaveBeenCalledTimes(0);

    // 3. Exhale stage: maintains acoustic presence on the sustain plateau, does not cut off voice
    engine.updateBreathModulation(0.5, 'exhale', 0.2);
    engine.updateBreathModulation(0.2, 'exhale', 0.9);
    expect(triggerReleaseSpy).toHaveBeenCalledTimes(0);

    // 4. HoldOut onset: breathing cycle finishes, note enters Release
    engine.updateBreathModulation(0.0, 'holdOut', 0.05);
    expect(triggerReleaseSpy).toHaveBeenCalledTimes(1);

    // Subsequent holdOut progression does not re-trigger release
    engine.updateBreathModulation(0.0, 'holdOut', 0.8);
    expect(triggerReleaseSpy).toHaveBeenCalledTimes(1);

    // 5. Next cycle inhale onset: triggers next breath note
    engine.updateBreathModulation(0.1, 'inhale', 0.02);
    expect(triggerAttackSpy).toHaveBeenCalledTimes(2);

    engine.dispose();
  });

  it('Modulation with custom MSEG curveData dynamically drives parameter values', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    const customCurve = createDefaultBreathCurveData();
    // Set inhale to start at 0.0 and end at 1.0
    customCurve.inhale.points = [
      { id: 'i1', time: 0, value: 0.0, tension: 0 },
      { id: 'i2', time: 1, value: 1.0, tension: 0 }
    ];

    const route: ModulationRoute = {
      target: 'filter-cutoff',
      source: 'stageProgress',
      depth: 0.5,
      bipolar: false,
      curveData: customCurve
    };

    engine.setModulationRoute('filter-cutoff', route);

    // Inhale at progress 0.0 -> curve value 0.0 -> modCutoff = baseCutoff * 2^(0) = baseCutoff
    engine.updateBreathModulation(0.0, 'inhale', 0.0);
    const baseCutoff = engine.filter.getParams().cutoff;
    expect(engine.filter.getParams().cutoff).toBe(baseCutoff);

    // Inhale at progress 1.0 -> curve value 1.0 -> cutoff increases
    engine.updateBreathModulation(1.0, 'inhale', 1.0);
    expect(engine.filter.getParams().cutoff).toBeGreaterThan(baseCutoff);

    engine.dispose();
  });

  it('LFO pure modular routing: LFO modulation is dispatched exclusively via matrix routes and respects LFO depth and bypass', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Set base masterPan
    engine.updateEffects({
      masterPan: 0.0,
      lfo2: { rate: 1.0, depth: 0.8, shape: 'sine', bypass: false }
    });

    // 1. Without route: panner strictly stays at base pan (0.0)
    engine.setModulationRoutes({});
    engine.updateBreathModulation(0.5, 'inhale', 0.5);
    const panner = (engine as any).panner;
    expect(panner.pan.value).toBe(0.0);

    // 2. With matrix route to master-pan:
    engine.setModulationRoute('master-pan', {
      target: 'master-pan',
      source: 'lfo2',
      depth: 0.5,
      bipolar: true
    });

    // Advance time to 0.25s (quarter cycle of 1Hz sine -> peak 1.0)
    ctx.advanceTime(0.25);
    engine.updateBreathModulation(0.5, 'inhale', 0.5);

    // Live value is peak (1.0) * lfo2.depth (0.8) = 0.8; multiplied by route.depth (0.5) = 0.4
    expect(panner.pan.value).toBeGreaterThan(0.2);

    // 3. When bypassed: modulation becomes 0.0
    engine.updateEffects({
      lfo2: { bypass: true }
    });
    engine.updateBreathModulation(0.5, 'inhale', 0.5);
    expect(panner.pan.value).toBe(0.0);

    engine.dispose();
  });
});
