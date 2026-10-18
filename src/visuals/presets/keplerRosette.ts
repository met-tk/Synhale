/**
 * Kepler Rosette Preset (Group III - Cosmic, Planetary & Sacred Astronomical Math)
 *
 * Celestial Orbital Resonance Spirograph & Venus-Earth Harmonic Mandala:
 * 1. 13:8 Golden Astronomical Resonance Dance (The Pentagram of Venus)
 * 2. 72 Sacred Connecting Chords Weaving the Evolving Orbital Rosette
 * 3. Dual Resonant Orbitals with Keplerian Eccentricity & Apsidal Precession
 * 4. Inhale/Exhale Petal Blooming Dynamics (Sacred Astronomical Lotus)
 * 5. Luminous Planetary Nodes & Active Interplanetary Conjugation Beam
 *
 * 100% Pure Monochromatic Platinum Zinc / Obsidian Ink.
 * 60fps Zero-GC: Pure mathematical parametric loops and static scalar math.
 */

import type { VisualRenderParams } from '../../types';

const CHORD_SAMPLES = 72;
const RESONANCE_RATIO_NUMERATOR = 13;
const RESONANCE_RATIO_DENOMINATOR = 8;
const ORBIT_STEPS = 64;

export function renderKeplerRosette(
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

  // Outer orbital radius calibrated so peak holdIn reaches ~0.411 * minDim on screen
  // Strictly continuous across all stage transitions (driven by organic macro)
  const rOuterBase = minDim * (0.168 + 0.098 * motion.macro);
  const rInnerBase = rOuterBase * (0.56 + 0.08 * motion.aperture);

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
      stageRotation = 2.80 + 0.34 * smoothP + 0.012 * Math.sin(p * Math.PI) * Math.sin(safeTime * 2.0);
      break;
    case 'exhale':
      stageRotation = 3.14 + 2.80 * smoothP;
      break;
    case 'holdOut':
      stageRotation = 5.94 + (Math.PI * 2 - 5.94) * smoothP;
      break;
  }

  // Apsidal precession of the orbital axes
  const precessionAngle = safeTime * 0.12 + stageRotation;

  // Keplerian orbital speeds
  const omegaOuter = 0.22;

  // =========================================================================
  // LAYER 1: Dual Concentric Planetary Orbital Tracks
  // Elliptical pathways with subtle eccentricity modulated by breath tension
  // =========================================================================
  const eccentricity = 0.06 + 0.04 * motion.tension;

  // Outer planetary orbit track
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.12 + 0.18 * motion.luminance).toFixed(3)})`;
  for (let s = 0; s <= ORBIT_STEPS; s++) {
    const a = (s / ORBIT_STEPS) * Math.PI * 2 + precessionAngle;
    const r = rOuterBase * (1.0 - eccentricity * Math.cos(a - precessionAngle));
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (s === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Inner planetary orbit track
  ctx.beginPath();
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = `${mono}${(0.10 + 0.15 * motion.luminance).toFixed(3)})`;
  for (let s = 0; s <= ORBIT_STEPS; s++) {
    const a = (s / ORBIT_STEPS) * Math.PI * 2 + precessionAngle;
    const r = rInnerBase * (1.0 + eccentricity * 0.8 * Math.cos(a - precessionAngle));
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (s === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // =========================================================================
  // LAYER 2: 72 Sacred Connecting Chords (The Blooming Rosette Mandala)
  // Generating the sacred 5-petaled celestial flower envelope
  // =========================================================================
  const chordAlpha = (
    (0.12 + 0.38 * motion.luminance) *
    (0.85 + 0.15 * motion.tension)
  ).toFixed(3);

  ctx.beginPath();
  ctx.lineWidth = 0.65 + 0.35 * motion.tension;
  ctx.strokeStyle = `${mono}${chordAlpha})`;

  // Breath aperture subtly modulates the phase span of the mandala bloom
  const phaseSpan = Math.PI * 16.0; // 8 full outer revolutions for complete 13:8 closure
  for (let k = 0; k < CHORD_SAMPLES; k++) {
    const t = (k / CHORD_SAMPLES) * phaseSpan + safeTime * omegaOuter + stageRotation;

    const angleInner = t * (RESONANCE_RATIO_NUMERATOR / RESONANCE_RATIO_DENOMINATOR);
    const angleOuter = t;

    const r1 = rInnerBase * (1.0 + eccentricity * Math.cos(angleInner));
    const r2 = rOuterBase * (1.0 - eccentricity * Math.cos(angleOuter));

    const x1 = r1 * Math.cos(angleInner + precessionAngle);
    const y1 = r1 * Math.sin(angleInner + precessionAngle);

    const x2 = r2 * Math.cos(angleOuter + precessionAngle);
    const y2 = r2 * Math.sin(angleOuter + precessionAngle);

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  // =========================================================================
  // LAYER 3: 5 Rosette Cusp Antinodes (Golden Petal Apex Halos)
  // Resonant nodes where the chords converge at petal cusps
  // =========================================================================
  const numPetals = RESONANCE_RATIO_NUMERATOR - RESONANCE_RATIO_DENOMINATOR; // 13 - 8 = 5 petals!
  const cuspRadius = rOuterBase * 0.94;
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.45 + 0.45 * motion.luminance).toFixed(3)})`;
  for (let p = 0; p < numPetals; p++) {
    const petalAngle = (p * Math.PI * 2) / numPetals + precessionAngle + safeTime * omegaOuter * 0.5;
    const cx = cuspRadius * Math.cos(petalAngle);
    const cy = cuspRadius * Math.sin(petalAngle);

    ctx.moveTo(cx + 1.8, cy);
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
  }
  ctx.fill();

  // Subtle concentric halo around each petal cusp during holdIn/expansion
  if (motion.tension > 0.30) {
    const haloAlpha = (0.25 * ((motion.tension - 0.30) / 0.70)).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = `${mono}${haloAlpha})`;
    for (let p = 0; p < numPetals; p++) {
      const petalAngle = (p * Math.PI * 2) / numPetals + precessionAngle + safeTime * omegaOuter * 0.5;
      const cx = cuspRadius * Math.cos(petalAngle);
      const cy = cuspRadius * Math.sin(petalAngle);
      ctx.moveTo(cx + 4.5, cy);
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 4: Active Dual Planetary Nodes & Interplanetary Transit Beam
  // Real-time celestial bodies traveling along their tracks
  // =========================================================================
  const nowT = safeTime * omegaOuter;
  const angleInner = nowT * (RESONANCE_RATIO_NUMERATOR / RESONANCE_RATIO_DENOMINATOR);
  const currentInnerAngle = angleInner + precessionAngle;
  const currentOuterAngle = nowT + precessionAngle;

  const currentR1 = rInnerBase * (1.0 + eccentricity * Math.cos(angleInner));
  const currentR2 = rOuterBase * (1.0 - eccentricity * Math.cos(nowT));

  const planet1X = currentR1 * Math.cos(currentInnerAngle);
  const planet1Y = currentR1 * Math.sin(currentInnerAngle);

  const planet2X = currentR2 * Math.cos(currentOuterAngle);
  const planet2Y = currentR2 * Math.sin(currentOuterAngle);

  // Inner Planet Starlight Pearl
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.85 + 0.15 * motion.luminance).toFixed(3)})`;
  ctx.arc(planet1X, planet1Y, 2.2 + 0.6 * motion.tension, 0, Math.PI * 2);
  ctx.fill();

  // Outer Planet Starlight Pearl
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.90 + 0.10 * motion.luminance).toFixed(3)})`;
  ctx.arc(planet2X, planet2Y, 2.8 + 0.8 * motion.tension, 0, Math.PI * 2);
  ctx.fill();

  // Outer Planet orbit ring halo
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${mono}${(0.25 + 0.35 * motion.luminance).toFixed(3)})`;
  ctx.arc(planet2X, planet2Y, 5.5, 0, Math.PI * 2);
  ctx.stroke();

  // =========================================================================
  // LAYER 5: Central Stellar Core Anchor (Sun of the Celestial System)
  // =========================================================================
  const sunR = 2.4 + 1.2 * motion.aperture;

  // Luminous solar corona ring
  ctx.beginPath();
  ctx.lineWidth = 0.85;
  ctx.strokeStyle = `${mono}${(0.35 + 0.35 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, 0, sunR * 2.0, 0, Math.PI * 2);
  ctx.stroke();

  // Dense central star
  ctx.beginPath();
  ctx.fillStyle = `${mono}${(0.95 + 0.05 * motion.luminance).toFixed(3)})`;
  ctx.arc(0, 0, sunR, 0, Math.PI * 2);
  ctx.fill();
}
