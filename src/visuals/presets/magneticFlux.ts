/**
 * Magnetic Flux Preset — Maxwell Toroidal Dipole Magnetosphere & 3D Celestial Flux Cage
 *
 * Avant-Garde Computational Magnetohydrodynamics & Sacred Planetary Physics:
 * - 3D Toroidal Magnetosphere Space Cage: 8 spatial azimuthal meridian planes revolving
 *   around the tilted geomagnetic dipole axis (24 volumetric magnetic field lines in total).
 * - Alfvén Wave Dynamic Ripples: Transverse Alfvén waves undulating along each magnetic tension line,
 *   breathing with organic mechanical aperture.
 * - Van Allen Trapped Plasma Ions: 24 energetic ions executing harmonic magnetic mirror bounce motion
 *   between North and South polar magnetic mirror points.
 * - Dual 3D Polar Auroral Oval Rings: Geometrically exact 3D perspective ellipses at North and South poles
 *   with fine auroral ray striations.
 * - Chapman-Ferraro Equatorial Current Ring & Singularity Core: 3D equatorial neutral sheet ring
 *   and central magnetic core singularity with dual shielding reticles.
 *
 * Strictly pure monochromatic (Platinum Zinc on dark, Obsidian Ink on light).
 * 60fps Zero-GC architecture: zero heap allocations inside the render loop.
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

const FLUX_STEPS = 64;
const FLUX_STEP_ANGLE = Math.PI / FLUX_STEPS; // theta goes from 0 to PI

// Pre-computed lookup tables for Zero-GC 60fps dipole trajectory evaluation
const FLUX_SIN3 = new Float64Array(FLUX_STEPS + 1);
const FLUX_SIN2COS = new Float64Array(FLUX_STEPS + 1);

for (let s = 0; s <= FLUX_STEPS; s++) {
  const theta = s * FLUX_STEP_ANGLE;
  const sinT = Math.sin(theta);
  const sin2 = sinT * sinT;
  FLUX_SIN3[s] = sin2 * sinT;
  FLUX_SIN2COS[s] = sin2 * Math.cos(theta);
}

const MERIDIAN_COUNT = 8; // 8 spatial azimuthal planes around the dipole axis
const SHELL_COUNT = 3;    // 3 radial L-shells per plane = 24 3D field lines
const AURORA_TICKS = 24;
const ION_COUNT = 24;     // 24 trapped Van Allen magnetic mirror plasma ions

/**
 * Renders Magnetic Flux preset.
 */
export function renderMagneticFlux(
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
): void {
  const minDim = Math.min(params.width, params.height);
  if (!(minDim > 0)) return;

  const motion = params.organicMotion ?? evaluateOrganicBreathMotion(
    params.stage,
    params.stageProgress,
    params.breathMacro,
    time,
    params.oscAActivity,
    params.oscBActivity,
    params.isDarkTheme
  );

  const macro = motion.macro;
  const safeTime = Number.isFinite(time) ? time : 0;
  const oscA = Number.isFinite(params.oscAActivity) ? Math.max(0, Math.min(1, params.oscAActivity)) : 0;

  // Pure monochrome palette
  const mono = params.isDarkTheme ? 'rgba(244, 244, 245, ' : 'rgba(24, 24, 27, ';

  // Calibrated so at macro=1.0 (with globalScale=1.4), maximum span reaches ~0.375 * minDim <= 0.40 * minDim
  const baseR = minDim * 0.088;
  const maxL = baseR * (1.20 + 1.45 * macro) * (1 + 0.05 * oscA);

  const isHoldIn = params.stage === 'holdIn';
  const isHoldOut = params.stage === 'holdOut';
  const resonance = isHoldIn ? 0.5 + 0.5 * Math.sin(safeTime * 3.0) : 0;

  // Continuous monotonic forward stage rotational progression (exact 2*PI modulo closure)
  const p = Math.max(0, Math.min(1, params.stageProgress));
  const smoothP = p * p * (3 - 2 * p);
  let stageRotation = 0;
  switch (params.stage) {
    case 'inhale':
      stageRotation = 2.80 * smoothP;
      break;
    case 'holdIn':
      stageRotation = 2.80 + 0.34 * smoothP + 0.015 * Math.sin(p * Math.PI) * Math.sin(safeTime * 2.0);
      break;
    case 'exhale':
      stageRotation = 3.14 + 2.80 * smoothP;
      break;
    case 'holdOut':
      stageRotation = 5.94 + (Math.PI * 2 - 5.94) * smoothP;
      break;
  }

  // Slow azimuthal drift of the magnetosphere cage
  const drift = safeTime * 0.08 + stageRotation * 0.25;

  // Dipole axial tilt (11.5 degrees geomagnetic tilt + subtle kinetic nutation)
  const baseTilt = 0.20; // ~11.5 degrees
  const nutation = 0.03 * Math.sin(safeTime * 0.6) + 0.02 * motion.velocity;
  const beta = baseTilt + nutation;
  const cosBeta = Math.cos(beta);
  const sinBeta = Math.sin(beta);

  // Camera oblique pitch (~22 degrees for 3D depth cueing)
  const psi = 0.38 + 0.04 * Math.sin(safeTime * 0.25);
  const cosPsi = Math.cos(psi);
  const sinPsi = Math.sin(psi);

  // Combined rotation angles for 3D to 2D projection:
  // Local (x', y', z') -> Tilted (x1, y1, z1) -> Camera Projected (px, py, depth)
  // x1 = x'
  // y1 = y' * cosBeta - z' * sinBeta
  // z1 = y' * sinBeta + z' * cosBeta
  // px = x1
  // py = y1 * cosPsi - z1 * sinPsi
  // depth = y1 * sinPsi + z1 * cosPsi

  // =========================================================================
  // LAYER 0: Toroidal Magnetic Core Shading Aura (Ethereal Depth)
  // =========================================================================
  if (typeof ctx.createRadialGradient === 'function' && macro > 0.08) {
    const auraR = maxL * 1.15;
    const grad = ctx.createRadialGradient(0, 0, baseR * 0.2, 0, 0, auraR);
    const coreAlpha = (0.042 + 0.040 * macro + 0.02 * resonance).toFixed(3);
    const midAlpha = (0.014 + 0.016 * macro).toFixed(3);
    grad.addColorStop(0, `${mono}${coreAlpha})`);
    grad.addColorStop(0.50, `${mono}${midAlpha})`);
    grad.addColorStop(1, `${mono}0.000)`);
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // LAYER 1: Geomagnetic Polar Needle Axis & Micro-Vernier Graduation Ticks
  // =========================================================================
  const axisAlpha = (isHoldOut ? 0.10 : 0.15 + 0.20 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${axisAlpha})`;

  const axisHalfLen = maxL * 0.95;
  // Along the dipole axis (x'=0, y'=0, z' = +/- axisHalfLen)
  const nPoleY1 = -axisHalfLen * sinBeta;
  const nPoleZ1 = axisHalfLen * cosBeta;
  const nPolePx = 0;
  const nPolePy = nPoleY1 * cosPsi - nPoleZ1 * sinPsi;

  const sPoleY1 = axisHalfLen * sinBeta;
  const sPoleZ1 = -axisHalfLen * cosBeta;
  const sPolePx = 0;
  const sPolePy = sPoleY1 * cosPsi - sPoleZ1 * sinPsi;

  ctx.moveTo(sPolePx, sPolePy);
  ctx.lineTo(nPolePx, nPolePy);
  ctx.stroke();

  // Subtle graduation ticks along polar axis
  ctx.beginPath();
  ctx.lineWidth = 0.55;
  ctx.strokeStyle = `${mono}${(isHoldOut ? 0.06 : 0.08 + 0.12 * motion.luminance).toFixed(3)})`;
  for (let t = -4; t <= 4; t++) {
    if (t === 0) continue;
    const frac = t / 4;
    const zTick = axisHalfLen * frac;
    const yTick1 = -zTick * sinBeta;
    const zTick1 = zTick * cosBeta;
    const pyTick = yTick1 * cosPsi - zTick1 * sinPsi;
    const tickLen = (Math.abs(t) === 4 ? 4.0 : 2.2);

    ctx.moveTo(-tickLen, pyTick);
    ctx.lineTo(tickLen, pyTick);
  }
  ctx.stroke();

  // =========================================================================
  // LAYER 2: 3D Toroidal Dipole Magnetosphere Space Cage
  // 8 spatial azimuthal meridian planes x 3 radial L-shells = 24 Volumetric Flux Lines
  // Augmented with dynamic transverse Alfvén wave ripples
  // =========================================================================
  for (let m = 0; m < MERIDIAN_COUNT; m++) {
    const phi = (m * Math.PI * 2) / MERIDIAN_COUNT + drift;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Compute average depth of this meridian plane for depth cueing
    const avgY1 = sinPhi * cosBeta;
    const avgZ1 = sinPhi * sinBeta;
    const avgDepth = avgY1 * sinPsi + avgZ1 * cosPsi;
    const depthNorm = Math.max(0, Math.min(1, avgDepth * 0.5 + 0.5));

    for (let k = 0; k < SHELL_COUNT; k++) {
      const shellFrac = (k + 1) / SHELL_COUNT;
      const shellL = maxL * (0.38 + 0.62 * shellFrac);

      const isMajorLine = (m % 2 === 0) && (k === SHELL_COUNT - 1);
      const lineAlpha = (
        ((isMajorLine ? 0.25 : 0.12) + 0.38 * depthNorm * motion.luminance) *
        (0.85 + 0.15 * motion.tension) *
        (isHoldOut ? 0.55 : 1.0)
      ).toFixed(3);

      const lineWidth = isMajorLine
        ? 1.10 + 0.40 * depthNorm
        : 0.65 + 0.35 * depthNorm;

      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = `${mono}${lineAlpha})`;

      for (let s = 0; s <= FLUX_STEPS; s++) {
        const theta = s * FLUX_STEP_ANGLE;

        // Transverse Alfvén wave dynamic ripple along the magnetic tension line
        const alfven = 1.0 + 0.042 * motion.aperture * Math.sin(theta * 3.0 - safeTime * 2.4 + phi);

        const rho = shellL * FLUX_SIN3[s] * alfven;
        const zPrime = shellL * FLUX_SIN2COS[s] * alfven;

        // Local 3D Cartesian coordinates
        const xPrime = rho * cosPhi;
        const yPrime = rho * sinPhi;

        // Rotate by dipole axial tilt beta (around X axis)
        const x1 = xPrime;
        const y1 = yPrime * cosBeta - zPrime * sinBeta;
        const z1 = yPrime * sinBeta + zPrime * cosBeta;

        // Camera oblique perspective projection
        const px = x1;
        const py = y1 * cosPsi - z1 * sinPsi;

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // =========================================================================
  // LAYER 3: Dual 3D Polar Auroral Oval Rings (North & South Resonance Cusp Rings)
  // Geometrically exact 3D perspective ellipses with radial auroral ray striations
  // =========================================================================
  const poleDist = maxL * 0.48 * (0.80 + 0.20 * motion.aperture);
  const auroraRadius = baseR * (0.28 + 0.18 * motion.tension);

  for (let poleSign = -1; poleSign <= 1; poleSign += 2) {
    const zPole = poleSign * poleDist;
    const ringAlpha = (isHoldOut ? 0.15 : 0.28 + 0.45 * motion.luminance + 0.15 * resonance).toFixed(3);

    ctx.beginPath();
    ctx.lineWidth = isHoldIn ? 1.35 : 0.95;
    ctx.strokeStyle = `${mono}${ringAlpha})`;

    const ellipseSteps = 36;
    for (let s = 0; s <= ellipseSteps; s++) {
      const a = (s * Math.PI * 2) / ellipseSteps;
      const xPrime = auroraRadius * Math.cos(a);
      const yPrime = auroraRadius * Math.sin(a);
      const zPrime = zPole;

      const x1 = xPrime;
      const y1 = yPrime * cosBeta - zPrime * sinBeta;
      const z1 = yPrime * sinBeta + zPrime * cosBeta;

      const px = x1;
      const py = y1 * cosPsi - z1 * sinPsi;

      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Auroral graduation ray teeth
    if (motion.tension > 0.20 || isHoldIn) {
      const teethAlpha = (0.35 * motion.tension).toFixed(3);
      ctx.beginPath();
      ctx.lineWidth = 0.55;
      ctx.strokeStyle = `${mono}${teethAlpha})`;

      for (let t = 0; t < AURORA_TICKS; t++) {
        const a = (t * Math.PI * 2) / AURORA_TICKS;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const tLen = t % 6 === 0 ? 3.8 : 2.0;

        // Inner vertex
        const xIn = auroraRadius * cosA;
        const yIn = auroraRadius * sinA;
        const x1In = xIn;
        const y1In = yIn * cosBeta - zPole * sinBeta;
        const z1In = yIn * sinBeta + zPole * cosBeta;
        const pxIn = x1In;
        const pyIn = y1In * cosPsi - z1In * sinPsi;

        // Outer vertex
        const xOut = (auroraRadius + tLen) * cosA;
        const yOut = (auroraRadius + tLen) * sinA;
        const x1Out = xOut;
        const y1Out = yOut * cosBeta - zPole * sinBeta;
        const z1Out = yOut * sinBeta + zPole * cosBeta;
        const pxOut = x1Out;
        const pyOut = y1Out * cosPsi - z1Out * sinPsi;

        ctx.moveTo(pxIn, pyIn);
        ctx.lineTo(pxOut, pyOut);
      }
      ctx.stroke();
    }

    // Specular polar axis focal pin
    const yPole1 = -zPole * sinBeta;
    const zPole1 = zPole * cosBeta;
    const pxPole = 0;
    const pyPole = yPole1 * cosPsi - zPole1 * sinPsi;

    ctx.beginPath();
    ctx.fillStyle = `${mono}${(0.75 + 0.25 * motion.luminance).toFixed(3)})`;
    const pinR = 1.6 + 0.6 * motion.tension;
    ctx.arc(pxPole, pyPole, pinR, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // LAYER 4: Van Allen Radiation Belt Plasma Ions (24 Trapped Bouncing Particles)
  // Particles oscillate along magnetic mirror lines between North and South poles
  // =========================================================================
  const ionAlpha = Math.min(0.98, isHoldOut ? 0.30 : 0.55 + 0.45 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${mono}${ionAlpha})`;

  for (let i = 0; i < ION_COUNT; i++) {
    const meridianIdx = i % MERIDIAN_COUNT;
    const phi = (meridianIdx * Math.PI * 2) / MERIDIAN_COUNT + drift;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const shellIdx = Math.floor(i / MERIDIAN_COUNT) % SHELL_COUNT;
    const shellFrac = (shellIdx + 1) / SHELL_COUNT;
    const shellL = maxL * (0.38 + 0.62 * shellFrac);

    // Harmonic bounce motion between North (theta ~ 0.14*PI) and South (theta ~ 0.86*PI)
    const bounceFreq = 1.5 + 0.25 * (i % 3);
    const bouncePhase = safeTime * bounceFreq + i * 0.68;
    const thetaIon = Math.PI * 0.5 + Math.PI * 0.36 * Math.sin(bouncePhase);

    const sinT = Math.sin(thetaIon);
    const sin2 = sinT * sinT;
    const alfven = 1.0 + 0.042 * motion.aperture * Math.sin(thetaIon * 3.0 - safeTime * 2.4 + phi);

    const rho = shellL * sin2 * sinT * alfven;
    const zPrime = shellL * sin2 * Math.cos(thetaIon) * alfven;

    const xPrime = rho * cosPhi;
    const yPrime = rho * sinPhi;

    const x1 = xPrime;
    const y1 = yPrime * cosBeta - zPrime * sinBeta;
    const z1 = yPrime * sinBeta + zPrime * cosBeta;

    const px = x1;
    const py = y1 * cosPsi - z1 * sinPsi;
    const depth = y1 * sinPsi + z1 * cosPsi;
    const depthNorm = Math.max(0, Math.min(1, (depth / maxL) * 0.5 + 0.5));

    const pr = 1.3 + 1.0 * depthNorm * (0.8 + 0.2 * motion.tension);
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, Math.PI * 2);
  }
  ctx.fill();

  // =========================================================================
  // LAYER 5: Chapman-Ferraro Equatorial Neutral Sheet Ring & Core Singularity
  // =========================================================================
  // 3D Equatorial current ring at z' = 0
  const eqRadius = maxL * 0.35 * (0.85 + 0.15 * motion.macro);
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.12 + 0.22 * motion.tension).toFixed(3)})`;
  const eqSteps = 40;
  for (let s = 0; s <= eqSteps; s++) {
    const a = (s * Math.PI * 2) / eqSteps;
    const xPrime = eqRadius * Math.cos(a);
    const yPrime = eqRadius * Math.sin(a);
    const x1 = xPrime;
    const y1 = yPrime * cosBeta; // zPrime = 0
    const z1 = yPrime * sinBeta;
    const px = x1;
    const py = y1 * cosPsi - z1 * sinPsi;

    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Central magnetic core singularity nucleus
  const coreAlpha = (0.85 + 0.15 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${mono}${coreAlpha})`;
  const centerRadius = isHoldOut ? 2.0 : 2.6 + 0.8 * motion.aperture;
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Dual magnetic core shielding rings
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${(0.22 + 0.38 * motion.tension).toFixed(3)})`;
  ctx.arc(0, 0, centerRadius * 2.2, 0, Math.PI * 2);
  ctx.stroke();

  if (isHoldIn || motion.tension > 0.5) {
    ctx.beginPath();
    ctx.lineWidth = 0.55;
    ctx.strokeStyle = `${mono}${(0.15 * motion.tension).toFixed(3)})`;
    ctx.arc(0, 0, centerRadius * 3.4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
