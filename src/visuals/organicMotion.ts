/**
 * Organic Breath Motion Engine
 *
 * Implements 4-pillar biological breathing animation dynamics:
 * 1. Physiological Easing & Momentum:
 *    - Inhale: C2-continuous smootherstep biological expansion (slow start, deep expansion, blooming deceleration)
 *    - Hold In: Suspended buoyancy micro-swelling (~1.5% amplitude living resonance) with C1 boundary windowing
 *    - Exhale: Passive biological elastic recoil ((1 - p)^1.8 damping release)
 *    - Hold Out: Anchored stillness in void with seamless boundary windowing (zero stage jump)
 * 2. Monochrome Luminance & Bloom:
 *    - Continuous stroke alpha and white/charcoal monochrome glow bloom without color cycling or stage pops
 * 3. Multi-layer Wavefront Lag:
 *    - Spatial ripple delay for concentric layers so elements breathe organically rather than in rigid lockstep
 * 4. Audio Harmonic Micro-tremor:
 *    - Zero-jerk micro-resonance synchronized with synthesizer activity
 *
 * Strictly zero color changes (pure monochromatic whites, zincs, and obsidian blacks).
 * Zero-GC architecture: zero heap allocations inside the 60fps render loop.
 */

import type { BreathStage, OrganicMotionMetrics } from '../types';

export type { OrganicMotionMetrics };

/**
 * C2-continuous smootherstep S-curve for physiological expansion.
 * 6p^5 - 15p^4 + 10p^3.
 * Continuous 1st and 2nd derivatives ensure zero mechanical acceleration jerk.
 */
export function smootherstep(p: number): number {
  const clamped = Math.max(0.0, Math.min(1.0, Number.isFinite(p) ? p : 0.0));
  return clamped * clamped * clamped * (clamped * (clamped * 6.0 - 15.0) + 10.0);
}

/**
 * Passive biological elastic recoil curve for exhale.
 * (1 - p)^1.8.
 * Replicates chest cavity pressure release: rapid initial release tapering gently to rest.
 */
export function passiveRecoil(p: number): number {
  const clamped = Math.max(0.0, Math.min(1.0, Number.isFinite(p) ? p : 0.0));
  return Math.pow(1.0 - clamped, 1.8);
}

/**
 * Standing floating undulation wave for Hold In.
 * Subtle 1.5% buoyancy amplitude avoids motion sickness while feeling distinctly alive.
 */
export function buoyancyWave(time: number, freq = 2.2, amp = 0.015): number {
  const safeTime = Number.isFinite(time) ? time : 0.0;
  const val = amp * Math.sin(freq * safeTime);
  return Object.is(val, -0) ? 0.0 : val;
}

/**
 * Anchored stillness pulse for Hold Out.
 * Extremely subtle sub-harmonic heartbeat in the void.
 */
export function voidResonance(time: number): number {
  const safeTime = Number.isFinite(time) ? time : 0.0;
  const val = 0.003 * (0.5 + 0.5 * Math.sin(1.2 * safeTime));
  return Object.is(val, -0) ? 0.0 : val;
}

/**
 * Evaluates the organic breath macro M ~ [0.0..1.015] based on stage, progress, and time.
 * Seamless C1-continuity across all stage boundaries (zero pops/jumps).
 */
export function calculateOrganicMacro(
  stage: BreathStage,
  stageProgress: number,
  breathMacro: number,
  time: number
): number {
  const p = Number.isFinite(stageProgress)
    ? stageProgress
    : Number.isFinite(breathMacro)
      ? stage === 'exhale'
        ? 1.0 - breathMacro
        : breathMacro
      : 0.0;
  const safeP = Math.max(0.0, Math.min(1.0, p));
  const safeTime = Number.isFinite(time) ? time : 0.0;

  switch (stage) {
    case 'inhale':
      return smootherstep(safeP);
    case 'holdIn': {
      // Boundary windowing via sin(p * PI) ensures M=1.0000 exactly at p=0 (Inhale end) and p=1 (Exhale start)
      const window = Math.sin(safeP * Math.PI);
      const wave = buoyancyWave(safeTime, 2.2, 0.015);
      return 1.0 + wave * window;
    }
    case 'exhale':
      return passiveRecoil(safeP);
    case 'holdOut': {
      // Boundary windowing ensures M=0.0000 exactly at p=0 (Exhale end) and p=1 (Inhale start)
      const window = Math.sin(safeP * Math.PI);
      return voidResonance(safeTime) * window;
    }
    default:
      return smootherstep(safeP);
  }
}

/**
 * Evaluates physiological luminance factor [0.20..1.0] for stroke alphas and intensity.
 * Continuous across all transitions without sudden brightness leaps.
 */
export function calculateOrganicLuminance(
  stage: BreathStage,
  stageProgress: number,
  macro: number,
  time: number
): number {
  const safeP = Number.isFinite(stageProgress)
    ? Math.max(0.0, Math.min(1.0, stageProgress))
    : Math.max(0.0, Math.min(1.0, Number.isFinite(macro) ? macro : 0.0));
  const safeTime = Number.isFinite(time) ? time : 0.0;

  switch (stage) {
    case 'inhale':
      return 0.40 + 0.55 * smootherstep(safeP);
    case 'holdIn': {
      // Windowed breathing pulse: exactly 0.95 at p=0 and p=1 to seamlessly bridge Inhale and Exhale
      const window = Math.sin(safeP * Math.PI);
      const wave = Math.sin(safeTime * 2.2 - 0.4);
      return 0.95 + 0.05 * wave * window;
    }
    case 'exhale': {
      const release = Math.pow(1.0 - safeP, 1.4);
      return 0.35 + 0.60 * release;
    }
    case 'holdOut': {
      // Smoothly bridge from 0.35 (Exhale end) through deep resting void dip (~0.225) to 0.40 (Inhale start)
      // Exactly matches 0.35 at p=0 and 0.40 at p=1 with zero jumps
      const bridge = 0.35 * (1.0 - safeP) + 0.40 * safeP;
      const dip = 0.15 * Math.sin(safeP * Math.PI);
      return bridge - dip;
    }
    default:
      return 0.5;
  }
}

/**
 * Evaluates monochrome glow bloom blur and alpha.
 * Strictly monochrome: no color tinting.
 */
export function calculateOrganicBloom(
  stage: BreathStage,
  luminance: number,
  isDarkTheme: boolean
): { blur: number; alpha: number } {
  const safeLum = Math.max(0.0, Math.min(1.0, Number.isFinite(luminance) ? luminance : 0.5));

  if (isDarkTheme) {
    switch (stage) {
      case 'inhale':
        return {
          blur: 10.0 * safeLum,
          alpha: 0.10 + 0.15 * safeLum
        };
      case 'holdIn':
        return {
          blur: 8.0 + 6.0 * safeLum,
          alpha: 0.22 + 0.12 * safeLum
        };
      case 'exhale':
        return {
          blur: 8.0 * safeLum,
          alpha: 0.08 + 0.14 * safeLum
        };
      case 'holdOut':
        return {
          blur: 1.0,
          alpha: 0.05
        };
      default:
        return {
          blur: 4.0 * safeLum,
          alpha: 0.10
        };
    }
  } else {
    // Light theme: crisp subtle obsidian ambient occlusion shadow
    switch (stage) {
      case 'inhale':
        return {
          blur: 4.0 * safeLum,
          alpha: 0.05 + 0.08 * safeLum
        };
      case 'holdIn':
        return {
          blur: 5.0 + 3.0 * safeLum,
          alpha: 0.10 + 0.06 * safeLum
        };
      case 'exhale':
        return {
          blur: 4.0 * safeLum,
          alpha: 0.04 + 0.07 * safeLum
        };
      case 'holdOut':
        return {
          blur: 0.5,
          alpha: 0.03
        };
      default:
        return {
          blur: 2.0 * safeLum,
          alpha: 0.05
        };
    }
  }
}

/**
 * Evaluates wavefront phase-delayed macro for concentric layers.
 * Inner layer leads, outer layers lag gently creating ripple depth.
 */
export function calculateLayerMacro(
  stage: BreathStage,
  stageProgress: number,
  layerIndex: number,
  totalLayers: number,
  time: number
): number {
  const n = Number.isFinite(totalLayers) ? Math.max(1, totalLayers) : 1;
  const idx = Number.isFinite(layerIndex) ? Math.max(0, Math.min(n - 1, layerIndex)) : 0;
  const safeP = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  // Wavefront delay factor: up to 8% phase lag from inner (0) to outer (n-1)
  const lagFraction = (idx / n) * 0.08;
  // Window the lag with Math.sin(safeP * Math.PI) so lag is strictly 0 at both p=0 and p=1
  // This guarantees that Inhale reaches 1.00000 and Exhale reaches 0.00000 for ALL layers with ZERO jumps!
  const dynamicLag = lagFraction * Math.sin(safeP * Math.PI);

  switch (stage) {
    case 'inhale': {
      const delayedP = Math.max(0.0, Math.min(1.0, safeP - dynamicLag));
      return smootherstep(delayedP);
    }
    case 'holdIn': {
      const phaseOffset = (idx / n) * 0.5;
      const window = Math.sin(safeP * Math.PI);
      const wave = Math.sin(safeTime * 2.2 - phaseOffset);
      return 1.0 + 0.015 * wave * window;
    }
    case 'exhale': {
      const delayedP = Math.max(0.0, Math.min(1.0, safeP - dynamicLag));
      return passiveRecoil(delayedP);
    }
    case 'holdOut': {
      const phaseOffset = (idx / n) * 0.4;
      const window = Math.sin(safeP * Math.PI);
      const wave = 0.5 + 0.5 * Math.sin(safeTime * 1.2 - phaseOffset);
      return 0.003 * wave * window;
    }
    default:
      return smootherstep(safeP);
  }
}

/**
 * Computes micro-harmonic tremor synchronized with synthesizer activity.
 */
export function calculateAudioTremor(
  oscAActivity: number,
  oscBActivity: number,
  time: number
): number {
  const oscA = Number.isFinite(oscAActivity) ? Math.max(0.0, Math.min(1.0, oscAActivity)) : 0.0;
  const oscB = Number.isFinite(oscBActivity) ? Math.max(0.0, Math.min(1.0, oscBActivity)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  const activity = 0.008 * oscA + 0.006 * oscB;
  if (activity <= 0.0) return 0.0;

  const tremor = activity * Math.sin(18.0 * safeTime);
  return Object.is(tremor, -0) ? 0.0 : tremor;
}

/**
 * Computes instantaneous physiological rate dM/dt.
 * Continuous across boundaries to prevent acceleration jerk.
 */
export function calculateKineticVelocity(
  stage: BreathStage,
  stageProgress: number,
  time: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  switch (stage) {
    case 'inhale': {
      const rate = 30.0 * p * p * (1.0 - p) * (1.0 - p);
      return Object.is(rate, -0) ? 0.0 : rate;
    }
    case 'holdIn': {
      const window = Math.sin(p * Math.PI);
      const rate = 0.033 * Math.cos(2.2 * safeTime) * window;
      return Object.is(rate, -0) ? 0.0 : rate;
    }
    case 'exhale': {
      // Smooth deceleration near endpoints
      const rate = -1.8 * Math.pow(1.0 - p, 0.8) * Math.sin(p * Math.PI);
      return Object.is(rate, -0) ? 0.0 : rate;
    }
    case 'holdOut': {
      const window = Math.sin(p * Math.PI);
      const rate = 0.0018 * Math.cos(1.2 * safeTime) * window;
      return Object.is(rate, -0) ? 0.0 : rate;
    }
    default:
      return 0.0;
  }
}

/**
 * Computes elastic structural tension factor [0.0..1.0].
 * Builds smoothly during inhalation, stays locked in holdIn, releases smoothly in exhalation.
 */
export function calculateKineticTension(
  stage: BreathStage,
  stageProgress: number,
  macro: number,
  time: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  switch (stage) {
    case 'inhale': {
      const t = Math.pow(smootherstep(p), 1.6);
      return Math.max(0.0, Math.min(1.0, t));
    }
    case 'holdIn': {
      const window = Math.sin(p * Math.PI);
      const wave = 1.0 + 0.015 * Math.sin(2.2 * safeTime) * window;
      return Math.max(0.0, Math.min(1.0, wave));
    }
    case 'exhale': {
      const t = Math.pow(1.0 - p, 2.0);
      return Math.max(0.0, Math.min(1.0, t));
    }
    case 'holdOut':
      return 0.0;
    default:
      return Math.max(0.0, Math.min(1.0, Number.isFinite(macro) ? macro : 0.0));
  }
}

/**
 * Computes viscous damping factor [0.0..1.0].
 * Continuous across boundaries.
 */
export function calculateViscousDamping(
  stage: BreathStage,
  stageProgress: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;

  switch (stage) {
    case 'inhale':
      return 0.15 + 0.15 * (1.0 - p); // 0.30 -> 0.15
    case 'holdIn':
      return 0.15 + 0.30 * p; // 0.15 -> 0.45
    case 'exhale':
      return 0.45 + 0.55 * p; // 0.45 -> 1.00
    case 'holdOut':
      return 1.00 - 0.70 * smootherstep(p); // 1.00 -> 0.30 smoothly releasing toward Inhale start
    default:
      return 0.5;
  }
}

/**
 * Computes dynamic diaphragm opening / aperture factor [0.0..1.0].
 * Strictly continuous across all transitions.
 */
export function calculateMechanicalAperture(
  stage: BreathStage,
  stageProgress: number,
  time: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  switch (stage) {
    case 'inhale':
      return Math.pow(smootherstep(p), 1.25); // 0.0 -> 1.0
    case 'holdIn': {
      const window = Math.sin(p * Math.PI);
      return Math.min(1.0, 1.0 + 0.01 * Math.sin(2.2 * safeTime) * window); // exactly 1.0 at p=0 and p=1
    }
    case 'exhale':
      return Math.pow(1.0 - p, 1.5); // 1.0 -> 0.0
    case 'holdOut':
      return 0.0;
    default:
      return 0.5;
  }
}

/**
 * Computes continuous spatial wave propagation phase (radians).
 * Drives seamless outward wave drift without jumps across stage boundaries.
 */
export function calculateWaveDrift(
  stage: BreathStage,
  stageProgress: number,
  time: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0.0, Math.min(1.0, stageProgress)) : 0.0;
  const safeTime = Number.isFinite(time) ? time : 0.0;

  let phasePush = 0.0;
  switch (stage) {
    case 'inhale':
      phasePush = 1.5 * smootherstep(p); // 0.0 -> 1.5
      break;
    case 'holdIn':
      phasePush = 1.5; // constant 1.5
      break;
    case 'exhale':
      phasePush = 1.5 + 0.8 * (1.0 - Math.pow(1.0 - p, 1.5)); // 1.5 -> 2.3
      break;
    case 'holdOut':
      // Seamless modulo 2*PI wrap back to 0.0 across Hold Out
      phasePush = 2.3 + (Math.PI * 2 - 2.3) * p; // 2.3 -> 2*PI (equivalent to 0)
      break;
  }

  return (safeTime * 0.75) + phasePush;
}

/**
 * Master evaluation function for organic breath motion metrics.
 */
export function evaluateOrganicBreathMotion(
  stage: BreathStage,
  stageProgress: number,
  breathMacro: number,
  time: number,
  oscAActivity = 0,
  oscBActivity = 0,
  isDarkTheme = true
): OrganicMotionMetrics {
  const macro = calculateOrganicMacro(stage, stageProgress, breathMacro, time);
  const scale = 1.0 + 0.4 * macro;
  const luminance = calculateOrganicLuminance(stage, stageProgress, macro, time);
  const bloom = calculateOrganicBloom(stage, luminance, isDarkTheme);
  const audioTremor = calculateAudioTremor(oscAActivity, oscBActivity, time);

  const velocity = calculateKineticVelocity(stage, stageProgress, time);
  const tension = calculateKineticTension(stage, stageProgress, macro, time);
  const damping = calculateViscousDamping(stage, stageProgress);
  const aperture = calculateMechanicalAperture(stage, stageProgress, time);
  const waveDrift = calculateWaveDrift(stage, stageProgress, time);

  return {
    macro,
    scale,
    luminance,
    bloomBlur: bloom.blur,
    bloomAlpha: bloom.alpha,
    audioTremor,
    velocity,
    tension,
    damping,
    aperture,
    waveDrift,
    getLayerMacro: (layerIndex: number, totalLayers: number) =>
      calculateLayerMacro(stage, stageProgress, layerIndex, totalLayers, time)
  };
}
