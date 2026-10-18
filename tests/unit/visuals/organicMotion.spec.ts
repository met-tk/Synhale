import { describe, it, expect } from 'vitest';
import {
  smootherstep,
  passiveRecoil,
  buoyancyWave,
  voidResonance,
  calculateOrganicMacro,
  calculateOrganicLuminance,
  calculateOrganicBloom,
  calculateLayerMacro,
  calculateAudioTremor,
  calculateKineticVelocity,
  calculateKineticTension,
  calculateViscousDamping,
  calculateMechanicalAperture,
  calculateWaveDrift,
  evaluateOrganicBreathMotion
} from '../../../src/visuals/organicMotion';

describe('Organic Breath Motion Unit Tests', () => {
  describe('Mathematical Curves & Physiological Easing', () => {
    it('smootherstep produces C2-continuous S-curve with zero jerk at endpoints and symmetric midpoint', () => {
      expect(smootherstep(0.0)).toBe(0.0);
      expect(smootherstep(0.5)).toBeCloseTo(0.5, 6);
      expect(smootherstep(1.0)).toBe(1.0);

      // Clamps outside [0, 1]
      expect(smootherstep(-0.5)).toBe(0.0);
      expect(smootherstep(1.5)).toBe(1.0);
      expect(smootherstep(NaN)).toBe(0.0);

      // Strictly monotonic inside [0, 1]
      let prev = -1;
      for (let i = 0; i <= 20; i++) {
        const p = i / 20;
        const val = smootherstep(p);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }

      // Acceleration: slow start, rapid middle, blooming decelerating cushion
      const deltaStart = smootherstep(0.1) - smootherstep(0.0); // slow start
      const deltaMid = smootherstep(0.55) - smootherstep(0.45);  // fast middle
      const deltaEnd = smootherstep(1.0) - smootherstep(0.9);   // cushion deceleration
      expect(deltaMid).toBeGreaterThan(deltaStart);
      expect(deltaMid).toBeGreaterThan(deltaEnd);
    });

    it('passiveRecoil replicates chest cavity biological elastic release', () => {
      expect(passiveRecoil(0.0)).toBe(1.0);
      expect(passiveRecoil(1.0)).toBe(0.0);

      // Initial release is faster due to higher pressure: at p=0.5 value is well below 0.5
      const midVal = passiveRecoil(0.5);
      expect(midVal).toBeCloseTo(Math.pow(0.5, 1.8), 4);
      expect(midVal).toBeLessThan(0.35);

      // Strictly monotonically decreasing
      let prev = 2;
      for (let i = 0; i <= 20; i++) {
        const p = i / 20;
        const val = passiveRecoil(p);
        expect(val).toBeLessThanOrEqual(prev);
        prev = val;
      }

      // Safe boundaries
      expect(passiveRecoil(-0.2)).toBe(1.0);
      expect(passiveRecoil(1.5)).toBe(0.0);
      expect(passiveRecoil(NaN)).toBe(1.0);
    });

    it('buoyancyWave provides subtle living resonance for Hold In without motion sickness', () => {
      expect(buoyancyWave(0.0)).toBe(0.0);

      // Bounded strictly within +/- 0.015 (1.5%)
      for (let t = 0; t <= 10; t += 0.25) {
        const wave = buoyancyWave(t);
        expect(Math.abs(wave)).toBeLessThanOrEqual(0.015001);
        expect(Number.isFinite(wave)).toBe(true);
      }
    });

    it('voidResonance provides tranquil minimal anchor pulse for Hold Out', () => {
      for (let t = 0; t <= 10; t += 0.5) {
        const res = voidResonance(t);
        expect(res).toBeGreaterThanOrEqual(0.0);
        expect(res).toBeLessThanOrEqual(0.003001);
        expect(Number.isFinite(res)).toBe(true);
      }
    });
  });

  describe('calculateOrganicMacro Stage Synthesis', () => {
    it('evaluates stage-specific biological macro factor', () => {
      // Inhale
      expect(calculateOrganicMacro('inhale', 0.0, 0.0, 1.0)).toBe(0.0);
      expect(calculateOrganicMacro('inhale', 0.5, 0.5, 1.0)).toBe(0.5);
      expect(calculateOrganicMacro('inhale', 1.0, 1.0, 1.0)).toBe(1.0);

      // Hold In
      expect(calculateOrganicMacro('holdIn', 0.0, 1.0, 0.0)).toBe(1.0);
      const holdInWave = calculateOrganicMacro('holdIn', 0.5, 1.0, Math.PI / 4.4);
      expect(holdInWave).toBeGreaterThan(1.0);
      expect(holdInWave).toBeLessThanOrEqual(1.015);

      // Exhale
      expect(calculateOrganicMacro('exhale', 0.0, 1.0, 1.0)).toBe(1.0);
      expect(calculateOrganicMacro('exhale', 1.0, 0.0, 1.0)).toBe(0.0);
      expect(calculateOrganicMacro('exhale', 0.5, 0.5, 1.0)).toBeCloseTo(Math.pow(0.5, 1.8), 4);

      // Hold Out
      const holdOutVal = calculateOrganicMacro('holdOut', 0.5, 0.0, 2.0);
      expect(holdOutVal).toBeGreaterThanOrEqual(0.0);
      expect(holdOutVal).toBeLessThanOrEqual(0.003);
    });
  });

  describe('Monochrome Luminance & Bloom Dynamics', () => {
    it('calculateOrganicLuminance blossoms on inhale, pulses on holdIn, dissipates on exhale', () => {
      const lumInhaleStart = calculateOrganicLuminance('inhale', 0.0, 0.0, 0);
      const lumInhaleEnd = calculateOrganicLuminance('inhale', 1.0, 1.0, 0);
      expect(lumInhaleStart).toBeCloseTo(0.40, 2);
      expect(lumInhaleEnd).toBeCloseTo(0.95, 2);
      expect(lumInhaleEnd).toBeGreaterThan(lumInhaleStart);

      // Hold In prana pulse is within [0.72..1.0]
      const lumHoldIn = calculateOrganicLuminance('holdIn', 0.5, 1.0, 1.5);
      expect(lumHoldIn).toBeGreaterThanOrEqual(0.72);
      expect(lumHoldIn).toBeLessThanOrEqual(1.0);

      // Exhale dissipates from high to low
      const lumExhaleStart = calculateOrganicLuminance('exhale', 0.0, 1.0, 0);
      const lumExhaleEnd = calculateOrganicLuminance('exhale', 1.0, 0.0, 0);
      expect(lumExhaleStart).toBeCloseTo(0.95, 2);
      expect(lumExhaleEnd).toBeCloseTo(0.35, 2);

      // Hold Out stays minimal and grounded
      const lumHoldOut = calculateOrganicLuminance('holdOut', 0.5, 0.0, 1.0);
      expect(lumHoldOut).toBeLessThanOrEqual(0.31);
    });

    it('calculateOrganicBloom outputs strictly finite blur and alpha for both themes', () => {
      for (const isDark of [true, false]) {
        for (const stage of ['inhale', 'holdIn', 'exhale', 'holdOut'] as const) {
          const bloom = calculateOrganicBloom(stage, 0.85, isDark);
          expect(bloom.blur).toBeGreaterThanOrEqual(0.0);
          expect(bloom.alpha).toBeGreaterThanOrEqual(0.0);
          expect(bloom.alpha).toBeLessThanOrEqual(0.40);
          expect(Number.isFinite(bloom.blur)).toBe(true);
          expect(Number.isFinite(bloom.alpha)).toBe(true);
        }
      }
    });
  });

  describe('Wavefront Phase Lag for Concentric Layers', () => {
    it('creates natural ripple propagation where inner layer leads and outer layers lag', () => {
      const totalLayers = 5;
      const progress = 0.5;

      // Inhale: layer 0 (innermost) expands further ahead than layer 4 (outermost)
      const innerMacro = calculateLayerMacro('inhale', progress, 0, totalLayers, 1.0);
      const outerMacro = calculateLayerMacro('inhale', progress, 4, totalLayers, 1.0);

      expect(innerMacro).toBeGreaterThan(outerMacro);
      expect(innerMacro).toBeCloseTo(0.5, 4);
      expect(outerMacro).toBeLessThan(0.5);
    });

    it('safely clamps out-of-range layer indices without producing NaN or out-of-bounds macro', () => {
      const valNeg = calculateLayerMacro('inhale', 0.5, -3, 5, 0);
      const valOver = calculateLayerMacro('inhale', 0.5, 10, 5, 0);
      expect(Number.isFinite(valNeg)).toBe(true);
      expect(Number.isFinite(valOver)).toBe(true);
    });
  });

  describe('Audio Harmonic Micro-tremor', () => {
    it('is zero when audio activity is zero, and responds smoothly when synth activity rises', () => {
      expect(calculateAudioTremor(0, 0, 1.0)).toBe(0.0);

      const tremorWithAudio = calculateAudioTremor(0.8, 0.6, 1.25);
      expect(Math.abs(tremorWithAudio)).toBeLessThanOrEqual(0.015);
      expect(Number.isFinite(tremorWithAudio)).toBe(true);
    });
  });

  describe('evaluateOrganicBreathMotion Master Evaluation', () => {
    it('returns complete, strictly finite OrganicMotionMetrics object with kinetic identity metrics', () => {
      const metrics = evaluateOrganicBreathMotion('inhale', 0.5, 0.5, 1.0, 0.4, 0.2, true);

      expect(metrics.macro).toBe(0.5);
      expect(metrics.scale).toBeCloseTo(1.2, 5);
      expect(metrics.luminance).toBeGreaterThan(0.4);
      expect(metrics.luminance).toBeLessThan(1.0);
      expect(metrics.bloomBlur).toBeGreaterThan(0);
      expect(metrics.bloomAlpha).toBeGreaterThan(0);
      expect(Number.isFinite(metrics.audioTremor)).toBe(true);

      // Kinetic identity metrics assertions
      expect(metrics.velocity).toBeGreaterThan(0.0);
      expect(Number.isFinite(metrics.velocity)).toBe(true);
      expect(metrics.tension).toBeGreaterThan(0.0);
      expect(metrics.tension).toBeLessThanOrEqual(1.0);
      expect(metrics.damping).toBeGreaterThan(0.0);
      expect(metrics.damping).toBeLessThanOrEqual(1.0);
      expect(metrics.aperture).toBeGreaterThan(0.0);
      expect(metrics.aperture).toBeLessThanOrEqual(1.0);
      expect(Number.isFinite(metrics.waveDrift)).toBe(true);

      // getLayerMacro method functions correctly
      const layer0 = metrics.getLayerMacro(0, 4);
      const layer3 = metrics.getLayerMacro(3, 4);
      expect(layer0).toBeGreaterThanOrEqual(layer3);
    });

    it('calculateKineticVelocity distinguishes active inhale acceleration from passive exhale decay', () => {
      const vInhale = calculateKineticVelocity('inhale', 0.5, 1.0);
      const vExhale = calculateKineticVelocity('exhale', 0.5, 1.0);
      const vHoldIn = calculateKineticVelocity('holdIn', 0.5, 1.0);
      const vHoldOut = calculateKineticVelocity('holdOut', 0.5, 1.0);

      expect(vInhale).toBeGreaterThan(1.0); // Active positive rate
      expect(vExhale).toBeLessThan(0.0);    // Dissipative negative rate
      expect(Math.abs(vHoldIn)).toBeLessThan(0.05); // Near-zero suspension
      expect(Math.abs(vHoldOut)).toBeLessThan(0.005); // Absolute resting stillness
    });

    it('calculateKineticTension and calculateViscousDamping behave physiologically', () => {
      // Inhale: tension builds, damping stays low
      const tInhaleStart = calculateKineticTension('inhale', 0.1, 0.1, 0);
      const tInhaleEnd = calculateKineticTension('inhale', 0.9, 0.9, 0);
      expect(tInhaleEnd).toBeGreaterThan(tInhaleStart);

      const dInhale = calculateViscousDamping('inhale', 0.5);
      const dExhale = calculateViscousDamping('exhale', 0.9);
      expect(dExhale).toBeGreaterThan(dInhale); // Exhale dissipates with higher damping
    });

    it('calculateWaveDrift advances smoothly without backwards steps across breath stages', () => {
      const driftInhale = calculateWaveDrift('inhale', 0.8, 1.0);
      const driftHoldIn = calculateWaveDrift('holdIn', 0.5, 1.0);
      const driftExhale = calculateWaveDrift('exhale', 0.8, 1.0);

      expect(Number.isFinite(driftInhale)).toBe(true);
      expect(Number.isFinite(driftHoldIn)).toBe(true);
      expect(Number.isFinite(driftExhale)).toBe(true);
      expect(driftExhale).toBeGreaterThan(driftInhale);
    });

    it('calculateMechanicalAperture calculates aperture opening ratio defensively across stages', () => {
      const apInhale = calculateMechanicalAperture('inhale', 0.8, 0.8);
      const apHoldIn = calculateMechanicalAperture('holdIn', 0.5, 1.0);
      const apExhale = calculateMechanicalAperture('exhale', 0.8, 0.2);
      const apHoldOut = calculateMechanicalAperture('holdOut', 0.5, 0.0);

      expect(apInhale).toBeGreaterThan(0.5);
      expect(apHoldIn).toBeGreaterThan(0.7);
      expect(apExhale).toBeLessThan(apInhale);
      expect(apHoldOut).toBe(0.0);
    });
  });
});
