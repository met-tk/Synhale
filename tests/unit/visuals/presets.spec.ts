import { describe, it, expect, vi } from 'vitest';
import {
  calculateMinimalRingRadii,
  renderMinimalRing,
  getMetatronNodes,
  getMetatronLineCount,
  renderSacredGeometry,
  computeChladniRipple,
  renderZenWaves,
  getPolygonVertices,
  renderCalmFocus,
  renderCoronaOrbit,
  renderHyperMetatron,
  renderLissajousKnot,
  renderMagneticFlux,
  renderSpacetimeWarp,
  renderKeplerRosette,
  renderTesseract4D,
  renderHopfFibration,
  PRESET_RENDERERS,
  OPTICAL_PRESET_RENDERERS,
  COSMIC_PRESET_RENDERERS,
  ALL_PRESET_RENDERERS
} from '../../../src/visuals/presets';
import type { VisualRenderParams } from '../../../src/types';

describe('Sacred Geometry Presets Unit Tests', () => {
  const mockCtx = () => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: ''
  } as unknown as CanvasRenderingContext2D);

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
    oscBActivity: 0.3
  };

  describe('Minimal Ring Preset', () => {
    it('calculates 5 concentric radii expanding monotonically with breath macro', () => {
      const baseR = 100;
      const r0 = calculateMinimalRingRadii(baseR, 0.0);
      const rHalf = calculateMinimalRingRadii(baseR, 0.5);
      const r1 = calculateMinimalRingRadii(baseR, 1.0);

      expect(r0).toHaveLength(5);
      expect(rHalf).toHaveLength(5);
      expect(r1).toHaveLength(5);

      // At M=0, all radii equal base radius
      for (const r of r0) {
        expect(r).toBe(baseR);
      }

      // At M=1, radii are strictly monotonically expanding with index
      for (let i = 0; i < 5; i++) {
        expect(r1[i]).toBeGreaterThan(rHalf[i]);
        expect(rHalf[i]).toBeGreaterThan(r0[i]);
      }

      for (let i = 1; i < 5; i++) {
        expect(r1[i]).toBeGreaterThan(r1[i - 1]);
      }
    });

    it('renders 5 concentric rings and center dot on canvas context', () => {
      const ctx = mockCtx();
      renderMinimalRing(ctx, baseParams, 1.0);

      // 5 rings + 1 center anchor = 6 arcs drawn
      expect(ctx.arc).toHaveBeenCalledTimes(6);
      expect(ctx.stroke).toHaveBeenCalledTimes(5);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sacred Geometry Preset (Metatron Cube)', () => {
    it('generates 13 nodes with correct radial distances', () => {
      const spacingD = 50;
      const nodes = getMetatronNodes(spacingD, 0);

      expect(nodes).toHaveLength(13);

      // Node 0 is center
      expect(nodes[0].x).toBe(0);
      expect(nodes[0].y).toBe(0);

      // Nodes 1..6 are at distance D
      for (let k = 1; k <= 6; k++) {
        const dist = Math.hypot(nodes[k].x, nodes[k].y);
        expect(dist).toBeCloseTo(spacingD, 4);
      }

      // Nodes 7..12 are at distance 2D
      for (let k = 7; k <= 12; k++) {
        const dist = Math.hypot(nodes[k].x, nodes[k].y);
        expect(dist).toBeCloseTo(spacingD * 2, 4);
      }
    });

    it('collapses cleanly to origin when spacing D is 0 without NaN', () => {
      const nodes = getMetatronNodes(0, Math.PI / 4);
      for (const node of nodes) {
        expect(node.x).toBe(0);
        expect(node.y).toBe(0);
        expect(Number.isNaN(node.x)).toBe(false);
        expect(Number.isNaN(node.y)).toBe(false);
      }
    });

    it('computes exactly 78 interconnecting lines for 13 nodes', () => {
      expect(getMetatronLineCount(13)).toBe(78);
    });

    it('renders 78 lines batched into a single stroke call', () => {
      const ctx = mockCtx();
      renderSacredGeometry(ctx, { ...baseParams, preset: 'sacredGeometry' }, 2.0);

      // 78 lines moveTo + lineTo
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalledTimes(78);
      // Batched strokes: lines + circles
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders full avant-garde 4D holographic crystal mandala when showMaxBoundary is true', () => {
      const ctx = mockCtx();
      renderSacredGeometry(ctx, { ...baseParams, preset: 'sacredGeometry', showMaxBoundary: true }, 2.0);

      // In full rich mode, crystal facets, orbital guide rings, Flower of Life rosette petals, and Merkaba stars are drawn
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      const lineToCount = (ctx.lineTo as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
      expect(lineToCount).toBeGreaterThan(78);
    });
  });

  describe('Zen Waves Preset', () => {
    it('computes Chladni polar harmonic ripples for modes 2..6', () => {
      const modes = [2, 3, 4, 5, 6];
      const angles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 2, Math.PI];

      for (const m of modes) {
        for (const theta of angles) {
          const val = computeChladniRipple(m, theta, 0);
          expect(Number.isFinite(val)).toBe(true);
          expect(Math.abs(val)).toBeLessThanOrEqual(1.0);
        }
      }

      // Mode 0 evaluates to 1.0
      expect(computeChladniRipple(0, Math.PI / 3, 0)).toBe(1.0);
    });

    it('renders ripple layers with closed polar paths', () => {
      const ctx = mockCtx();
      renderZenWaves(ctx, { ...baseParams, preset: 'zenWaves' }, 1.5);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe('Calm Focus Preset', () => {
    it('computes regular polygon vertices from triangle (3) to hexagon (6)', () => {
      const radius = 100;
      for (const sides of [3, 4, 5, 6]) {
        const vertices = getPolygonVertices(sides, radius, { x: 0, y: 0 }, 0);
        expect(vertices).toHaveLength(sides);

        for (const v of vertices) {
          const dist = Math.hypot(v.x, v.y);
          expect(dist).toBeCloseTo(radius, 4);
        }
      }

      // Equilateral triangle side length = R * sqrt(3)
      const tri = getPolygonVertices(3, radius, { x: 0, y: 0 }, 0);
      const side = Math.hypot(tri[1].x - tri[0].x, tri[1].y - tri[0].y);
      expect(side).toBeCloseTo(radius * Math.sqrt(3), 2);
    });

    it('renders polygons, outer guide circle, and central anchor dot', () => {
      const ctx = mockCtx();
      renderCalmFocus(ctx, { ...baseParams, preset: 'calmFocus' }, 1.0);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('Preset Registry', () => {
    it('exports all 4 sacred geometry presets in the registry', () => {
      const keys = Object.keys(PRESET_RENDERERS);
      expect(keys).toEqual(['minimalRing', 'sacredGeometry', 'zenWaves', 'calmFocus']);
      for (const key of keys) {
        expect(typeof PRESET_RENDERERS[key as keyof typeof PRESET_RENDERERS]).toBe('function');
      }
    });

    it('exports all 4 pure monochrome optical presets in OPTICAL_PRESET_RENDERERS', () => {
      const opticalKeys = Object.keys(OPTICAL_PRESET_RENDERERS);
      expect(opticalKeys).toEqual(['coronaOrbit', 'hyperMetatron', 'lissajousKnot', 'magneticFlux']);

      const stages = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const;
      const fns = [renderCoronaOrbit, renderHyperMetatron, renderLissajousKnot, renderMagneticFlux];

      for (const fn of fns) {
        for (const stage of stages) {
          const ctx = mockCtx();
          fn(ctx, { ...baseParams, stage, isDarkTheme: true }, 1.25);
          expect(ctx.beginPath).toHaveBeenCalled();
          expect(ctx.stroke).toHaveBeenCalled();
          expect(String(ctx.strokeStyle)).toContain('rgba(244, 244, 245,');
        }
      }
    });

    it('exports all 4 cosmic presets in COSMIC_PRESET_RENDERERS and ALL_PRESET_RENDERERS (12 presets total)', () => {
      const cosmicKeys = Object.keys(COSMIC_PRESET_RENDERERS);
      expect(cosmicKeys).toEqual(['spacetimeWarp', 'keplerRosette', 'tesseract4D', 'hopfFibration']);
      expect(Object.keys(ALL_PRESET_RENDERERS)).toHaveLength(12);

      const stages = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const;
      const fns = [renderSpacetimeWarp, renderKeplerRosette, renderTesseract4D, renderHopfFibration];

      for (const fn of fns) {
        for (const stage of stages) {
          const ctx = mockCtx();
          fn(ctx, { ...baseParams, stage, isDarkTheme: true }, 1.25);
          expect(ctx.beginPath).toHaveBeenCalled();
          expect(ctx.stroke).toHaveBeenCalled();
        }
      }
    });
  });
});
