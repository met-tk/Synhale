import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SerumLfoScope } from '../../../src/ui/components/lfo/SerumLfoScope';
import { HardwareDeck } from '../../../src/ui/components/deck/HardwareDeck';
import { ThemeProvider } from '../../../src/ui/theme';

describe('Serum LFO Scope & Master Pan Hardware Integration', () => {
  it('renders SerumLfoScope with SVG waveform path and playhead', () => {
    const onShapeChange = vi.fn();
    const { container } = render(
      React.createElement(SerumLfoScope, {
        id: 'lfo1',
        shape: 'triangle',
        rate: 0.25,
        depth: 0.5,
        isPlaying: true,
        width: 180,
        height: 50,
        onShapeChange
      })
    );

    // Verify rate display
    expect(screen.getByText('0.25Hz')).toBeDefined();

    // Verify waveform buttons (SIN, TRI, SAW, SQR, RND)
    expect(screen.getByRole('button', { name: /lfo1 waveform sine/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lfo1 waveform triangle/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lfo1 waveform sawtooth/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lfo1 waveform square/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lfo1 waveform random/i })).toBeDefined();

    // Click SAW button
    const sawBtn = screen.getByRole('button', { name: /lfo1 waveform sawtooth/i });
    fireEvent.click(sawBtn);
    expect(onShapeChange).toHaveBeenCalledWith('sawtooth');

    // SVG elements present
    const svgPath = container.querySelector('path');
    expect(svgPath).not.toBeNull();
    expect(svgPath?.getAttribute('d')).toContain('M');
  });

  it('renders SerumLfoScope with default height of 75px for expanded vertical grid', () => {
    const { container } = render(
      React.createElement(SerumLfoScope, {
        id: 'lfo1',
        rate: 0.15,
        depth: 0.25
      })
    );

    const screenDiv = container.querySelector('div[style*="height"]');
    expect(screenDiv).not.toBeNull();
    expect((screenDiv as HTMLElement).style.height).toBe('75px');

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 160 75');
  });

  it('renders Master Pan knob and symmetric LFO 2 Depth in HardwareDeck', () => {
    const onEffectsChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          effects: {
            filter: { type: 'lowpass', cutoff: 3500, resonance: 1.5, bypass: false },
            drive: { amount: 0, tone: 0.5, bypass: true },
            delay: { time: 0.32, feedback: 0.4, damping: 4000, mix: 0.25, bypass: false },
            reverb: { decayTime: 3.5, damping: 0.5, mix: 0.35, bypass: false },
            masterGain: 0.8,
            masterPan: 0.0,
            lfo1: { rate: 0.15, depth: 0.25, shape: 'sine', bypass: false },
            lfo2: { rate: 0.08, depth: 0.4, shape: 'sine', bypass: false },
            adsr: { attack: 0.8, decay: 1.5, sustain: 0.75, release: 2.5, bypass: false }
          },
          isPlaying: false,
          onEffectsChange
        })
      )
    );

    // Master Pan knob exists
    const masterPanKnob = screen.getByRole('slider', { name: /Master Pan/i });
    expect(masterPanKnob).toBeDefined();
    expect(masterPanKnob.getAttribute('aria-valuenow')).toBe('0');

    // Rack LFO 2 Depth knob exists in modular rack
    const lfo2DepthKnobs = screen.getAllByRole('slider', { name: /Rack LFO 2 Depth|LFO 2 Depth/i });
    expect(lfo2DepthKnobs.length).toBeGreaterThanOrEqual(1);

    // Top-bar LFO bay is removed
    expect(screen.queryByLabelText('LFO 1 Rate')).toBeNull();
    expect(screen.queryByLabelText('LFO 2 Rate')).toBeNull();
  });
});
