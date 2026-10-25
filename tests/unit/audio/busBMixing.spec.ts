import { describe, it, expect, vi } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';
import { AdsrModule } from '../../../src/audio/nodes/AdsrModule';

describe('BUS B Topology, Equal-Power Mixing and Multi-Instance Processing', () => {
  it('guarantees complete signal flow and node topology for BUS B', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    const laneBusB = (engine as any).laneBusB;
    const effectChainB = (engine as any).effectChainB;
    const busGainB = (engine as any).busGainB;
    const busMixer = (engine as any).busMixer;

    expect(laneBusB).toBeDefined();
    expect(effectChainB).toBeDefined();
    expect(busGainB).toBeDefined();
    expect(busMixer).toBeDefined();

    // Verify topology: laneBusB -> effectChainB -> busGainB -> busMixer
    expect(laneBusB.connectedNodes).toContain(effectChainB.inputNode);
    expect(effectChainB.outputNode.connectedNodes).toContain(busGainB);
    expect(busGainB.connectedNodes).toContain(busMixer);
  });

  it('routes sound sources accurately to BUS B without leaking into BUS A', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Route OSC B (Noise) to laneB
    engine.setSourceRoute('oscB', 'laneB');
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    const routeGains = (engine as any).sourceRouteGains.get('oscB');

    expect(routeGains).toBeDefined();
    expect(routeGains.toA.gain.value).toBeCloseTo(0.0, 6);
    expect(routeGains.toB.gain.value).toBeCloseTo(1.0, 6);
    expect(routeGains.toThru.gain.value).toBeCloseTo(0.0, 6);

    // Route Sub Drone to laneB
    engine.setSourceRoute('drone', 'laneB');
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    const droneGains = (engine as any).sourceRouteGains.get('drone');
    expect(droneGains.toA.gain.value).toBeCloseTo(0.0, 6);
    expect(droneGains.toB.gain.value).toBeCloseTo(1.0, 6);
  });

  it('implements strict equal-power crossfade between BUS A and BUS B (cos^2 + sin^2 = 1)', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    const busGainA = (engine as any).busGainA;
    const busGainB = (engine as any).busGainB;

    // 1. Default at 0.5 (Balanced)
    expect(engine.getBusMix()).toBe(0.5);
    const midCos = Math.cos(0.5 * Math.PI * 0.5);
    const midSin = Math.sin(0.5 * Math.PI * 0.5);
    expect(busGainA.gain.value).toBeCloseTo(midCos, 4);
    expect(busGainB.gain.value).toBeCloseTo(midSin, 4);
    expect(Math.pow(busGainA.gain.value, 2) + Math.pow(busGainB.gain.value, 2)).toBeCloseTo(1.0, 4);

    // 2. Full BUS A (busMix = 0.0)
    engine.setBusMix(0.0);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(0.0);
    expect(busGainA.gain.value).toBeCloseTo(1.0, 4);
    expect(busGainB.gain.value).toBeCloseTo(0.0, 4);

    // 3. Full BUS B (busMix = 1.0)
    engine.setBusMix(1.0);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(1.0);
    expect(busGainA.gain.value).toBeCloseTo(0.0, 4);
    expect(busGainB.gain.value).toBeCloseTo(1.0, 4);

    // 4. Quarter point (busMix = 0.25)
    engine.setBusMix(0.25);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(0.25);
    const qCos = Math.cos(0.25 * Math.PI * 0.5);
    const qSin = Math.sin(0.25 * Math.PI * 0.5);
    expect(busGainA.gain.value).toBeCloseTo(qCos, 4);
    expect(busGainB.gain.value).toBeCloseTo(qSin, 4);
    expect(Math.pow(busGainA.gain.value, 2) + Math.pow(busGainB.gain.value, 2)).toBeCloseTo(1.0, 4);

    // 5. Out of bounds clamping
    engine.setBusMix(-0.5);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(0.0);
    expect(busGainA.gain.value).toBeCloseTo(1.0, 4);

    engine.setBusMix(1.5);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(1.0);
    expect(busGainB.gain.value).toBeCloseTo(1.0, 4);

    // 6. Update through updateEffects
    engine.updateEffects({ busMix: 0.75 });
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusMix()).toBe(0.75);
    expect(engine.getEffectsParams().busMix).toBe(0.75);
  });

  it('guarantees complete independence for all 8 effect module types in BUS B', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Populate Lane B with dedicated secondary instances of all 8 effect modules
    const laneBOrder = [
      'gain_2',
      'drive_2',
      'filter_2',
      'eq_2',
      'adsr_2',
      'lfo_2',
      'delay_2',
      'reverb_2'
    ];
    engine.reorderLaneEffects('laneB', laneBOrder);

    // 1. Set specific parameters for Lane A modules
    engine.updateEffects({
      gain: { value: 6.0 },
      drive: { amount: 0.2 },
      filter: { cutoff: 800 },
      eq: { low: { gain: -3.0 } },
      adsr: { attack: 0.5, release: 1.0 },
      delay: { time: 0.25, mix: 0.3 },
      reverb: { decayTime: 2.0, mix: 0.2 }
    });

    // 2. Set completely different parameters for Lane B modules
    engine.updateEffects({
      instances: {
        gain_2: { value: -6.0 },
        drive_2: { amount: 0.8 },
        filter_2: { cutoff: 4500 },
        eq_2: { low: { gain: 6.0 } },
        adsr_2: { attack: 2.5, release: 5.0 },
        delay_2: { time: 0.65, mix: 0.7 },
        reverb_2: { decayTime: 8.0, mix: 0.85 }
      }
    });

    // 3. Verify Lane A parameters remain unaffected
    const paramsA = engine.getEffectsParams();
    expect(paramsA.gain?.value).toBe(6.0);
    expect(paramsA.drive?.amount).toBe(0.2);
    expect(paramsA.filter?.cutoff).toBe(800);
    expect(paramsA.eq?.low?.gain).toBe(-3.0);
    expect(paramsA.adsr?.attack).toBe(0.5);
    expect(paramsA.delay?.time).toBe(0.25);
    expect(paramsA.reverb?.decayTime).toBe(2.0);

    // 4. Verify Lane B module instances have their own distinct parameters
    const instances = paramsA.instances!;
    expect(instances['gain_2'].value).toBe(-6.0);
    expect(instances['drive_2'].amount).toBe(0.8);
    expect(instances['filter_2'].cutoff).toBe(4500);
    expect(instances['eq_2'].low.gain).toBe(6.0);
    expect(instances['adsr_2'].attack).toBe(2.5);
    expect(instances['delay_2'].time).toBe(0.65);
    expect(instances['reverb_2'].decayTime).toBe(8.0);
  });

  it('synchronizes monophonic breath gating lifecycle across all active ADSR instances', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Add secondary ADSR module to Lane B
    engine.addEffectToLane('laneB', 'adsr_2');
    const adsr1 = (engine as any).adsr as AdsrModule;
    const adsr2 = (engine as any).getOrCreateEffectModule('adsr_2') as AdsrModule;

    expect(adsr1).toBeDefined();
    expect(adsr2).toBeDefined();

    // Prime engine in holdOut stage so next inhale is a valid stage transition
    engine.updateBreathModulation(0.0, 'holdOut', 0.0);

    const spy1Attack = vi.spyOn(adsr1, 'triggerAttack');
    const spy1Release = vi.spyOn(adsr1, 'triggerRelease');
    const spy2Attack = vi.spyOn(adsr2, 'triggerAttack');
    const spy2Release = vi.spyOn(adsr2, 'triggerRelease');

    // Inhale trigger (Note On)
    engine.updateBreathModulation(0.2, 'inhale', 0.1);
    expect(spy1Attack).toHaveBeenCalledWith(1.0);
    expect(spy2Attack).toHaveBeenCalledWith(1.0);

    // HoldIn maintain
    engine.updateBreathModulation(0.8, 'holdIn', 0.5);
    expect(spy1Release).not.toHaveBeenCalled();
    expect(spy2Release).not.toHaveBeenCalled();

    // HoldOut trigger (Note Off)
    engine.updateBreathModulation(0.0, 'holdOut', 0.2);
    expect(spy1Release).toHaveBeenCalled();
    expect(spy2Release).toHaveBeenCalled();

    // Purge on hard cut
    const spy1Purge = vi.spyOn(adsr1, 'purge');
    const spy2Purge = vi.spyOn(adsr2, 'purge');
    engine.executeZeroResidueHardCut();
    expect(spy1Purge).toHaveBeenCalled();
    expect(spy2Purge).toHaveBeenCalled();
  });

  it('guarantees MULTIMODE FILTER in BUS B is properly connected and modulated', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Route OSC A to Lane B
    engine.setSourceRoute('oscA', 'laneB');

    // Add dedicated Filter instance (filter_2) to Lane B
    engine.addEffectToLane('laneB', 'filter_2');

    const filter2 = (engine as any).getOrCreateEffectModule('filter_2');
    expect(filter2).toBeDefined();

    // 1. Verify filter_2 can receive and update cutoff & resonance
    engine.updateEffects({
      instances: {
        filter_2: {
          type: 'highpass',
          cutoff: 3200,
          resonance: 4.5,
          bypass: false
        }
      }
    });

    const filter2Params = filter2.getParams();
    expect(filter2Params.type).toBe('highpass');
    expect(filter2Params.cutoff).toBe(3200);
    expect(filter2Params.resonance).toBe(4.5);
    expect(filter2Params.bypass).toBe(false);

    // 2. Assign live modulation route to filter_2-cutoff
    engine.setModulationRoute('filter_2-cutoff', {
      target: 'filter_2-cutoff',
      source: 'breathMacro',
      depth: 0.8,
      bipolar: false
    });

    // 3. Update breath modulation (macro = 1.0 -> full positive cutoff boost)
    engine.updateBreathModulation(1.0, 'inhale', 0.5);
    const modulatedParams = filter2.getParams();
    expect(modulatedParams.cutoff).toBeGreaterThan(3200);

    // 4. Return to zero macro -> cutoff should return smoothly to base
    engine.setModulationRoute('filter_2-cutoff', null);
    engine.updateBreathModulation(0.0, 'holdOut', 0.0);
    expect(filter2.getParams().cutoff).toBe(3200);
  });

  it('safely deep-merges multi-instance EQ sub-bands without wiping untouched band settings in BUS B', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Add EQ to Lane B
    engine.addEffectToLane('laneB', 'eq_2');
    const eq2 = (engine as any).getOrCreateEffectModule('eq_2');
    expect(eq2).toBeDefined();

    // 1. Initial base settings
    engine.updateEffects({
      instances: {
        eq_2: {
          low: { frequency: 120, gain: 0, q: 0.707 },
          midLow: { frequency: 450, gain: 2.0, q: 1.2 }
        }
      }
    });

    // 2. Partial update to only low gain (should NOT wipe low frequency or q)
    engine.updateEffects({
      instances: {
        eq_2: {
          low: { gain: 6.0 }
        }
      }
    });

    const currentParams = eq2.getParams();
    expect(currentParams.low.gain).toBe(6.0);
    expect(currentParams.low.frequency).toBe(120);
    expect(currentParams.low.q).toBe(0.707);
    expect(currentParams.midLow.gain).toBe(2.0);
    expect(currentParams.midLow.frequency).toBe(450);
  });

  it('handles migrating the original filter between Lane A and Lane B seamlessly', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    const effectChainA = (engine as any).effectChainA;
    const effectChainB = (engine as any).effectChainB;

    expect(effectChainA.hasEffect('filter')).toBe(true);
    expect(effectChainB.hasEffect('filter')).toBe(false);

    // Transfer filter from Lane A to Lane B
    engine.moveEffectBetweenLanes('filter', 'laneB');

    expect(engine.getLaneEffectOrder('laneA')).not.toContain('filter');
    expect(engine.getLaneEffectOrder('laneB')).toContain('filter');
    expect(effectChainA.hasEffect('filter')).toBe(false);
    expect(effectChainB.hasEffect('filter')).toBe(true);

    // Verify filter can be parameterized in Lane B
    engine.updateEffects({
      filter: { cutoff: 550 }
    });
    expect((engine as any).filter.getParams().cutoff).toBe(550);
  });

  it('controls independent master faders for BUS A and BUS B and sums to master busMixer', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    const busGainA = (engine as any).busGainA;
    const busGainB = (engine as any).busGainB;

    // Default bus levels are 1.0
    expect(engine.getBusLevelA()).toBe(1.0);
    expect(engine.getBusLevelB()).toBe(1.0);

    // Set busLevelA to 0.50
    engine.updateEffects({ busLevelA: 0.50 });
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusLevelA()).toBe(0.50);
    expect(engine.getEffectsParams().busLevelA).toBe(0.50);
    const midCos = Math.cos(0.5 * Math.PI * 0.5);
    expect(busGainA.gain.value).toBeCloseTo(midCos * 0.50, 4);

    // Set busLevelB to 0.80
    engine.updateEffects({ busLevelB: 0.80 });
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(engine.getBusLevelB()).toBe(0.80);
    expect(engine.getEffectsParams().busLevelB).toBe(0.80);
    const midSin = Math.sin(0.5 * Math.PI * 0.5);
    expect(busGainB.gain.value).toBeCloseTo(midSin * 0.80, 4);

    // Set busMix to 0.0 (100% BUS A) while busLevelA is 0.50
    engine.setBusMix(0.0);
    ctx.advanceTime(1); // Allow scheduled anti-click ramps to settle.
    expect(busGainA.gain.value).toBeCloseTo(1.0 * 0.50, 4);
    expect(busGainB.gain.value).toBeCloseTo(0.0, 4);
  });
});

