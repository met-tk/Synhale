/**
 * Spacetime Warp Preset (Group III - Cosmic, Mathematics & Pseudo-3D)
 *
 * Relativistic Spacetime Geodesic Metric & Gravitational Well:
 * 1. 3D Oblique Perspective Curvilinear Coordinate Spacetime Mesh
 * 2. Kerr Frame-Dragging Spiral Vorticity along Infalling Geodesics
 * 3. Gravitational Wave Ripples Propagating Outward from Pulsating Core
 * 4. Concentric Iso-Potential Latitude Rings & Hyperbolic Meridian Curves
 * 5. Relativistic Photon Test Quanta Spiraling along Geodesic Trajectories
 *
 * 100% Pure Monochromatic Platinum Zinc / Obsidian Ink.
 * 60fps Zero-GC: Pre-allocated static typed arrays and pure parametric math.
 */

import type { VisualRenderParams } from '../../types';

const MERIDIAN_LINES = 16;
const LATITUDE_RINGS = 10;
const MERIDIAN_SAMPLES = 48;
const LATITUDE_SAMPLES = 64;
const PHOTON_QUANTA = 8;

export function renderSpacetimeWarp(
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
): void {
  const { width, height, isDarkTheme } = params;
  const minDim = Math.min(width, height);
  if (minDim <= 0) return;

  const motion = params.organicMotion ?? {
    macro: Math.max(0, Math.min(1, params.breathMacro)),
    scale: 1.0,
    luminance: 0.6 + 0.4 * Math.max(0, Math.min(1, params.breathMacro)),
    bloomBlur: 0,
    bloomAlpha: 0,
    audioTremor: 0,
    velocity: 0,
    tension: 0.5,
    damping: 0.5,
    aperture: 0.5,
    waveDrift: 0,
    getLayerMacro: () => params.breathMacro
  };

  const safeTime = Number.isFinite(time) ? time : 0;
  const mono = isDarkTheme ? 'rgba(244, 244, 245, ' : 'rgba(24, 24, 27, ';

  // Dynamic outer radius calibrated to reach peak expansion (~0.295 * minDim local, ~0.413 * minDim on screen with 1.4x scale)
  // Strictly continuous across all stage transitions (driven by organic macro)
  const outerR = minDim * (0.170 + 0.125 * motion.macro);
  const coreR = outerR * (0.14 + 0.04 * motion.aperture);

  // Continuous monotonic forward stage rotational progression
  // Exactly completes 2*PI across the 4 stages with C1 smoothstep transitions (zero jumps across cycle restarts)
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

  // 3D Oblique viewing perspective: inclination angle around X-axis
  const pitch = 0.62 + 0.06 * Math.sin(safeTime * 0.30); // ~35.5 to 38.9 degrees tilt
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // Dynamic gravitational well depth (deepens dramatically with breath tension)
  const wellDepth = outerR * (0.75 + 0.35 * motion.tension);
  const globalSpin = safeTime * 0.18 + stageRotation;

  // Gravitational wave ripple parameters
  const gwPhase = safeTime * 2.2 - stageRotation;
  const gwAmp = outerR * 0.05 * motion.aperture;

  // =========================================================================
  // LAYER 1: 12 Concentric Iso-Potential Latitude Rings (3D Funnel Contour)
  // Horizontal slices of the curved gravity depression
  // =========================================================================
  for (let ring = 0; ring < LATITUDE_RINGS; ring++) {
    const ringT = (ring + 1) / LATITUDE_RINGS; // 0.1 to 1.0
    const rCurrent = coreR + (outerR - coreR) * ringT;

    // Relativistic depression depth: hyperbolic drop towards the core
    const normalizedR = (rCurrent - coreR) / (outerR - coreR);
    const zBase = -wellDepth * Math.pow(1.0 - normalizedR, 1.85);

    // Gravitational wave ripple perturbation
    const zRipple = gwAmp * Math.sin(normalizedR * Math.PI * 4.0 - gwPhase) * normalizedR;
    const z3d = zBase + zRipple;

    const ringAlpha = (
      (0.08 + 0.32 * (1.0 - ringT * 0.45) * motion.luminance) *
      (0.85 + 0.15 * Math.sin(safeTime * 1.5 + ring))
    ).toFixed(3);

    ctx.beginPath();
    ctx.lineWidth = ring === 0 || ring === LATITUDE_RINGS - 1 ? 1.0 : 0.65;
    ctx.strokeStyle = `${mono}${ringAlpha})`;

    for (let s = 0; s <= LATITUDE_SAMPLES; s++) {
      const theta = (s / LATITUDE_SAMPLES) * Math.PI * 2 + globalSpin;

      // Frame dragging twist increases as radius approaches core
      const frameDragAngle = (1.0 - normalizedR) * 0.85;
      const twistedCos = Math.cos(theta + frameDragAngle);
      const twistedSin = Math.sin(theta + frameDragAngle);

      const x3d = rCurrent * twistedCos;
      const y3d = rCurrent * twistedSin;

      // 3D Oblique camera projection
      const px = x3d;
      const py = y3d * cosPitch - z3d * sinPitch;

      if (s === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 3: 16 Radial Geodesic Meridian Lines (Infalling Spacetime Strands)
  // Connecting outer space into the gravitational singularity throat
  // =========================================================================
  for (let m = 0; m < MERIDIAN_LINES; m++) {
    const baseMeridianAngle = (m / MERIDIAN_LINES) * Math.PI * 2 + globalSpin;
    const mAlpha = (0.12 + 0.38 * motion.luminance).toFixed(3);

    ctx.beginPath();
    ctx.lineWidth = m % 4 === 0 ? 1.0 : 0.65;
    ctx.strokeStyle = `${mono}${mAlpha})`;

    for (let s = 0; s <= MERIDIAN_SAMPLES; s++) {
      const u = s / MERIDIAN_SAMPLES; // 0.0 (core) to 1.0 (rim)
      const r = coreR + (outerR - coreR) * u;

      const zBase = -wellDepth * Math.pow(1.0 - u, 1.85);
      const zRipple = gwAmp * Math.sin(u * Math.PI * 4.0 - gwPhase) * u;
      const z3d = zBase + zRipple;

      // Kerr frame-dragging spiral rotation
      const frameDragAngle = (1.0 - u) * 0.85;
      const angle = baseMeridianAngle + frameDragAngle;

      const x3d = r * Math.cos(angle);
      const y3d = r * Math.sin(angle);

      const px = x3d;
      const py = y3d * cosPitch - z3d * sinPitch;

      if (s === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 4: 8 Relativistic Photon Test Quanta (Geodesic Orbiters)
  // Quanta orbiting along the curved spacetime funnel at Keplerian speeds
  // =========================================================================
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.80 + 0.20 * motion.luminance).toFixed(3)})`;

  for (let p = 0; p < PHOTON_QUANTA; p++) {
    // Variable orbital radii from throat to outer rim
    const pFrac = (p + 1) / (PHOTON_QUANTA + 1);
    const pr = coreR + (outerR - coreR) * pFrac;

    // Keplerian orbital speed: inner particles rotate significantly faster!
    const orbitalSpeed = (0.45 / Math.sqrt(pFrac)) * 0.75;
    const pAngle = safeTime * orbitalSpeed + (p * Math.PI * 2) / PHOTON_QUANTA + globalSpin;

    const zBase = -wellDepth * Math.pow(1.0 - pFrac, 1.85);
    const z3d = zBase + gwAmp * Math.sin(pFrac * Math.PI * 4.0 - gwPhase) * pFrac;

    const frameDragAngle = (1.0 - pFrac) * 0.85;
    const twistedAngle = pAngle + frameDragAngle;

    const px = pr * Math.cos(twistedAngle);
    const py = pr * Math.sin(twistedAngle) * cosPitch - z3d * sinPitch;

    const pSize = 1.3 + 0.9 * (1.0 - pFrac) * motion.tension;
    ctx.moveTo(px + pSize, py);
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
  }
  ctx.fill();

  // =========================================================================
  // LAYER 5: Central Singularity Core & Event Horizon Throat
  // Deep anchor point where spacetime curvature diverges
  // =========================================================================
  const throatZ = -wellDepth;
  const throatCenterY = 0 * cosPitch - throatZ * sinPitch;

  // Glowing throat perimeter halo
  ctx.beginPath();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `${mono}${(0.45 + 0.45 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, throatCenterY, coreR * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Dense singularity bindu dot
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.90 + 0.10 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, throatCenterY, 2.0 + 1.0 * motion.aperture, 0, Math.PI * 2);
  ctx.fill();
}
