/**
 * Zen Waves Preset (F16) — Cymatics Chladni Acoustic Plate & Zen Garden Ripples
 *
 * Pure Meditative Acoustic Cymatics (Chladni Resonator / Kyoto Karesansui):
 * - Sharp, pure acoustic nodal curves vibrating with harmonic modes 2, 3, 4, 5, 6.
 * - Inhale: High-amplitude vibrational excitation; concentric Chladni nodal curves
 *   bloom outward with geometric wave dispersion like sand particles forming sacred patterns on a vibrating metal plate.
 * - Hold In: Harmonic standing wave frequency lock; wave contours stabilize into a sharp geometric
 *   cymatics mandala; zero angular jumps or discontinuities.
 * - Exhale: Viscous harmonic dissipation; wave perturbations smoothly flatten as acoustic energy
 *   disperses into quiet laminar stillness.
 * - Hold Out: Placid zen stone pool; wave contours relax into pure concentric stillness,
 *   focusing consciousness on a single resting stone droplet.
 *
 * Exclusivity Contract: Strictly dry-plate Chladni cymatics and sand-ripple geometry.
 * Silk veils, fluid streamlines, and acoustic levitation pearls are reserved exclusively for Silk Cymatics.
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

export const CHLADNI_MODES = [2, 3, 4, 5, 6] as const;
export const NUM_ZEN_RIPPLES = 5;
export const POLAR_STEPS = 144;

const CHLADNI_MODE_WEIGHTS = CHLADNI_MODES.map(m => 1 / Math.sqrt(m));
const STEP_ANGLE = (Math.PI * 2) / POLAR_STEPS;
const UNIT_COS = new Float64Array(POLAR_STEPS + 1);
const UNIT_SIN = new Float64Array(POLAR_STEPS + 1);
for (let step = 0; step <= POLAR_STEPS; step++) {
  const theta = step * STEP_ANGLE;
  UNIT_COS[step] = Math.cos(theta);
  UNIT_SIN[step] = Math.sin(theta);
}
const RING_PHI = new Float64Array(CHLADNI_MODES.length);

/**
 * Computes individual Chladni polar harmonic ripple: cos(m * theta + phi).
 * Evaluates cleanly for any mode m (e.g. m=0 evaluates to 1.0).
 * Preserves exact mathematical contract and unit test compatibility.
 */
export function computeChladniRipple(m: number, theta: number, phi = 0): number {
  return Math.cos(m * theta + phi);
}

/**
 * Renders Zen Waves (Cymatics Chladni Acoustic Plate & Zen Garden Ripples).
 */
export function renderZenWaves(
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
): void {
  const minDim = Math.min(params.width, params.height);
  const baseRadius = minDim > 0 ? minDim * 0.0737 : 10;
  const noiseActivity = Math.max(0, Math.min(1, params.oscBActivity));

  const motion = params.organicMotion ?? evaluateOrganicBreathMotion(
    params.stage,
    params.stageProgress,
    params.breathMacro,
    time,
    params.oscAActivity,
    params.oscBActivity,
    params.isDarkTheme
  );

  const safeTime = Number.isFinite(time) ? time : 0;
  const safeP = Number.isFinite(params.stageProgress) ? Math.max(0, Math.min(1, params.stageProgress)) : 0;

  // Pure monochromatic palette
  const baseStroke = params.isDarkTheme
    ? 'rgba(244, 244, 245, '
    : 'rgba(24, 24, 27, ';

  // Amplitude modulation: strictly continuous across all stage boundaries (Zero pops!)
  const isHoldInPulse = params.stage === 'holdIn' ? 0.22 * Math.sin(safeP * Math.PI) * Math.sin(safeTime * 2.8) : 0;
  const stageAmpMod = 0.35 + 1.25 * motion.macro + isHoldInPulse;

  // =========================================================================
  // LAYER 0: Karesansui Zen Sand-Ripple Reference Rings (3 guide horizons)
  // =========================================================================
  if (params.showMaxBoundary && motion.macro > 0.1) {
    const guideAlpha = (0.08 * motion.macro * motion.luminance).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = `${baseStroke}${guideAlpha})`;
    for (let g = 0; g < 3; g++) {
      const gr = baseRadius * (1.3 + g * 0.68) * (1 + 0.65 * motion.macro);
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 1: 5 Concentric Chladni Standing Wave Harmonic Ripples
  // =========================================================================
  for (let k = 0; k < NUM_ZEN_RIPPLES; k++) {
    const layerMacro = motion.getLayerMacro(k, NUM_ZEN_RIPPLES);
    const layerFactor = 1 + k * 0.32;
    const ringBaseR = baseRadius * layerFactor * (1 + 0.70 * layerMacro);

    const ampBase = (baseRadius * 0.048) * stageAmpMod * (1 + 0.5 * noiseActivity) + baseRadius * Math.abs(motion.audioTremor);

    // Continuous Alpha derived smoothly from motion.luminance and damping
    const outerDampFade = 0.18 + 0.42 * motion.damping;
    const ringAlpha = Math.exp(-0.28 * k) * (1 - (k / NUM_ZEN_RIPPLES) * outerDampFade) * motion.luminance;
    const clampedAlpha = Math.max(0.06, Math.min(0.96, ringAlpha * 0.90));

    // Fluid acoustic vortex rotation: continuous uniform carrier + bounded acoustic twist
    const rotSign = k % 2 === 0 ? 1 : -1;
    const vortexSpeed = 0.04 * (1.0 + 0.35 * (NUM_ZEN_RIPPLES - k));
    const baseRot = rotSign * vortexSpeed * safeTime;
    const acousticTwist = rotSign * (0.16 * motion.tension * ((NUM_ZEN_RIPPLES - k) / NUM_ZEN_RIPPLES));
    const vortexAngle = baseRot + acousticTwist;

    // Continuous dynamic wave drift (C1 smooth with zero boundary pop)
    const driftPhase = safeTime * 0.6 + 0.4 * motion.tension + k * 0.42;
    for (let mIndex = 0; mIndex < CHLADNI_MODES.length; mIndex++) {
      const modeSpeed = 0.8 + CHLADNI_MODES[mIndex] * 0.25;
      RING_PHI[mIndex] = driftPhase * modeSpeed;
    }

    ctx.beginPath();
    ctx.lineWidth = (1.30 + 0.55 * (1 - k / NUM_ZEN_RIPPLES)) * (1.0 - 0.20 * motion.damping * (k / NUM_ZEN_RIPPLES));
    ctx.strokeStyle = `${baseStroke}${clampedAlpha.toFixed(3)})`;

    for (let step = 0; step <= POLAR_STEPS; step++) {
      const theta = step * STEP_ANGLE + vortexAngle;

      let rippleOffset = 0;
      for (let mIndex = 0; mIndex < CHLADNI_MODES.length; mIndex++) {
        const modeAttenuation = (mIndex >= 3)
          ? (1.0 - 0.5 * motion.damping) * (1.0 + 0.35 * motion.tension)
          : 1.0;
        rippleOffset += ampBase * CHLADNI_MODE_WEIGHTS[mIndex] * modeAttenuation * computeChladniRipple(CHLADNI_MODES[mIndex], theta, RING_PHI[mIndex]);
      }

      const r = Math.max(2, ringBaseR + rippleOffset);
      const x = r * UNIT_COS[step];
      const y = r * UNIT_SIN[step];

      if (step === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 2: Central Zen Stone Droplet & Concentric Micro-Ripples
  // =========================================================================
  const dropletAlpha = (0.65 + 0.35 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${baseStroke}${dropletAlpha})`;
  const dropR = 2.2 + 1.2 * motion.aperture;
  ctx.arc(0, 0, dropR, 0, Math.PI * 2);
  ctx.fill();

  // Concentric micro-ripple ring enclosing the central droplet
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  const rippleAlpha = (0.22 + 0.35 * motion.tension).toFixed(3);
  ctx.strokeStyle = `${baseStroke}${rippleAlpha})`;
  ctx.arc(0, 0, dropR * 2.4, 0, Math.PI * 2);
  ctx.stroke();
}
