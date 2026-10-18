import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalFlowGraph } from '../../../src/ui/components/deck/SignalFlowGraph';
import { DEFAULT_CHANNEL_STRIP, DEFAULT_EFFECTS_CHAIN } from '../../../src/audio/engine';

describe('SignalFlowGraph Semi-Modular Topology View', () => {
  it('renders all 4 sound sources (OSC A, GRAIN CLOUD, OSC B, SUB 432Hz)', () => {
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={false}
        isDark={true}
      />
    );

    expect(screen.getByText('OSC A')).toBeDefined();
    expect(screen.getByText('WAVETABLE')).toBeDefined();
    expect(screen.getByText('GRAIN')).toBeDefined();
    expect(screen.getByText('CLOUD')).toBeDefined();
    expect(screen.getByText('OSC B')).toBeDefined();
    expect(screen.getByText('NOISE')).toBeDefined();
    expect(screen.getByText('SUB')).toBeDefined();
    expect(screen.getByText('432Hz')).toBeDefined();
  });

  it('renders default effect chain order (PREAMP, DRIVE, FILTER, ADSR, DELAY, REVERB, OUT)', () => {
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
      />
    );

    expect(screen.getByText('PREAMP')).toBeDefined();
    expect(screen.getByText('DRIVE')).toBeDefined();
    expect(screen.getByText('FILTER')).toBeDefined();
    expect(screen.getByText('ADSR')).toBeDefined();
    expect(screen.getByText('DELAY')).toBeDefined();
    expect(screen.getByText('REVERB')).toBeDefined();
    expect(screen.getByText('OUT')).toBeDefined();
    expect(screen.getByText('LIMITER ON')).toBeDefined();
  });

  it('renders reordered effects based on custom effectOrder prop', () => {
    const customOrder = ['filter', 'drive', 'gain', 'delay', 'reverb', 'adsr'];
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={false}
        effectOrder={customOrder}
      />
    );

    expect(screen.getByText('FILTER')).toBeDefined();
    expect(screen.getByText('DRIVE')).toBeDefined();
    expect(screen.getByText('PREAMP')).toBeDefined();
  });

  it('calls onReorderEffects when move buttons are clicked', () => {
    const onReorder = vi.fn();
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
        effectOrder={['gain', 'drive', 'filter', 'adsr', 'delay', 'reverb']}
        onReorderEffects={onReorder}
      />
    );

    // Click Move Drive Left -> should swap gain and drive
    const moveDriveLeft = screen.getByLabelText('Move Drive Left');
    fireEvent.click(moveDriveLeft);

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(['drive', 'gain', 'filter', 'adsr', 'delay', 'reverb']);
  });

  it('complies strictly with zero emoji standard', () => {
    const { container } = render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
      />
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });
});
