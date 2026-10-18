import { describe, it, expect, vi } from 'vitest';
import { CanvasRenderer } from '../../../src/visuals/canvasRenderer';
import type { VisualRenderParams } from '../../../src/types';

describe('Maximum Expansion Guide Boundary Unit Tests', () => {
  const createMockCtx = () => {
    return {
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
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D;
  };

  const baseParams: VisualRenderParams = {
    width: 800,
    height: 600,
    dpr: 1,
    breathMacro: 0.5,
    stage: 'inhale',
    stageProgress: 0.5,
    isDarkTheme: true,
    preset: 'minimalRing',
    oscAActivity: 0.2,
    oscBActivity: 0.3,
    showMaxBoundary: true
  };

  it('renders maximum expansion guide boundary when showMaxBoundary is enabled', () => {
    const renderer = new CanvasRenderer();
    const ctx = createMockCtx();

    renderer.render(ctx, baseParams);

    // Guide ring dashed circle arc
    expect(ctx.arc).toHaveBeenCalled();
    // 4 cardinal tick notches
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    // Line dash set and restored
    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 6]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('renders proximity resonance glow when breathMacro > 0.8 or stage is holdIn', () => {
    const renderer = new CanvasRenderer();
    const ctxHoldIn = createMockCtx();

    renderer.render(ctxHoldIn, {
      ...baseParams,
      breathMacro: 1.0,
      stage: 'holdIn'
    });

    // Proximity glow ring causes additional arc and stroke calls
    expect(ctxHoldIn.arc).toHaveBeenCalled();
    expect(ctxHoldIn.stroke).toHaveBeenCalled();
  });

  it('omits guide boundary when showMaxBoundary is false or omitted', () => {
    const renderer = new CanvasRenderer();
    const ctx = createMockCtx();

    renderer.render(ctx, {
      ...baseParams,
      showMaxBoundary: false
    });

    // setLineDash is never called if guide is not drawn
    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('uses pure monochrome proximity glow across all presets (no cyan or blue line in any group)', () => {
    const renderer = new CanvasRenderer();
    const allPresets = [
      'minimalRing',
      'sacredGeometry',
      'zenWaves',
      'calmFocus',
      'coronaOrbit',
      'hyperMetatron',
      'lissajousKnot',
      'magneticFlux',
      'spacetimeWarp',
      'keplerRosette',
      'tesseract4D',
      'hopfFibration'
    ] as const;

    for (const preset of allPresets) {
      const strokeStyles: string[] = [];
      const ctx = createMockCtx();
      ctx.stroke = vi.fn(() => {
        strokeStyles.push(String(ctx.strokeStyle));
      });

      renderer.render(ctx, {
        ...baseParams,
        preset,
        breathMacro: 1.0,
        stage: 'holdIn',
        showMaxBoundary: true
      });

      // None of the strokes should contain cyan/blue accent rgba(56, 189, 248
      for (const style of strokeStyles) {
        expect(style).not.toContain('56, 189, 248');
      }
    }
  });
});

