import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { EffectChainManager } from '../../../src/audio/nodes/EffectChainManager';
import { GainModule } from '../../../src/audio/nodes/GainModule';
import { DriveModule } from '../../../src/audio/nodes/DriveModule';
import { MultimodeFilter } from '../../../src/audio/nodes/MultimodeFilter';

describe('EffectChainManager Modular Processing Chain', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('initializes with direct wire bypass and connects to destination', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const dest = ctx.createGain();
    manager.connect(dest as unknown as AudioNode);

    expect(manager.getOrder()).toEqual([]);
    expect(manager.getAllEffects()).toEqual([]);

    manager.dispose();
  });

  it('registers effects and establishes serial chain order', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    const drive = new DriveModule(ctx as unknown as BaseAudioContext);
    const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

    manager.registerEffect(gain);
    manager.registerEffect(drive);
    manager.registerEffect(filter);

    expect(manager.getOrder()).toEqual(['gain', 'drive', 'filter']);
    expect(manager.getEffect('gain')).toBe(gain);
    expect(manager.getEffect('drive')).toBe(drive);
    expect(manager.getEffect('filter')).toBe(filter);

    manager.dispose();
  });

  it('reorders effects dynamically', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    const drive = new DriveModule(ctx as unknown as BaseAudioContext);
    const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

    manager.registerEffect(gain);
    manager.registerEffect(drive);
    manager.registerEffect(filter);

    manager.reorderEffects(['filter', 'gain', 'drive']);
    expect(manager.getOrder()).toEqual(['filter', 'gain', 'drive']);

    // Reorder with omitted element - omitted should be appended at the end
    manager.reorderEffects(['drive']);
    expect(manager.getOrder()).toEqual(['drive', 'filter', 'gain']);

    manager.dispose();
  });

  it('adds and inserts effects at arbitrary index', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    const drive = new DriveModule(ctx as unknown as BaseAudioContext);
    const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

    manager.registerEffect(gain);
    manager.registerEffect(drive);
    expect(manager.getOrder()).toEqual(['gain', 'drive']);

    // Insert filter between gain and drive
    manager.addEffect(filter, 1);
    expect(manager.getOrder()).toEqual(['gain', 'filter', 'drive']);

    manager.dispose();
  });

  it('removes effects and reconnects remaining chain cleanly', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    const drive = new DriveModule(ctx as unknown as BaseAudioContext);
    const filter = new MultimodeFilter(ctx as unknown as BaseAudioContext);

    manager.registerEffect(gain);
    manager.registerEffect(drive);
    manager.registerEffect(filter);

    manager.removeEffect('drive');
    expect(manager.getOrder()).toEqual(['gain', 'filter']);
    expect(manager.getEffect('drive')).toBeDefined(); // still in map but removed from order

    manager.removeEffect('gain');
    expect(manager.getOrder()).toEqual(['filter']);

    manager.removeEffect('filter');
    expect(manager.getOrder()).toEqual([]);

    manager.dispose();
  });

  it('dispatches purge and restore across registered effects', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    manager.registerEffect(gain);

    expect(() => manager.purge()).not.toThrow();
    expect(() => manager.restore()).not.toThrow();

    manager.dispose();
  });

  it('idempotently skips reorder when order is unchanged, preserving continuous throughput', () => {
    const manager = new EffectChainManager(ctx as unknown as BaseAudioContext);
    const gain = new GainModule(ctx as unknown as BaseAudioContext);
    const drive = new DriveModule(ctx as unknown as BaseAudioContext);

    manager.registerEffect(gain);
    manager.registerEffect(drive);

    const initialOrder = manager.getOrder();
    expect(initialOrder).toEqual(['gain', 'drive']);

    // Calling reorderEffects with the exact same order should be a no-op
    manager.reorderEffects(['gain', 'drive']);
    expect(manager.getOrder()).toEqual(['gain', 'drive']);

    manager.dispose();
  });
});
