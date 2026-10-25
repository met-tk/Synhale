import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../../../src/audio/engine';
import { GranularChannel } from '../../../src/audio/nodes/GranularChannel';
import { EffectChainManager } from '../../../src/audio/nodes/EffectChainManager';
import { GainModule } from '../../../src/audio/nodes/GainModule';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { playCueSound, stopCueSounds } from '../../../src/audio/cue/breathCuePlayer';
import { sanitizeParameterPatch } from '../../../src/audio/dsp/parameterSafety';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Audit: audio lifecycle and hostile inputs', () => {
  it('can construct and configure the initial graph silently before an explicit resume', async () => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init({ muted: true });
    engine.updateChannelStrip({ oscA: { gain: 0.3 } });
    ctx.advanceTime(1);
    expect(engine.masterCutGain.gain.value).toBe(0);
    await engine.resume();
    ctx.advanceTime(0.004);
    expect(engine.masterCutGain.gain.value).toBeCloseTo(1, 6);
    engine.dispose();
  });

  it('stops all running oscillator sources when the engine is disposed', async () => {
    const ctx = new MockAudioContext();
    const created = vi.spyOn(ctx, 'createOscillator');
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
    const sources = created.mock.results.map(result => result.value).filter(source => source.started);
    expect(sources.length).toBeGreaterThan(3);
    engine.dispose();
    expect(sources.every(source => source.stopped)).toBe(true);
    expect(ctx.state).toBe('closed');
  });

  it.each(['pause', 'dispose'])('does not revive audio after %s while resume is pending', async action => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
    let release!: () => void;
    vi.spyOn(ctx, 'resume').mockReturnValue(new Promise<void>(resolve => { release = resolve; }));
    const resume = engine.resume();
    engine.executeZeroResidueHardCut();
    if (action === 'dispose') engine.dispose();
    release();
    await resume;
    ctx.advanceTime(0.01);
    expect(engine.masterCutGain.gain.value).toBe(0);
    engine.dispose();
  });

  it('continues releasing the graph when an individual module cleanup fails', async () => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
    vi.spyOn(engine.oscA, 'dispose').mockImplementation(() => { throw new Error('node failed'); });
    const releaseDrone = vi.spyOn(engine.drone, 'dispose');
    engine.dispose();
    expect(releaseDrone).toHaveBeenCalledOnce();
    expect(ctx.state).toBe('closed');
  });

  it('keeps granular scheduling stopped across parameter edits until transport resumes', () => {
    vi.useFakeTimers();
    const ctx = new MockAudioContext();
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const created = vi.spyOn(ctx, 'createOscillator');
    granular.setParams({ sampleId: 'celestialWavetable', bypass: false, probability: 1, rate: 20 });
    granular.start();
    granular.purge();
    const stoppedCount = created.mock.calls.length;
    granular.setParams({ bypass: true });
    granular.setParams({ bypass: false });
    ctx.advanceTime(1);
    vi.advanceTimersByTime(500);
    expect(created.mock.calls.length).toBe(stoppedCount);
    granular.restore();
    expect(created.mock.calls.length).toBeGreaterThan(stoppedCount);
    granular.dispose();
  });

  it('clamps granular parameters without mutating the caller or leaking snapshot references', () => {
    const ctx = new MockAudioContext();
    const granular = new GranularChannel(ctx as unknown as BaseAudioContext);
    const patch = Object.freeze({ gain: 20, pan: -9, baseFreq: 99999 });
    granular.setParams(patch);
    expect(granular.getParams()).toMatchObject({ gain: 1, pan: -1, baseFreq: 2000 });
    granular.setParams({ gain: NaN, pan: Infinity });
    expect(granular.getParams()).toMatchObject({ gain: 1, pan: -1 });
    const snapshot = granular.getParams();
    snapshot.grainEnvelope!.attack = 99;
    expect(granular.getParams().grainEnvelope?.attack).not.toBe(99);
    granular.dispose();
  });

  it('deduplicates repeated effect IDs instead of wiring a node to itself', () => {
    const ctx = new MockAudioContext();
    const chain = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    chain.registerEffect(gain);
    chain.reorderEffects(['gain', 'gain', 'gain']);
    expect(chain.getOrder()).toEqual(['gain']);
    expect((gain.outputNode as any).connectedNodes).not.toContain(gain.inputNode);
    chain.dispose();
  });

  it('ignores non-finite values and cyclic patches without recursion failure', () => {
    const patch: Record<string, unknown> = { gain: NaN, good: 0.3 };
    patch.self = patch;
    expect(sanitizeParameterPatch(patch)).toEqual({ good: 0.3, self: {} });
  });

  it('fades active transition cues when transport pauses', () => {
    const ctx = new MockAudioContext();
    const gains = vi.spyOn(ctx, 'createGain');
    playCueSound('singingBowl', 0.3, ctx as unknown as BaseAudioContext);
    const outputs = gains.mock.results.map(result => result.value).filter(gain => gain.connectedNodes.includes(ctx.destination));
    expect(outputs.length).toBeGreaterThan(0);
    ctx.advanceTime(0.05);
    stopCueSounds(ctx as unknown as BaseAudioContext);
    ctx.advanceTime(0.05);
    for (const gain of outputs) expect(gain.gain.value).toBeLessThan(0.000001);
  });
});
