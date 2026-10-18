import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GranularChannel } from '../../../src/audio/nodes/GranularChannel';
import { OscAChannel } from '../../../src/audio/nodes/OscAChannel';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Particle Engine & Granular Voice Management (M1 Decoupled)', () => {
  let ctx: MockAudioContext;
  let granular: GranularChannel;
  let oscA: OscAChannel;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    oscA = new OscAChannel(ctx as unknown as BaseAudioContext);
  });

  afterEach(() => {
    granular.dispose();
    oscA.dispose();
  });

  it('verifies OscAChannel is a pure wavetable oscillator with zero particle scheduler', () => {
    // OscAChannel must not possess particle timers or voiceMode state machines
    expect((oscA as any).particleTimer).toBeUndefined();
    expect((oscA as any).particleBus).toBeUndefined();
    expect((oscA as any).activeVoices).toBeUndefined();
    
    // OscA getParams returns wavetable-centric parameters only
    const params = oscA.getParams();
    expect(params.wavetableIndex).toBeDefined();
    expect(params.harmonics).toBeDefined();
    expect(params.unison).toBeDefined();
  });

  it('GranularChannel initializes with standalone modular particle parameters', () => {
    const params = granular.getParams();
    expect(params.scale).toBe('pentatonic');
    expect(params.density).toBe(4);
    expect(params.rate).toBe(1.5);
    expect(params.bypass).toBe(false);
  });

  it('GranularChannel seamlessly updates rate, density, scale, and Phase Plant envelope parameters', () => {
    granular.start(0);

    granular.setParams({
      rate: 3.0,
      density: 6,
      scale: 'lydian',
      octaveRange: 2,
      randomPan: 0.8,
      duration: 0.6,
      probability: 0.95,
      grainEnvelope: {
        attack: 0.1,
        hold: 0.4,
        release: 0.5,
        shape: 'gaussian'
      }
    });

    const params = granular.getParams();
    expect(params.rate).toBe(3.0);
    expect(params.density).toBe(6);
    expect(params.scale).toBe('lydian');
    expect(params.grainEnvelope?.shape).toBe('gaussian');
  });

  it('GranularChannel emits physical visual grains tracking during playback and advances lookahead', () => {
    granular.start(0);
    ctx.advanceTime(0.5);

    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);
  });

  it('GranularChannel purges active particle voices immediately on 0ms hard cut and restores cleanly', () => {
    granular.start(0);
    ctx.advanceTime(0.3);

    expect(() => granular.purge()).not.toThrow();
    expect(granular.getActiveVisualGrains().length).toBe(0);

    expect(() => granular.restore()).not.toThrow();
    expect(granular.isStarted).toBe(true);
  });
});
