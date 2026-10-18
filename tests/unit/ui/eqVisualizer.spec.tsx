/**
 * Synhale 2 - EqVisualizer Component Unit Tests
 * 
 * Verifies interactive 4-band parametric equalizer UI:
 * - SVG frequency response curve rendering
 * - 4 interactive band control handles (Low, 432Hz Mid-Low, 2160Hz Mid-High, High)
 * - Bypass mode rendering
 * - Double-click resetting to defaults
 * - Pointer interactions and onChange event dispatching
 * - S6 Industrial aesthetic: zero emoji, zero yellow/orange
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EqVisualizer } from '../../../src/ui/components/deck/EqVisualizer';
import { DEFAULT_EQ_PARAMS, EqParams } from '../../../src/types/audio';

describe('EqVisualizer Component Suite', () => {
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const warmColorRegex = /#(?:f59e0b|d97706|b45309|fbbf24|fde047|facc15|eab308|ca8a04|a16207|ea580c|f97316|c2410c|9a3412)/i;

  it('renders SVG frequency curve, grid lines and 4 band handles', () => {
    const { container, getByText } = render(
      React.createElement(EqVisualizer, {
        params: DEFAULT_EQ_PARAMS,
        isDark: true,
        height: 120
      })
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    // Frequency grid labels
    expect(getByText('100')).toBeDefined();
    expect(getByText('1k')).toBeDefined();
    expect(getByText('10k')).toBeDefined();

    // 4 band indicator labels
    expect(getByText('LOW')).toBeDefined();
    expect(getByText('432Hz')).toBeDefined();
    expect(getByText('2.1k')).toBeDefined();
    expect(getByText('HIGH')).toBeDefined();
  });

  it('renders bypass state with flat curve and bypass badge', () => {
    const bypassedParams: EqParams = {
      ...DEFAULT_EQ_PARAMS,
      bypass: true
    };

    const { getByText, queryByText } = render(
      React.createElement(EqVisualizer, {
        params: bypassedParams,
        isDark: true
      })
    );

    expect(getByText('EQ BYPASS')).toBeDefined();
    // In bypass mode, individual interactive handles are hidden
    expect(queryByText('LOW')).toBeNull();
  });

  it('dispatches reset to default upon double click on a band handle', () => {
    const handleChange = vi.fn();
    const customParams: EqParams = {
      ...DEFAULT_EQ_PARAMS,
      midLow: {
        frequency: 600,
        gain: 8.0,
        q: 2.5
      }
    };

    const { getByText } = render(
      React.createElement(EqVisualizer, {
        params: customParams,
        onChange: handleChange
      })
    );

    const midLowLabel = getByText('432Hz');
    const handleGroup = midLowLabel.closest('g');
    expect(handleGroup).toBeDefined();

    fireEvent.doubleClick(handleGroup!);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        midLow: expect.objectContaining({
          frequency: 432,
          gain: 0
        })
      })
    );
  });

  it('shows floating readout pill on handle hover', () => {
    const { getByText, container } = render(
      React.createElement(EqVisualizer, {
        params: DEFAULT_EQ_PARAMS
      })
    );

    const midLowLabel = getByText('432Hz');
    const handleGroup = midLowLabel.closest('g');
    expect(handleGroup).toBeDefined();

    fireEvent.pointerEnter(handleGroup!);

    // Floating pill should display frequency & Q
    expect(container.textContent).toContain('432Hz');
    expect(container.textContent).toContain('Q:1.41');
  });

  it('complies strictly with zero emoji standard', () => {
    const { container } = render(
      React.createElement(EqVisualizer, {
        params: DEFAULT_EQ_PARAMS
      })
    );

    expect(emojiRegex.test(container.innerHTML)).toBe(false);
  });

  it('complies strictly with S6-5 zero yellow/orange color guard', () => {
    const { container } = render(
      React.createElement(EqVisualizer, {
        params: DEFAULT_EQ_PARAMS
      })
    );

    expect(warmColorRegex.test(container.innerHTML)).toBe(false);
  });
});
