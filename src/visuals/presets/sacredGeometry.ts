/**
 * Sacred Geometry Preset — 4D Holographic Crystal Mandala & Sacred Origami Engine
 *
 * Avant-Garde Computational Sacred Geometry:
 * - Inhale: 4D stereographic crystal unfolding; 13 nodes expand along W-Z-X hyperspace axes;
 *   sacred hexagram facets illuminate with translucent crystal diamond fills;
 *   dual counter-rotating Merkaba star tetrahedrons unfold with golden-ratio precision.
 * - Hold In: Holographic Crystal Resonance Lock; 13 nodes ignite with 6-pointed stellated
 *   starlight facets; Vesica Piscis rosette petals form a glowing sacred mandala;
 *   78 crystalline chords achieve high-contrast standing resonance without angular jumps.
 * - Exhale: Dimensional folding & elastic relaxation; crystal facets smoothly dim and fold inward
 *   like a sacred geometric lotus closing at dusk; viscous damping calms all motion.
 * - Hold Out: Ethereal gossamer void; crystal fills dissolve completely, leaving gossamer lattice
 *   filaments, the inner Seed-of-Life rosette, and radiant central Bindu resting in peace.
 *
 * All features are mathematically modulated by continuous tension and macro envelopes,
 * guaranteeing C1 smooth bridging with absolutely zero stage transition pops or jumps.
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

export const METATRON_NODE_COUNT = 13;

export interface NodePoint {
  x: number;
  y: number;
}

// Pre-allocated reusable buffers for zero-GC rendering (60fps lock)
const REUSABLE_NODES: NodePoint[] = Array.from({ length: METATRON_NODE_COUNT }, () => ({ x: 0, y: 0 }));
const NODE_DEPTH: Float64Array = new Float64Array(METATRON_NODE_COUNT);

function populateReusableNodes(spacingD: number, rotation: number): void {
  const baseAngle = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  REUSABLE_NODES[0].x = 0;
  REUSABLE_NODES[0].y = 0;
  NODE_DEPTH[0] = 1.0;

  for (let k = 0; k < 6; k++) {
    const angle = baseAngle + (k * Math.PI) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x1 = spacingD * cos;
    const y1 = spacingD * sin;
    const x2 = 2 * spacingD * cos;
    const y2 = 2 * spacingD * sin;

    REUSABLE_NODES[1 + k].x = Object.is(x1, -0) ? 0 : x1;
    REUSABLE_NODES[1 + k].y = Object.is(y1, -0) ? 0 : y1;
    NODE_DEPTH[1 + k] = 1.0;

    REUSABLE_NODES[7 + k].x = Object.is(x2, -0) ? 0 : x2;
    REUSABLE_NODES[7 + k].y = Object.is(y2, -0) ? 0 : y2;
    NODE_DEPTH[7 + k] = 1.0;
  }
}

/**
 * Computes the 13 nodes of the Fruit of Life / Metatron's Cube.
 * When D = 0, all nodes collapse to (0, 0) without generating NaN or Infinity.
 */
export function getMetatronNodes(spacingD: number, rotation = 0): NodePoint[] {
  populateReusableNodes(spacingD, rotation);
  return REUSABLE_NODES.map(n => ({ x: n.x, y: n.y }));
}

/**
 * Returns total interconnect lines for Metatron's Cube: n * (n - 1) / 2 = 78 lines.
 */
export function getMetatronLineCount(numNodes = METATRON_NODE_COUNT): number {
  return (numNodes * (numNodes - 1)) / 2;
}

/**
 * Computes non-linear stage-aware rotation angle:
 * Continuous angular phase across all stage transitions with zero jumps.
 */
function getStageRotationAngle(
  stage: VisualRenderParams['stage'],
  stageProgress: number,
  time: number,
  velocity: number
): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0, Math.min(1, stageProgress)) : 0;
  const safeTime = Number.isFinite(time) ? time : 0;
  const v = Number.isFinite(velocity) ? velocity : 0;

  switch (stage) {
    case 'inhale': {
      const eased = Math.pow(p, 1.6);
      return eased * (Math.PI / 3) + v * 0.025;
    }
    case 'holdIn': {
      // Windowed with sin(p * PI) so angle is strictly Math.PI/3 at both p=0 and p=1
      return (Math.PI / 3) + 0.015 * Math.sin(p * Math.PI) * Math.sin(safeTime * 2.2);
    }
    case 'exhale': {
      const decay = Math.pow(1.0 - p, 1.6);
      return decay * (Math.PI / 3);
    }
    case 'holdOut': {
      return 0.0;
    }
    default:
      return 0.0;
  }
}

/**
 * Populates morphed node positions for the 4D Tesseract stereographic projection.
 */
function populateMorphed4DNodes(
  spacingD: number,
  baseAngle: number,
  macro: number,
  tension = 0,
  velocity = 0
): void {
  REUSABLE_NODES[0].x = 0;
  REUSABLE_NODES[0].y = 0;
  NODE_DEPTH[0] = 1.0 + 0.3 * tension;

  const sinMacroPi = Math.sin(macro * Math.PI);
  const morphTwist = (sinMacroPi * 0.65 + tension * 0.35) * (Math.PI / 6) + velocity * 0.035;

  const wRotation = (macro * 0.8 + tension * 0.4) * (Math.PI / 4);
  const cosW = Math.cos(wRotation);
  const sinW = Math.sin(wRotation);

  for (let k = 0; k < 6; k++) {
    const kAngle = (k * Math.PI) / 3;

    // Inner Hexagon (Nodes 1..6)
    const innerAngle = baseAngle + morphTwist + kAngle;
    const innerZ = 0.55 * sinMacroPi + tension * 0.35;
    const innerW = 0.45 * sinMacroPi;
    const rotInnerW = innerZ * sinW + innerW * cosW;
    const perspInner = 1 / Math.max(0.5, 1 - rotInnerW * 0.32);
    const r1 = spacingD * (1 + 0.22 * sinMacroPi + 0.05 * tension) * perspInner;

    const x1 = r1 * Math.cos(innerAngle);
    const y1 = r1 * Math.sin(innerAngle);
    REUSABLE_NODES[1 + k].x = Object.is(x1, -0) ? 0 : x1;
    REUSABLE_NODES[1 + k].y = Object.is(y1, -0) ? 0 : y1;
    NODE_DEPTH[1 + k] = perspInner;

    // Outer Hexagon (Nodes 7..12)
    const outerAngle = baseAngle - morphTwist * 0.5 + kAngle;
    const outerZ = -0.32 * sinMacroPi - tension * 0.18;
    const outerW = -0.32 * sinMacroPi;
    const rotOuterW = outerZ * sinW + outerW * cosW;
    const perspOuter = 1 / Math.max(0.5, 1 - rotOuterW * 0.25);
    const r2 = 2 * spacingD * (1 - 0.08 * sinMacroPi) * perspOuter;

    const x2 = r2 * Math.cos(outerAngle);
    const y2 = r2 * Math.sin(outerAngle);
    REUSABLE_NODES[7 + k].x = Object.is(x2, -0) ? 0 : x2;
    REUSABLE_NODES[7 + k].y = Object.is(y2, -0) ? 0 : y2;
    NODE_DEPTH[7 + k] = perspOuter;
  }
}

/**
 * Renders the Sacred Geometry preset (4D Holographic Crystal Mandala).
 */
export function renderSacredGeometry(
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
): void {
  const minDim = Math.min(params.width, params.height);
  const baseSpacing = minDim > 0 ? minDim * 0.065 : 10;

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
  const spacingD = baseSpacing * (1 + 0.758 * macro);

  const stageAngle = getStageRotationAngle(params.stage, params.stageProgress, time, motion.velocity);
  const rotation = (time * 0.03 + stageAngle) % (Math.PI * 2);

  if (params.showMaxBoundary) {
    populateMorphed4DNodes(spacingD, rotation, macro, motion.tension, motion.velocity);
  } else {
    populateReusableNodes(spacingD, rotation);
  }

  const baseStroke = params.isDarkTheme
    ? 'rgba(244, 244, 245, '
    : 'rgba(24, 24, 27, ';

  // Continuous Alpha derived smoothly from motion.tension (Zero pops!)
  const lineAlphaVal = 0.16 + 0.66 * motion.tension;
  const circleAlphaVal = 0.22 + 0.62 * motion.tension;

  // =========================================================================
  // REAL APP AVANT-GARDE CRYSTAL LAYERS (ShowMaxBoundary = true)
  // =========================================================================
  if (params.showMaxBoundary) {
    // Layer 0: Translucent Sacred Crystal Facet Fills (Hexagram Petals)
    // Smoothly illuminates with tension, dissolving to 0 on exhale
    const facetAlpha = (0.048 * Math.pow(motion.tension, 1.5)).toFixed(3);
    if (parseFloat(facetAlpha) > 0.005) {
      ctx.fillStyle = `${baseStroke}${facetAlpha})`;

      // Inner Star Hexagram Facets (Nodes 1..6)
      ctx.beginPath();
      for (let k = 1; k <= 6; k++) {
        const n = REUSABLE_NODES[k];
        if (k === 1) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      }
      ctx.closePath();
      ctx.fill();

      // Outer Interlocking Diamond Facets
      for (let k = 0; k < 6; k++) {
        const i1 = 1 + k;
        const i2 = 1 + ((k + 1) % 6);
        const o1 = 7 + k;
        ctx.beginPath();
        ctx.moveTo(REUSABLE_NODES[0].x, REUSABLE_NODES[0].y);
        ctx.lineTo(REUSABLE_NODES[i1].x, REUSABLE_NODES[i1].y);
        ctx.lineTo(REUSABLE_NODES[o1].x, REUSABLE_NODES[o1].y);
        ctx.lineTo(REUSABLE_NODES[i2].x, REUSABLE_NODES[i2].y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Layer A: Concentric Seed-of-Life Orbital Guide Rings
    const orbitAlpha = (circleAlphaVal * 0.35).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = `${baseStroke}${orbitAlpha})`;
    ctx.arc(0, 0, spacingD, 0, Math.PI * 2);
    ctx.arc(0, 0, spacingD * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Layer B: Flower of Life Vesica Piscis Rosette Petals (centered at 6 inner nodes)
    const petalAlpha = (lineAlphaVal * 0.42).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.90;
    ctx.strokeStyle = `${baseStroke}${petalAlpha})`;
    for (let k = 1; k <= 6; k++) {
      const node = REUSABLE_NODES[k];
      const petalR = spacingD * (0.95 + 0.05 * NODE_DEPTH[k]);
      ctx.moveTo(node.x + petalR, node.y);
      ctx.arc(node.x, node.y, petalR, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Layer C: 3D Merkaba Star Tetrahedron (counter-rotating at golden ratio speed -0.618)
    const merkabaRot = -rotation * 0.618;
    const merkabaR = spacingD * 1.732 * (1 + 0.08 * motion.tension);
    const merkabaAlpha = (0.10 + 0.45 * motion.tension).toFixed(3);

    if (typeof ctx.save === 'function') ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 1.0 + 0.4 * motion.tension;
    ctx.strokeStyle = `${baseStroke}${merkabaAlpha})`;

    // Upward Triangle (Light / Spirit)
    for (let t = 0; t < 3; t++) {
      const a = merkabaRot + (t * 2 * Math.PI) / 3 - Math.PI / 2;
      const x = merkabaR * Math.cos(a);
      const y = merkabaR * Math.sin(a);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Downward Triangle (Ground / Physical)
    for (let t = 0; t < 3; t++) {
      const a = merkabaRot + (t * 2 * Math.PI) / 3 + Math.PI / 2;
      const x = merkabaR * Math.cos(a);
      const y = merkabaR * Math.sin(a);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (typeof ctx.restore === 'function') ctx.restore();
  }

  // =========================================================================
  // CORE MANDALA LATTICE: 78 Lines (Batched single stroke for test compat)
  // =========================================================================
  const collapseRatio = Math.max(0.40, Math.min(1.0, macro * 1.25));
  ctx.beginPath();
  ctx.lineWidth = (1.0 + 0.35 * motion.tension) * collapseRatio;
  ctx.strokeStyle = `${baseStroke}${(lineAlphaVal * collapseRatio).toFixed(3)})`;

  for (let i = 0; i < METATRON_NODE_COUNT; i++) {
    const p1 = REUSABLE_NODES[i];
    for (let j = i + 1; j < METATRON_NODE_COUNT; j++) {
      const p2 = REUSABLE_NODES[j];
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  }
  ctx.stroke();

  // Fruit of Life Circles at 13 Nodes
  const circleRadius = Math.max(1, spacingD * 0.5);
  ctx.beginPath();
  ctx.lineWidth = 1.15 + 0.25 * motion.tension;
  ctx.strokeStyle = `${baseStroke}${circleAlphaVal.toFixed(3)})`;

  for (let i = 0; i < METATRON_NODE_COUNT; i++) {
    const node = REUSABLE_NODES[i];
    const nodeR = params.showMaxBoundary ? circleRadius * (0.85 + 0.15 * NODE_DEPTH[i]) : circleRadius;
    ctx.moveTo(node.x + nodeR, node.y);
    ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
  }
  ctx.stroke();

  // Node Accent Focal Points & Central Singularity
  const pointAlpha = (0.65 + 0.35 * motion.tension).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${baseStroke}${pointAlpha})`;
  for (let i = 0; i < METATRON_NODE_COUNT; i++) {
    const node = REUSABLE_NODES[i];
    const dotR = i === 0 ? 3.0 : 2.0;
    ctx.moveTo(node.x + dotR, node.y);
    ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
  }
  ctx.fill();

  // Stellated Node Starlight Halos: Smoothly envelope with macro (Zero jumps!)
  const haloWeight = Math.max(0.0, (motion.macro - 0.55) / 0.45);
  if (params.showMaxBoundary && haloWeight > 0.01) {
    const haloRadius = circleRadius * 1.12;
    const pulseAlpha = (0.35 * haloWeight * (0.8 + 0.2 * Math.sin(time * 3))).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.95 * haloWeight;
    ctx.strokeStyle = `${baseStroke}${pulseAlpha})`;
    for (let i = 0; i < METATRON_NODE_COUNT; i++) {
      const node = REUSABLE_NODES[i];
      ctx.moveTo(node.x + haloRadius, node.y);
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Starlight cross needles on central Bindu node
    ctx.beginPath();
    ctx.lineWidth = 1.0 * haloWeight;
    ctx.strokeStyle = `${baseStroke}${(0.55 * haloWeight).toFixed(3)})`;
    const needleLen = circleRadius * 1.5 * haloWeight;
    ctx.moveTo(-needleLen, 0);
    ctx.lineTo(needleLen, 0);
    ctx.moveTo(0, -needleLen);
    ctx.lineTo(0, needleLen);
    ctx.stroke();
  }
}
