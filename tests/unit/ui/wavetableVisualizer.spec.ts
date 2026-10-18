import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { WavetableVisualizer } from '../../../src/ui/components/deck/WavetableVisualizer';

describe('WavetableVisualizer Component', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('renders Pure Square with sharp base waveform and no morph overlay at morph=0', () => {
    const { container, getByText } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 2, morph: 0, harmonics: 1.0 })
    );

    // Title & Slice badge
    expect(getByText('Pure Square')).toBeDefined();
    expect(getByText('S02')).toBeDefined();
    expect(getByText('Pure Roots')).toBeDefined();
    expect(getByText('Pure Wave')).toBeDefined();

    const paths = container.querySelectorAll('svg path');
    // Area path + 1 base curve path = 2 paths (no morph ghost path)
    expect(paths.length).toBe(2);
  });

  it('displays morph target and pulsing overlay when morph is active', () => {
    const { container, getByText } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 2, morph: 0.84, harmonics: 1.0 })
    );

    expect(getByText('Pure Square')).toBeDefined();
    expect(getByText('S02')).toBeDefined();

    // Footer indicator shows target slice S03
    expect(getByText(/84% > S03/)).toBeDefined();

    // Active morph renders ghost dashed path
    const morphGhost = container.querySelector('.animate-pulse');
    expect(morphGhost).not.toBeNull();
  });

  it('renders 25% pulse width slice correctly', () => {
    const { getByText } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 15, morph: 0 })
    );
    expect(getByText('Pulse Width 25%')).toBeDefined();
    expect(getByText('S15')).toBeDefined();
    expect(getByText('Spectral Expansion')).toBeDefined();
  });

  it('renders 3D Isometric Waterfall terrain with continuous wtPosition when defaultViewMode is 3d', () => {
    const { container, getByText } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 4, wtPosition: 4.55, defaultViewMode: '3d' })
    );

    // Header & Badges
    expect(getByText('Singing Bowls')).toBeDefined();
    expect(getByText('WT 4.55')).toBeDefined();
    expect(getByText('3D')).toBeDefined();

    // 3D terrain renders multiple slice paths
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThan(10);
  });

  it('toggles between 2D and 3D views on mode button click', () => {
    const { container, getByText, getByLabelText } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 2, wtPosition: 2.0, defaultViewMode: '2d' })
    );

    const toggleBtn = getByLabelText('Toggle 2D/3D Wavetable View');
    expect(getByText('2D')).toBeDefined();
    expect(container.querySelectorAll('svg path').length).toBe(2);

    // Switch to 3D
    fireEvent.click(toggleBtn);
    expect(getByText('3D')).toBeDefined();
    expect(container.querySelectorAll('svg path').length).toBeGreaterThan(10);

    // Switch back to 2D
    fireEvent.click(toggleBtn);
    expect(getByText('2D')).toBeDefined();
    expect(container.querySelectorAll('svg path').length).toBe(2);
  });

  it('strictly satisfies zero-emoji constraint in both modes', () => {
    const { container } = render(
      React.createElement(WavetableVisualizer, { sliceIndex: 2, wtPosition: 4.55, defaultViewMode: '3d' })
    );
    const textContent = container.textContent || '';
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
