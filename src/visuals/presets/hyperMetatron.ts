/**
 * Hyper-Metatron Preset — Pure Monochrome 3D Depth-Sorted Sacred Geometry & Phyllotaxis
 *
 * Layer 0 (Gossamer Veil): Central singularity luminance halo & hexagram veil
 * Layer 1 (Phyllotaxis Starfield): 48-node golden-angle (137.5 deg) spiral photon array
 * Layer 2 (Depth-Sorted 78-Line Web): 3D Metatron lattice partitioned into Back / Mid / Front depth planes
 * Layer 3 (Vesica Piscis Lens): Interlocking rosette petals & counter-rotating 3D Merkaba
 * Layer 4 (Specular Reticle Nodes): 13 precision double-ring anchors with cardinal crosshairs
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

const HYPER_NODE_COUNT = 13;
const PHYLLOTAXIS_COUNT = 48;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399963 rad (137.50776 deg)

// Pre-allocated 3D node buffers for zero-GC rendering
const NODE_X = new Float64Array(HYPER_NODE_COUNT);
const NODE_Y = new Float64Array(HYPER_NODE_COUNT);
const NODE_Z = new Float64Array(HYPER_NODE_COUNT);

const PHYLLO_R_NORM = new Float64Array(PHYLLOTAXIS_COUNT);
for (let i = 0; i < PHYLLOTAXIS_COUNT; i++) {
  PHYLLO_R_NORM[i] = Math.sqrt((i + 1) / PHYLLOTAXIS_COUNT);
}

export function renderHyperMetatron(
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
  const progress = Number.isFinite(params.stageProgress)
    ? Math.max(0, Math.min(1, params.stageProgress))
    : 0;
  const safeTime = Number.isFinite(time) ? time : 0;

  // Pure monochrome ink: Platinum Zinc in dark mode, Obsidian Ink in light mode
  const mono = params.isDarkTheme ? 'rgba(244, 244, 245, ' : 'rgba(24, 24, 27, ';

  const baseSpacing = minDim * 0.064;
  const spacingD = baseSpacing * (1 + 0.75 * macro);
  const outerHorizonR = spacingD * 2.48;

  const isHoldIn = params.stage === 'holdIn';
  const isHoldOut = params.stage === 'holdOut';
  const resonance = isHoldIn ? 0.5 + 0.5 * Math.sin(safeTime * 3.0) : 0;

  // Continuous kinetic stage rotation without phase jumps
  const stageSweep =
    params.stage === 'inhale'
      ? Math.pow(progress, 1.6) * (Math.PI / 3) + Math.max(0.0, motion.velocity) * 0.02
      : isHoldIn
        ? (Math.PI / 3) + 0.015 * Math.sin(safeTime * 2.2)
        : params.stage === 'exhale'
          ? Math.pow(1.0 - progress, 1.6) * (Math.PI / 3)
          : 0.0;

  const baseRot = safeTime * 0.035 + stageSweep;
  const sinMacroPi = Math.sin(macro * Math.PI);

  // Populate 13 3D morphed Metatron nodes
  NODE_X[0] = 0;
  NODE_Y[0] = 0;
  NODE_Z[0] = 1.0;

  const innerTwist = (sinMacroPi * 0.6 + motion.tension * 0.4) * (Math.PI / 7) + motion.velocity * 0.03;
  const innerD = spacingD * (1 + 0.22 * sinMacroPi + 0.05 * motion.tension);
  const outerD = 2 * spacingD * (1 - 0.08 * sinMacroPi);

  for (let k = 0; k < 6; k++) {
    const aInner = baseRot + innerTwist + (k * Math.PI) / 3;
    const aOuter = baseRot - innerTwist * 0.5 + (k * Math.PI) / 3;

    // 3D foreshortening & Z-depth computation
    const zIn = Math.cos(k * (Math.PI / 3) + safeTime * 0.6);
    const zOut = -Math.sin(k * (Math.PI / 3) - safeTime * 0.45);

    NODE_X[1 + k] = innerD * Math.cos(aInner);
    NODE_Y[1 + k] = innerD * Math.sin(aInner);
    NODE_Z[1 + k] = 0.35 + 0.65 * (0.5 + 0.5 * zIn);

    NODE_X[7 + k] = outerD * Math.cos(aOuter);
    NODE_Y[7 + k] = outerD * Math.sin(aOuter);
    NODE_Z[7 + k] = 0.15 + 0.55 * (0.5 + 0.5 * zOut);
  }

  // --- LAYER 0: Gossamer Singularity Halo & Translucent Hexagram Veil ---
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(0, 0, spacingD * 0.05, 0, 0, outerHorizonR);
    const cAlpha = (0.045 + 0.045 * macro + 0.02 * resonance).toFixed(3);
    grad.addColorStop(0, `${mono}${cAlpha})`);
    grad.addColorStop(0.5, `${mono}${(0.016 + 0.018 * macro).toFixed(3)})`);
    grad.addColorStop(1, `${mono}0.000)`);
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(0, 0, outerHorizonR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Translucent inner hexagon veil
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.018 + 0.024 * macro).toFixed(3)})`;
  for (let k = 1; k <= 6; k++) {
    if (k === 1) ctx.moveTo(NODE_X[k], NODE_Y[k]);
    else ctx.lineTo(NODE_X[k], NODE_Y[k]);
  }
  ctx.closePath();
  ctx.fill();

  // --- LAYER 1: 48-Node Golden Angle Phyllotaxis Spiral Nebula ---
  const spiralTwist = 0.50 * motion.aperture + 0.25 * motion.tension;
  const maxPhylloR = outerHorizonR * 0.96;

  // 1A: Gossamer spiral vortex connectome
  ctx.beginPath();
  ctx.lineWidth = 0.45;
  const spiralLineAlpha = (isHoldOut ? 0.04 : 0.06 + 0.09 * motion.luminance).toFixed(3);
  ctx.strokeStyle = `${mono}${spiralLineAlpha})`;
  for (let i = 0; i < PHYLLOTAXIS_COUNT; i++) {
    const normR = PHYLLO_R_NORM[i];
    const r = maxPhylloR * normR * (0.50 + 0.50 * motion.aperture);
    const theta = i * GOLDEN_ANGLE - safeTime * 0.06 + spiralTwist * (1 - normR);
    const px = r * Math.cos(theta);
    const py = r * Math.sin(theta);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 1B: Phyllotaxis starlight dust nodes (2 size tiers for depth)
  for (let tier = 0; tier < 2; tier++) {
    ctx.beginPath();
    const starAlpha = tier === 0
      ? (isHoldOut ? 0.16 : 0.22 + 0.33 * motion.luminance).toFixed(3)
      : (isHoldOut ? 0.30 : 0.42 + 0.42 * motion.luminance).toFixed(3);
    ctx.fillStyle = `${mono}${starAlpha})`;
    const dotSize = tier === 0 ? 0.95 : 1.55;

    for (let i = tier; i < PHYLLOTAXIS_COUNT; i += 2) {
      const normR = PHYLLO_R_NORM[i];
      const r = maxPhylloR * normR * (0.55 + 0.45 * macro);
      const theta = i * GOLDEN_ANGLE - safeTime * 0.08 + spiralTwist * (1 - normR);
      const px = r * Math.cos(theta);
      const py = r * Math.sin(theta);
      ctx.moveTo(px + dotSize, py);
      ctx.arc(px, py, dotSize, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // --- LAYER 2: 3-Tier Depth-Sorted 78-Line Metatron Lattice ---
  const collapseRatio = Math.max(0.40, Math.min(1.0, macro * 1.25));
  const baseLineAlpha = (isHoldOut ? 0.14 : 0.20 + 0.52 * motion.luminance) * collapseRatio;

  // Tier 2A (Back Plane): Outer-to-Outer & Long Cross Chords (Hairline 0.45px, recessed alpha)
  ctx.beginPath();
  ctx.lineWidth = 0.45;
  ctx.strokeStyle = `${mono}${(baseLineAlpha * 0.26).toFixed(3)})`;
  for (let i = 7; i < HYPER_NODE_COUNT; i++) {
    for (let j = i + 1; j < HYPER_NODE_COUNT; j++) {
      ctx.moveTo(NODE_X[i], NODE_Y[i]);
      ctx.lineTo(NODE_X[j], NODE_Y[j]);
    }
  }
  ctx.stroke();

  // Tier 2B (Mid Plane): Inner-to-Outer Tesseract Struts (0.80px, medium luminance)
  ctx.beginPath();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = `${mono}${(baseLineAlpha * 0.54).toFixed(3)})`;
  for (let i = 1; i <= 6; i++) {
    for (let j = 7; j < HYPER_NODE_COUNT; j++) {
      ctx.moveTo(NODE_X[i], NODE_Y[i]);
      ctx.lineTo(NODE_X[j], NODE_Y[j]);
    }
  }
  ctx.stroke();

  // Tier 2C (Foreground Plane): Center-to-All & Inner Hexagram Core (1.30px, high luminance)
  ctx.beginPath();
  ctx.lineWidth = isHoldIn ? 1.45 : 1.2;
  ctx.strokeStyle = `${mono}${Math.min(0.95, baseLineAlpha * 0.95).toFixed(3)})`;
  // Center to all 12 surrounding nodes
  for (let j = 1; j < HYPER_NODE_COUNT; j++) {
    ctx.moveTo(NODE_X[0], NODE_Y[0]);
    ctx.lineTo(NODE_X[j], NODE_Y[j]);
  }
  // Inner 6-node complete graph
  for (let i = 1; i <= 6; i++) {
    for (let j = i + 1; j <= 6; j++) {
      ctx.moveTo(NODE_X[i], NODE_Y[i]);
      ctx.lineTo(NODE_X[j], NODE_Y[j]);
    }
  }
  ctx.stroke();

  // --- LAYER 3: Vesica Piscis Lens Petals & Counter-Rotating 3D Merkaba ---
  const circleR = Math.max(1, spacingD * 0.5);

  // Outer 6 Fruit-of-Life spheres (recessed hairline)
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(baseLineAlpha * 0.42).toFixed(3)})`;
  for (let i = 7; i < HYPER_NODE_COUNT; i++) {
    ctx.moveTo(NODE_X[i] + circleR, NODE_Y[i]);
    ctx.arc(NODE_X[i], NODE_Y[i], circleR, 0, Math.PI * 2);
  }
  ctx.stroke();

  // Inner 7 Seed-of-Life spheres (crisp foreground lens)
  ctx.beginPath();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = `${mono}${Math.min(0.92, baseLineAlpha * 0.85).toFixed(3)})`;
  for (let i = 0; i <= 6; i++) {
    ctx.moveTo(NODE_X[i] + circleR, NODE_Y[i]);
    ctx.arc(NODE_X[i], NODE_Y[i], circleR, 0, Math.PI * 2);
  }
  ctx.stroke();

  // Counter-rotating 3D Merkaba Star Tetrahedron
  const merkabaRot = -baseRot * 0.618;
  const merkabaR = spacingD * 1.732;
  ctx.beginPath();
  ctx.lineWidth = isHoldIn ? 1.5 : 1.15;
  ctx.strokeStyle = `${mono}${Math.min(0.92, 0.35 + 0.50 * macro).toFixed(3)})`;
  for (let dir = -1; dir <= 1; dir += 2) {
    for (let t = 0; t < 3; t++) {
      const a = merkabaRot + (t * 2 * Math.PI) / 3 + (dir * Math.PI) / 2;
      const x = merkabaR * Math.cos(a);
      const y = merkabaR * Math.sin(a);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.stroke();

  // --- LAYER 4: 13 Specular Reticle Nodes & Precision Crosshairs ---
  // Outer micro-halos around the 13 nodes + central orthogonal reticle crosshairs
  ctx.beginPath();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = `${mono}${(0.30 + 0.45 * macro).toFixed(3)})`;
  for (let i = 0; i < HYPER_NODE_COUNT; i++) {
    const haloR = (i === 0 ? 6.0 : i <= 6 ? 4.2 : 3.0) * (0.85 + 0.3 * NODE_Z[i]);
    ctx.moveTo(NODE_X[i] + haloR, NODE_Y[i]);
    ctx.arc(NODE_X[i], NODE_Y[i], haloR, 0, Math.PI * 2);
  }
  const crossIn = 4.2;
  const crossOut = 9.5 * (1 + 0.3 * macro);
  ctx.moveTo(crossIn, 0);
  ctx.lineTo(crossOut, 0);
  ctx.moveTo(-crossIn, 0);
  ctx.lineTo(-crossOut, 0);
  ctx.moveTo(0, crossIn);
  ctx.lineTo(0, crossOut);
  ctx.moveTo(0, -crossIn);
  ctx.lineTo(0, -crossOut);
  ctx.stroke();

  // Specular solid cores
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.82 + 0.18 * macro).toFixed(3)})`;
  for (let i = 0; i < HYPER_NODE_COUNT; i++) {
    const dotR = i === 0 ? 2.8 : i <= 6 ? 1.9 : 1.35;
    ctx.moveTo(NODE_X[i] + dotR, NODE_Y[i]);
    ctx.arc(NODE_X[i], NODE_Y[i], dotR, 0, Math.PI * 2);
  }
  ctx.fill();
}
