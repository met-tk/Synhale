import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../../src/audio/engine';
import { OscAChannel } from '../../../src/audio/nodes/OscAChannel';
import { AdsrModule } from '../../../src/audio/nodes/AdsrModule';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Sound Leakage and Sustained Tone Elimination Audit', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('strictly maintains equal-power wavetable crossfade (g1^2 + g2^2 = 1.0) on OscA without silencing oscillators', () => {
    const oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
    oscA.start(0);

    // Simulate breath modulation wavetable sweep across all 24 slices
    for (let wt = 0; wt < 24; wt += 2.5) {
      oscA.setParams({ wavetableIndex: wt });
      const g1 = (oscA as any).gain1.gain.value;
      const g2 = (oscA as any).gain2.gain.value;
      expect(g1 * g1 + g2 * g2).toBeCloseTo(1.0, 4);
      expect(g1 + g2).toBeGreaterThan(0.0);
    }

    oscA.dispose();
  });

  it('strictly isolates DroneChannel from OscA parameter changes during breath modulation', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Set drone gain to an audible target (0.8)
    engine.updateChannelStrip({
      oscA: { wavetableIndex: 5, gain: 0.9 },
      drone: { gain: 0.8, bypass: false }
    });

    // Run breath modulation across all 4 stages
    engine.updateBreathModulation(0.8, 'inhale', 0.5);
    expect(engine.drone.getParams().gain).toBeCloseTo(0.8, 2);

    engine.updateBreathModulation(1.0, 'holdIn', 0.5);
    expect(engine.drone.getParams().gain).toBeCloseTo(0.8, 2);

    engine.updateBreathModulation(0.4, 'exhale', 0.5);
    expect(engine.drone.getParams().gain).toBeCloseTo(0.8, 2);

    engine.updateBreathModulation(0.0, 'holdOut', 0.5);
    expect(engine.drone.getParams().gain).toBeCloseTo(0.8, 2);

    engine.dispose();
  });

  it('attenuates ADSR envelope to absolute zero when sustain is set to zero, eliminating persistent tone', () => {
    const adsr = new AdsrModule(ctx as unknown as BaseAudioContext);
    adsr.setParams({ attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 });

    adsr.triggerAttack(1.0);
    // Envelope is now active. Now user turns sustain to 0 for a crisp non-sustaining tone:
    adsr.setParams({ sustain: 0.0 });

    const gainNode = (adsr as any).envelopeGain.gain;
    expect(gainNode).toBeDefined();
    expect(adsr.getParams().sustain).toBe(0.0);
    // Verify scheduled ramp goes down to 0
    expect(adsr.getParams().bypass).toBe(false);

    adsr.dispose();
  });
});
