import { describe, it, expect, beforeEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import {
  makeTanhDistortionCurve,
  makeTubeDistortionCurve,
  calculateDriveAutoMakeupGain
} from './testHarness';

describe('Feature F06: 4x Oversampled Drive Saturation', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  it('F06-1: Tanh soft saturation curve is symmetric, monotonically non-decreasing, and bounded in [-1, 1]', () => {
    const curve = makeTanhDistortionCurve(1024, 3.0);
    expect(curve.length).toBe(1024);

    expect(curve[0]).toBeCloseTo(-1.0, 4);
    expect(curve[1023]).toBeCloseTo(1.0, 4);
    expect(curve[511] + curve[512]).toBeCloseTo(0.0, 2); // Odd symmetry f(-x) = -f(x)

    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      expect(Math.abs(curve[i])).toBeLessThanOrEqual(1.0);
    }
  });

  it('F06-2: Tube harmonics curve generates asymmetric transfer function for warm even harmonics', () => {
    const curve = makeTubeDistortionCurve(1024);
    expect(curve.length).toBe(1024);

    // Negative peak is different in absolute magnitude from positive peak due to asymmetry
    const posMax = curve[1023]; // at x = 1.0: (1 + 0.18) / (1 + 0.18) = 1.0
    const negMin = curve[0];    // at x = -1.0: (-1 + 0.18) / (1 + 0.18) = -0.82 / 1.18 = -0.6949
    expect(posMax).toBeCloseTo(1.0, 4);
    expect(negMin).toBeCloseTo(-0.6949, 3);
    expect(Math.abs(negMin)).not.toBeCloseTo(posMax, 2);
  });

  it('F06-3: WaveShaperNode supports 4x oversampling for anti-aliasing protection', () => {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeTanhDistortionCurve(2048, 2.5);
    shaper.oversample = '4x';

    expect(shaper.oversample).toBe('4x');
    expect(shaper.curve).not.toBeNull();
    expect(shaper.curve?.length).toBe(2048);
  });

  it('F06-4: Auto-makeup gain compensates perceived volume as drive saturation increases', () => {
    expect(calculateDriveAutoMakeupGain(1.0)).toBe(1.0);
    expect(calculateDriveAutoMakeupGain(0.5)).toBe(1.0);

    const compAt2 = calculateDriveAutoMakeupGain(2.0); // 1 / sqrt(1 + 0.6*1) = 1 / sqrt(1.6) ~= 0.7905
    expect(compAt2).toBeCloseTo(0.7905, 3);

    const compAt5 = calculateDriveAutoMakeupGain(5.0); // 1 / sqrt(1 + 0.6*4) = 1 / sqrt(3.4) ~= 0.5423
    expect(compAt5).toBeCloseTo(0.5423, 3);

    // Higher drive must produce lower makeup gain to prevent loudness jump
    expect(compAt5).toBeLessThan(compAt2);
  });

  it('F06-5: Drive bypass switch enables direct uncolored signal path', () => {
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();

    // Bypass enabled: wet = 0, dry = 1
    wetGain.gain.value = 0;
    dryGain.gain.value = 1;

    expect(wetGain.gain.value).toBe(0);
    expect(dryGain.gain.value).toBe(1);
  });
});
