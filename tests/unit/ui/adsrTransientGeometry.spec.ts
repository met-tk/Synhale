import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { AdsrEnvelopeVisualizer } from '../../../src/ui/components/adsr/AdsrEnvelopeVisualizer';

describe('ADSR Visualizer Transient Geometry Precision', () => {
  it('renders nearly vertical transient when Attack is 0.01s without false horizontal width', () => {
    const { container } = render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 0.01,
        decay: 0.8,
        sustain: 0.0,
        release: 0.5,
        isPlaying: false,
      })
    );

    // Look for circle nodes: Start Node (x0) and Peak Node (x1)
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);

    // Start node is at x0 (padLeft = 24)
    const x0 = parseFloat(circles[0].getAttribute('cx') || '0');
    // Peak node is at x1 = x0 + wAttack
    const x1 = parseFloat(circles[2].getAttribute('cx') || '0');

    const attackDistance = Math.abs(x1 - x0);

    // At 0.01s, attack horizontal distance must be strictly <= 3px for instant transient snap
    expect(attackDistance).toBeLessThanOrEqual(3.0);
  });

  it('renders wider attack ramp when Attack is set to long 5.0s', () => {
    const { container } = render(
      React.createElement(AdsrEnvelopeVisualizer, {
        attack: 5.0,
        decay: 0.8,
        sustain: 0.5,
        release: 1.0,
        isPlaying: false,
      })
    );

    const circles = container.querySelectorAll('circle');
    const x0 = parseFloat(circles[0].getAttribute('cx') || '0');
    const x1 = parseFloat(circles[2].getAttribute('cx') || '0');

    const attackDistance = Math.abs(x1 - x0);

    // At 5.0s, attack distance should be significantly wider (>= 30px)
    expect(attackDistance).toBeGreaterThanOrEqual(30.0);
  });
});
