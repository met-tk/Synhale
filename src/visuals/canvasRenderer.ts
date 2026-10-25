/**
 * Canvas 2D Sacred Geometry Rendering Engine (F15)
 * Zero-GC batching, DPR scaling, 60fps locked scheduling, dark/light theme support.
 */

import type { VisualRenderer, VisualRenderParams } from '../types';
import { PRESET_RENDERERS, ALL_PRESET_RENDERERS } from './presets';
import { evaluateOrganicBreathMotion } from './organicMotion';

/**
 * Sanitizes devicePixelRatio to prevent division by zero or non-positive scaling.
 */
export function sanitizeDPR(dpr: number): number {
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1.0;
}

/**
 * Clamps delta time to prevent massive jumps when waking from sleep or tab-out.
 */
export function clampDeltaTime(rawDtSeconds: number, maxDt = 0.1): number {
  const dt = Number.isFinite(rawDtSeconds) ? rawDtSeconds : 0.016;
  return Math.min(maxDt, Math.max(0.0, dt));
}

/**
 * Configures canvas internal resolution and CSS display size according to devicePixelRatio.
 */
export function setupCanvasDPI(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { width: number; height: number; dpr: number } {
  // Prefer parent container layout dimensions (e.g. <main>) to adapt seamlessly during window resizing
  let rect = canvas.getBoundingClientRect();
  const parent = canvas.parentElement;
  if (parent && parent !== document.body) {
    const parentRect = parent.getBoundingClientRect();
    if (parentRect.width > 0 && parentRect.height > 0) {
      rect = parentRect;
    }
  }
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const dpr = sanitizeDPR(rawDpr);

  const cssWidth = Math.max(0, rect.width);
  const cssHeight = Math.max(0, rect.height);

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  if (typeof ctx.resetTransform === 'function') {
    ctx.resetTransform();
  }
  if (typeof ctx.scale === 'function') {
    ctx.scale(dpr, dpr);
  }

  return { width: cssWidth, height: cssHeight, dpr };
}

/**
 * Calculates continuous time dilation rate for breath stages.
 * Slows time down gracefully during breath-hold stages (holdIn & holdOut) while maintaining C1 continuity.
 */
export function calculateTimeDilationRate(stage: VisualRenderParams['stage'], stageProgress: number): number {
  const p = Number.isFinite(stageProgress) ? Math.max(0, Math.min(1, stageProgress)) : 0;
  // Ease into the stage during the first 35% of the phase duration
  const easeIn = Math.min(1, p * 2.8);
  const sIn = easeIn * easeIn * (3 - 2 * easeIn);

  switch (stage) {
    case 'inhale':
      // Accelerates smoothly from Hold Out's low rate (0.22) back to normal flow (1.0)
      return 0.22 + 0.78 * sIn;
    case 'holdIn':
      // Decelerates smoothly from full flow (1.0) into suspended slow-motion (0.28)
      return 1.0 - 0.72 * sIn;
    case 'exhale':
      // Accelerates smoothly from Hold In's rate (0.28) back to full flow (1.0)
      return 0.28 + 0.72 * sIn;
    case 'holdOut':
      // Decelerates smoothly from full flow (1.0) down into meditative void stillness (0.22)
      return 1.0 - 0.78 * sIn;
    default:
      return 1.0;
  }
}

const GUIDE_DASH = [4, 6];
const SOLID_DASH: number[] = [];

export class CanvasRenderer implements VisualRenderer {
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;

  /**
   * Resets the rendering engine state and stops any active animation loop.
   */
  reset(): void {
    this.stop();
    this.elapsedTime = 0;
    this.lastTimestamp = 0;
  }

  /**
   * Starts a 60fps requestAnimationFrame render loop with dynamic parameter evaluation.
   */
  start(canvas: HTMLCanvasElement, getParams: () => VisualRenderParams): void {
    this.stop();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : 0;

    const loop = (timestamp: number) => {
      const rawDt = this.lastTimestamp > 0 ? (timestamp - this.lastTimestamp) / 1000 : 0.016;
      const dt = clampDeltaTime(rawDt);
      this.lastTimestamp = timestamp;

      const params = getParams();
      const dilation = calculateTimeDilationRate(params.stage, params.stageProgress);
      this.elapsedTime += dt * dilation;

      this.render(ctx, params);

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this.animationFrameId = window.requestAnimationFrame(loop);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  /**
   * Stops the active animation frame loop cleanly.
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
  }

  /**
   * Renders a single frame onto the Canvas 2D context.
   */
  render(ctx: CanvasRenderingContext2D, params: VisualRenderParams): void {
    const { width, height, isDarkTheme, preset } = params;

    // Handle 0x0 canvas dimensions safely
    if (width <= 0 || height <= 0) {
      return;
    }

    ctx.save();

    // 1. Fill background with theme color (soft palette tint when provided)
    const bgColor = params.background ?? (isDarkTheme ? '#09090b' : '#fcfbf9');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Coordinate transformation: Translate origin to center of viewport
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);

    // 2a. Dynamic organic breath scaling & motion evaluation
    const organicMotion = params.organicMotion ?? evaluateOrganicBreathMotion(
      params.stage,
      params.stageProgress,
      params.breathMacro,
      this.elapsedTime,
      params.oscAActivity,
      params.oscBActivity,
      params.isDarkTheme
    );
    params.organicMotion = organicMotion;

    // 2b. Maximum Expansion Guide Boundary (Fixed Reference Horizon)
    if (params.showMaxBoundary && !params.hideBoundaryGuide) {
      this.renderMaxExpansionGuide(ctx, params);
    }

    // 3. Dynamic breath scaling: 1.0 to 1.4 scale factor
    const globalScale = 1.0 + 0.4 * organicMotion.macro;
    ctx.scale(globalScale, globalScale);

    // 4. Render selected Sacred Geometry or Monochrome Optical preset
    const renderPreset = ALL_PRESET_RENDERERS[preset] || PRESET_RENDERERS.minimalRing;
    renderPreset(ctx, params, this.elapsedTime);

    ctx.restore();
  }

  /**
   * Renders the Maximum Expansion Guide Boundary (Instrument Horizon Reticle)
   * Indicates to the practitioner the maximum target volume of full inhalation.
   */
  private renderMaxExpansionGuide(ctx: CanvasRenderingContext2D, params: VisualRenderParams): void {
    const { width, height, isDarkTheme, breathMacro, stage } = params;
    const minDim = Math.min(width, height);
    if (minDim <= 0) return;

    // Maximum expansion horizon radius (centered in viewport)
    const maxRadius = minDim * 0.40;
    const motion = params.organicMotion;
    const macro = motion ? motion.macro : Math.max(0, Math.min(1, breathMacro));
    const luminance = motion ? motion.luminance : (0.6 + 0.4 * macro);

    const baseStroke = isDarkTheme ? 'rgba(228, 228, 231, ' : 'rgba(39, 39, 42, ';
    const glowColor = baseStroke;
    const hasLineDash = typeof ctx.setLineDash === 'function';

    // 1. Dashed precision guide ring
    const guideAlpha = (0.10 + 0.14 * luminance).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    if (hasLineDash) {
      ctx.setLineDash(GUIDE_DASH);
    }
    ctx.strokeStyle = `${baseStroke}${guideAlpha})`;
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (hasLineDash) {
      ctx.setLineDash(SOLID_DASH);
    }

    // 2. Proximity glow ring when approaching peak inhale or in holdIn
    if (macro > 0.8 || stage === 'holdIn') {
      const proximity = stage === 'holdIn' ? 1.0 : (macro - 0.8) / 0.2;
      const glowAlpha = (0.15 + 0.25 * proximity * luminance).toFixed(3);
      ctx.beginPath();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = `${glowColor}${glowAlpha})`;
      ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Four cardinal precision notches (0, 90, 180, 270 deg)
    const tickLen = 6;
    const tickAlpha = (0.2 + 0.2 * macro).toFixed(3);
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = `${baseStroke}${tickAlpha})`;

    // North, South, East, West notches
    ctx.moveTo(maxRadius - tickLen / 2, 0);
    ctx.lineTo(maxRadius + tickLen / 2, 0);

    ctx.moveTo(-maxRadius - tickLen / 2, 0);
    ctx.lineTo(-maxRadius + tickLen / 2, 0);

    ctx.moveTo(0, maxRadius - tickLen / 2);
    ctx.lineTo(0, maxRadius + tickLen / 2);

    ctx.moveTo(0, -maxRadius - tickLen / 2);
    ctx.lineTo(0, -maxRadius + tickLen / 2);

    ctx.stroke();
  }
}
