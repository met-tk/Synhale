import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CanvasRenderer,
  setupCanvasDPI,
  sanitizeDPR,
  clampDeltaTime,
  calculateTimeDilationRate
} from '../../../src/visuals/canvasRenderer';
import type { VisualRenderParams } from '../../../src/types';

describe('CanvasRenderer Unit Tests', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    // Mock getBoundingClientRect
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600
    });

    const mockCtx = {
      scale: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      closePath: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D;

    canvas.getContext = vi.fn().mockReturnValue(mockCtx);
    ctx = mockCtx;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    vi.restoreAllMocks();
  });

  it('setupCanvasDPI scales canvas buffer and applies scale transform', () => {
    const originalDpr = window.devicePixelRatio;
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2.5, configurable: true });

      const result = setupCanvasDPI(canvas, ctx);

      expect(result.dpr).toBe(2.5);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(canvas.width).toBe(2000);
      expect(canvas.height).toBe(1500);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
      expect(ctx.resetTransform).toHaveBeenCalled();
      expect(ctx.scale).toHaveBeenCalledWith(2.5, 2.5);
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, configurable: true });
    }
  });

  it('setupCanvasDPI adapts dynamically to parent container resizing', () => {
    const originalDpr = window.devicePixelRatio;
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: 1.0, configurable: true });

      const parent = document.createElement('main');
      parent.getBoundingClientRect = vi.fn(() => ({
        width: 1440,
        height: 900,
        top: 48,
        left: 0,
        right: 1440,
        bottom: 948,
        x: 0,
        y: 48,
        toJSON: () => {}
      }));
      parent.appendChild(canvas);

      const result = setupCanvasDPI(canvas, ctx);
      expect(result.width).toBe(1440);
      expect(result.height).toBe(900);
      expect(canvas.width).toBe(1440);
      expect(canvas.height).toBe(900);
      expect(canvas.style.width).toBe('1440px');
      expect(canvas.style.height).toBe('900px');
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, configurable: true });
    }
  });

  it('sanitizeDPR handles boundary inputs safely', () => {
    expect(sanitizeDPR(0)).toBe(1.0);
    expect(sanitizeDPR(-3.5)).toBe(1.0);
    expect(sanitizeDPR(NaN)).toBe(1.0);
    expect(sanitizeDPR(2.0)).toBe(2.0);
  });

  it('clampDeltaTime prevents massive jumps from sleep/background tab', () => {
    expect(clampDeltaTime(5.0)).toBe(0.1);
    expect(clampDeltaTime(0.016)).toBeCloseTo(0.016, 4);
    expect(clampDeltaTime(-0.5)).toBe(0.0);
  });

  it('renders centered coordinates and theme background for dark theme', () => {
    const renderer = new CanvasRenderer();
    let fillStyleAtRect: string | CanvasGradient | CanvasPattern = '';
    ctx.fillRect = vi.fn().mockImplementation(() => {
      fillStyleAtRect = ctx.fillStyle;
    });

    const params: VisualRenderParams = {
      width: 800,
      height: 600,
      dpr: 1,
      breathMacro: 0.5,
      stage: 'inhale',
      stageProgress: 0.5,
      isDarkTheme: true,
      preset: 'minimalRing',
      oscAActivity: 0.2,
      oscBActivity: 0.1
    };

    renderer.render(ctx, params);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(fillStyleAtRect).toBe('#09090b');
    expect(ctx.translate).toHaveBeenCalledWith(400, 300);
    // Breath macro 0.5 -> global scale 1.0 + 0.4 * 0.5 = 1.2
    expect(ctx.scale).toHaveBeenCalledWith(1.2, 1.2);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('renders warm sand background for light theme', () => {
    const renderer = new CanvasRenderer();
    let fillStyleAtRect: string | CanvasGradient | CanvasPattern = '';
    ctx.fillRect = vi.fn().mockImplementation(() => {
      fillStyleAtRect = ctx.fillStyle;
    });

    const params: VisualRenderParams = {
      width: 1000,
      height: 800,
      dpr: 2,
      breathMacro: 1.0,
      stage: 'holdIn',
      stageProgress: 0.2,
      isDarkTheme: false,
      preset: 'sacredGeometry',
      oscAActivity: 0.0,
      oscBActivity: 0.0
    };

    renderer.render(ctx, params);

    expect(fillStyleAtRect).toBe('#fcfbf9');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 800);
    expect(ctx.translate).toHaveBeenCalledWith(500, 400);
    // Macro 1.0 -> global scale 1.4
    expect(ctx.scale).toHaveBeenCalledWith(1.4, 1.4);
  });

  it('safely skips rendering on zero-dimension canvas', () => {
    const renderer = new CanvasRenderer();
    const params: VisualRenderParams = {
      width: 0,
      height: 0,
      dpr: 1,
      breathMacro: 0.0,
      stage: 'holdOut',
      stageProgress: 0.0,
      isDarkTheme: true,
      preset: 'zenWaves',
      oscAActivity: 0.0,
      oscBActivity: 0.0
    };

    renderer.render(ctx, params);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.translate).not.toHaveBeenCalled();
  });

  it('start, stop, and reset lifecycle cleanly schedules and cancels animation frames', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const renderer = new CanvasRenderer();
    const getParams = () => ({
      width: 800,
      height: 600,
      dpr: 1,
      breathMacro: 0.5,
      stage: 'inhale' as const,
      stageProgress: 0.5,
      isDarkTheme: true,
      preset: 'calmFocus' as const,
      oscAActivity: 0,
      oscBActivity: 0
    });

    renderer.start(canvas, getParams);
    expect(rafSpy).toHaveBeenCalled();

    renderer.stop();
    expect(cafSpy).toHaveBeenCalledWith(42);

    renderer.reset();
    expect(cafSpy).toHaveBeenCalled();
  });

  describe('calculateTimeDilationRate (Bullet-Time Suspension)', () => {
    it('slows time flow down to ~0.28 during holdIn and ~0.22 during holdOut', () => {
      // Mid-stage evaluations
      const inhaleRate = calculateTimeDilationRate('inhale', 0.5);
      const holdInRate = calculateTimeDilationRate('holdIn', 0.5);
      const exhaleRate = calculateTimeDilationRate('exhale', 0.5);
      const holdOutRate = calculateTimeDilationRate('holdOut', 0.5);

      expect(inhaleRate).toBeCloseTo(1.0, 2);
      expect(holdInRate).toBeCloseTo(0.28, 2);
      expect(exhaleRate).toBeCloseTo(1.0, 2);
      expect(holdOutRate).toBeCloseTo(0.22, 2);
    });

    it('strictly satisfies C1 boundary continuity with zero Delta across all stage transitions', () => {
      // Inhale(1) -> HoldIn(0)
      const inhaleEnd = calculateTimeDilationRate('inhale', 1.0);
      const holdInStart = calculateTimeDilationRate('holdIn', 0.0);
      expect(inhaleEnd).toBeCloseTo(1.0, 4);
      expect(holdInStart).toBeCloseTo(1.0, 4);
      expect(Math.abs(inhaleEnd - holdInStart)).toBe(0);

      // HoldIn(1) -> Exhale(0)
      const holdInEnd = calculateTimeDilationRate('holdIn', 1.0);
      const exhaleStart = calculateTimeDilationRate('exhale', 0.0);
      expect(holdInEnd).toBeCloseTo(0.28, 4);
      expect(exhaleStart).toBeCloseTo(0.28, 4);
      expect(Math.abs(holdInEnd - exhaleStart)).toBe(0);

      // Exhale(1) -> HoldOut(0)
      const exhaleEnd = calculateTimeDilationRate('exhale', 1.0);
      const holdOutStart = calculateTimeDilationRate('holdOut', 0.0);
      expect(exhaleEnd).toBeCloseTo(1.0, 4);
      expect(holdOutStart).toBeCloseTo(1.0, 4);
      expect(Math.abs(exhaleEnd - holdOutStart)).toBe(0);

      // HoldOut(1) -> Inhale(0)
      const holdOutEnd = calculateTimeDilationRate('holdOut', 1.0);
      const nextInhaleStart = calculateTimeDilationRate('inhale', 0.0);
      expect(holdOutEnd).toBeCloseTo(0.22, 4);
      expect(nextInhaleStart).toBeCloseTo(0.22, 4);
      expect(Math.abs(holdOutEnd - nextInhaleStart)).toBeLessThan(1e-12);
    });

    it('safely handles non-finite inputs without producing NaN or out-of-bounds rates', () => {
      expect(calculateTimeDilationRate('inhale', NaN)).toBeGreaterThanOrEqual(0.20);
      expect(calculateTimeDilationRate('holdIn', Infinity)).toBeLessThanOrEqual(1.05);
      expect(calculateTimeDilationRate('exhale', -1)).toBeGreaterThanOrEqual(0.20);
    });
  });
});
