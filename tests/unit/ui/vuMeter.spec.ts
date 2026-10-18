import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BipolarVuMeter, computeVuBars, updatePeak } from '../../../src/ui/components/vu';

describe('Center-Zero Bidirectional VU Meter (F22)', () => {
  it('computes bidirectional left and right percentages accurately', () => {
    const atZero = computeVuBars(0.0);
    expect(atZero.leftPct).toBe(0);
    expect(atZero.rightPct).toBe(0);

    const atPos = computeVuBars(0.65);
    expect(atPos.leftPct).toBe(0);
    expect(atPos.rightPct).toBeCloseTo(65.0, 1);

    const atNeg = computeVuBars(-0.45);
    expect(atNeg.leftPct).toBeCloseTo(45.0, 1);
    expect(atNeg.rightPct).toBe(0);

    const clampedPos = computeVuBars(1.2);
    expect(clampedPos.rightPct).toBe(100);

    const clampedNeg = computeVuBars(-1.5);
    expect(clampedNeg.leftPct).toBe(100);
  });

  it('updatePeak retains peak level for 400ms before decay', () => {
    let state = { peak: 0.8, timestamp: 1000 };

    // After 200ms with smaller value, peak stays at 0.8
    state = updatePeak(0.3, 1200, state.peak, state.timestamp);
    expect(state.peak).toBe(0.8);

    // After 450ms (> 400ms), peak decays to new current value
    state = updatePeak(0.4, 1450, state.peak, state.timestamp);
    expect(state.peak).toBe(0.4);

    // Higher value immediately raises peak even before 400ms
    state = updatePeak(0.9, 1500, state.peak, state.timestamp);
    expect(state.peak).toBe(0.9);
  });

  it('renders meter in horizontal orientation with scale and readouts', () => {
    render(
      React.createElement(BipolarVuMeter, {
        value: 0.72,
        label: 'Breath VU',
        showPeakHold: true
      })
    );

    const meter = screen.getByRole('meter', { name: 'Breath VU' });
    expect(meter).toBeDefined();
    expect(meter.getAttribute('aria-valuenow')).toBe('0.72');
    expect(meter.getAttribute('aria-valuemin')).toBe('-1');
    expect(meter.getAttribute('aria-valuemax')).toBe('1');

    expect(screen.getByText('+0.72')).toBeDefined();
    expect(screen.getByText('0.0')).toBeDefined();
    expect(screen.getByText('-1.0')).toBeDefined();
    expect(screen.getByText('+1.0')).toBeDefined();
  });

  it('renders meter in vertical orientation', () => {
    render(
      React.createElement(BipolarVuMeter, {
        value: -0.35,
        label: 'Vert VU',
        orientation: 'vertical'
      })
    );

    const meter = screen.getByRole('meter', { name: 'Vert VU' });
    expect(meter).toBeDefined();
    expect(meter.getAttribute('aria-valuenow')).toBe('-0.35');
    expect(screen.getByText('-0.35')).toBeDefined();
  });
});
