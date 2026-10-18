import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GrainEnvelopeScope } from '../../../src/ui/components/deck/GrainEnvelopeScope';
import { ThemeProvider } from '../../../src/ui/theme';

describe('GrainEnvelopeScope Component', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('renders envelope shape selector and dispatches onEnvelopeChange', () => {
    const handleEnvelopeChange = vi.fn();
    const { getByTitle } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.245,
          envelope: { attack: 0.1, hold: 0.45, release: 0.45, shape: 'trapezoid' },
          onEnvelopeChange: handleEnvelopeChange
        })
      )
    );

    const gaussBtn = getByTitle('Envelope Window Shape: gaussian');
    fireEvent.click(gaussBtn);
    expect(handleEnvelopeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: 'gaussian'
      })
    );
  });

  it('renders time readouts and direction switcher buttons', () => {
    const handleDirChange = vi.fn();
    const { getByText, getByTitle } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.5,
          envelope: { attack: 0.1, hold: 0.45, release: 0.45, shape: 'trapezoid' },
          activeGrainsCount: 4.5,
          direction: 'forward',
          onDirectionChange: handleDirChange
        })
      )
    );

    expect(getByText('Grain Env')).toBeDefined();
    expect(getByText(/A:50ms · R:225ms/)).toBeDefined();
    expect(getByText('500ms')).toBeDefined();
    expect(getByText('4.50 grains')).toBeDefined();

    const reverseBtn = getByTitle('Reverse Playback');
    fireEvent.click(reverseBtn);
    expect(handleDirChange).toHaveBeenCalledWith('reverse');
  });

  it('supports interactive duration pointer drag scrubbing', () => {
    const handleDurationChange = vi.fn();
    const { getByRole } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.245,
          onDurationChange: handleDurationChange
        })
      )
    );

    const durationSlider = getByRole('slider', { name: 'Grain Duration' });
    expect(durationSlider).toBeDefined();
    expect(durationSlider.getAttribute('aria-valuenow')).toBe('245');

    // Simulate pointer down
    fireEvent.pointerDown(durationSlider, {
      clientX: 100,
      clientY: 100,
      pointerId: 1
    });

    // Simulate pointer move (dragging right + up to increase duration)
    fireEvent.pointerMove(durationSlider, {
      clientX: 150, // +50px
      clientY: 80,  // -20px (dy = +20)
      pointerId: 1
    });

    expect(handleDurationChange).toHaveBeenCalled();
    const lastCallArg = handleDurationChange.mock.calls[handleDurationChange.mock.calls.length - 1][0];
    expect(lastCallArg).toBeGreaterThan(0.245);

    // Simulate pointer up
    fireEvent.pointerUp(durationSlider, { pointerId: 1 });
  });

  it('supports keyboard navigation and double-click reset on duration slider', () => {
    const handleDurationChange = vi.fn();
    const { getByRole } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.5,
          onDurationChange: handleDurationChange
        })
      )
    );

    const durationSlider = getByRole('slider', { name: 'Grain Duration' });

    // Arrow Right (step +0.05)
    fireEvent.keyDown(durationSlider, { key: 'ArrowRight' });
    expect(handleDurationChange).toHaveBeenCalledWith(0.55);

    // Arrow Left (step -0.05)
    fireEvent.keyDown(durationSlider, { key: 'ArrowLeft' });
    expect(handleDurationChange).toHaveBeenCalledWith(0.45);

    // Double click to reset
    fireEvent.doubleClick(durationSlider);
    expect(handleDurationChange).toHaveBeenCalledWith(0.245);
  });

  it('supports wheel scrolling to adjust duration', () => {
    const handleDurationChange = vi.fn();
    const { getByRole } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.3,
          onDurationChange: handleDurationChange
        })
      )
    );

    const durationSlider = getByRole('slider', { name: 'Grain Duration' });

    // Wheel up (deltaY < 0 -> increases duration)
    fireEvent.wheel(durationSlider, { deltaY: -100 });
    expect(handleDurationChange).toHaveBeenCalledWith(0.32);

    // Wheel down (deltaY > 0 -> decreases duration)
    fireEvent.wheel(durationSlider, { deltaY: 100 });
    expect(handleDurationChange).toHaveBeenCalledWith(0.28);
  });

  it('supports interactive density pointer drag scrubbing, keyboard, wheel, and reset', () => {
    const handleDensityChange = vi.fn();
    const { getByRole } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.245,
          density: 4.0,
          onDensityChange: handleDensityChange
        })
      )
    );

    const densitySlider = getByRole('slider', { name: 'Grain Density' });
    expect(densitySlider).toBeDefined();
    expect(densitySlider.getAttribute('aria-valuenow')).toBe('4');

    // Pointer drag
    fireEvent.pointerDown(densitySlider, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(densitySlider, { clientX: 150, pointerId: 1 }); // +50px -> +5.0
    expect(handleDensityChange).toHaveBeenCalled();
    fireEvent.pointerUp(densitySlider, { pointerId: 1 });

    // Keyboard navigation
    fireEvent.keyDown(densitySlider, { key: 'ArrowRight' });
    expect(handleDensityChange).toHaveBeenCalledWith(5);

    fireEvent.keyDown(densitySlider, { key: 'ArrowLeft' });
    expect(handleDensityChange).toHaveBeenCalledWith(3);

    // Wheel
    fireEvent.wheel(densitySlider, { deltaY: -100 });
    expect(handleDensityChange).toHaveBeenCalledWith(4.5);

    // Double click reset
    fireEvent.doubleClick(densitySlider);
    expect(handleDensityChange).toHaveBeenCalledWith(4.0);
  });

  it('supports dragging the SVG duration end handle to adjust grain duration', () => {
    const handleDurationChange = vi.fn();
    const { getByTitle, container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.3,
          onDurationChange: handleDurationChange
        })
      )
    );

    const durationHandle = getByTitle('Drag horizontally to adjust playback duration (20ms - 10000ms)');
    expect(durationHandle).toBeDefined();

    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeDefined();

    // Simulate pointer down on the handle
    fireEvent.pointerDown(durationHandle, { clientX: 200, clientY: 100, pointerId: 2 });

    // Simulate moving pointer on svg
    fireEvent.pointerMove(svgElement!, { clientX: 250, clientY: 100, pointerId: 2 });
    expect(handleDurationChange).toHaveBeenCalled();
    const latestCall = handleDurationChange.mock.calls[handleDurationChange.mock.calls.length - 1][0];
    expect(latestCall).toBeGreaterThan(0.3);

    fireEvent.pointerUp(svgElement!, { pointerId: 2 });
  });

  it('supports Phase Plant GR / HZ trigger mode toggle and rate slider scrubbing', () => {
    const handleRateChange = vi.fn();
    const handleDensityChange = vi.fn();
    const { getByRole } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.25,
          density: 4.0,
          rate: 16.0,
          onDensityChange: handleDensityChange,
          onRateChange: handleRateChange
        })
      )
    );

    // Initial mode is Grains
    const modeBtn = getByRole('button', { name: 'Trigger Mode: Grains' });
    expect(modeBtn).toBeDefined();
    expect(getByRole('slider', { name: 'Grain Density' })).toBeDefined();

    // Toggle to Rate mode (HZ)
    fireEvent.click(modeBtn);
    const rateSlider = getByRole('slider', { name: 'Grain Rate' });
    expect(rateSlider).toBeDefined();
    expect(rateSlider.getAttribute('aria-valuenow')).toBe('16');

    // Pointer drag on rate
    fireEvent.pointerDown(rateSlider, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(rateSlider, { clientX: 120, pointerId: 1 }); // +20px -> +10Hz
    expect(handleRateChange).toHaveBeenCalled();
    fireEvent.pointerUp(rateSlider, { pointerId: 1 });

    // Keyboard navigation on rate
    fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });
    expect(handleRateChange).toHaveBeenCalledWith(18);

    fireEvent.keyDown(rateSlider, { key: 'ArrowLeft' });
    expect(handleRateChange).toHaveBeenCalledWith(14);

    // Double click reset
    fireEvent.doubleClick(rateSlider);
    expect(handleRateChange).toHaveBeenCalledWith(16);
  });

  it('strictly adheres to zero-emoji and clean industrial UI standards', () => {
    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(GrainEnvelopeScope, {
          duration: 0.245,
          activeGrainsCount: 3.14
        })
      )
    );

    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });
});


