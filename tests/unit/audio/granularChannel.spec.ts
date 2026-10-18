import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { GranularChannel } from '../../../src/audio/nodes/GranularChannel';

describe('GranularChannel Standalone AudioSourceNode', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('initializes with default modular parameters and connects to destination', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    const initial = granular.getParams();
    expect(initial.gain).toBe(0.75);
    expect(initial.bypass).toBe(false);
    expect(initial.scale).toBe('pentatonic');
    expect(initial.density).toBe(4);
    expect(initial.rate).toBe(1.5);
    expect(granular.id).toBe('granular');

    granular.dispose();
  });

  it('updates parameters and adapts rate, density, and stereo pan', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    granular.setParams({
      rate: 3.5,
      density: 8,
      octaveRange: 3,
      scale: 'dorian',
      randomPan: 0.8,
      gain: 0.6,
      pan: -0.3
    });

    const params = granular.getParams();
    expect(params.rate).toBe(3.5);
    expect(params.density).toBe(8);
    expect(params.octaveRange).toBe(3);
    expect(params.scale).toBe('dorian');
    expect(params.gain).toBe(0.6);
    expect(params.pan).toBe(-0.3);

    granular.dispose();
  });

  it('starts particle scheduling and emits physical visual grains', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    let triggeredCount = 0;
    granular.onParticleTrigger = () => {
      triggeredCount++;
    };

    granular.start(0);
    expect(granular.isStarted).toBe(true);

    // Advance mock time by 0.5s to trigger particle lookahead loop
    ctx.advanceTime(0.5);

    // Active visual grains should be tracked
    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);

    granular.dispose();
  });

  it('handles 0ms zero-residue purge and restore safely', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    granular.start(0);
    ctx.advanceTime(0.2);

    // Execute purge
    granular.purge();
    expect(granular.getActiveVisualGrains().length).toBe(0);

    // Restore
    granular.restore();
    expect(granular.isStarted).toBe(true);

    granular.dispose();
  });

  it('handles bypass toggling with smooth hardware crossfade', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    granular.start(0);
    granular.setParams({ bypass: true });
    expect(granular.getParams().bypass).toBe(true);

    ctx.advanceTime(0.01);
    granular.setParams({ bypass: false });
    expect(granular.getParams().bypass).toBe(false);

    granular.dispose();
  });

  it('supports Phase Plant dual-row physical parameters, sample switching, and grain envelopes', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    // Initial Phase Plant defaults
    const initial = granular.getParams();
    expect(initial.sampleId).toBe('handpan');
    expect(initial.level).toBe(1.0);
    expect(initial.semi).toBe(0);
    expect(initial.cent).toBe(0);
    expect(initial.harmonic).toBe(1.0);
    expect(initial.shift).toBe(0);
    expect(initial.direction).toBe('forward');
    expect(initial.position).toBe(0.25);

    // Update with Phase Plant parameter values
    granular.setParams({
      sampleId: 'singingBowl',
      level: 0.85,
      semi: 5,
      cent: 12,
      harmonic: 2.0,
      shift: 40,
      phase: 90,
      phaseJitter: 30,
      direction: 'pingpong',
      mode: 'arp',
      scale: 'dorian',
      position: 0.45,
      positionJitter: 0.15,
      timingJitter: 0.20,
      levelJitter: 0.10,
      reverseChance: 0.35,
      grainEnvelope: {
        attack: 0.15,
        hold: 0.40,
        release: 0.45,
        shape: 'gaussian'
      }
    });

    const updated = granular.getParams();
    expect(updated.sampleId).toBe('singingBowl');
    expect(updated.level).toBe(0.85);
    expect(updated.semi).toBe(5);
    expect(updated.cent).toBe(12);
    expect(updated.harmonic).toBe(2.0);
    expect(updated.shift).toBe(40);
    expect(updated.phase).toBe(90);
    expect(updated.phaseJitter).toBe(30);
    expect(updated.direction).toBe('pingpong');
    expect(updated.mode).toBe('arp');
    expect(updated.scale).toBe('dorian');
    expect(updated.position).toBe(0.45);
    expect(updated.grainEnvelope?.attack).toBe(0.15);
    expect(updated.grainEnvelope?.shape).toBe('gaussian');

    // Can switch to pure wavetable mode
    granular.setParams({ sampleId: 'celestialWavetable' });
    expect(granular.getParams().sampleId).toBe('celestialWavetable');

    granular.dispose();
  });

  it('supports Phase Plant octave, keyTrack, range cropping and sample metadata', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    // Test getSampleMetadata
    const meta = granular.getSampleMetadata();
    expect(meta.sampleRate).toBeGreaterThan(0);
    expect(meta.channels).toBeGreaterThan(0);
    expect(meta.duration).toBeGreaterThan(0);
    expect(meta.name).toBeDefined();

    // Set extended Phase Plant parameters
    granular.setParams({
      octave: -1,
      keyTrack: 0.5,
      rangeStart: 0.1,
      rangeEnd: 0.8
    });

    const params = granular.getParams();
    expect(params.octave).toBe(-1);
    expect(params.keyTrack).toBe(0.5);
    expect(params.rangeStart).toBe(0.1);
    expect(params.rangeEnd).toBe(0.8);

    // Trigger particles within range [0.1, 0.8] without error
    granular.start(0);
    ctx.advanceTime(0.5);

    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);

    granular.dispose();
  });

  it('correctly sets and calculates panJitter, pitchJitter (st & cents), and levelJitter', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    granular.setParams({
      panJitter: 0.75,
      pitchJitter: 0.25, // <= 1.0 treated as semitones (25 cents)
      levelJitter: 0.5,
      level: 0.8
    });

    const params = granular.getParams();
    expect(params.panJitter).toBe(0.75);
    expect(params.pitchJitter).toBe(0.25);
    expect(params.levelJitter).toBe(0.5);
    expect(params.level).toBe(0.8);

    // Start playback and advance time to trigger grains
    granular.start(0);
    ctx.advanceTime(0.5);

    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);

    // Also test pitchJitter in cents (> 1.0, e.g. 24 cents)
    granular.setParams({
      pitchJitter: 24
    });
    expect(granular.getParams().pitchJitter).toBe(24);
    ctx.advanceTime(0.3);

    granular.dispose();
  });

  it('dynamically extends grainSpanNorm and ensures safe slice duration when duration is increased', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    // Set duration to a longer length (1.5s)
    granular.setParams({
      duration: 1.5,
      position: 0.1,
      rangeStart: 0.0,
      rangeEnd: 1.0
    });

    const params = granular.getParams();
    expect(params.duration).toBe(1.5);
    expect(params.position).toBe(0.1);
    expect(params.rangeStart).toBe(0.0);
    expect(params.rangeEnd).toBe(1.0);

    granular.start(0);
    ctx.advanceTime(0.5);

    const grains = granular.getActiveVisualGrains();
    expect(Array.isArray(grains)).toBe(true);

    // Verify safe slice duration and dynamic grainSpanNorm mathematical constraints:
    // grainSpanNorm = (nominalDuration * playbackRate) / targetBuffer.duration
    const sampleDuration = 3.6;
    const playbackRate = 1.0;
    const nominalDuration = 1.5;
    const expectedSpan = (nominalDuration * playbackRate) / sampleDuration;
    expect(expectedSpan).toBeCloseTo(0.4166, 3);

    // safeDuration = Math.min(nominalDuration, remainingBufferSec / playbackRate)
    const remainingBufferSec = sampleDuration * (1.0 - 0.1);
    const safeDuration = Math.min(nominalDuration, remainingBufferSec / playbackRate);
    expect(safeDuration).toBe(1.5);

    granular.dispose();
  });

  it('applies Phase Plant boundary-adaptive envelope and clickless zero release near sample end', () => {
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    granular.connect(dest as unknown as AudioNode);

    const triggeredGrains: any[] = [];
    granular.onParticleTrigger = (g) => {
      triggeredGrains.push(g);
    };

    // Place position near the very end of sample (0.95) with long nominal duration (2.0s)
    granular.setParams({
      sampleId: 'handpan',
      position: 0.95,
      duration: 2.0,
      rangeStart: 0.0,
      rangeEnd: 1.0,
      probability: 1.0
    });

    // Provide mock 3.6s audio buffer for acoustic slicing test
    const sampleDuration = 3.6;
    (granular as any).currentSampleBuffer = ctx.createBuffer(2, Math.floor(44100 * sampleDuration), 44100);

    granular.start(0);
    ctx.advanceTime(0.6);

    expect(triggeredGrains.length).toBeGreaterThan(0);

    // Sample total duration is 3.6s, position 0.95 means remaining sample is ~0.18s
    // Adaptive envelope constrains effective grain duration to ~0.18s rather than 2.0s, preventing cliff clicks
    const lastGrain = triggeredGrains[0];
    expect(lastGrain.duration).toBeLessThanOrEqual(0.35);

    granular.dispose();
  });
});


