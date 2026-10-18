/**
 * Lissajous Knot Preset — Ethereal Laser Harmonograph & Topological Light Knot
 *
 * Avant-Garde Computational Optical Physics & Sacred Harmonic Topology:
 * - Inhale: High-dimensional parametric laser interferometry; harmonic frequency ratios
 *   smoothly dilate and weave into a three-dimensional closed topological light knot;
 *   dual counter-chiral beams generate microscopic moiré interference fringes.
 * - Hold In: Harmonic golden-ratio resonance lock; 8 antinode intersection points
 *   illuminate with brilliant monochrome starlight nodes; central coherent focal bindu pulses with prana.
 * - Exhale: Viscous topological untangling; 3D light loops unwind with silky fluid deceleration,
 *   relaxing gracefully toward the resting lemniscate.
 * - Hold Out: Ethereal stillness in the void; collapses to a pure minimal infinity loop
 *   and single razor-sharp central laser axis anchor.
 *
 * Strictly pure monochromatic (Platinum Zinc on dark, Obsidian Ink on light).
 * 60fps Zero-GC architecture: zero heap allocations inside the render loop.
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

const KNOT_STEPS = 288;
const STEP_ANGLE = (Math.PI * 2) / KNOT_STEPS;

// Pre-allocated static buffers for Zero-GC 60fps rendering
const KNOT_X0 = new Float64Array(KNOT_STEPS + 1);
const KNOT_Y0 = new Float64Array(KNOT_STEPS + 1);
const KNOT_Z0 = new Float64Array(KNOT_STEPS + 1);

const KNOT_X1 = new Float64Array(KNOT_STEPS + 1);
const KNOT_Y1 = new Float64Array(KNOT_STEPS + 1);
const KNOT_Z1 = new Float64Array(KNOT_STEPS + 1);

const GOLDEN_PHASE = Math.PI / 1.618033988749895; // Golden angle phase offset

/**
 * Renders Lissajous Knot preset.
 */
export function renderLissajousKnot(
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

  // Strictly calibrated boundary: maxOuterR * 1.4 <= 0.385 * minDim
  const minOuterR = minDim * 0.138;
  const maxOuterR = minDim * 0.262;
  const radius = (minOuterR + (maxOuterR - minOuterR) * macro) * (1 + 0.05 * oscA);

  // Continuous resonance derived smoothly from tension and prana bloom
  const resonance = motion.tension > 0.5 ? ((motion.tension - 0.5) / 0.5) * (0.5 + 0.5 * Math.sin(safeTime * 2.8)) : 0;

  // =========================================================================
  // LAYER 0: Subtle Radial Harmonic Glow Aura (Ethereal Depth)
  // =========================================================================
  if (typeof ctx.createRadialGradient === 'function' && macro > 0.08) {
    const auraR = radius * 1.25;
    const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, auraR);
    const coreAlpha = (0.035 + 0.045 * macro + 0.02 * resonance).toFixed(3);
    const midAlpha = (0.010 + 0.018 * macro).toFixed(3);
    grad.addColorStop(0, `${mono}${coreAlpha})`);
    grad.addColorStop(0.55, `${mono}${midAlpha})`);
    grad.addColorStop(1, `${mono}0.000)`);
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Precision reticle chrono precession
  const reticleRot = safeTime * 0.04;

  // =========================================================================
  // LAYER 1: Optical Polar Alignment & Perimeter Graduation Ring
  // =========================================================================
  // Subtle perimeter graduation ring with non-crossing micro ticks
  ctx.beginPath();
  ctx.lineWidth = 0.55;
  ctx.strokeStyle = `${mono}${(0.05 + 0.12 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, 0, radius * 1.02, 0, Math.PI * 2);
  ctx.stroke();

  // Perimeter micro ticks (outer perimeter only, never crossing center)
  const tickInner = radius * 1.00;
  const tickOuter = radius * 1.03;
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.06 + 0.18 * motion.luminance).toFixed(3)})`;
  for (let t = 0; t < 12; t++) {
    const tickAngle = reticleRot + (t * Math.PI) / 6;
    const cT = Math.cos(tickAngle);
    const sT = Math.sin(tickAngle);
    ctx.moveTo(tickInner * cT, tickInner * sT);
    ctx.lineTo(tickOuter * cT, tickOuter * sT);
  }
  ctx.stroke();

  // =========================================================================
  // LAYER 2: 3D Parametric Harmonograph Knot Coordinates Calculation
  // =========================================================================
  // Frequency harmonics: 3:4:5 3D Lissajous knot with smooth continuous stage twist
  const speed = 0.18;
  const baseTheta = safeTime * speed;
  const kineticTwist = 0.32 * motion.tension;

  const phaseX = baseTheta * 1.0 + kineticTwist;
  const phaseY = baseTheta * 0.75;
  const phaseZ = baseTheta * 1.25 + kineticTwist * 0.8;

  // Continuous monotonic forward rotational drive across all 4 stages (including Exhale):
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

  let stageYaw = 0;
  switch (params.stage) {
    case 'inhale':
      stageYaw = 2.80 * smoothP;
      break;
    case 'holdIn':
      stageYaw = 2.80 + 0.25 * smoothP + 0.010 * Math.sin(p * Math.PI) * Math.sin(safeTime * 1.8);
      break;
    case 'exhale':
      stageYaw = 3.05 + 2.80 * smoothP;
      break;
    case 'holdOut':
      stageYaw = 5.85 + (Math.PI * 2 - 5.85) * smoothP;
      break;
  }

  // 3D camera Euler tumbling & dynamic breath rotation torque
  const rollZ0 = safeTime * 0.15 + stageRotation;
  const yawY0 = safeTime * 0.12 + stageYaw;
  const tiltX0 = 0.42 + 0.15 * Math.sin(safeTime * 0.35);

  const cosRoll0 = Math.cos(rollZ0);
  const sinRoll0 = Math.sin(rollZ0);
  const cosYaw0 = Math.cos(yawY0);
  const sinYaw0 = Math.sin(yawY0);
  const cosTilt0 = Math.cos(tiltX0);
  const sinTilt0 = Math.sin(tiltX0);

  // Counter-chiral rotation angles for Beam 1 (Opposing twist for moire interference, continuing forward with exact 2*PI period)
  const rollZ1 = safeTime * -0.09 - stageRotation;
  const yawY1 = safeTime * -0.08 - stageYaw;
  const cosRoll1 = Math.cos(rollZ1);
  const sinRoll1 = Math.sin(rollZ1);
  const cosYaw1 = Math.cos(yawY1);
  const sinYaw1 = Math.sin(yawY1);

  // Smooth continuous topological scaling across all breath phases (Zero jumps)
  const rx = radius * (0.80 + 0.14 * motion.aperture);
  const ry = radius * (0.72 + 0.16 * motion.aperture);
  const rz = radius * (0.55 + 0.25 * motion.aperture);

  for (let s = 0; s <= KNOT_STEPS; s++) {
    const theta = s * STEP_ANGLE;

    // Beam 0 (Primary Beam)
    const x0 = rx * Math.sin(3 * theta + phaseX);
    const y0 = ry * Math.sin(4 * theta + phaseY);
    const z0 = rz * Math.cos(5 * theta + phaseZ);

    // Full 3D Euler isometric rotation: Yaw -> Tilt -> Roll
    const xYaw0 = x0 * cosYaw0 + z0 * sinYaw0;
    const zYaw0 = -x0 * sinYaw0 + z0 * cosYaw0;
    const yTilt0 = y0 * cosTilt0 - zYaw0 * sinTilt0;
    const zTilt0 = y0 * sinTilt0 + zYaw0 * cosTilt0;
    const xRot0 = xYaw0 * cosRoll0 - yTilt0 * sinRoll0;
    const yRot0 = xYaw0 * sinRoll0 + yTilt0 * cosRoll0;

    KNOT_X0[s] = xRot0;
    KNOT_Y0[s] = yRot0;
    KNOT_Z0[s] = zTilt0;

    // Beam 1 (Counter-Chiral Twin Interference Beam)
    const x1 = rx * Math.sin(3 * theta + phaseX + GOLDEN_PHASE);
    const y1 = ry * Math.sin(4 * theta + phaseY - GOLDEN_PHASE);
    const z1 = rz * Math.cos(5 * theta + phaseZ + GOLDEN_PHASE);

    const xYaw1 = x1 * cosYaw1 + z1 * sinYaw1;
    const zYaw1 = -x1 * sinYaw1 + z1 * cosYaw1;
    const yTilt1 = y1 * cosTilt0 - zYaw1 * sinTilt0;
    const zTilt1 = y1 * sinTilt0 + zYaw1 * cosTilt0;
    const xRot1 = xYaw1 * cosRoll1 - yTilt1 * sinRoll1;
    const yRot1 = xYaw1 * sinRoll1 + yTilt1 * cosRoll1;

    KNOT_X1[s] = xRot1;
    KNOT_Y1[s] = yRot1;
    KNOT_Z1[s] = zTilt1;
  }

  // =========================================================================
  // LAYER 3: Render Twin Counter-Chiral Beam (Delicate Moiré Interference)
  // =========================================================================
  const twinAlpha = (0.09 + 0.35 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${twinAlpha})`;

  for (let s = 0; s <= KNOT_STEPS; s++) {
    const px = KNOT_X1[s];
    const py = KNOT_Y1[s];
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // =========================================================================
  // LAYER 4: Render Primary Coherent Light Knot & Traveling Soliton Wavefronts
  // =========================================================================
  // 4A: Delicate Continuous Primary Light Knot
  ctx.beginPath();
  ctx.lineWidth = 0.85;
  const baseAlpha = (0.16 + 0.30 * motion.luminance).toFixed(3);
  ctx.strokeStyle = `${mono}${baseAlpha})`;

  for (let s = 0; s <= KNOT_STEPS; s++) {
    const px = KNOT_X0[s];
    const py = KNOT_Y0[s];
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 4B: Traveling Coherent Laser Energy Streams (Naturally gliding along the thin line)
  const pulseCount = 2;
  const pulseLengthSteps = 72; // Spans ~1/4 of the topological knot loop
  const travelSpeed = 0.16;

  const streamWidth = 1.45 + 0.40 * motion.tension;
  const streamAlpha = Math.min(0.98, 0.48 + 0.50 * motion.luminance).toFixed(3);

  ctx.lineWidth = streamWidth;
  ctx.strokeStyle = `${mono}${streamAlpha})`;

  for (let k = 0; k < pulseCount; k++) {
    const rawPhase = safeTime * travelSpeed + k * 0.5;
    const headFrac = ((rawPhase % 1.0) + 1.0) % 1.0;
    const headStep = headFrac * KNOT_STEPS;

    ctx.beginPath();
    for (let j = 0; j <= pulseLengthSteps; j++) {
      const sFloat = (headStep - j + KNOT_STEPS * 10) % KNOT_STEPS;
      const s0 = Math.floor(sFloat);
      const s1 = (s0 + 1) % KNOT_STEPS;
      const frac = sFloat - s0;

      const px = KNOT_X0[s0] * (1 - frac) + KNOT_X0[s1] * frac;
      const py = KNOT_Y0[s0] * (1 - frac) + KNOT_Y0[s1] * frac;

      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Luminous leading photon bead at the head of the stream
    const headIdx0 = Math.floor(headStep);
    const headIdx1 = (headIdx0 + 1) % KNOT_STEPS;
    const headFracStep = headStep - headIdx0;
    const hx = KNOT_X0[headIdx0] * (1 - headFracStep) + KNOT_X0[headIdx1] * headFracStep;
    const hy = KNOT_Y0[headIdx0] * (1 - headFracStep) + KNOT_Y0[headIdx1] * headFracStep;

    const beadR = 1.8 + 0.8 * motion.tension;
    ctx.beginPath();
    ctx.fillStyle = `${mono}${Math.min(0.98, 0.65 + 0.35 * motion.luminance).toFixed(3)})`;
    ctx.arc(hx, hy, beadR, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // LAYER 5: 8 Sacred Antinode Starlight Nodes (Harmonic Standing Intersections)
  // =========================================================================
  const nodeCount = 8;
  const nodeStepInterval = Math.floor(KNOT_STEPS / nodeCount);
  const nodeRadius = 1.6 + 0.9 * motion.tension;

  ctx.beginPath();
  ctx.fillStyle = `${mono}${Math.min(0.98, 0.42 + 0.52 * motion.luminance + 0.10 * resonance).toFixed(3)})`;
  for (let k = 0; k < nodeCount; k++) {
    const sIdx = (k * nodeStepInterval) % KNOT_STEPS;
    const nx = KNOT_X0[sIdx];
    const ny = KNOT_Y0[sIdx];
    ctx.moveTo(nx + nodeRadius, ny);
    ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
  }
  ctx.fill();

  // Concentric focal halos at 4 cardinal antinodes: continuous fade-in with tension
  if (motion.tension > 0.40) {
    const haloAlpha = (0.28 * ((motion.tension - 0.40) / 0.60)).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = `${mono}${haloAlpha})`;
    for (let k = 0; k < nodeCount; k += 2) {
      const sIdx = (k * nodeStepInterval) % KNOT_STEPS;
      const nx = KNOT_X0[sIdx];
      const ny = KNOT_Y0[sIdx];
      ctx.moveTo(nx + nodeRadius * 2.5, ny);
      ctx.arc(nx, ny, nodeRadius * 2.5, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 6: Central Laser Singularity Bindu Core (Anchor of Consciousness)
  // =========================================================================
  const coreAlpha = (0.80 + 0.20 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${mono}${coreAlpha})`;
  const centerRadius = 2.0 + 1.2 * motion.aperture;
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Micro reticle circle around center
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${(0.20 + 0.40 * motion.tension).toFixed(3)})`;
  ctx.arc(0, 0, centerRadius * 2.2, 0, Math.PI * 2);
  ctx.stroke();
}
