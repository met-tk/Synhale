import { describe, it, expect } from 'vitest';
import {
  evaluateTensionCurve,
  evaluateStageCurve,
  evaluateParameterAutomation,
  evaluateAutomationMap,
  snapContinuousBoundary,
  calculateTimelineStageWidths,
  mapNormalizedToPhysical
} from '../../../src/breath/timeline';
import type { ParameterAutomationConfig } from '../../../src/types';

describe('Timeline & Tension Curves Unit Tests', () => {
  it('interpolates linearly when Tension T = 0', () => {
    expect(evaluateTensionCurve(0.0, 0, 100, 0.0)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(0.25, 0, 100, 0.0)).toBeCloseTo(25.0, 4);
    expect(evaluateTensionCurve(0.5, 0, 100, 0.0)).toBeCloseTo(50.0, 4);
    expect(evaluateTensionCurve(0.75, 0, 100, 0.0)).toBeCloseTo(75.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, 0.0)).toBeCloseTo(100.0, 4);
  });

  it('produces concave ease-in curve when Tension T > 0 (slower initial growth)', () => {
    const linearQuarter = evaluateTensionCurve(0.25, 0, 100, 0.0);
    const easeInQuarter = evaluateTensionCurve(0.25, 0, 100, 0.6);

    expect(easeInQuarter).toBeLessThan(linearQuarter);
    expect(evaluateTensionCurve(0.0, 0, 100, 0.6)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, 0.6)).toBeCloseTo(100.0, 4);
  });

  it('produces convex ease-out curve when Tension T < 0 (faster initial growth)', () => {
    const linearQuarter = evaluateTensionCurve(0.25, 0, 100, 0.0);
    const easeOutQuarter = evaluateTensionCurve(0.25, 0, 100, -0.6);

    expect(easeOutQuarter).toBeGreaterThan(linearQuarter);
    expect(evaluateTensionCurve(0.0, 0, 100, -0.6)).toBeCloseTo(0.0, 4);
    expect(evaluateTensionCurve(1.0, 0, 100, -0.6)).toBeCloseTo(100.0, 4);
  });

  it('strictly preserves bounds [0, 1] under extreme tension T = -1.0 and T = +1.0', () => {
    for (let p = 0; p <= 1.0; p += 0.05) {
      const vNeg = evaluateTensionCurve(p, 0, 1, -1.0);
      expect(vNeg).toBeGreaterThanOrEqual(0.0);
      expect(vNeg).toBeLessThanOrEqual(1.0);

      const vPos = evaluateTensionCurve(p, 0, 1, 1.0);
      expect(vPos).toBeGreaterThanOrEqual(0.0);
      expect(vPos).toBeLessThanOrEqual(1.0);
    }
  });

  it('calculates strictly monotonic descent for inverted curves (startVal = 100, endVal = 0)', () => {
    let prev = 100;
    for (let p = 0.1; p <= 1.0; p += 0.1) {
      const current = evaluateTensionCurve(p, 100, 0, 0.4);
      expect(current).toBeLessThanOrEqual(prev);
      prev = current;
    }
    expect(evaluateTensionCurve(1.0, 100, 0, 0.4)).toBeCloseTo(0.0, 4);
  });

  it('returns constant value when startVal === endVal for any tension', () => {
    for (const t of [-1.0, -0.5, 0.0, 0.5, 1.0]) {
      const val = evaluateTensionCurve(0.42, 0.5, 0.5, t);
      expect(val).toBeCloseTo(0.5, 5);
    }
  });

  it('safely clamps out-of-bounds phi and tension', () => {
    const under = evaluateTensionCurve(-0.5, 0, 100, 0.2);
    expect(under).toBeCloseTo(0.0, 4);

    const over = evaluateTensionCurve(1.5, 0, 100, 0.2);
    expect(over).toBeCloseTo(100.0, 4);

    const extremeTension = evaluateTensionCurve(0.5, 0, 100, 99.0);
    expect(extremeTension).toBeGreaterThanOrEqual(0);
    expect(extremeTension).toBeLessThanOrEqual(100);
  });

  it('evaluates stage curve and parameter automation configs accurately', () => {
    const config: ParameterAutomationConfig = {
      targetParam: 'filterCutoff',
      inhale: { startVal: 0.1, endVal: 0.9, tension: 0.5 },
      holdIn: { startVal: 0.9, endVal: 0.9, tension: 0.0 },
      exhale: { startVal: 0.9, endVal: 0.1, tension: -0.3 },
      holdOut: { startVal: 0.1, endVal: 0.1, tension: 0.0 }
    };

    expect(evaluateStageCurve(config.inhale, 0.0)).toBeCloseTo(0.1, 4);
    expect(evaluateStageCurve(config.inhale, 1.0)).toBeCloseTo(0.9, 4);
    expect(evaluateParameterAutomation(config, 'inhale', 0.0)).toBeCloseTo(0.1, 4);
    expect(evaluateParameterAutomation(config, 'inhale', 1.0)).toBeCloseTo(0.9, 4);
    expect(evaluateParameterAutomation(config, 'holdIn', 0.5)).toBeCloseTo(0.9, 4);
    expect(evaluateParameterAutomation(config, 'exhale', 1.0)).toBeCloseTo(0.1, 4);
    expect(evaluateParameterAutomation(config, 'holdOut', 0.8)).toBeCloseTo(0.1, 4);
  });

  it('evaluates multiple automation configs to a key-value record', () => {
    const configs: ParameterAutomationConfig[] = [
      {
        targetParam: 'filterCutoff',
        inhale: { startVal: 0.2, endVal: 0.8, tension: 0.0 },
        holdIn: { startVal: 0.8, endVal: 0.8, tension: 0.0 },
        exhale: { startVal: 0.8, endVal: 0.2, tension: 0.0 },
        holdOut: { startVal: 0.2, endVal: 0.2, tension: 0.0 }
      },
      {
        targetParam: 'reverbWet',
        inhale: { startVal: 0.1, endVal: 0.5, tension: 0.0 },
        holdIn: { startVal: 0.5, endVal: 0.7, tension: 0.0 },
        exhale: { startVal: 0.7, endVal: 0.1, tension: 0.0 },
        holdOut: { startVal: 0.1, endVal: 0.1, tension: 0.0 }
      }
    ];

    const map = evaluateAutomationMap(configs, 'inhale', 0.5);
    expect(map.filterCutoff).toBeCloseTo(0.5, 4);
    expect(map.reverbWet).toBeCloseTo(0.3, 4);
  });

  it('snaps continuous boundaries when enabled and preserves decoupled values when disabled', () => {
    const prevEnd = 0.85;
    const nextStart = 0.40;

    expect(snapContinuousBoundary(prevEnd, nextStart, true)).toBe(0.85);
    expect(snapContinuousBoundary(prevEnd, nextStart, false)).toBe(0.40);
  });

  it('calculates proportional timeline widths for rhythms like 4-7-8', () => {
    const rhythm = { inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 };
    const widths = calculateTimelineStageWidths(rhythm, 1000);

    expect(widths.inhale + widths.holdIn + widths.exhale + widths.holdOut).toBeCloseTo(1000, 2);
    expect(widths.holdOut).toBe(0);
    expect(widths.exhale).toBeGreaterThan(widths.holdIn);
    expect(widths.holdIn).toBeGreaterThan(widths.inhale);
  });

  it('maps normalized values to physical acoustic units (linear, logarithmic, exponential)', () => {
    // Linear
    expect(mapNormalizedToPhysical(0.5, 0, 100, 'linear')).toBeCloseTo(50, 4);

    // Logarithmic (geometric midpoint of 100 and 10000 is 1000)
    expect(mapNormalizedToPhysical(0.5, 100, 10000, 'logarithmic')).toBeCloseTo(1000, 1);
    expect(mapNormalizedToPhysical(0.0, 100, 10000, 'logarithmic')).toBeCloseTo(100, 1);
    expect(mapNormalizedToPhysical(1.0, 100, 10000, 'logarithmic')).toBeCloseTo(10000, 1);

    // Exponential (v^2 mapping: 0.5^2 = 0.25 -> 0.25 of range)
    expect(mapNormalizedToPhysical(0.5, 0, 100, 'exponential')).toBeCloseTo(25, 4);
  });
});
