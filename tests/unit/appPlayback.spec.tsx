import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { AudioEngine } from '../../src/audio/engine';
import { getAllFactoryPresets } from '../../src/audio/presets/soundPresets';
import { MockAudioContext } from '../mocks/webAudioMock';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('First playback and transport failures', () => {
  it('loads the sound selected before initialization into the actual engine', async () => {
    const load = vi.spyOn(AudioEngine.prototype, 'loadSoundPreset');
    const preset = getAllFactoryPresets()[1];
    render(<App />);
    fireEvent.click(screen.getByTitle('切换音色'));
    fireEvent.click(screen.getByText(preset.name));
    fireEvent.click(screen.getByTitle('轻触开始呼吸'));
    await waitFor(() => expect(screen.getByTitle('轻触暂停呼吸')).toBeInTheDocument());
    expect(load).toHaveBeenCalledWith(expect.objectContaining({ channelStrip: expect.objectContaining(preset.channelStrip) }));
    fireEvent.click(screen.getByTitle('轻触暂停呼吸'));
    expect(screen.getByTitle('轻触开始呼吸')).toBeInTheDocument();
  });

  it('serializes pending starts and allows retry after the audio device rejects resume', async () => {
    let reject!: (reason: Error) => void;
    const resume = vi.spyOn(AudioEngine.prototype, 'resume').mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; }));
    render(<App />);
    fireEvent.click(screen.getByTitle('轻触开始呼吸'));
    await waitFor(() => expect(resume).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: /呼吸倒计时/ }));
    expect(resume).toHaveBeenCalledOnce();
    await act(async () => { reject(new Error('Device lost')); });
    expect(screen.getByRole('alert')).toHaveTextContent('音频启动失败');
    fireEvent.click(screen.getByTitle('轻触开始呼吸'));
    await waitFor(() => expect(screen.getByTitle('轻触暂停呼吸')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
