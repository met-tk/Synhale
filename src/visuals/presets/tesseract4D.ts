/**
 * Tesseract 4D Preset (Group III - Cosmic, Mathematics & 4D Pseudo-3D)
 *
 * Four-Dimensional Hypercube Stereographic Projection & Inside-Out Inversion:
 * 1. 16 Vertices in R4 Space: (±1, ±1, ±1, ±1)
 * 2. 32 Hypercube Edges with Bitwise Adjacency Popcount
 * 3. Double-Plane 4D Euler Rotations: XW Hyper-Plane & YZ Spatial Plane
 * 4. 4D-to-3D Stereographic Perspective Inversion (Inner Cube Passing Through Outer)
 * 5. Depth-Cued Monochromatic Alpha & 16 Luminous Hyper-Vertex Quanta
 *
 * 100% Pure Monochromatic Platinum Zinc / Obsidian Ink.
 * 60fps Zero-GC: Pre-allocated static buffers and precomputed edge pairs.
 */

import type { VisualRenderParams } from '../../types';

// Precomputed 16 4D Vertices in R4 space (±1, ±1, ±1, ±1)
const V4_BASE: readonly [number, number, number, number][] = Array.from({ length: 16 }, (_, i) => [
  (i & 1) ? 1 : -1,
  (i & 2) ? 1 : -1,
  (i & 4) ? 1 : -1,
  (i & 8) ? 1 : -1
]);

// Precomputed 32 Edges connecting vertices with Hamming distance == 1
const EDGES: readonly [number, number][] = (() => {
  const list: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j;
      // Power of 2 check: bitwise Hamming distance == 1
      if ((xor & (xor - 1)) === 0) {
        list.push([i, j]);
      }
    }
  }
  return list;
})();

// Pre-allocated static buffers for projected 2D coordinates (Zero-GC)
const PROJ_X = new Float64Array(16);
const PROJ_Y = new Float64Array(16);
const PROJ_DEPTH = new Float64Array(16);

export function renderTesseract4D(
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

  // Scaling factor calibrated so peak holdIn reaches ~0.413 * minDim on screen
  // Strictly continuous across all stage transitions (driven by organic macro)
  const scale = minDim * (0.165 + 0.103 * motion.macro);

  // Strictly monotonic forward rotation. The angular velocity is constant
  // (driven purely by safeTime) so the projected shape NEVER reverses direction
  // or snaps. The breath rhythm is expressed through scale, aperture, depth-cue
  // and luminance channels (all C1-continuous across stages via organicMotion),
  // not through rotational speed — this is the only way to guarantee both
  // (a) zero shape jumps at stage boundaries AND (b) constant spin direction.

  // 4D Rotation Angles:
  // Alpha: XW hyper-plane rotation (generates the inside-out inversion morph!)
  const alpha = safeTime * 0.42;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);

  // Beta: YZ spatial plane rotation (continuous 3D tumble)
  const beta = safeTime * 0.27;
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);

  // Gamma: subtle XZ spatial drift (pure continuous clock drift)
  const gamma = safeTime * 0.08;
  const cosG = Math.cos(gamma);
  const sinG = Math.sin(gamma);

  // 4D Perspective Distance: modulates the perspective distortion ratio
  const d4 = 2.45 - 0.25 * motion.aperture;

  // 3D Oblique viewing angle
  const pitch = 0.54;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // =========================================================================
  // STEP 1: Compute 4D Rotation, 4D->3D Stereographic & 3D->2D Projection
  // =========================================================================
  for (let i = 0; i < 16; i++) {
    const v = V4_BASE[i];
    const x0 = v[0];
    const y0 = v[1];
    const z0 = v[2];
    const w0 = v[3];

    // 1. Rotate in XW hyper-plane
    const x1 = x0 * cosA - w0 * sinA;
    const w1 = x0 * sinA + w0 * cosA;

    // 2. Rotate in YZ spatial plane
    const y1 = y0 * cosB - z0 * sinB;
    const z1 = y0 * sinB + z0 * cosB;

    // 3. Rotate in XZ spatial plane
    const x2 = x1 * cosG - z1 * sinG;
    const z2 = x1 * sinG + z1 * cosG;
    const y2 = y1;
    const w2 = w1;

    // 4. 4D to 3D Stereographic / Perspective Projection
    const factor4D = 1.0 / (d4 - w2 * 0.65);
    const x3d = x2 * factor4D;
    const y3d = y2 * factor4D;
    const z3d = z2 * factor4D;

    // 5. 3D to 2D Oblique Projection
    PROJ_X[i] = x3d * scale;
    PROJ_Y[i] = (y3d * cosPitch - z3d * sinPitch) * scale;
    PROJ_DEPTH[i] = y3d * sinPitch + z3d * cosPitch;
  }

  // =========================================================================
  // LAYER 1: 32 Hypercube Edges with Depth-Sorting and Inversion Rendering
  // The edges smoothly morph as inner and outer cubes invert through each other
  // =========================================================================
  for (let e = 0; e < EDGES.length; e++) {
    const edge = EDGES[e];
    const i = edge[0];
    const j = edge[1];

    const x1 = PROJ_X[i];
    const y1 = PROJ_Y[i];
    const x2 = PROJ_X[j];
    const y2 = PROJ_Y[j];

    const avgDepth = (PROJ_DEPTH[i] + PROJ_DEPTH[j]) * 0.5;
    // Normalize depth to [0.0..1.0] for atmospheric perspective
    const depthNorm = Math.max(0, Math.min(1, avgDepth * 0.65 + 0.5));

    // Distinguish between pure 3D cube edges and transverse 4D hyper-edges (i ^ j === 8)
    const isHyperEdge = (i ^ j) === 8;
    const baseAlpha = isHyperEdge ? 0.32 : 0.22;
    const edgeAlpha = (
      (baseAlpha + 0.48 * depthNorm * motion.luminance) *
      (0.85 + 0.15 * motion.tension)
    ).toFixed(3);

    ctx.beginPath();
    ctx.lineWidth = isHyperEdge ? 1.1 + 0.5 * depthNorm : 0.75 + 0.45 * depthNorm;
    ctx.strokeStyle = `${mono}${edgeAlpha})`;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 3: 16 Luminous Hyper-Vertex Quanta (Starlight Nodes)
  // Quanta at all 16 projected corners showing topological inversion
  // =========================================================================
  for (let i = 0; i < 16; i++) {
    const px = PROJ_X[i];
    const py = PROJ_Y[i];
    const depthNorm = Math.max(0, Math.min(1, PROJ_DEPTH[i] * 0.65 + 0.5));

    const vAlpha = (0.50 + 0.48 * depthNorm * motion.luminance).toFixed(3);
    const vSize = 1.6 + 1.2 * depthNorm * motion.tension;

    ctx.beginPath();
    ctx.fillStyle = `${mono}${vAlpha})`;
    ctx.arc(px, py, vSize, 0, Math.PI * 2);
    ctx.fill();

    // Subtle micro-halo on prominent front vertices
    if (depthNorm > 0.65 && motion.tension > 0.35) {
      ctx.beginPath();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = `${mono}${(0.20 * depthNorm).toFixed(3)})`;
      ctx.arc(px, py, vSize * 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // =========================================================================
  // LAYER 4: Central Singularity Core (Zero Point of Consciousness)
  // =========================================================================
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.85 + 0.15 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, 0, 1.8 + 0.6 * motion.aperture, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.25 + 0.25 * motion.tension).toFixed(3)})`;
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.stroke();
}
