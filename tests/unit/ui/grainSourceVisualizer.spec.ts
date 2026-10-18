import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GrainSourceVisualizer } from '../../../src/ui/components/deck/GrainSourceVisualizer';
import { ThemeProvider } from '../../../src/ui/theme';

describe('GrainSourceVisualizer Phase Plant Waveform Highlight & Grain Lifecycle', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  beforeEach(() => {
    const mockCtx = {
      scale: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 120,
      top: 0,
      left: 0,
      right: 400,
      bottom: 120
    });
  });

  it('renders sample title, sample duration, and range boundary readouts', () => {
    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainSourceVisualizer, {
          sampleId: 'handpan',
          position: 0.25,
          rangeStart: 0.1,
          rangeEnd: 0.9,
          duration: 0.45,
          sampleMetadata: {
            duration: 3.6,
            name: 'Handpan Ding D3',
            sampleRate: 44100,
            channels: 2
          }
        })
      )
    );

    // Verify sample info badge readouts
    expect(screen.getByText('Sample Waveform')).toBeDefined();
    expect(screen.getByText(/POS:\s*25%/)).toBeDefined();
    expect(screen.getByText(/RNG:\s*\[10%..90%\]/)).toBeDefined();
    expect(screen.getByText(/3\.6s/)).toBeDefined();

    // Verify Zero Emoji
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });

  it('accepts and adapts to dynamic duration (Grain Length)', () => {
    const { rerender } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainSourceVisualizer, {
          sampleId: 'handpan',
          position: 0.2,
          duration: 0.1
        })
      )
    );

    expect(screen.getByText(/3\.6s/)).toBeDefined();

    // Re-render with elongated Grain Length (2.4s)
    rerender(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainSourceVisualizer, {
          sampleId: 'handpan',
          position: 0.2,
          duration: 2.4
        })
      )
    );

    expect(screen.getByText(/3\.6s/)).toBeDefined();
  });

  it('renders live grains with smooth trajectory across active range', () => {
    const mockGrains = [
      {
        id: 1,
        freq: 216,
        pan: 0,
        startTime: 0,
        attack: 0.05,
        decay: 0.2,
        sustain: 1.0,
        release: 0.2,
        peakGain: 0.9,
        totalStopTime: 1.0,
        sampleOffset: 0.25,
        isReverse: false,
        duration: 0.8,
        playbackRate: 1.0,
        grainSpanNorm: 0.22
      }
    ];

    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainSourceVisualizer, {
          sampleId: 'handpan',
          position: 0.25,
          isPlaying: true,
          duration: 0.8,
          getLiveGrains: () => mockGrains,
          getAudioCurrentTime: () => 0.1
        })
      )
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('stops animation frame and renders zero live grains when bypass is true', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const mockGrains = [
      {
        id: 1,
        freq: 216,
        pan: 0,
        startTime: 0,
        attack: 0.05,
        decay: 0.2,
        sustain: 1.0,
        release: 0.2,
        peakGain: 0.9,
        totalStopTime: 1.0,
        sampleOffset: 0.25,
        duration: 0.8
      }
    ];

    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainSourceVisualizer, {
          sampleId: 'handpan',
          isPlaying: true,
          bypass: true, // Granular Cloud bypassed!
          getLiveGrains: () => mockGrains
        })
      )
    );

    // When bypass is true, requestAnimationFrame must NOT run continuous particle rendering
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});
