import { describe, it, expect } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';
import { EffectChainManager } from '../../../src/audio/nodes/EffectChainManager';
import { GainModule } from '../../../src/audio/nodes/GainModule';
import { AdsrModule } from '../../../src/audio/nodes/AdsrModule';

describe('Multi-BUS Audio Routing & Effect Chain Isolation', () => {
  describe('EffectChainManager Unregistration & Cross-Lane Isolation', () => {
    it('completely unregisters effect module and disconnects audio nodes', () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const chain = new EffectChainManager(ctx as unknown as AudioContext);
      const mod = new GainModule(ctx as unknown as AudioContext, 'gain_test');

      chain.addEffect(mod);
      expect(chain.hasEffect('gain_test')).toBe(true);
      expect(chain.getOrder()).toContain('gain_test');

      chain.unregisterEffect('gain_test');
      expect(chain.hasEffect('gain_test')).toBe(false);
      expect(chain.getOrder()).not.toContain('gain_test');
    });

    it('prevents module from being retained in effects map after unregistering', () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const chainA = new EffectChainManager(ctx as unknown as AudioContext);
      const chainB = new EffectChainManager(ctx as unknown as AudioContext);
      const mod = new GainModule(ctx as unknown as AudioContext, 'filter_shared');

      chainA.addEffect(mod);
      expect(chainA.hasEffect('filter_shared')).toBe(true);

      // Migrate to chainB: unregister from chainA, register in chainB
      chainA.unregisterEffect('filter_shared');
      chainB.addEffect(mod);

      expect(chainA.hasEffect('filter_shared')).toBe(false);
      expect(chainB.hasEffect('filter_shared')).toBe(true);
      expect(chainA.getOrder()).not.toContain('filter_shared');
      expect(chainB.getOrder()).toContain('filter_shared');
    });
  });

  describe('AudioEngine Sound Source Bus Routing', () => {
    it('accurately routes sound sources to Lane A, Lane B, and Thru', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      const routeGains = (engine as any).sourceRouteGains;
      const oscAGains = routeGains.get('oscA');
      const granularGains = routeGains.get('granular');
      const oscBGains = routeGains.get('oscB');
      const droneGains = routeGains.get('drone');

      expect(oscAGains).toBeDefined();
      expect(granularGains).toBeDefined();
      expect(oscBGains).toBeDefined();
      expect(droneGains).toBeDefined();

      // Route OSC A to Lane A
      engine.setSourceRoute('oscA', 'laneA');
      expect(engine.getSourceRoutes().oscA).toBe('laneA');
      expect((oscAGains.toA.gain as any)._value ?? oscAGains.toA.gain.value).toBe(1.0);
      expect((oscAGains.toB.gain as any)._value ?? oscAGains.toB.gain.value).toBe(0.0);
      expect((oscAGains.toThru.gain as any)._value ?? oscAGains.toThru.gain.value).toBe(0.0);

      // Route Granular to Lane B
      engine.setSourceRoute('granular', 'laneB');
      expect(engine.getSourceRoutes().granular).toBe('laneB');
      expect((granularGains.toA.gain as any)._value ?? granularGains.toA.gain.value).toBe(0.0);
      expect((granularGains.toB.gain as any)._value ?? granularGains.toB.gain.value).toBe(1.0);
      expect((granularGains.toThru.gain as any)._value ?? granularGains.toThru.gain.value).toBe(0.0);

      // Route OSC B to Thru
      engine.setSourceRoute('oscB', 'thru');
      expect(engine.getSourceRoutes().oscB).toBe('thru');
      expect((oscBGains.toA.gain as any)._value ?? oscBGains.toA.gain.value).toBe(0.0);
      expect((oscBGains.toB.gain as any)._value ?? oscBGains.toB.gain.value).toBe(0.0);
      expect((oscBGains.toThru.gain as any)._value ?? oscBGains.toThru.gain.value).toBe(1.0);

      // Sub drone defaults to Lane A
      expect(engine.getSourceRoutes().drone).toBe('laneA');
      expect((droneGains.toA.gain as any)._value ?? droneGains.toA.gain.value).toBe(1.0);
    });

    it('does NOT reset sound source routes when effect knobs are turned without sourceRoutes', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      // User routes Granular to Lane B and Drone to Thru
      engine.setSourceRoute('granular', 'laneB');
      engine.setSourceRoute('drone', 'thru');
      expect(engine.getSourceRoutes().granular).toBe('laneB');
      expect(engine.getSourceRoutes().drone).toBe('thru');

      // User adjusts filter cutoff and drive gain
      engine.updateEffects({
        filter: { cutoff: 1500, resonance: 4.0 },
        drive: { amount: 3.5 }
      });

      // Sound source routes MUST remain intact!
      const routesAfterKnobTurn = engine.getSourceRoutes();
      expect(routesAfterKnobTurn.granular).toBe('laneB');
      expect(routesAfterKnobTurn.drone).toBe('thru');
      expect(routesAfterKnobTurn.oscA).toBe('laneA');
    });

    it('updates source route when explicitly passed in updateEffects', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      engine.updateEffects({
        sourceRoutes: {
          oscA: 'laneB',
          granular: 'laneA',
          oscB: 'thru',
          drone: 'laneB'
        }
      });

      const routes = engine.getSourceRoutes();
      expect(routes.oscA).toBe('laneB');
      expect(routes.granular).toBe('laneA');
      expect(routes.oscB).toBe('thru');
      expect(routes.drone).toBe('laneB');
    });
  });

  describe('AudioEngine Lane Effects Management & Isolation', () => {
    it('strictly isolates effect modules between Lane A and Lane B during moveEffectBetweenLanes', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      const chainA = (engine as any).effectChainA;
      const chainB = (engine as any).effectChainB;

      // Initially 'delay' is in Lane A
      expect(engine.getLaneEffectOrder('laneA')).toContain('delay');
      expect(engine.getLaneEffectOrder('laneB')).not.toContain('delay');
      expect(chainA.hasEffect('delay')).toBe(true);
      expect(chainB.hasEffect('delay')).toBe(false);

      // Move 'delay' to Lane B
      engine.moveEffectBetweenLanes('delay', 'laneB');

      expect(engine.getLaneEffectOrder('laneA')).not.toContain('delay');
      expect(engine.getLaneEffectOrder('laneB')).toContain('delay');
      expect(chainA.hasEffect('delay')).toBe(false);
      expect(chainB.hasEffect('delay')).toBe(true);

      // Move 'delay' back to Lane A
      engine.moveEffectBetweenLanes('delay', 'laneA');

      expect(engine.getLaneEffectOrder('laneA')).toContain('delay');
      expect(engine.getLaneEffectOrder('laneB')).not.toContain('delay');
      expect(chainA.hasEffect('delay')).toBe(true);
      expect(chainB.hasEffect('delay')).toBe(false);
    });

    it('removes effect module from opposite lane when addEffectToLane is invoked', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      const chainA = (engine as any).effectChainA;
      const chainB = (engine as any).effectChainB;

      expect(chainA.hasEffect('reverb')).toBe(true);
      expect(chainB.hasEffect('reverb')).toBe(false);

      // Add 'reverb' to Lane B
      engine.addEffectToLane('laneB', 'reverb');

      expect(engine.getLaneEffectOrder('laneA')).not.toContain('reverb');
      expect(engine.getLaneEffectOrder('laneB')).toContain('reverb');
      expect(chainA.hasEffect('reverb')).toBe(false);
      expect(chainB.hasEffect('reverb')).toBe(true);
    });

    it('completely unregisters and disconnects module when removeEffectFromLane is called', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      const chainA = (engine as any).effectChainA;

      expect(chainA.hasEffect('drive')).toBe(true);
      engine.removeEffectFromLane('laneA', 'drive');

      expect(engine.getLaneEffectOrder('laneA')).not.toContain('drive');
      expect(chainA.hasEffect('drive')).toBe(false);
    });

    it('instantiates independent instances for distinct ADSR module ids', async () => {
      const ctx = new MockAudioContext({ sampleRate: 44100 });
      const engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();

      const primaryAdsr = engine.getOrCreateEffectModule('adsr');
      const secondAdsr = engine.getOrCreateEffectModule('adsr_2');

      expect(primaryAdsr).toBeInstanceOf(AdsrModule);
      expect(secondAdsr).toBeInstanceOf(AdsrModule);
      expect(primaryAdsr).not.toBe(secondAdsr);
      expect(secondAdsr?.id).toBe('adsr_2');
    });
  });
});
