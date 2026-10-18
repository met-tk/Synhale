/**
 * Corona Orbit Preset — Pure Monochrome 5-Tier Optical Architecture
 *
 * Layer 0 (Gossamer Veil): Multi-tier translucent breath discs & radial optical aura
 * Layer 1 (Deep Vernier Grid): 72-tick micro-chronometer scale with active phase sweep
 * Layer 2 (Silk Echo Filaments): 10 phase-shifted harmonic echo rings (0.5px hairline)
 * Layer 3 (Primary Harmonic Rings): 5 golden-ratio breathing rings + active breath phase arc
 * Layer 4 (Specular Orbital Satellites): Counter-rotating orbital nodes with comet trails & Bindu core
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

export const NUM_CORONA_RINGS = 5;
const VERNIER_TICKS = 72;
const ECHO_STEPS = 96;
const ECHO_STEP_ANGLE = (Math.PI * 2) / ECHO_STEPS;

// Precomputed trigonometric lookup tables for zero-GC 60fps rendering
const VERNIER_COS = new Float64Array(VERNIER_TICKS);
const VERNIER_SIN = new Float64Array(VERNIER_TICKS);
for (let i = 0; i < VERNIER_TICKS; i++) {
  const a = (i * Math.PI * 2) / VERNIER_TICKS - Math.PI / 2;
  VERNIER_COS[i] = Math.cos(a);
  VERNIER_SIN[i] = Math.sin(a);
}

const ECHO_COS = new Float64Array(ECHO_STEPS + 1);
const ECHO_SIN = new Float64Array(ECHO_STEPS + 1);
for (let i = 0; i <= ECHO_STEPS; i++) {
  const a = i * ECHO_STEP_ANGLE;
  ECHO_COS[i] = Math.cos(a);
  ECHO_SIN[i] = Math.sin(a);
}

const GOLDEN_RATIOS = [0.382, 0.528, 0.685, 0.842, 1.0] as const;
const ORBIT_SPEEDS = [0.42, -0.31, 0.24, -0.18, 0.13] as const;

export function renderCoronaOrbit(
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
  const oscA = Number.isFinite(params.oscAActivity) ? Math.max(0, Math.min(1, params.oscAActivity)) : 0;

  // Pure monochrome ink: Platinum Zinc in dark mode, Obsidian Ink in light mode
  const mono = params.isDarkTheme ? 'rgba(244, 244, 245, ' : 'rgba(24, 24, 27, ';

  // Calibrated so at macro=1.0 (with CanvasRenderer globalScale=1.4), max radius reaches ~0.282 * minDim -> 0.395 * minDim
  const minOuterR = minDim * 0.145;
  const maxOuterR = minDim * 0.268;
  const outerR = minOuterR + (maxOuterR - minOuterR) * macro;

  // Continuous resonance derived smoothly from tension (Zero stage jump)
  const resonancePulse = motion.tension > 0.45 ? ((motion.tension - 0.45) / 0.55) * (0.5 + 0.5 * Math.sin(safeTime * 2.8)) : 0;

  // --- LAYER 0: Gossamer Corona Veils (Ultra-low alpha monochrome depth discs) ---
  if (typeof ctx.createRadialGradient === 'function') {
    const gradR = Math.max(4, outerR * 1.08);
    const grad = ctx.createRadialGradient(0, 0, gradR * 0.04, 0, 0, gradR);
    const coreVeilAlpha = (0.035 + 0.045 * macro + 0.02 * resonancePulse).toFixed(3);
    const midVeilAlpha = (0.015 + 0.022 * macro).toFixed(3);
    grad.addColorStop(0, `${mono}${coreVeilAlpha})`);
    grad.addColorStop(0.55, `${mono}${midVeilAlpha})`);
    grad.addColorStop(1, `${mono}0.000)`);
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(0, 0, gradR, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let v = 0; v < 3; v++) {
    const veilR = outerR * (0.35 + v * 0.26);
    const veilAlpha = (0.014 + 0.012 * macro * (1 - v * 0.25)).toFixed(3);
    ctx.beginPath();
    ctx.fillStyle = `${mono}${veilAlpha})`;
    ctx.arc(0, 0, Math.max(0.5, veilR), 0, Math.PI * 2);
    ctx.fill();
  }

  // --- LAYER 1: 72-Tick Vernier Micro-Chronometer ---
  const vernierR = outerR * 1.045;
  const sweepProgress =
    params.stage === 'inhale'
      ? motion.aperture
      : params.stage === 'holdIn'
        ? 1.0
        : params.stage === 'exhale'
          ? Math.pow(1.0 - progress, 1.4)
          : 0.0;

  const continuousActiveTick = sweepProgress * VERNIER_TICKS;
  const activeFullTicks = Math.floor(continuousActiveTick);
  const leadingTickAlphaFrac = continuousActiveTick - activeFullTicks;
  const minHairline = params.dpr >= 2 ? 0.45 : 0.70;

  // Batch 1A: Base hairline vernier ticks
  ctx.beginPath();
  ctx.lineWidth = Math.max(minHairline, 0.55);
  const baseTickAlpha = 0.07 + 0.12 * motion.luminance;
  ctx.strokeStyle = `${mono}${baseTickAlpha.toFixed(3)})`;
  for (let i = 0; i < VERNIER_TICKS; i++) {
    const isMajor = i % 6 === 0;
    const innerT = vernierR - (isMajor ? 4.5 : 2.2);
    const outerT = vernierR + (isMajor ? 2.5 : 1.0);
    ctx.moveTo(innerT * VERNIER_COS[i], innerT * VERNIER_SIN[i]);
    ctx.lineTo(outerT * VERNIER_COS[i], outerT * VERNIER_SIN[i]);
  }
  ctx.stroke();

  // Batch 1B: Illuminated active sweep vernier ticks (smooth sub-pixel sweep)
  if (continuousActiveTick > 0.01) {
    ctx.beginPath();
    ctx.lineWidth = Math.max(minHairline * 1.3, 0.85);
    const activeTickAlpha = 0.38 + 0.28 * macro + 0.12 * resonancePulse;

    for (let i = 0; i <= activeFullTicks && i < VERNIER_TICKS; i++) {
      const isMajor = i % 6 === 0;
      const innerT = vernierR - (isMajor ? 5.5 : 3.0);
      const outerT = vernierR + (isMajor ? 3.2 : 1.5);
      const tickAlpha = (i === activeFullTicks ? activeTickAlpha * leadingTickAlphaFrac : activeTickAlpha);
      if (tickAlpha > 0.02) {
        ctx.strokeStyle = `${mono}${tickAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(innerT * VERNIER_COS[i], innerT * VERNIER_SIN[i]);
        ctx.lineTo(outerT * VERNIER_COS[i], outerT * VERNIER_SIN[i]);
        ctx.stroke();
      }
    }
  }

  // --- LAYER 2: Silk Phase-Shifted Harmonic Echo Filaments (Moiré Interference) ---
  const waveAmp = outerR * (0.008 + 0.018 * macro + 0.006 * oscA);
  for (let pair = 0; pair < 2; pair++) {
    const sign = pair === 0 ? 1 : -1;
    const echoAlpha = ((0.08 + 0.18 * motion.luminance) * (pair === 0 ? 1 : 0.72)).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = Math.max(minHairline, 0.55);
    ctx.strokeStyle = `${mono}${echoAlpha})`;

    for (let i = 0; i < NUM_CORONA_RINGS; i++) {
      const ringR = outerR * GOLDEN_RATIOS[i];
      const phase = safeTime * (0.7 + i * 0.22) * sign + i * 1.1;

      for (let s = 0; s <= ECHO_STEPS; s++) {
        const theta = s * ECHO_STEP_ANGLE;
        const harmonic =
          Math.sin(3 * theta + phase) * 0.65 +
          Math.cos(5 * theta - phase * 1.3) * 0.35;
        const r = Math.max(1, ringR + waveAmp * harmonic * (0.5 + 0.5 * GOLDEN_RATIOS[i]));
        const x = r * ECHO_COS[s];
        const y = r * ECHO_SIN[s];
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.stroke();
  }

  // --- LAYER 3: 5 Primary Golden-Ratio Breathing Rings & Phase Chronometer Arc ---
  for (let i = 0; i < NUM_CORONA_RINGS; i++) {
    const layerMacro = motion.getLayerMacro(i, NUM_CORONA_RINGS);
    const layerOuterR = minOuterR + (maxOuterR - minOuterR) * layerMacro;
    const ratio = GOLDEN_RATIOS[i];
    // Pure stable orbital ring radius without micro-jittering
    const ringR = Math.max(1, layerOuterR * ratio);

    // Depth-graded luminance: inner rings and outermost horizon ring have distinct visual weight
    const depthWeight = i === 0 ? 0.92 : i === NUM_CORONA_RINGS - 1 ? 0.85 : 0.42 + 0.25 * (1 - i / NUM_CORONA_RINGS);
    const alpha = Math.max(0.08, Math.min(0.96, depthWeight * motion.luminance));

    ctx.beginPath();
    const lineBoost = i === NUM_CORONA_RINGS - 1 ? 0.40 * motion.tension : 0;
    ctx.lineWidth = (i === 0 ? 1.55 : 0.85 + 0.55 * (1 - i / NUM_CORONA_RINGS)) + lineBoost;
    ctx.strokeStyle = `${mono}${alpha.toFixed(3)})`;
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Active Breath Phase Sweep Arc on outermost ring
  const sweepFraction = sweepProgress;

  if (sweepFraction > 0.005) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + sweepFraction * Math.PI * 2;
    ctx.beginPath();
    ctx.lineWidth = 1.9;
    const arcAlpha = (0.68 + 0.28 * macro).toFixed(3);
    ctx.strokeStyle = `${mono}${arcAlpha})`;
    ctx.arc(0, 0, outerR, startAngle, endAngle);
    ctx.stroke();
  }

  // --- LAYER 4: Counter-Rotating Orbital Satellites, Comet Trails & Central Bindu ---
  for (let i = 0; i < NUM_CORONA_RINGS; i++) {
    const ringR = outerR * GOLDEN_RATIOS[i];
    const baseAngle = safeTime * ORBIT_SPEEDS[i] + i * ((Math.PI * 2) / NUM_CORONA_RINGS);
    const kineticLead = (ORBIT_SPEEDS[i] > 0 ? 1 : -1) * (0.22 * motion.tension);
    const satAngle = baseAngle + kineticLead;
    const sx = ringR * Math.cos(satAngle);
    const sy = ringR * Math.sin(satAngle);

    // Subtle comet tail arc trailing behind each satellite
    const tailArcLen = (0.22 + 0.28 * macro) * (ORBIT_SPEEDS[i] > 0 ? -1 : 1);
    ctx.beginPath();
    ctx.lineWidth = 1.1;
    const tailAlpha = (0.16 + 0.35 * motion.luminance).toFixed(3);
    ctx.strokeStyle = `${mono}${tailAlpha})`;
    ctx.arc(
      0,
      0,
      ringR,
       tailArcLen < 0 ? satAngle + tailArcLen : satAngle,
      tailArcLen < 0 ? satAngle : satAngle + tailArcLen
    );
    ctx.stroke();

    // Outer optical reticle halo on satellite
    const haloR = i === NUM_CORONA_RINGS - 1 ? 4.4 : 3.4;
    ctx.beginPath();
    ctx.lineWidth = 0.7;
    const haloAlpha = (0.28 + 0.45 * motion.luminance).toFixed(3);
    ctx.strokeStyle = `${mono}${haloAlpha})`;
    ctx.arc(sx, sy, haloR * (1 + 0.15 * resonancePulse), 0, Math.PI * 2);
    ctx.stroke();

    // Specular satellite core
    ctx.beginPath();
    const coreAlpha = (0.65 + 0.35 * motion.luminance).toFixed(3);
    ctx.fillStyle = `${mono}${coreAlpha})`;
    ctx.arc(sx, sy, i === 0 ? 2.1 : 1.65, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Bindu Precision Anchor (Double-ring + luminous seed)
  const binduOuterR = 6.5 * (1 + 0.35 * macro);
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${(0.35 + 0.35 * macro).toFixed(3)})`;
  ctx.arc(0, 0, binduOuterR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.85 + 0.15 * macro).toFixed(3)})`;
  ctx.arc(0, 0, 2.4 * (1 + 0.25 * macro), 0, Math.PI * 2);
  ctx.fill();
}
