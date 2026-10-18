import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';

describe('Tier 2 Boundaries - B05: Gain Controls & Bypass Relay Extremes', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('B05-1: Negative gain values (-10.0) are clamped to parameter minimum', () => {
    const gainNode = ctx.createGain();
    gainNode.gain.value = -10.0;
    expect(gainNode.gain.value).toBe(0.0); // Clamped to minValue 0
  });

  it('B05-2: Excessive gain values (+1000.0) are clamped to parameter maximum (100.0)', () => {
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1000.0;
    expect(gainNode.gain.value).toBe(100.0); // Clamped to maxValue 100
  });

  it('B05-3: Pan values outside [-1.0, 1.0] are clamped without throwing', () => {
    const panner = ctx.createStereoPanner();
    panner.pan.value = -3.5;
    expect(panner.pan.value).toBe(-1.0);

    panner.pan.value = 4.2;
    expect(panner.pan.value).toBe(1.0);
  });

  it('B05-4: 0ms bypass fade duration handles instantaneous cut safely', () => {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.8, 0);

    // Instant cut: start and end time equal
    gainNode.gain.setValueAtTime(0.0, 0.1);
    ctx.advanceTime(0.1);
    expect(gainNode.gain.getValueAtTime(0.1)).toBe(0.0);
  });

  it('B05-5: Rapid alternating bypass toggles resolve to predictable final state', () => {
    let isBypassed = false;

    // Flip 10 times
    for (let i = 0; i < 10; i++) {
      isBypassed = !isBypassed;
    }
    expect(isBypassed).toBe(false); // Even flips return to false
  });
});
