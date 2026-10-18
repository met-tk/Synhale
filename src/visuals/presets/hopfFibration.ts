/**
 * Hopf Fibration Preset (Group III - Cosmic, Mathematics & Optical Magic)
 *
 * Hopf Fibration S3 -> S2 & Villarceau Toroidal Vortex Coil:
 * 1. 24 Intertwined Villarceau Circles Foliating a 3D Hyperspherical Torus
 * 2. Bitangent Planar Inclination sigma = arcsin(r / R)
 * 3. Infinite Self-Swallowing Toroidal Vortex Optical Illusion (Smoke Ring Flow)
 * 4. Inhale/Exhale Torus Aspect Ratio Breathing (Spindle Torus to Horn Torus)
 * 5. 12 Luminous Quanta Nodes Gliding along Continuous Villarceau Fibers
 *
 * 100% Pure Monochromatic Platinum Zinc / Obsidian Ink.
 * 60fps Zero-GC: Pure mathematical parametric loops and static scalar math.
 */

import type { VisualRenderParams } from '../../types';

const FIBER_COUNT = 24;
const FIBER_SAMPLES = 48;
const QUANTA_COUNT = 12;

export function renderHopfFibration(
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

  // Torus major radius calibrated so peak holdIn reaches ~0.414 * minDim on screen
  // Strictly continuous across all stage transitions (driven by organic macro)
  const R = minDim * (0.145 + 0.092 * motion.macro);
  // Minor radius swelling dynamically with breath aperture (spindle to horn torus)
  const r = R * (0.35 + 0.22 * motion.aperture);

  // Villarceau bitangent inclination angle
  const sinSigma = Math.min(0.95, r / R);
  const cosSigma = Math.sqrt(Math.max(0, 1.0 - sinSigma * sinSigma));

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

  // Continuous toroidal vortex flow phase & precession
  const flowPhase = safeTime * 0.28 + stageRotation;
  const precession = safeTime * 0.12 + stageRotation;

  // 3D Oblique viewing angle
  const pitch = 0.58 + 0.08 * Math.sin(safeTime * 0.25);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // =========================================================================
  // LAYER 1: 24 Intertwined Villarceau Circles (Hopf Fibration Vortex Flow)
  // Generating the infinite self-swallowing smoke-ring optical illusion
  // =========================================================================
  for (let k = 0; k < FIBER_COUNT; k++) {
    // Azimuthal angle of the k-th fiber
    const phi = (k * Math.PI * 2) / FIBER_COUNT + flowPhase;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Orthonormal basis vectors in the plane of the k-th Villarceau circle:
    // u = (-sinPhi, cosPhi, 0)
    // v = (-cosSigma * cosPhi, -cosSigma * sinPhi, sinSigma)
    // normal = (sinSigma * cosPhi, sinSigma * sinPhi, cosSigma)
    const ux = -sinPhi;
    const uy = cosPhi;

    const vx = -cosSigma * cosPhi;
    const vy = -cosSigma * sinPhi;
    const vz = sinSigma;

    // Normal offset displacement
    const nx = sinSigma * cosPhi;
    const ny = sinSigma * sinPhi;
    const nz = cosSigma;

    // Estimated average fiber depth for depth cueing
    const avgFiberY3d = ny * r * 0.5;
    const avgFiberZ3d = nz * r * 0.5;
    const depthNorm = Math.max(0, Math.min(1, (avgFiberY3d * sinPitch + avgFiberZ3d * cosPitch) / (R * 1.2) * 0.5 + 0.5));

    const isMajorFiber = k % 4 === 0;
    const fiberAlpha = (
      ((isMajorFiber ? 0.28 : 0.14) + 0.45 * depthNorm * motion.luminance) *
      (0.85 + 0.15 * motion.tension)
    ).toFixed(3);

    ctx.beginPath();
    ctx.lineWidth = isMajorFiber ? 1.05 + 0.45 * depthNorm : 0.65 + 0.35 * depthNorm;
    ctx.strokeStyle = `${mono}${fiberAlpha})`;

    for (let s = 0; s <= FIBER_SAMPLES; s++) {
      const theta = (s / FIBER_SAMPLES) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Point on the Villarceau circle in 3D space
      const x3d = R * (cosT * ux + sinT * vx) + nx * r * 0.45;
      const y3d = R * (cosT * uy + sinT * vy) + ny * r * 0.45;
      const z3d = R * (sinT * vz) + nz * r * 0.45;

      // Global precession around Z
      const cosP = Math.cos(precession);
      const sinP = Math.sin(precession);
      const rotX = x3d * cosP - y3d * sinP;
      const rotY = x3d * sinP + y3d * cosP;
      const rotZ = z3d;

      // 3D Oblique camera projection
      const px = rotX;
      const py = rotY * cosPitch - rotZ * sinPitch;

      if (s === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 3: 12 Luminous Quanta Nodes (Gliding along Villarceau Fibers)
  // Luminous pearls circulating through the continuous toroidal vortex
  // =========================================================================
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.85 + 0.15 * motion.luminance).toFixed(3)})`;

  for (let q = 0; q < QUANTA_COUNT; q++) {
    // Select specific fiber and parameter angle for each quantum
    const qFiberIdx = (q * 2) % FIBER_COUNT;
    const qPhi = (qFiberIdx * Math.PI * 2) / FIBER_COUNT + flowPhase;
    const qCosPhi = Math.cos(qPhi);
    const qSinPhi = Math.sin(qPhi);

    const qUx = -qSinPhi;
    const qUy = qCosPhi;
    const qVx = -cosSigma * qCosPhi;
    const qVy = -cosSigma * qSinPhi;
    const qVz = sinSigma;

    const qNx = sinSigma * qCosPhi;
    const qNy = sinSigma * qSinPhi;
    const qNz = cosSigma;

    // Fast circulation around the circle
    const qTheta = safeTime * 0.85 + (q * Math.PI * 2) / QUANTA_COUNT + stageRotation * 3.0;
    const qCosT = Math.cos(qTheta);
    const qSinT = Math.sin(qTheta);

    const qx3d = R * (qCosT * qUx + qSinT * qVx) + qNx * r * 0.45;
    const qy3d = R * (qCosT * qUy + qSinT * qVy) + qNy * r * 0.45;
    const qz3d = R * (qSinT * qVz) + qNz * r * 0.45;

    const cosP = Math.cos(precession);
    const sinP = Math.sin(precession);
    const qRotX = qx3d * cosP - qy3d * sinP;
    const qRotY = qx3d * sinP + qy3d * cosP;
    const qRotZ = qz3d;

    const qpx = qRotX;
    const qpy = qRotY * cosPitch - qRotZ * sinPitch;
    const qDepth = qRotY * sinPitch + qRotZ * cosPitch;
    const qDepthNorm = Math.max(0, Math.min(1, qDepth / (R * 1.2) * 0.5 + 0.5));

    const qSize = 1.4 + 1.2 * qDepthNorm * motion.tension;
    ctx.moveTo(qpx + qSize, qpy);
    ctx.arc(qpx, qpy, qSize, 0, Math.PI * 2);
  }
  ctx.fill();

  // =========================================================================
  // LAYER 4: Stereoscopic 3D Center Singularity Pearl Node (Center of Vortex)
  // Deep 3D shading with diffuse penumbra halo, solid spherical core, and offset specular highlight
  // =========================================================================
  const coreAlpha = (0.85 + 0.15 * motion.luminance).toFixed(3);
  const coreR = (2.8 + 1.2 * motion.macro) * (0.95 + 0.10 * motion.tension);

  // 4A: Diffuse penumbra halo (subtle ethereal glow)
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.18 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, 0, coreR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 4B: Stereoscopic 3D Spherical Core (Radial Shading with Top-Left Specular Glint)
  const glint = coreR * 0.35;
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(-glint, -glint, 0, 0, 0, coreR);
    if (isDarkTheme) {
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.35, 'rgba(240, 240, 245, 0.95)');
      grad.addColorStop(0.85, 'rgba(140, 140, 148, 0.85)');
      grad.addColorStop(1.0, 'rgba(50, 50, 56, 0.75)');
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(0.28, 'rgba(160, 160, 170, 0.90)');
      grad.addColorStop(0.75, 'rgba(40, 40, 45, 0.95)');
      grad.addColorStop(1.0, 'rgba(15, 15, 18, 1.0)');
    }
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Universal 2D Canvas fallback: Solid body + offset specular glint
    ctx.beginPath();
    ctx.fillStyle = `${mono}${coreAlpha})`;
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)';
    ctx.arc(-glint, -glint, coreR * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4C: Concentric Focal Ring (Precision Optical Singularity Reticle)
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.16 + 0.24 * motion.tension).toFixed(3)})`;
  ctx.arc(0, 0, coreR * 1.6, 0, Math.PI * 2);
  ctx.stroke();
}
