/**
 * Tier 5 Adversarial: Milestone M3 Sacred Geometry Visual Canvas Stress Tests
 * Empirical challenge suite stress-testing:
 * 1. Canvas DPI & Extreme Dimensions (0x0, 1x1, 5120x1440, 8K 7680x4320, DPR = 0, negative DPR, fractional DPR)
 * 2. Tap Detection Threshold Boundaries (7.99px vs 8.00px vs 8.01px, 219ms vs 220ms vs 221ms, rapid-fire 50 taps)
 * 3. Sacred Geometry Preset Math & Breath Modulation (M = -0.5..1.5, phi = -1.0..2.0, audio spikes, Metatron 78 lines)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CanvasRenderer,
  setupCanvasDPI,
  sanitizeDPR,
  clampDeltaTime
} from '../../src/visuals/canvasRenderer';
import {
  isTapGesture,
  createCanvasPointerHandlers
} from '../../src/visuals/gestureHandler';
import {
  calculateMinimalRingRadii,
  NUM_MINIMAL_RINGS
} from '../../src/visuals/presets/minimalRing';
import {
  getMetatronNodes,
  getMetatronLineCount,
  METATRON_NODE_COUNT,
  renderSacredGeometry
} from '../../src/visuals/presets/sacredGeometry';
import {
  computeChladniRipple,
  CHLADNI_MODES,
  POLAR_STEPS
} from '../../src/visuals/presets/zenWaves';
import {
  getPolygonVertices,
  FOCUS_POLYGON_SIDES
} from '../../src/visuals/presets/calmFocus';
import {
  getStageBadgeText,
  formatCountdown,
  getLedGlow
} from '../../src/visuals/statusCapsule';
import type { VisualRenderParams, BreathStage } from '../../src/types';

/**
 * Strict Mock Canvas Context that immediately throws if any coordinate, dimension,
 * scale, or translation argument is NaN, null, undefined, or non-finite.
 */
class StrictMockCanvasContext {
  public fillStyle: string | CanvasGradient | CanvasPattern = '';
  public strokeStyle: string | CanvasGradient | CanvasPattern = '';
  public lineWidth = 1;

  public methodCalls: { method: string; args: any[] }[] = [];
  public strokeCount = 0;
  public lineToCount = 0;
  public moveToCount = 0;
  public arcCount = 0;

  private assertFinite(method: string, args: number[]) {
    for (let i = 0; i < args.length; i++) {
      const v = args[i];
      if (typeof v !== 'number' || !Number.isFinite(v) || Number.isNaN(v)) {
        throw new Error(
          `StrictMockCanvasContext violation: method "${method}" called with non-finite argument at index ${i}: ${v}`
        );
      }
    }
  }

  scale(sx: number, sy: number): void {
    this.assertFinite('scale', [sx, sy]);
    this.methodCalls.push({ method: 'scale', args: [sx, sy] });
  }

  translate(tx: number, ty: number): void {
    this.assertFinite('translate', [tx, ty]);
    this.methodCalls.push({ method: 'translate', args: [tx, ty] });
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.assertFinite('fillRect', [x, y, w, h]);
    this.methodCalls.push({ method: 'fillRect', args: [x, y, w, h] });
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.assertFinite('clearRect', [x, y, w, h]);
    this.methodCalls.push({ method: 'clearRect', args: [x, y, w, h] });
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.assertFinite('arc', [x, y, radius, startAngle, endAngle]);
    this.arcCount++;
    this.methodCalls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  moveTo(x: number, y: number): void {
    this.assertFinite('moveTo', [x, y]);
    this.moveToCount++;
    this.methodCalls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.assertFinite('lineTo', [x, y]);
    this.lineToCount++;
    this.methodCalls.push({ method: 'lineTo', args: [x, y] });
  }

  beginPath(): void {
    this.methodCalls.push({ method: 'beginPath', args: [] });
  }

  closePath(): void {
    this.methodCalls.push({ method: 'closePath', args: [] });
  }

  stroke(): void {
    this.strokeCount++;
    this.methodCalls.push({ method: 'stroke', args: [] });
  }

  fill(): void {
    this.methodCalls.push({ method: 'fill', args: [] });
  }

  save(): void {
    this.methodCalls.push({ method: 'save', args: [] });
  }

  restore(): void {
    this.methodCalls.push({ method: 'restore', args: [] });
  }

  resetTransform(): void {
    this.methodCalls.push({ method: 'resetTransform', args: [] });
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    this.assertFinite('createRadialGradient', [x0, y0, r0, x1, y1, r1]);
    return {
      addColorStop: (offset: number, _color: string) => {
        this.assertFinite('addColorStop', [offset]);
      }
    } as CanvasGradient;
  }

  resetStats(): void {
    this.methodCalls = [];
    this.strokeCount = 0;
    this.lineToCount = 0;
    this.moveToCount = 0;
    this.arcCount = 0;
  }
}

describe('Tier 5 Adversarial: Milestone M3 Sacred Geometry Visual Canvas Stress Tests', () => {
  let strictCtx: StrictMockCanvasContext;
  let canvas: HTMLCanvasElement;
  let renderer: CanvasRenderer;

  beforeEach(() => {
    strictCtx = new StrictMockCanvasContext();
    canvas = document.createElement('canvas');
    canvas.getContext = vi.fn().mockReturnValue(strictCtx as unknown as CanvasRenderingContext2D);
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1200,
      height: 800,
      top: 0,
      left: 0,
      right: 1200,
      bottom: 800
    });
    renderer = new CanvasRenderer();
  });

  afterEach(() => {
    renderer.stop();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. STRESS-TEST: Canvas DPI & Dimensions Extremes
  // =========================================================================
  describe('1. Canvas DPI & Dimension Extremes Stress Testing', () => {
    it('1.1: sanitizeDPR handles zero, negative, NaN, and fractional DPR values safely', () => {
      expect(sanitizeDPR(0)).toBe(1.0);
      expect(sanitizeDPR(-0.0)).toBe(1.0);
      expect(sanitizeDPR(-1.5)).toBe(1.0);
      expect(sanitizeDPR(NaN)).toBe(1.0);
      expect(sanitizeDPR(1.25)).toBe(1.25);
      expect(sanitizeDPR(2.75)).toBe(2.75);
      expect(sanitizeDPR(0.5)).toBe(0.5);
    });

    it('1.2: setupCanvasDPI with fractional DPR (1.25, 2.75) computes precise rounded buffer dimensions', () => {
      const origDpr = window.devicePixelRatio;

      // Fractional DPR 1.25
      Object.defineProperty(window, 'devicePixelRatio', { value: 1.25, configurable: true });
      const res1 = setupCanvasDPI(canvas, strictCtx as unknown as CanvasRenderingContext2D);
      expect(res1.dpr).toBe(1.25);
      expect(canvas.width).toBe(1500); // 1200 * 1.25 = 1500
      expect(canvas.height).toBe(1000); // 800 * 1.25 = 1000
      expect(canvas.style.width).toBe('1200px');
      expect(canvas.style.height).toBe('800px');

      // Fractional DPR 2.75
      Object.defineProperty(window, 'devicePixelRatio', { value: 2.75, configurable: true });
      const res2 = setupCanvasDPI(canvas, strictCtx as unknown as CanvasRenderingContext2D);
      expect(res2.dpr).toBe(2.75);
      expect(canvas.width).toBe(3300); // 1200 * 2.75 = 3300
      expect(canvas.height).toBe(2200); // 800 * 2.75 = 2200

      Object.defineProperty(window, 'devicePixelRatio', { value: origDpr, configurable: true });
    });

    it('1.3: setupCanvasDPI with zero or negative DPR gracefully falls back to DPR 1.0', () => {
      const origDpr = window.devicePixelRatio;

      Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
      const resZero = setupCanvasDPI(canvas, strictCtx as unknown as CanvasRenderingContext2D);
      expect(resZero.dpr).toBe(1.0);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(800);

      Object.defineProperty(window, 'devicePixelRatio', { value: -2.5, configurable: true });
      const resNeg = setupCanvasDPI(canvas, strictCtx as unknown as CanvasRenderingContext2D);
      expect(resNeg.dpr).toBe(1.0);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(800);

      Object.defineProperty(window, 'devicePixelRatio', { value: origDpr, configurable: true });
    });

    it('1.4: Degenerate canvas dimensions (0x0, 0x500, 500x0, negative) cleanly abort without drawing', () => {
      const degenerateParams: VisualRenderParams[] = [
        { width: 0, height: 0, dpr: 1, breathMacro: 0.5, stage: 'inhale', stageProgress: 0.5, isDarkTheme: true, preset: 'minimalRing', oscAActivity: 0, oscBActivity: 0 },
        { width: 0, height: 500, dpr: 1, breathMacro: 0.5, stage: 'inhale', stageProgress: 0.5, isDarkTheme: true, preset: 'sacredGeometry', oscAActivity: 0, oscBActivity: 0 },
        { width: 500, height: 0, dpr: 1, breathMacro: 0.5, stage: 'inhale', stageProgress: 0.5, isDarkTheme: true, preset: 'zenWaves', oscAActivity: 0, oscBActivity: 0 },
        { width: -100, height: -200, dpr: 1, breathMacro: 0.5, stage: 'inhale', stageProgress: 0.5, isDarkTheme: true, preset: 'calmFocus', oscAActivity: 0, oscBActivity: 0 }
      ];

      for (const p of degenerateParams) {
        strictCtx.resetStats();
        renderer.render(strictCtx as unknown as CanvasRenderingContext2D, p);
        expect(strictCtx.methodCalls.length).toBe(0);
      }
    });

    it('1.5: Minimal positive 1x1 canvas executes all 4 presets without NaN coordinates or context throws', () => {
      const presets: VisualRenderParams['preset'][] = [
        'minimalRing',
        'sacredGeometry',
        'zenWaves',
        'calmFocus'
      ];

      for (const preset of presets) {
        strictCtx.resetStats();
        const params: VisualRenderParams = {
          width: 1,
          height: 1,
          dpr: 1,
          breathMacro: 0.5,
          stage: 'inhale',
          stageProgress: 0.5,
          isDarkTheme: true,
          preset,
          oscAActivity: 0.3,
          oscBActivity: 0.3
        };

        expect(() => {
          renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
        }).not.toThrow();

        // Must translate to center (0.5, 0.5)
        const translateCall = strictCtx.methodCalls.find((c) => c.method === 'translate');
        expect(translateCall).toBeDefined();
        expect(translateCall?.args).toEqual([0.5, 0.5]);
      }
    });

    it('1.6: Ultra-wide 5120x1440 resolution centers origin at (2560, 720) with finite coordinates', () => {
      const params: VisualRenderParams = {
        width: 5120,
        height: 1440,
        dpr: 1,
        breathMacro: 0.8,
        stage: 'holdIn',
        stageProgress: 0.3,
        isDarkTheme: false,
        preset: 'sacredGeometry',
        oscAActivity: 0.1,
        oscBActivity: 0.1
      };

      expect(() => {
        renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
      }).not.toThrow();

      const translateCall = strictCtx.methodCalls.find((c) => c.method === 'translate');
      expect(translateCall?.args).toEqual([2560, 720]);

      // All arc, lineTo, moveTo calls must be strictly finite
      expect(strictCtx.lineToCount).toBe(78);
      expect(strictCtx.arcCount).toBe(26); // 13 fruit-of-life circles + 13 node points
    });

    it('1.7: 8K extreme resolution (7680x4320) executes rendering across all presets without NaN', () => {
      const presets: VisualRenderParams['preset'][] = [
        'minimalRing',
        'sacredGeometry',
        'zenWaves',
        'calmFocus'
      ];

      for (const preset of presets) {
        strictCtx.resetStats();
        const params: VisualRenderParams = {
          width: 7680,
          height: 4320,
          dpr: 2.0,
          breathMacro: 1.0,
          stage: 'exhale',
          stageProgress: 0.7,
          isDarkTheme: true,
          preset,
          oscAActivity: 0.5,
          oscBActivity: 0.5
        };

        expect(() => {
          renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
        }).not.toThrow();

        const translateCall = strictCtx.methodCalls.find((c) => c.method === 'translate');
        expect(translateCall?.args).toEqual([3840, 2160]);
      }
    });

    it('1.8: Delta time clamping handles massive pause jumps and negative delta inputs', () => {
      // 5-minute freeze (300 seconds) must clamp to maxDt = 0.1s
      expect(clampDeltaTime(300.0)).toBe(0.1);
      // Negative dt from clock skew must clamp to 0.0s
      expect(clampDeltaTime(-2.0)).toBe(0.0);
      // Normal 60fps frame (16.6ms) passes through accurately
      expect(clampDeltaTime(0.016667)).toBeCloseTo(0.016667, 5);
    });
  });

  // =========================================================================
  // 2. STRESS-TEST: Tap Detection Threshold Boundaries
  // =========================================================================
  describe('2. Tap Detection Threshold Boundaries Stress Testing', () => {
    it('2.1: Exact displacement boundary at 8.00px: 7.99px accepted, 8.00px rejected, 8.01px rejected', () => {
      const dt = 100;
      // 7.99px displacement: strictly valid tap
      expect(isTapGesture(100, 100, 107.99, 100, dt)).toBe(true);

      // 8.00px displacement: strictly rejected as drag
      expect(isTapGesture(100, 100, 108.00, 100, dt)).toBe(false);

      // 8.01px displacement: strictly rejected as drag
      expect(isTapGesture(100, 100, 108.01, 100, dt)).toBe(false);
    });

    it('2.2: Exact diagonal displacement boundary: sqrt(dx^2 + dy^2)', () => {
      const dt = 100;
      // dx = 5.65, dy = 5.65 -> dist = sqrt(31.9225 + 31.9225) = sqrt(63.845) = 7.9903px < 8.0px
      expect(isTapGesture(0, 0, 5.65, 5.65, dt)).toBe(true);

      // dx = 5.66, dy = 5.66 -> dist = sqrt(32.0356 + 32.0356) = sqrt(64.0712) = 8.0044px >= 8.0px
      expect(isTapGesture(0, 0, 5.66, 5.66, dt)).toBe(false);

      // Exactly sqrt(32) + sqrt(32): dx = 4*sqrt(2) ~= 5.656854, dy = 4*sqrt(2) ~= 5.656854 -> dist = 8.00000px
      const halfDiagonal = 4.0 * Math.SQRT2;
      expect(isTapGesture(0, 0, halfDiagonal, halfDiagonal, dt)).toBe(false);
    });

    it('2.3: Exact duration boundary at 220ms: 219ms accepted, 220ms rejected, 221ms rejected', () => {
      // 219ms: within tap duration threshold
      expect(isTapGesture(100, 100, 102, 102, 219)).toBe(true);

      // 220ms: threshold boundary is strictly rejected (hold gesture)
      expect(isTapGesture(100, 100, 102, 102, 220)).toBe(false);

      // 221ms: strictly rejected
      expect(isTapGesture(100, 100, 102, 102, 221)).toBe(false);
    });

    it('2.4: Zero-movement taps (start === end) are accepted within duration threshold', () => {
      expect(isTapGesture(250, 400, 250, 400, 10)).toBe(true);
      expect(isTapGesture(0, 0, 0, 0, 219)).toBe(true);
      expect(isTapGesture(0, 0, 0, 0, 220)).toBe(false);
    });

    it('2.5: Negative and mixed Cartesian coordinates evaluate accurate Euclidean distances', () => {
      // From (-50, -50) to (-45, -46): dx=5, dy=4, dist=sqrt(41)=6.403px < 8px
      expect(isTapGesture(-50, -50, -45, -46, 50)).toBe(true);

      // From (-100, 100) to (-108, 100): dx=-8, dist=8px >= 8px
      expect(isTapGesture(-100, 100, -108, 100, 50)).toBe(false);
    });

    it('2.6: NaN coordinates handling: returns false without throwing unhandled exception', () => {
      expect(isTapGesture(NaN, 100, 100, 100, 50)).toBe(false);
      expect(isTapGesture(100, NaN, 100, 100, 50)).toBe(false);
      expect(isTapGesture(100, 100, NaN, 100, 50)).toBe(false);
      expect(isTapGesture(100, 100, 100, NaN, 50)).toBe(false);
      expect(isTapGesture(NaN, NaN, NaN, NaN, 50)).toBe(false);
    });

    it('2.7: Characterizes behavior on negative time intervals (dt < 0) and NaN duration', () => {
      // Note: isTapGesture checks `durationMs >= 220`. If durationMs is negative or NaN:
      // -50 >= 220 is false, so Euclidean distance is computed.
      expect(isTapGesture(100, 100, 102, 102, -50)).toBe(true);
      // For NaN durationMs, NaN >= 220 is false, so it evaluates distance:
      expect(isTapGesture(100, 100, 102, 102, NaN)).toBe(true);
    });

    it('2.8: Rapid-fire successive pointer taps: 50 taps in 1 second triggers 50 onTap and strictly 1 unlock', () => {
      let tapCount = 0;
      let unlockCount = 0;

      const handlers = createCanvasPointerHandlers(
        () => {
          tapCount++;
        },
        () => {
          unlockCount++;
        }
      );

      let mockNow = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockNow);

      // 50 rapid-fire taps (20ms each: down at 0ms, up at 8ms)
      for (let i = 0; i < 50; i++) {
        mockNow = 1000 + i * 20;
        handlers.onPointerDown({ clientX: 200 + (i % 5), clientY: 300 + (i % 5) });

        mockNow = 1000 + i * 20 + 8; // 8ms hold duration
        handlers.onPointerUp({ clientX: 200 + (i % 5) + 1, clientY: 300 + (i % 5) + 1 });
      }

      expect(tapCount).toBe(50);
      expect(unlockCount).toBe(1); // One-shot audio unlock
    });

    it('2.9: Pointer cancel gesture rejection: suppresses tap toggle cleanly', () => {
      let tapFired = false;
      const handlers = createCanvasPointerHandlers(() => {
        tapFired = true;
      });

      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      handlers.onPointerCancel();
      handlers.onPointerUp({ clientX: 100, clientY: 100 });

      expect(tapFired).toBe(false);
    });

    it('2.10: Pointer drag gesture (d = 15px) is rejected as tap', () => {
      let tapFired = false;
      const handlers = createCanvasPointerHandlers(() => {
        tapFired = true;
      });

      handlers.onPointerDown({ clientX: 100, clientY: 100 });
      handlers.onPointerUp({ clientX: 115, clientY: 100 });

      expect(tapFired).toBe(false);
    });
  });

  // =========================================================================
  // 3. STRESS-TEST: Preset Geometry Calculations & Modulation
  // =========================================================================
  describe('3. Preset Geometry Calculations & Modulation Stress Testing', () => {
    it('3.1: Minimal Ring radii remain positive, monotonically expanding for M > 0, and clamped for M = -0.5..1.5', () => {
      const testMacros = [-0.5, 0.0, 0.5, 1.0, 1.5];
      const baseRadius = 80;

      for (const M of testMacros) {
        const radii = calculateMinimalRingRadii(baseRadius, M, NUM_MINIMAL_RINGS);
        expect(radii.length).toBe(NUM_MINIMAL_RINGS);

        // All radii must be positive
        for (let i = 0; i < radii.length; i++) {
          expect(radii[i]).toBeGreaterThan(0);
          expect(Number.isFinite(radii[i])).toBe(true);
        }

        // When M > 0, rings strictly expand monotonically with ring index
        if (M > 0) {
          for (let i = 1; i < radii.length; i++) {
            expect(radii[i]).toBeGreaterThan(radii[i - 1]);
          }
        } else {
          // When M <= 0, formula evaluates to baseline radius for all rings
          for (let i = 0; i < radii.length; i++) {
            expect(radii[i]).toBe(baseRadius);
          }
        }

        // Radii for M = -0.5 must match M = 0.0 due to internal clamping
        if (M === -0.5) {
          const baselineRadii = calculateMinimalRingRadii(baseRadius, 0.0, NUM_MINIMAL_RINGS);
          expect(radii).toEqual(baselineRadii);
        }

        // Radii for M = 1.5 must match M = 1.0 due to internal clamping
        if (M === 1.5) {
          const maxRadii = calculateMinimalRingRadii(baseRadius, 1.0, NUM_MINIMAL_RINGS);
          expect(radii).toEqual(maxRadii);
        }
      }
    });

    it('3.2: Metatron\'s Cube interconnecting lines count is strictly 78 (13 * 12 / 2)', () => {
      expect(getMetatronLineCount(13)).toBe(78);
      expect(getMetatronLineCount(METATRON_NODE_COUNT)).toBe(78);

      // Boundary: arbitrary node count n*(n-1)/2
      expect(getMetatronLineCount(3)).toBe(3);
      expect(getMetatronLineCount(6)).toBe(15);
      expect(Math.abs(getMetatronLineCount(0))).toBe(0);
    });

    it('3.3: Metatron\'s Cube node coordinates collapse to origin for D=0 and remain bounded for any D', () => {
      // D = 0: All 13 nodes must collapse to (0, 0) without NaN or -0
      const collapsedNodes = getMetatronNodes(0, Math.PI / 4);
      expect(collapsedNodes.length).toBe(13);
      for (const node of collapsedNodes) {
        expect(node.x).toBe(0);
        expect(node.y).toBe(0);
        expect(Object.is(node.x, -0)).toBe(false);
        expect(Object.is(node.y, -0)).toBe(false);
      }

      // Spacing D = 50: Max radial distance is strictly 2 * D = 100
      const nodes = getMetatronNodes(50, 0.5);
      expect(nodes[0]).toEqual({ x: 0, y: 0 }); // Center node
      for (let k = 1; k <= 6; k++) {
        const dist = Math.hypot(nodes[k].x, nodes[k].y);
        expect(dist).toBeCloseTo(50, 4); // Inner ring radius D
      }
      for (let k = 7; k <= 12; k++) {
        const dist = Math.hypot(nodes[k].x, nodes[k].y);
        expect(dist).toBeCloseTo(100, 4); // Outer ring radius 2*D
      }
    });

    it('3.4: renderSacredGeometry batches exactly 78 lineTo segments in single stroke call', () => {
      strictCtx.resetStats();
      const params: VisualRenderParams = {
        width: 1000,
        height: 1000,
        dpr: 1,
        breathMacro: 0.5,
        stage: 'inhale',
        stageProgress: 0.5,
        isDarkTheme: true,
        preset: 'sacredGeometry',
        oscAActivity: 0,
        oscBActivity: 0
      };

      renderSacredGeometry(strictCtx as unknown as CanvasRenderingContext2D, params, 1.0);

      // Metatron's Cube lines: 78 moveTo and 78 lineTo calls
      expect(strictCtx.lineToCount).toBe(78);
      expect(strictCtx.moveToCount).toBe(78 + 13 + 13); // 78 lines + 13 fruit circles + 13 accent points
      expect(strictCtx.strokeCount).toBe(2); // 1 for 78 lines, 1 for 13 fruit circles
    });

    it('3.5: Zen Waves Chladni ripples: cos(m*theta + phi) bounded in [-1, 1] and positive radius', () => {
      for (const m of CHLADNI_MODES) {
        for (let step = 0; step <= POLAR_STEPS; step++) {
          const theta = (step * Math.PI * 2) / POLAR_STEPS;
          const ripple = computeChladniRipple(m, theta, 1.23);
          expect(ripple).toBeGreaterThanOrEqual(-1.0);
          expect(ripple).toBeLessThanOrEqual(1.0);
          expect(Number.isFinite(ripple)).toBe(true);
        }
      }
    });

    it('3.6: Calm Focus polygon vertex generation produces strictly valid n-sided polygons', () => {
      for (const sides of FOCUS_POLYGON_SIDES) {
        const vertices = getPolygonVertices(sides, 100, { x: 0, y: 0 }, 0);
        expect(vertices.length).toBe(sides);

        for (const v of vertices) {
          expect(Number.isFinite(v.x)).toBe(true);
          expect(Number.isFinite(v.y)).toBe(true);
          expect(Math.hypot(v.x, v.y)).toBeCloseTo(100, 4);
        }

        // Side length consistency for equilateral / regular polygon
        const sideLengths: number[] = [];
        for (let j = 0; j < vertices.length; j++) {
          const next = vertices[(j + 1) % vertices.length];
          sideLengths.push(Math.hypot(next.x - vertices[j].x, next.y - vertices[j].y));
        }

        // All edges of regular polygon must have equal length
        const firstEdge = sideLengths[0];
        for (const len of sideLengths) {
          expect(len).toBeCloseTo(firstEdge, 3);
        }
      }
    });

    it('3.7: Audio activity spikes (oscAActivity = 10.0, oscBActivity = -5.0) do not cause NaN', () => {
      const presets: VisualRenderParams['preset'][] = [
        'minimalRing',
        'sacredGeometry',
        'zenWaves',
        'calmFocus'
      ];

      for (const preset of presets) {
        strictCtx.resetStats();
        const params: VisualRenderParams = {
          width: 800,
          height: 600,
          dpr: 1,
          breathMacro: 0.5,
          stage: 'inhale',
          stageProgress: 0.5,
          isDarkTheme: true,
          preset,
          oscAActivity: 10.0, // High spike
          oscBActivity: -5.0  // Negative spike
        };

        expect(() => {
          renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
        }).not.toThrow();
      }
    });

    it('3.8: Stage progress phi = -1.0, 0.0, 0.5, 1.0, 2.0 maintains LED breathing glow in [0.15, 1.0]', () => {
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      const testPhis = [-1.0, 0.0, 0.5, 1.0, 2.0];

      for (const stage of stages) {
        for (const phi of testPhis) {
          const glow = getLedGlow(stage, phi);
          expect(glow).toBeGreaterThanOrEqual(0.15);
          expect(glow).toBeLessThanOrEqual(1.0);
          expect(Number.isFinite(glow)).toBe(true);
        }
      }
    });

    it('3.9: Rapid stage transitions and 0-duration stage passthroughs execute without state desync', () => {
      const sequence: { stage: BreathStage; progress: number }[] = [
        { stage: 'inhale', progress: 0.99 },
        { stage: 'holdIn', progress: 0.0 }, // 0s passthrough
        { stage: 'exhale', progress: 0.01 },
        { stage: 'holdOut', progress: 0.0 }, // 0s passthrough
        { stage: 'inhale', progress: 0.05 }
      ];

      for (const step of sequence) {
        strictCtx.resetStats();
        const params: VisualRenderParams = {
          width: 800,
          height: 600,
          dpr: 1,
          breathMacro: 0.4,
          stage: step.stage,
          stageProgress: step.progress,
          isDarkTheme: true,
          preset: 'sacredGeometry',
          oscAActivity: 0,
          oscBActivity: 0
        };

        expect(() => {
          renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
        }).not.toThrow();

        const badge = getStageBadgeText(step.stage);
        expect(badge).toBeTruthy();
        expect(badge).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    });

    it('3.10: Countdown formatting with boundary values (negative, zero, fractions)', () => {
      expect(formatCountdown(-1.5)).toBe('0.0s');
      expect(formatCountdown(-0.0)).toBe('0.0s');
      expect(formatCountdown(0)).toBe('0.0s');
      expect(formatCountdown(0.04)).toBe('0.0s');
      expect(formatCountdown(4.24)).toBe('4.2s');
      expect(formatCountdown(4.26)).toBe('4.3s');
      expect(formatCountdown(100.56)).toBe('100.6s');
    });

    it('3.11: Theme switching applies high contrast dark and light background fills', () => {
      let lastFillStyle: string | CanvasGradient | CanvasPattern = '';
      strictCtx.fillRect = (_x, _y, _w, _h) => {
        lastFillStyle = strictCtx.fillStyle;
      };

      // Dark theme: #09090b
      const darkParams: VisualRenderParams = {
        width: 600,
        height: 600,
        dpr: 1,
        breathMacro: 0.5,
        stage: 'inhale',
        stageProgress: 0.5,
        isDarkTheme: true,
        preset: 'minimalRing',
        oscAActivity: 0,
        oscBActivity: 0
      };
      renderer.render(strictCtx as unknown as CanvasRenderingContext2D, darkParams);
      expect(lastFillStyle).toBe('#09090b');

      // Light theme: #fcfbf9
      const lightParams: VisualRenderParams = {
        ...darkParams,
        isDarkTheme: false
      };
      renderer.render(strictCtx as unknown as CanvasRenderingContext2D, lightParams);
      expect(lastFillStyle).toBe('#fcfbf9');
    });

    it('3.12: Adversarial finding test: sacredGeometry line/point alpha with out-of-bounds M (-1.0, 1.5)', () => {
      // Documenting the behavior of sacredGeometry when breathMacro is out-of-bounds:
      // In sacredGeometry.ts, lineAlpha = (0.25 + 0.35 * breathMacro).toFixed(3)
      // When M = -1.0, lineAlpha = "-0.100" (negative alpha string)
      // When M = 1.5, pointAlpha = (0.7 + 0.3 * 1.5).toFixed(3) = "1.150" (> 1.0)
      const paramsNegative: VisualRenderParams = {
        width: 800,
        height: 600,
        dpr: 1,
        breathMacro: -1.0,
        stage: 'inhale',
        stageProgress: 0,
        isDarkTheme: true,
        preset: 'sacredGeometry',
        oscAActivity: 0,
        oscBActivity: 0
      };

      // Does not throw in CanvasRenderer due to strictCtx handling strings
      expect(() => {
        renderer.render(strictCtx as unknown as CanvasRenderingContext2D, paramsNegative);
      }).not.toThrow();

      // However, strokeStyle was set to an out-of-spec negative alpha string:
      // "rgba(228, 228, 231, -0.100)"
      const lineStrokeCalls = strictCtx.methodCalls.filter((c) => c.method === 'stroke');
      expect(lineStrokeCalls.length).toBeGreaterThan(0);
    });

    it('3.13: Monochrome optical & cosmic presets withstand extreme macro, 1x1, 8K, and NaN inputs without non-finite coordinates', () => {
      const advancedPresets = [
        'coronaOrbit',
        'hyperMetatron',
        'lissajousKnot',
        'magneticFlux',
        'spacetimeWarp',
        'keplerRosette',
        'tesseract4D',
        'hopfFibration'
      ] as const;
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      const testMacros = [-10.0, 0.0, 0.5, 1.0, 10.0];
      const dimensions = [
        { width: 1, height: 1 },
        { width: 800, height: 600 },
        { width: 7680, height: 4320 }
      ];

      for (const preset of advancedPresets) {
        for (const stage of stages) {
          for (const macro of testMacros) {
            for (const dim of dimensions) {
              strictCtx.resetStats();
              const params: VisualRenderParams = {
                width: dim.width,
                height: dim.height,
                dpr: 2,
                breathMacro: macro,
                stage,
                stageProgress: 0.5,
                isDarkTheme: macro !== 0.0,
                preset,
                oscAActivity: NaN,
                oscBActivity: -99
              };

              expect(() => {
                renderer.render(strictCtx as unknown as CanvasRenderingContext2D, params);
              }).not.toThrow();

              expect(strictCtx.strokeCount).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });
});


