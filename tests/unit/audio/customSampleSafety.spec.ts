import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { getSampleDuration, loadGranularSampleBuffer, registerCustomAudioSample } from '../../../src/audio/nodes/GranularSampleLibrary';

afterEach(() => vi.restoreAllMocks());

describe('Custom audio sample integrity', () => {
  it('assigns distinct IDs to same-millisecond imports and retains the exact buffer across sample rates', async () => {
    const ctx = new MockAudioContext();
    const audio = ctx.createBuffer(1, 1024, 44100) as unknown as AudioBuffer;
    vi.spyOn(Date, 'now').mockReturnValue(100);
    const first = registerCustomAudioSample(ctx as unknown as BaseAudioContext, 'first.wav', audio);
    const second = registerCustomAudioSample(ctx as unknown as BaseAudioContext, 'second.wav', audio);
    expect(first.id).not.toBe(second.id);
    const differentRateContext = { sampleRate: 96000 } as BaseAudioContext;
    expect(await loadGranularSampleBuffer(differentRateContext, first.id)).toBe(audio);
    expect(getSampleDuration(first.id)).toBe(audio.duration);
  });

  it('rejects a decoded sample beyond the session budget before copying or registering it', () => {
    const ctx = new MockAudioContext();
    const getChannelData = vi.fn();
    const oversized = { length: 128 * 1024 * 1024, numberOfChannels: 2, duration: 100,
      getChannelData } as unknown as AudioBuffer;
    expect(() => registerCustomAudioSample(ctx as unknown as BaseAudioContext, 'huge.wav', oversized)).toThrow('空间已满');
    expect(getChannelData).not.toHaveBeenCalled();
  });
});
