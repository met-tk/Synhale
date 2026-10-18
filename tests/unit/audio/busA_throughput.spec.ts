import { describe, it, expect } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';
import { LfoRackEffectModule } from '../../../src/audio/nodes/LfoRackEffectModule';

describe('BUS A Throughput and Modular Chain Stability', () => {
  it('maintains internal pass-through connectivity in LfoRackEffectModule after disconnect', () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const lfoModule = new LfoRackEffectModule(ctx as unknown as AudioContext);

    // Initial state: inputNode connects to passGain, passGain connects to outputNode
    const passGain = (lfoModule as any).passGain;
    expect((lfoModule.inputNode as any).connectedNodes).toContain(passGain);
    expect(passGain.connectedNodes).toContain(lfoModule.outputNode);

    // Connect external sink
    const dummyDest = (ctx as any).createGain();
    lfoModule.connect(dummyDest);
    expect((lfoModule.outputNode as any).connectedNodes).toContain(dummyDest);

    // Call disconnect (called by EffectChainManager during chain reordering)
    lfoModule.disconnect();

    // The external connection is severed, but internal pass-through remains intact
    expect((lfoModule.outputNode as any).connectedNodes).not.toContain(dummyDest);
    expect((lfoModule.inputNode as any).connectedNodes).toContain(passGain);
    expect(passGain.connectedNodes).toContain(lfoModule.outputNode);
  });

  it('guarantees complete signal flow through BUS A effects chain after reordering', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Reorder Lane A effects with full module list
    const orderWithLfo = ['gain', 'drive', 'filter', 'eq', 'adsr', 'lfo', 'delay', 'reverb'];
    engine.reorderLaneEffects('laneA', orderWithLfo);

    // Verify all modules in order exist and have their outputs properly chained
    const chainA = (engine as any).effectChainA;
    expect(chainA.getOrder()).toEqual(orderWithLfo);

    // Audio input to BUS A connects to chainA.inputNode
    const laneBusA = (engine as any).laneBusA;
    expect(laneBusA.connectedNodes).toContain(chainA.inputNode);

    // First effect input connects to chain input
    const firstModule = (engine as any).effectModules.get('gain');
    expect(chainA.inputTransitionGain.connectedNodes).toContain(firstModule.inputNode);

    // Last module output should connect to chain output transition gain
    const lastModule = (engine as any).effectModules.get('reverb');
    expect(lastModule.outputNode.connectedNodes).toContain(chainA.outputTransitionGain);

    // Chain output connects to busGainA, which connects to busMixer
    const busGainA = (engine as any).busGainA;
    const busMixer = (engine as any).busMixer;
    expect(chainA.outputNode.connectedNodes).toContain(busGainA);
    expect(busGainA.connectedNodes).toContain(busMixer);
  });

  it('supports independent multi-instance effects in the rack chain', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Add a secondary filter instance (filter_2) to Lane A
    engine.addEffectToLane('laneA', 'filter_2');

    const mod1 = (engine as any).getOrCreateEffectModule('filter');
    const mod2 = (engine as any).getOrCreateEffectModule('filter_2');

    expect(mod1).toBeDefined();
    expect(mod2).toBeDefined();
    expect(mod1).not.toBe(mod2);
    expect(mod1.id).toBe('filter');
    expect(mod2.id).toBe('filter_2');

    const laneAOrder = engine.getLaneEffectOrder('laneA');
    expect(laneAOrder).toContain('filter_2');
  });

  it('guarantees strict parameter isolation between BUS A and BUS B effect instances', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Place filter in Lane A and filter_2 in Lane B
    engine.addEffectToLane('laneB', 'filter_2');
    const filter1 = (engine as any).getOrCreateEffectModule('filter');
    const filter2 = (engine as any).getOrCreateEffectModule('filter_2');

    // 1. Initial default state verification
    expect(filter1.getParams().cutoff).toBe(3500);
    expect(filter2.getParams().cutoff).toBe(2400);

    // 2. Adjust filter on BUS A only (e.g. cutoff = 500, resonance = 4.0)
    engine.updateEffects({
      filter: { cutoff: 500, resonance: 4.0 }
    });

    // BUS A filter must be updated; BUS B filter_2 must remain completely unaffected
    expect(filter1.getParams().cutoff).toBe(500);
    expect(filter1.getParams().resonance).toBe(4.0);
    expect(filter2.getParams().cutoff).toBe(2400);
    expect(filter2.getParams().resonance).toBe(1.0);

    // 3. Adjust filter_2 on BUS B only (e.g. cutoff = 9000, bypass = true)
    engine.updateEffects({
      instances: {
        filter_2: { cutoff: 9000, bypass: true }
      }
    });

    // BUS B filter_2 must be updated; BUS A filter must retain its previous independent values
    expect(filter2.getParams().cutoff).toBe(9000);
    expect(filter2.getParams().bypass).toBe(true);
    expect(filter1.getParams().cutoff).toBe(500);
    expect(filter1.getParams().resonance).toBe(4.0);
    expect(filter1.getParams().bypass).toBe(false);

    // 4. Verify getEffectModuleParams maintains isolated state snapshots
    const p1 = engine.getEffectModuleParams('filter');
    const p2 = engine.getEffectModuleParams('filter_2');
    expect(p1.cutoff).toBe(500);
    expect(p2.cutoff).toBe(9000);
    expect(p2.bypass).toBe(true);
  });

  it('guarantees complete parameter isolation across multi-instance delay and preamp gain', async () => {
    const ctx = new MockAudioContext({ sampleRate: 44100 });
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Add delay_2 and gain_2 to Lane B
    engine.addEffectToLane('laneB', 'delay_2');
    engine.addEffectToLane('laneB', 'gain_2');

    const delay1 = (engine as any).getOrCreateEffectModule('delay');
    const delay2 = (engine as any).getOrCreateEffectModule('delay_2');
    const gain1 = (engine as any).getOrCreateEffectModule('gain');
    const gain2 = (engine as any).getOrCreateEffectModule('gain_2');

    // Update BUS A delay
    engine.updateEffects({
      delay: { time: 0.88, feedback: 0.75 }
    });
    expect(delay1.getParams().time).toBe(0.88);
    expect(delay1.getParams().feedback).toBe(0.75);
    expect(delay2.getParams().time).toBe(0.35); // default unaffected

    // Update BUS B delay_2
    engine.updateEffects({
      instances: {
        delay_2: { time: 0.12, feedback: 0.1 }
      }
    });
    expect(delay2.getParams().time).toBe(0.12);
    expect(delay2.getParams().feedback).toBe(0.1);
    expect(delay1.getParams().time).toBe(0.88); // BUS A delay unaffected

    // Bypass BUS A preamp gain
    engine.updateEffects({
      gain: { bypass: true, softClip: false }
    });
    expect(gain1.getParams().bypass).toBe(true);
    expect(gain1.getParams().softClip).toBe(false);
    expect(gain2.getParams().bypass).toBe(false); // BUS B gain unaffected
    expect(gain2.getParams().softClip).toBe(true);
  });
});
