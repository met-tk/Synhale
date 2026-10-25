import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../../src/ui/theme';
import { GrainSourceVisualizer } from '../../../src/ui/components/deck/GrainSourceVisualizer';
import { MockAudioContext } from '../../mocks/webAudioMock';
import * as samples from '../../../src/audio/nodes/GranularSampleLibrary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(onLoaded = vi.fn()) {
  const view = render(<ThemeProvider><GrainSourceVisualizer sampleId="singingBowl" onCustomSampleLoaded={onLoaded} /></ThemeProvider>);
  return { ...view, onLoaded, drop: (file: File) => fireEvent.drop(screen.getByRole('region'), { dataTransfer: { files: [file] } }) };
}

function file() {
  const result = new File(['test'], 'sample.wav', { type: 'audio/wav' });
  Object.defineProperty(result, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(4)) });
  return result;
}

describe('Audio import lifecycle', () => {
  it('rejects oversized files before reading or decoding them', () => {
    const view = mount();
    const input = file();
    Object.defineProperty(input, 'size', { value: samples.MAX_IMPORTED_AUDIO_BYTES + 1 });
    view.drop(input);
    expect(input.arrayBuffer).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('64 MB');
    expect(view.onLoaded).not.toHaveBeenCalled();
  });

  it('serializes drops and does not register a decoded sample after the view unmounts', async () => {
    const ctx = new MockAudioContext();
    let complete!: (buffer: AudioBuffer) => void;
    const decode = vi.spyOn(ctx, 'decodeAudioData').mockReturnValue(new Promise<AudioBuffer>(resolve => { complete = resolve; }) as any);
    const close = vi.spyOn(ctx, 'close');
    const register = vi.spyOn(samples, 'registerCustomAudioSample');
    vi.stubGlobal('AudioContext', vi.fn(function () { return ctx; }));
    const view = mount();
    await act(async () => { view.drop(file()); });
    expect(screen.getByRole('status')).toHaveTextContent('正在加载音频');
    await act(async () => { view.drop(file()); });
    expect(decode).toHaveBeenCalledOnce();
    view.unmount();
    await act(async () => { complete(ctx.createBuffer(1, 128, 44100) as unknown as AudioBuffer); });
    expect(close).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
    expect(view.onLoaded).not.toHaveBeenCalled();
  });
});
