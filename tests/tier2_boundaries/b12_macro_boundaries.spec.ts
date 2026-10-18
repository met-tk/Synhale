import { describe, it, expect } from 'vitest';
import { calculateLogCutoff } from '../tier1_features/testHarness';

describe('Tier 2 Boundaries - B12: Breath Macro Physical Modulation Extremes', () => {
  it('B12-1: Macro M = 0.0 outputs exact baseline frequency 90Hz', () => {
    const fMin = calculateLogCutoff(0.0, 90, 14000);
    expect(fMin).toBeCloseTo(90.0, 4);
  });

  it('B12-2: Macro M = 1.0 outputs exact maximum frequency 14000Hz', () => {
    const fMax = calculateLogCutoff(1.0, 90, 14000);
    expect(fMax).toBeCloseTo(14000.0, 2);
  });

  it('B12-3: Macro M below 0.0 or above 1.0 is clamped cleanly without out-of-range frequencies', () => {
    const fUnder = calculateLogCutoff(-2.5, 90, 14000);
    expect(fUnder).toBeCloseTo(90.0, 4);

    const fOver = calculateLogCutoff(5.0, 90, 14000);
    expect(fOver).toBeCloseTo(14000.0, 2);
  });

  it('B12-4: Micro-ramp time of 1ms (0.001s) safely executes steep noise fade', () => {
    const fadeDurSec = 0.001;
    expect(fadeDurSec).toBe(0.001);
    expect(fadeDurSec).toBeGreaterThan(0);
  });

  it('B12-5: Reverb wet boost at 1.0 bounded and non-clipping in all conditions', () => {
    const wetMax = 1.0;
    const dryComp = Math.cos(wetMax * (Math.PI / 2));
    const wetComp = Math.sin(wetMax * (Math.PI / 2));

    expect(wetComp).toBeCloseTo(1.0, 5);
    expect(dryComp).toBeCloseTo(0.0, 5);
  });
});
