import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { FilterVisualizer } from '../../../src/ui/components/deck/FilterVisualizer';
import type { FilterType } from '../../../src/types/audio';

describe('FilterVisualizer Component', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('renders lowpass filter response curve and cutoff indicator', () => {
    const { container, getByText } = render(
      React.createElement(FilterVisualizer, {
        type: 'lowpass',
        cutoff: 2400,
        resonance: 2.0,
        isDark: true
      })
    );

    // Label and mode tag
    expect(getByText('LP 24dB')).toBeDefined();
    expect(getByText(/2.4k/)).toBeDefined();

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    // Contains area fill and main response curve
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 6 filter modes without error', () => {
    const modes: FilterType[] = ['lowpass', 'bandpass', 'highpass', 'notch', 'peak', 'ladder'];
    modes.forEach(mode => {
      const { container } = render(
        React.createElement(FilterVisualizer, {
          type: mode,
          cutoff: 1000,
          resonance: 1.5,
          isDark: true
        })
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });

  it('displays live modulated frequency badge when modulated', () => {
    const { getByText } = render(
      React.createElement(FilterVisualizer, {
        type: 'ladder',
        cutoff: 800,
        resonance: 4.0,
        liveModCutoff: 3200,
        isDark: true
      })
    );

    expect(getByText('Ladder 24dB')).toBeDefined();
    // Modulated frequency badge
    expect(getByText(/MOD 3.2k/)).toBeDefined();
  });

  it('adapts cleanly to light theme', () => {
    const { container } = render(
      React.createElement(FilterVisualizer, {
        type: 'peak',
        cutoff: 1500,
        resonance: 3.0,
        isDark: false
      })
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('bg-slate-50/90');
  });

  it('strictly satisfies zero-emoji constraint', () => {
    const { container } = render(
      React.createElement(FilterVisualizer, {
        type: 'notch',
        cutoff: 1200,
        resonance: 2.5,
        liveModCutoff: 1800,
        isDark: true
      })
    );
    const textContent = container.textContent || '';
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
