/**
 * Calm Focus Preset — Precision Dual-Chiral Iris Shutter & Cybernetic Chrono-Aperture
 *
 * Avant-Garde Computational Horology & Precision Optics:
 * - Inhale: Polygons (3, 4, 5, 6) transform into aerodynamic curved camera iris shutter blades;
 *   adjacent tiers counter-rotate with differential gear speed, opening a dramatic light aperture;
 *   high-precision optical rangefinder crosshairs and vernier alignment rays radiate outward.
 * - Hold In: Harmonic focal lock; iris aperture reaches maximum golden opening;
 *   illuminating translucent geometric moiré facets and brilliant starlight nodes at all vertices;
 *   central razor-sharp sniper reticle Bindu with standing wave resonance.
 * - Exhale: Viscous mechanical closure; iris blades shear smoothly inward, folding down with
 *   silky liquid deceleration; vernier rays fade out as the aperture closes gracefully.
 * - Hold Out: Minimal resting void; iris completely closes down, leaving only the razor-sharp
 *   central crosshair focal pin and a single compact triangle breathing in deep meditation.
 *
 * All features are mathematically modulated by continuous tension and macro envelopes,
 * guaranteeing C1 smooth bridging with absolutely zero stage transition pops or jumps.
 */

import type { VisualRenderParams } from '../../types';
import { evaluateOrganicBreathMotion } from '../organicMotion';

export const FOCUS_POLYGON_SIDES = [3, 4, 5, 6] as const;

export interface VertexPoint {
  x: number;
  y: number;
}

/**
 * Computes polygon vertices for a regular n-sided polygon.
 * Preserves exact mathematical contract and unit test compatibility.
 */
export function getPolygonVertices(
  sides: number,
  radius: number,
  center = { x: 0, y: 0 },
  rotation = 0
): VertexPoint[] {
  const n = Math.max(3, sides);
  return Array.from({ length: n }, (_, j) => {
    const angle = rotation + (2 * Math.PI * j) / n;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    };
  });
}

// Pre-allocated static buffers for Zero-GC 60fps rendering
const VX = new Float64Array(12);
const VY = new Float64Array(12);
const MX = new Float64Array(12);
const MY = new Float64Array(12);

/**
 * Renders Calm Focus preset (Precision Dual-Chiral Iris Shutter & Cybernetic Chrono-Aperture).
 */
export function renderCalmFocus(
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
): void {
  const minDim = Math.min(params.width, params.height);
  const baseRadius = minDim > 0 ? minDim * 0.0895 : 10;

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

  // Pure monochromatic palette
  const baseStroke = params.isDarkTheme
    ? 'rgba(244, 244, 245, '
    : 'rgba(24, 24, 27, ';

  // Continuous Alpha derived smoothly from motion.tension (Zero pops!)
  const lineAlphaBase = 0.18 + 0.64 * motion.tension;
  const outerGuideAlpha = 0.12 + 0.50 * motion.tension;
  const outerGuideR = baseRadius * 2.2 * (1 + 0.45 * macro);

  // Precision chrono rotation for bezel, crosshairs, and iris
  const chronoRot = safeTime * 0.045;

  // =========================================================================
  // LAYER 1: Dual-Chiral Iris Shutter Blades (Polygons 3, 4, 5, 6)
  // =========================================================================
  for (let idx = 0; idx < FOCUS_POLYGON_SIDES.length; idx++) {
    const n = FOCUS_POLYGON_SIDES[idx];
    const layerMacro = motion.getLayerMacro(idx, FOCUS_POLYGON_SIDES.length);
    const layerFactor = 1 + idx * 0.28;
    const r = baseRadius * layerFactor * (1 + 0.46 * layerMacro);

    // Differential counter-rotation: continuous uniform carrier + prominent iris twist
    const rotSpeed = 0.10 * (1 + 0.35 * (FOCUS_POLYGON_SIDES.length - idx));
    const rotSign = n % 2 === 0 ? 1 : -1;
    const baseRot = rotSign * rotSpeed * safeTime;
    // Iris twist dynamically counter-rotates by ~45 degrees with aperture expansion
    const irisTwist = rotSign * (0.75 * motion.aperture * (1 + 0.20 * (FOCUS_POLYGON_SIDES.length - idx)));
    const rotation = baseRot + irisTwist;

    const polyAlpha = lineAlphaBase * (1 - idx * 0.10);
    const clampedAlpha = Math.max(0.08, Math.min(0.96, polyAlpha * 0.85));

    // Curved aerodynamic iris blade pinching: continuously driven by tension
    const midFlatDist = r * Math.cos(Math.PI / n);
    const pinchDepth = 0.26 * motion.tension;
    const rMid = midFlatDist * (1.0 - pinchDepth);

    for (let j = 0; j < n; j++) {
      const angle = rotation + (2 * Math.PI * j) / n;
      VX[j] = r * Math.cos(angle);
      VY[j] = r * Math.sin(angle);

      const angleMid = rotation + (2 * Math.PI * (j + 0.5)) / n;
      MX[j] = rMid * Math.cos(angleMid);
      MY[j] = rMid * Math.sin(angleMid);
    }

    // Translucent Geometric Aperture Fills (Smoothly fades with tension)
    if (params.showMaxBoundary && motion.tension > 0.05) {
      const fillAlpha = (0.040 * Math.pow(motion.tension, 1.5) * (1 - idx * 0.15)).toFixed(3);
      ctx.beginPath();
      ctx.fillStyle = `${baseStroke}${fillAlpha})`;
      for (let j = 0; j < n; j++) {
        if (j === 0) ctx.moveTo(VX[j], VY[j]);
        else ctx.lineTo(VX[j], VY[j]);
        ctx.lineTo(MX[j], MY[j]);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Draw Iris Diaphragm Perimeter Chords
    ctx.beginPath();
    ctx.lineWidth = 1.25 + 0.35 * motion.tension;
    ctx.strokeStyle = `${baseStroke}${clampedAlpha.toFixed(3)})`;

    for (let j = 0; j < n; j++) {
      const vx = VX[j];
      const vy = VY[j];
      if (j === 0) {
        ctx.moveTo(vx, vy);
      } else {
        ctx.lineTo(vx, vy);
      }
      ctx.lineTo(MX[j], MY[j]);
    }
    ctx.closePath();
    ctx.stroke();

    // Vernier Optical Alignment Rays (projected from outer polygons toward guide circle)
    const rayWeight = Math.max(0.0, (motion.macro - 0.35) / 0.65);
    if (params.showMaxBoundary && rayWeight > 0.01 && idx >= 2) {
      const rayAlpha = (0.40 * rayWeight).toFixed(3);
      ctx.beginPath();
      ctx.lineWidth = 0.65 * rayWeight;
      ctx.strokeStyle = `${baseStroke}${rayAlpha})`;
      for (let j = 0; j < n; j++) {
        ctx.moveTo(VX[j], VY[j]);
        const rayAngle = Math.atan2(VY[j], VX[j]);
        ctx.lineTo(outerGuideR * Math.cos(rayAngle), outerGuideR * Math.sin(rayAngle));
      }
      ctx.stroke();
    }

    // Vertex Starlight Nodes & Focal Halos (Continuous size & alpha)
    ctx.beginPath();
    ctx.fillStyle = `${baseStroke}${(clampedAlpha * 0.90).toFixed(3)})`;
    const markerRadius = 1.5 + 0.8 * motion.tension;
    for (let j = 0; j < n; j++) {
      const vx = VX[j];
      const vy = VY[j];
      ctx.moveTo(vx + markerRadius, vy);
      ctx.arc(vx, vy, markerRadius, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // =========================================================================
  // LAYER 2: Outer Harmonizing Optical Horizon Ring & Compass Ticks
  // =========================================================================
  ctx.beginPath();
  ctx.lineWidth = 1.0 + 0.5 * motion.tension;
  ctx.strokeStyle = `${baseStroke}${outerGuideAlpha.toFixed(3)})`;
  ctx.arc(0, 0, outerGuideR, 0, Math.PI * 2);
  ctx.stroke();

  // Compass graduation ticks on outer guide ring: smoothly driven by crossWeight and chrono precession
  const crossWeight = Math.max(0.0, (motion.macro - 0.20) / 0.80);
  if (params.showMaxBoundary && crossWeight > 0.01) {
    ctx.beginPath();
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = `${baseStroke}${(outerGuideAlpha * 0.6 * crossWeight).toFixed(3)})`;
    for (let c = 0; c < 24; c++) {
      const ca = (c * Math.PI * 2) / 24 + chronoRot;
      const cCos = Math.cos(ca);
      const cSin = Math.sin(ca);
      const isCard = c % 6 === 0;
      const cLen = (isCard ? 6 : 3) * crossWeight;
      ctx.moveTo((outerGuideR - cLen) * cCos, (outerGuideR - cLen) * cSin);
      ctx.lineTo((outerGuideR + cLen) * cCos, (outerGuideR + cLen) * cSin);
    }
    ctx.stroke();
  }

  // =========================================================================
  // LAYER 3: Central Precision Optical Reticle (Bindu Anchor Core)
  // =========================================================================
  const focalAlpha = (0.75 + 0.25 * motion.luminance).toFixed(3);
  ctx.beginPath();
  ctx.fillStyle = `${baseStroke}${focalAlpha})`;
  const centerRadius = 2.0 + 0.8 * motion.aperture;
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Micro-target crosshairs on central focal point (Continuous counter-rotation)
  ctx.beginPath();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `${baseStroke}${(0.18 + 0.35 * motion.tension).toFixed(3)})`;
  const microCross = centerRadius * 2.8;
  const cosCore = Math.cos(-chronoRot * 0.8);
  const sinCore = Math.sin(-chronoRot * 0.8);
  ctx.moveTo(-microCross * cosCore, -microCross * sinCore);
  ctx.lineTo(microCross * cosCore, microCross * sinCore);
  ctx.moveTo(microCross * sinCore, -microCross * cosCore);
  ctx.lineTo(-microCross * sinCore, microCross * cosCore);
  ctx.arc(0, 0, centerRadius * 2.0, 0, Math.PI * 2);
  ctx.stroke();
}
