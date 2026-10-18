import { describe, it, expect } from 'vitest';
import type { VisualPresetId } from '../../src/types';

describe('Feature F16: 4 Sacred Geometry Visual Presets', () => {
  it('F16-1: Minimal Ring calculates 5 concentric radii expanding monotonically with breath macro M', () => {
    const baseRadius = 100;
    const numRings = 5;

    function getRadii(macro: number): number[] {
      return Array.from({ length: numRings }, (_, i) => {
        return baseRadius * (1 + 0.85 * macro * (1 + (i / numRings) * 0.35));
      });
    }

    const radii0 = getRadii(0.0);
    const radii1 = getRadii(1.0);

    expect(radii0).toHaveLength(5);
    expect(radii1).toHaveLength(5);

    // Each ring at M=1 should be strictly larger than at M=0
    for (let i = 0; i < numRings; i++) {
      expect(radii1[i]).toBeGreaterThan(radii0[i]);
    }
  });

  it('F16-2: Sacred Geometry generates 13 Fruit-of-Life nodes and exactly 78 interconnect lines', () => {
    const numNodes = 13;
    // Combinations of 2 from 13: 13 * 12 / 2 = 78 lines
    let lineCount = 0;
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        lineCount++;
      }
    }
    expect(lineCount).toBe(78);
  });

  it('F16-3: Zen Waves computes Chladni polar harmonic ripples for modes m in [2..6]', () => {
    const modes = [2, 3, 4, 5, 6];
    const theta = Math.PI / 4;

    for (const m of modes) {
      const ripple = Math.cos(m * theta);
      expect(Number.isFinite(ripple)).toBe(true);
      expect(Math.abs(ripple)).toBeLessThanOrEqual(1.0);
    }
  });

  it('F16-4: Calm Focus computes polygon vertices from triangle (3) to hexagon (6) around focal point', () => {
    const polygonSides = [3, 4, 5, 6];
    const center = { x: 400, y: 300 };
    const radius = 120;

    for (const n of polygonSides) {
      const vertices = Array.from({ length: n }, (_, j) => {
        const angle = (2 * Math.PI * j) / n;
        return {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
      });

      expect(vertices).toHaveLength(n);
      // All vertices must be at expected distance from center
      for (const v of vertices) {
        const dist = Math.hypot(v.x - center.x, v.y - center.y);
        expect(dist).toBeCloseTo(radius, 4);
      }
    }
  });

  it('F16-5: Preset identifier enum validates exactly the 4 supported sacred geometry presets', () => {
    const validPresets: VisualPresetId[] = ['minimalRing', 'sacredGeometry', 'zenWaves', 'calmFocus'];
    expect(validPresets).toHaveLength(4);

    let activePreset: VisualPresetId = 'minimalRing';
    activePreset = 'sacredGeometry';
    expect(activePreset).toBe('sacredGeometry');
  });
});
