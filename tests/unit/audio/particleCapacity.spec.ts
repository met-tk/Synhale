import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GranularChannel } from '../../../src/audio/nodes/GranularChannel';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Particle Engine Capacity and Power Balancing (GranularChannel Owner)', () => {
  let ctx: MockAudioContext;
  let granular: GranularChannel;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    granular = new GranularChannel(ctx as unknown as BaseAudioContext);
  });

  afterEach(async () => {
    granular.dispose();
    await ctx.close();
  });

  it('supports expanded rate up to 50.0 Hz and density up to 32 voices without error', () => {
    granular.setParams({
      rate: 50.0,
      density: 32,
      octaveRange: 4,
      scale: 'dorian',
      randomPan: 0.8,
      duration: 0.1,
      probability: 1.0
    });

    granular.start(0);

    const params = granular.getParams();
    expect(params.rate).toBe(50.0);
    expect(params.density).toBe(32);
    expect(params.duration).toBe(0.1);

    // Verify active visual grains tracking
    ctx.advanceTime(0.1);
    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);

    granular.stop(0);
  });

  it('supports commercial granular parameters (timingJitter, pitchJitter, positionJitter, spray) and fluid voice generation', () => {
    granular.setParams({
      rate: 20.0,
      density: 8,
      octaveRange: 3,
      scale: 'pentatonic',
      randomPan: 0.9,
      duration: 0.2,
      probability: 1.0,
      spray: 3,
      pitchJitter: 25,
      positionJitter: 0.15,
      timingJitter: 0.1
    });

    granular.start(0);

    const params = granular.getParams();
    expect(params.spray).toBe(3);
    expect(params.pitchJitter).toBe(25);
    expect(params.positionJitter).toBe(0.15);

    ctx.advanceTime(0.1);
    expect(granular.getActiveVisualGrains()).toBeDefined();

    granular.stop(0);
  });
});
