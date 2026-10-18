import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdsrEnvelopeVisualizer } from '../../../src/ui/components/adsr/AdsrEnvelopeVisualizer';

describe('AdsrEnvelopeVisualizer Studio Component', () => {
  it('renders region container and accessible label', () => {
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.8,
        decay: 1.5,
        sustain: 0.75,
        release: 2.5,
        isPlaying: false,
        voiceMode: 'drone'
      })
    );

    const container = screen.getByRole('region', { name: 'ADSR Envelope Visualizer' });
    expect(container).toBeDefined();
  });

  it('renders metric badges with correct formatted text', () => {
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.45,
        decay: 1.2,
        sustain: 0.6,
        release: 3.5,
        isPlaying: true,
        voiceMode: 'drone'
      })
    );

    expect(screen.getByText('0.45s')).toBeDefined();
    expect(screen.getByText('1.20s')).toBeDefined();
    expect(screen.getByText('60%')).toBeDefined();
    expect(screen.getByText('3.50s')).toBeDefined();
  });

  it('gracefully disables animations in polyphonic particle mode and shows baseline badge', () => {
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.2,
        decay: 0.5,
        sustain: 0.8,
        release: 1.0,
        isPlaying: true,
        voiceMode: 'particles'
      })
    );

    // Shows polyphonic indication and explicit notice that animation is disabled
    expect(screen.getByText(/POLYPHONIC/i)).toBeDefined();
    expect(screen.getByText(/动效已停用/i)).toBeDefined();
  });

  it('indicates monophonic sustain in drone mode', () => {
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.5,
        decay: 1.0,
        sustain: 0.7,
        release: 2.0,
        isPlaying: true,
        voiceMode: 'drone'
      })
    );

    expect(screen.getByText(/MONO DRONE/i)).toBeDefined();
    expect(screen.getByText(/单音发声维持包络/i)).toBeDefined();
  });

  it('renders interactive node sliders with correct aria properties when onChange is provided', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.8,
        decay: 1.5,
        sustain: 0.75,
        release: 2.5,
        onChange: handleChange
      })
    );

    const attackNode = screen.getByRole('slider', { name: 'ADSR Attack Node' });
    const decayNode = screen.getByRole('slider', { name: 'ADSR Decay and Sustain Node' });
    const sustainNode = screen.getByRole('slider', { name: 'ADSR Sustain Level Node' });
    const releaseNode = screen.getByRole('slider', { name: 'ADSR Release Node' });

    expect(attackNode).toBeDefined();
    expect(decayNode).toBeDefined();
    expect(sustainNode).toBeDefined();
    expect(releaseNode).toBeDefined();

    expect(attackNode.getAttribute('aria-valuenow')).toBe('0.8');
    expect(sustainNode.getAttribute('aria-valuenow')).toBe('0.75');
  });

  it('supports keyboard adjustment of Attack, Decay, Sustain, and Release nodes', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 1.0,
        decay: 1.5,
        sustain: 0.7,
        release: 2.0,
        onChange: handleChange
      })
    );

    const attackNode = screen.getByRole('slider', { name: 'ADSR Attack Node' });
    fireEvent.keyDown(attackNode, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith({ attack: 1.05 });

    fireEvent.keyDown(attackNode, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith({ attack: 0.95 });

    const sustainNode = screen.getByRole('slider', { name: 'ADSR Sustain Level Node' });
    fireEvent.keyDown(sustainNode, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith({ sustain: 0.72 });

    const releaseNode = screen.getByRole('slider', { name: 'ADSR Release Node' });
    fireEvent.keyDown(releaseNode, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith({ release: 2.05 });
  });

  it('dispatches onChange when dragging attack node via pointer events', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 1.0,
        decay: 1.5,
        sustain: 0.7,
        release: 2.0,
        onChange: handleChange
      })
    );

    const attackHandle = screen.getByTestId('adsr-handle-attack');
    fireEvent.pointerDown(attackHandle, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(attackHandle, { clientX: 140, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(attackHandle, { clientX: 140, clientY: 50, pointerId: 1 });

    expect(handleChange).toHaveBeenCalled();
    const calls = handleChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0].attack).toBeDefined();
  });
});

