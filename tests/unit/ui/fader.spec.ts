import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BipolarFader, applyMagneticCenterDetent } from '../../../src/ui/components/fader';

describe('Bipolar Fader with Magnetic Center Detent (F22)', () => {
  it('applies magnetic center detent clamping values within +/-0.03 to exact 0.0', () => {
    expect(applyMagneticCenterDetent(0.015)).toBe(0.0);
    expect(applyMagneticCenterDetent(-0.025)).toBe(0.0);
    expect(applyMagneticCenterDetent(0.00)).toBe(0.0);
    expect(applyMagneticCenterDetent(0.029)).toBe(0.0);
    expect(applyMagneticCenterDetent(-0.029)).toBe(0.0);

    // Outside threshold -> retained
    expect(applyMagneticCenterDetent(0.031)).toBe(0.031);
    expect(applyMagneticCenterDetent(-0.031)).toBe(-0.031);
    expect(applyMagneticCenterDetent(0.5)).toBe(0.5);

    // Clamps extreme inputs to [-1.0, 1.0]
    expect(applyMagneticCenterDetent(100.0)).toBe(1.0);
    expect(applyMagneticCenterDetent(-100.0)).toBe(-1.0);
  });

  it('renders bipolar fader with vertical orientation and ARIA attributes', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(BipolarFader, {
        id: 'fader-test',
        label: 'Mod Depth',
        value: 0.5,
        bipolar: true,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Mod Depth' });
    expect(slider).toBeDefined();
    expect(slider.getAttribute('aria-orientation')).toBe('vertical');
    expect(slider.getAttribute('aria-valuenow')).toBe('0.5');
    expect(slider.getAttribute('aria-valuemin')).toBe('-1');
    expect(slider.getAttribute('aria-valuemax')).toBe('1');
    expect(slider.getAttribute('aria-valuetext')).toBe('+0.50');
  });

  it('handles keyboard navigation: ArrowUp/PageUp and ArrowDown/PageDown', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(BipolarFader, {
        id: 'fader-test',
        label: 'Level',
        value: 0.4,
        bipolar: false,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Level' });

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith(0.45);

    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith(0.35);

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith(0.0);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith(1.0);
  });

  it('resets to defaultValue on double click', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(BipolarFader, {
        id: 'fader-test',
        label: 'Master',
        value: 0.7,
        defaultValue: 0.0,
        bipolar: true,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Master' });
    fireEvent.doubleClick(slider);
    expect(handleChange).toHaveBeenCalledWith(0.0);
  });

  it('disables interaction when disabled prop is true', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(BipolarFader, {
        id: 'fader-test',
        label: 'Disabled',
        value: 0.5,
        disabled: true,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Disabled' });
    expect(slider.getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('correctly displays full modulation depth bar when unipolar fader is pushed to 100%', () => {
    const { container } = render(
      React.createElement(BipolarFader, {
        id: 'master-fader',
        label: 'Master',
        value: 1.0,
        bipolar: false,
        min: 0.0,
        max: 1.0,
        onChange: vi.fn(),
        assignedModulation: {
          target: 'master-fader',
          source: 'stageProgress',
          depth: 1.0,
          bipolar: false
        },
        liveModOffset: 0.25
      })
    );

    // Find the modulation range bar (with bg-sky-500/70)
    const rangeBar = container.querySelector('.bg-sky-500\\/70') as HTMLElement;
    expect(rangeBar).toBeDefined();
    // At effectiveValue = 1.0 and depth = 1.0:
    // modBottomPct should be 0%, modTopPct should be 0% (full height 100%)
    expect(rangeBar.style.top).toBe('0%');
    expect(rangeBar.style.bottom).toBe('0%');

    // Find the live tick (with bg-cyan-300)
    const liveTick = container.querySelector('.bg-cyan-300') as HTMLElement;
    expect(liveTick).toBeDefined();
    // At liveModOffset = 0.25, liveVal = 1.0 * (0 + 1.0 * 0.25) = 0.25 -> 25%
    expect(liveTick.style.bottom).toBe('calc(25% - 1.25px)');
  });

  it('keeps live tick visible and accurately positioned at 0% when liveModOffset is 0.0', () => {
    const { container } = render(
      React.createElement(BipolarFader, {
        id: 'master-fader',
        label: 'Master',
        value: 1.0,
        bipolar: false,
        min: 0.0,
        max: 1.0,
        onChange: vi.fn(),
        assignedModulation: {
          target: 'master-fader',
          source: 'stageProgress',
          depth: 1.0,
          bipolar: false
        },
        liveModOffset: 0.0
      })
    );

    const liveTick = container.querySelector('.bg-cyan-300') as HTMLElement;
    expect(liveTick).toBeDefined();
    expect(liveTick.style.bottom).toBe('calc(0% - 1.25px)');
  });
});

