import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Knob, isLongPressKnob, ModulationCard } from '../../../src/ui/components/knob';
import type { ModulationRoute } from '../../../src/types';

describe('Rotary Knob & Modulation Card (F23)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders knob with label, value, and accessible slider attributes', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Cutoff',
        value: 1000,
        min: 20,
        max: 20000,
        step: 1,
        unit: ' Hz',
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Cutoff' });
    expect(slider).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('1000');
    expect(slider.getAttribute('aria-valuemin')).toBe('20');
    expect(slider.getAttribute('aria-valuemax')).toBe('20000');
    expect(slider.getAttribute('aria-valuetext')).toBe('1000 Hz');
  });

  it('handles keyboard navigation: ArrowUp/Right increments, ArrowDown/Left decrements', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Resonance',
        value: 2.0,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Resonance' });

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith(2.1);

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(2.1);

    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith(1.9);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(1.9);

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith(0.1);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith(10.0);
  });

  it('resets to defaultValue on double click', () => {
    const handleChange = vi.fn();
    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Detune',
        value: 25,
        min: -50,
        max: 50,
        defaultValue: 0,
        bipolar: true,
        onChange: handleChange
      })
    );

    const slider = screen.getByRole('slider', { name: 'Detune' });
    fireEvent.doubleClick(slider);
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('triggers onLongPress and haptic vibration after exactly 320ms stationary hold', () => {
    const handleLongPress = vi.fn();
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true
    });

    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Filter',
        value: 500,
        min: 20,
        max: 2000,
        onChange: vi.fn(),
        onLongPress: handleLongPress
      })
    );

    const slider = screen.getByRole('slider', { name: 'Filter' });

    fireEvent.pointerDown(slider, { clientX: 100, clientY: 100, pointerId: 1 });

    // After 319ms, not triggered yet
    act(() => {
      vi.advanceTimersByTime(319);
    });
    expect(handleLongPress).not.toHaveBeenCalled();

    // At 320ms, triggered!
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleLongPress).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith(15);
  });

  it('cancels onLongPress if pointer displacement > 5px before 320ms', () => {
    const handleLongPress = vi.fn();
    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Filter',
        value: 500,
        min: 20,
        max: 2000,
        onChange: vi.fn(),
        onLongPress: handleLongPress
      })
    );

    const slider = screen.getByRole('slider', { name: 'Filter' });

    fireEvent.pointerDown(slider, { clientX: 100, clientY: 100, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Move by 6px
    fireEvent.pointerMove(slider, { clientX: 106, clientY: 100, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(handleLongPress).not.toHaveBeenCalled();
  });

  it('cancels onLongPress if released before 320ms', () => {
    const handleLongPress = vi.fn();
    render(
      React.createElement(Knob, {
        id: 'test-knob',
        label: 'Filter',
        value: 500,
        min: 20,
        max: 2000,
        onChange: vi.fn(),
        onLongPress: handleLongPress
      })
    );

    const slider = screen.getByRole('slider', { name: 'Filter' });

    fireEvent.pointerDown(slider, { clientX: 100, clientY: 100, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    fireEvent.pointerUp(slider, { clientX: 100, clientY: 100, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(handleLongPress).not.toHaveBeenCalled();
  });

  it('isLongPressKnob pure function matches boundary specifications', () => {
    expect(isLongPressKnob(0, 0, 320)).toBe(true);
    expect(isLongPressKnob(1, 1, 400)).toBe(true);
    expect(isLongPressKnob(4.99, 0, 350)).toBe(true);
    expect(isLongPressKnob(5.01, 0, 350)).toBe(false);
    expect(isLongPressKnob(6, 0, 350)).toBe(false);
    expect(isLongPressKnob(0, 0, 319)).toBe(false);
  });

  it('ModulationCard configures source, depth, and triggers onAssign / onUnassign', () => {
    const handleAssign = vi.fn();
    const handleUnassign = vi.fn();
    const handleClose = vi.fn();

    const existingRoute: ModulationRoute = {
      source: 'breathMacro',
      target: 'filter-cutoff',
      depth: 0.65,
      bipolar: true
    };

    render(
      React.createElement(ModulationCard, {
        isOpen: true,
        target: 'filter-cutoff',
        targetLabel: 'Filter Cutoff',
        route: existingRoute,
        onAssign: handleAssign,
        onUnassign: handleUnassign,
        onClose: handleClose
      })
    );

    expect(screen.getByText('Filter Cutoff')).toBeDefined();
    expect(screen.getByText('+65%')).toBeDefined();

    // Select LFO 1
    fireEvent.click(screen.getByText('LFO 1'));

    // Click Assign
    fireEvent.click(screen.getByText('分配'));
    expect(handleAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'lfo1',
        target: 'filter-cutoff',
        bipolar: true
      })
    );
  });

  it('ModulationCard provides only dynamic modulation sources without redundant Manual option', () => {
    render(
      React.createElement(ModulationCard, {
        isOpen: true,
        target: 'filter-cutoff',
        targetLabel: 'Filter Cutoff',
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onClose: vi.fn()
      })
    );

    // Verify 4 dynamic sources are present
    expect(screen.getByText('Breath Macro')).toBeDefined();
    expect(screen.getByText('LFO 1')).toBeDefined();
    expect(screen.getByText('LFO 2')).toBeDefined();
    expect(screen.getByText('Stage Env')).toBeDefined();

    // Verify Manual is excluded
    expect(screen.queryByText('Manual')).toBeNull();
    expect(screen.queryByText('手动')).toBeNull();
  });

  it('ModulationCard unassigns active modulation via dedicated Unassign button', () => {
    const handleUnassign = vi.fn();
    const handleClose = vi.fn();
    const existingRoute: ModulationRoute = {
      source: 'breathMacro',
      target: 'filter-cutoff',
      depth: 0.5,
      bipolar: true
    };

    render(
      React.createElement(ModulationCard, {
        isOpen: true,
        target: 'filter-cutoff',
        targetLabel: 'Filter Cutoff',
        route: existingRoute,
        onAssign: vi.fn(),
        onUnassign: handleUnassign,
        onClose: handleClose
      })
    );

    const unassignBtn = screen.getByText('取消分配');
    expect(unassignBtn).toBeDefined();

    fireEvent.click(unassignBtn);
    expect(handleUnassign).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
