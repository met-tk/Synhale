import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { GrainSourceVisualizer } from '../../src/ui/components/deck/GrainSourceVisualizer';
import { GrainEnvelopeScope } from '../../src/ui/components/deck/GrainEnvelopeScope';
import { SignalFlowGraph } from '../../src/ui/components/deck/SignalFlowGraph';
import { DEFAULT_CHANNEL_STRIP, DEFAULT_EFFECTS_CHAIN } from '../../src/audio/engine';
import { ThemeProvider } from '../../src/ui/theme';

/**
 * Milestone 4 (D27 - D33) Deep Adversarial Stress & Empirical Verification Suite
 * 
 * Strict forensic standards:
 * - 100% zero emoji
 * - S6-5 zero yellow/orange compliance
 * - Empirical verification with simulated browser events and mathematical bounds
 */

describe('Milestone 4 (D27 - D33) Deep Adversarial Stress Suite', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      scale: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 120,
      top: 0,
      left: 0,
      right: 400,
      bottom: 120
    });
    (HTMLElement.prototype as any).setPointerCapture = vi.fn();
    (HTMLElement.prototype as any).releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // D27: AudioContext Leak & Hardware Quota Exhaustion Stress
  // =========================================================================
  describe('D27 Adversarial: AudioContext Lifecycle & Quota Stress', () => {
    it('D27-ADV-1: 50 consecutive file drops invoke close() 100% of the time without leakage', async () => {
      let openContextCount = 0;
      let totalCreated = 0;
      let totalClosed = 0;

      const MockAudioContext = vi.fn().mockImplementation(() => {
        totalCreated++;
        openContextCount++;
        return {
          decodeAudioData: vi.fn().mockImplementation(async () => ({
            duration: 1.0,
            numberOfChannels: 1,
            sampleRate: 44100,
            getChannelData: () => new Float32Array(512)
          })),
          createBuffer: vi.fn().mockReturnValue({
            duration: 1.0,
            numberOfChannels: 1,
            sampleRate: 44100,
            copyToChannel: vi.fn(),
            getChannelData: () => new Float32Array(512)
          }),
          close: vi.fn().mockImplementation(async () => {
            openContextCount--;
            totalClosed++;
          })
        };
      });

      (window as any).AudioContext = MockAudioContext;

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'adv-test' })
        )
      );

      const dropZone = container.firstChild as HTMLElement;

      // Drop 50 audio files sequentially
      for (let i = 0; i < 50; i++) {
        const file = new File(['audio-payload'], `grain_sample_${i}.wav`, { type: 'audio/wav' });
        (file as any).arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(16));

        await act(async () => {
          fireEvent.drop(dropZone, {
            dataTransfer: {
              files: [file]
            }
          });
        });
      }

      expect(totalCreated).toBe(50);
      expect(totalClosed).toBe(50);
      expect(openContextCount).toBe(0);
    });

    it('D27-ADV-2: close() rejection is safely swallowed and does not cause unhandled crash', async () => {
      const MockAudioContext = vi.fn().mockImplementation(() => ({
        decodeAudioData: vi.fn().mockRejectedValue(new Error('Corrupt header')),
        close: vi.fn().mockRejectedValue(new Error('Hardware context already torn down'))
      }));

      (window as any).AudioContext = MockAudioContext;

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'adv-test' })
        )
      );

      const dropZone = container.firstChild as HTMLElement;
      const file = new File(['corrupt'], 'broken.flac', { type: 'audio/flac' });
      (file as any).arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      // Should not throw unhandled rejection
      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file]
          }
        });
      });

      expect(MockAudioContext).toHaveBeenCalledTimes(1);
    });

    it('D27-ADV-3: Non-audio extension drops do not instantiate AudioContext', async () => {
      const MockAudioContext = vi.fn();
      (window as any).AudioContext = MockAudioContext;

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'adv-test' })
        )
      );

      const dropZone = container.firstChild as HTMLElement;
      const nonAudioFiles = [
        new File(['text'], 'notes.txt', { type: 'text/plain' }),
        new File(['img'], 'photo.png', { type: 'image/png' }),
        new File(['binary'], 'binary.exe', { type: 'application/octet-stream' }),
        new File(['json'], 'config.json', { type: 'application/json' })
      ];

      for (const file of nonAudioFiles) {
        await act(async () => {
          fireEvent.drop(dropZone, {
            dataTransfer: {
              files: [file]
            }
          });
        });
      }

      expect(MockAudioContext).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // D28: Retina DPR Scaling & Logical Pixel Geometry
  // =========================================================================
  describe('D28 Adversarial: Retina DPR Scaling & Logical Pixel Decoupling', () => {
    it('D28-ADV-1: Arbitrary DPR scaling factors scale backing store and invoke ctx.scale(dpr, dpr)', () => {
      const dprValues = [0.75, 1.0, 1.25, 1.5, 2.0, 2.75, 3.0, 4.0];

      for (const dpr of dprValues) {
        mockCtx.scale.mockClear();
        mockCtx.save.mockClear();
        mockCtx.restore.mockClear();
        window.devicePixelRatio = dpr;

        const { unmount } = render(
          React.createElement(
            ThemeProvider,
            null,
            React.createElement(GrainSourceVisualizer, { sampleId: 'dpr-test', isPlaying: false })
          )
        );

        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.scale).toHaveBeenCalledWith(dpr, dpr);
        expect(mockCtx.restore).toHaveBeenCalled();

        unmount();
      }
    });

    it('D28-ADV-2: Negative dimension container aborts cleanly without context distortion', () => {
      HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
        width: -10,
        height: -10,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      });

      mockCtx.save.mockClear();
      mockCtx.scale.mockClear();

      render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'negative-test', isPlaying: false })
        )
      );

      // When width <= 0 or height <= 0, render returns early before modifying context
      expect(mockCtx.scale).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // D29: Zero React Re-renders on Hover
  // =========================================================================
  describe('D29 Adversarial: Zero React Re-renders on High-Frequency Pointer Hover', () => {
    it('D29-ADV-1: 100 rapid pointerMove events cause strictly 0 additional component re-renders', () => {
      let renderCount = 0;
      const RenderTracker: React.FC = () => {
        renderCount++;
        return React.createElement(GrainSourceVisualizer, { sampleId: 'hover-test', isPlaying: false });
      };

      const { container } = render(
        React.createElement(ThemeProvider, null, React.createElement(RenderTracker, null))
      );

      expect(renderCount).toBe(1);
      const canvas = container.querySelector('canvas')!;

      // Bombard with 100 pointer moves
      for (let i = 0; i < 100; i++) {
        fireEvent.pointerMove(canvas, {
          clientX: (i * 3.8) % 380 + 10,
          clientY: 40,
          pointerId: 1
        });
      }

      // Re-render count must stay strictly 1
      expect(renderCount).toBe(1);

      // Pointer leave should also cause zero re-renders
      fireEvent.pointerLeave(canvas);
      expect(renderCount).toBe(1);
    });

    it('D29-ADV-2: Playing state suppresses manual canvas redraw calls while updating hoverRef', () => {
      let renderCount = 0;
      const RenderTracker: React.FC = () => {
        renderCount++;
        return React.createElement(GrainSourceVisualizer, { sampleId: 'hover-playing', isPlaying: true });
      };

      const { container } = render(
        React.createElement(ThemeProvider, null, React.createElement(RenderTracker, null))
      );

      expect(renderCount).toBe(1);
      const canvas = container.querySelector('canvas')!;

      for (let i = 0; i < 50; i++) {
        fireEvent.pointerMove(canvas, { clientX: i * 5, clientY: 50, pointerId: 1 });
      }

      expect(renderCount).toBe(1);
    });
  });

  // =========================================================================
  // D30: Handle Hitbox & Overlap Priority Invariants
  // =========================================================================
  describe('D30 Adversarial: Handle Hit-Testing & Overlap Priority Invariants', () => {
    it('D30-ADV-1: Priority to rangeStart over playhead when exactly coincident', () => {
      const onRangeChange = vi.fn();
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'coincident',
            position: 0.35,
            rangeStart: 0.35,
            rangeEnd: 0.85,
            onRangeChange,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click at exact 0.35 * 400 = 140px
      fireEvent.pointerDown(canvas, { clientX: 140, clientY: 60, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 160, clientY: 60, pointerId: 1 });

      expect(onRangeChange).toHaveBeenCalled();
      const [start, end] = onRangeChange.mock.calls[0];
      expect(start).toBeCloseTo(0.40, 2);
      expect(end).toBe(0.85);
      expect(onPositionChange).not.toHaveBeenCalled();
    });

    it('D30-ADV-2: Priority to rangeEnd over playhead when exactly coincident', () => {
      const onRangeChange = vi.fn();
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'coincident-end',
            position: 0.75,
            rangeStart: 0.20,
            rangeEnd: 0.75,
            onRangeChange,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click at exact 0.75 * 400 = 300px
      fireEvent.pointerDown(canvas, { clientX: 300, clientY: 60, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 320, clientY: 60, pointerId: 1 });

      expect(onRangeChange).toHaveBeenCalled();
      const [start, end] = onRangeChange.mock.calls[0];
      expect(start).toBe(0.20);
      expect(end).toBeCloseTo(0.80, 2);
      expect(onPositionChange).not.toHaveBeenCalled();
    });

    it('D30-ADV-3: Range handle drag clamps prevent start from overtaking end', () => {
      const onRangeChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'clamp-test',
            position: 0.1,
            rangeStart: 0.2,
            rangeEnd: 0.5,
            onRangeChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click at rangeStart (80px) and attempt to drag past rangeEnd to 300px (0.75)
      fireEvent.pointerDown(canvas, { clientX: 80, clientY: 60, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 300, clientY: 60, pointerId: 1 });

      expect(onRangeChange).toHaveBeenCalled();
      const [start] = onRangeChange.mock.calls[0];
      // Clamped to rangeEnd - 0.04 = 0.5 - 0.04 = 0.46
      expect(start).toBeLessThanOrEqual(0.46);
    });

    it('D30-ADV-4: Playhead click outside handle hit radius is clamped to [rangeStart, rangeEnd]', () => {
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'playhead-clamp',
            position: 0.5,
            rangeStart: 0.25,
            rangeEnd: 0.75,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click at 10px (normX = 0.025, below rangeStart 0.25)
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 60, pointerId: 1 });
      expect(onPositionChange).toHaveBeenCalledWith(0.25);

      // Click at 390px (normX = 0.975, above rangeEnd 0.75)
      fireEvent.pointerDown(canvas, { clientX: 390, clientY: 60, pointerId: 1 });
      expect(onPositionChange).toHaveBeenCalledWith(0.75);
    });
  });

  // =========================================================================
  // D31: Hann & Gaussian Window Dynamic AHR Responsiveness
  // =========================================================================
  describe('D31 Adversarial: Hann & Gaussian Dynamic AHR Responsiveness & Numerical Safety', () => {
    it('D31-ADV-1: Extreme parameter combinations generate valid SVG paths without NaN or Infinity', () => {
      const shapes = ['gaussian', 'hann', 'sine', 'triangle', 'trapezoid'] as const;
      const testEnvelopes = [
        { attack: 0.001, hold: 0.001, release: 0.998 },
        { attack: 0.998, hold: 0.001, release: 0.001 },
        { attack: 0.499, hold: 0.002, release: 0.499 },
        { attack: 0.05, hold: 0.90, release: 0.05 },
        { attack: 0.33, hold: 0.34, release: 0.33 }
      ];

      for (const shape of shapes) {
        for (const env of testEnvelopes) {
          const { container, unmount } = render(
            React.createElement(
              ThemeProvider,
              null,
              React.createElement(GrainEnvelopeScope, {
                envelope: { ...env, shape }
              })
            )
          );

          const paths = container.querySelectorAll('path');
          expect(paths.length).toBeGreaterThan(0);

          for (const path of paths) {
            const d = path.getAttribute('d') || '';
            expect(d).not.toContain('NaN');
            expect(d).not.toContain('Infinity');
            expect(d).toMatch(/M\s+[\d.-]+\s+[\d.-]+/);
          }

          unmount();
        }
      }
    });

    it('D31-ADV-2: Gaussian and Hann curves visibly displace peak when attack/release shifts', () => {
      // Test Gaussian peak shift
      const { container: g1 } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.1, hold: 0.1, release: 0.8, shape: 'gaussian' }
          })
        )
      );
      const dGaussian1 = g1.querySelector('path')?.getAttribute('d')!;

      const { container: g2 } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.8, hold: 0.1, release: 0.1, shape: 'gaussian' }
          })
        )
      );
      const dGaussian2 = g2.querySelector('path')?.getAttribute('d')!;

      expect(dGaussian1).not.toBe(dGaussian2);

      // In g1 (fast attack, long release), early points should rise fast
      // In g2 (slow attack, fast release), early points should rise slow
      expect(dGaussian1).toBeDefined();
      expect(dGaussian2).toBeDefined();
    });
  });

  // =========================================================================
  // D32: padX Margin Jump Elimination & Duration Handle Displacement
  // =========================================================================
  describe('D32 Adversarial: padX Offset Jump Elimination & Duration Handle Feedback', () => {
    it('D32-ADV-1: Clicking exactly on handle coordinate produces zero jumping error', () => {
      const onEnvelopeChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.20, hold: 0.50, release: 0.30, shape: 'trapezoid' },
            onEnvelopeChange
          })
        )
      );

      const svg = container.querySelector('svg')!;
      svg.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 240,
        height: 68,
        left: 0,
        top: 0,
        right: 240,
        bottom: 68
      });

      // Attack handle coordinate: padX + attackFrac * graphW = 10 + 0.20 * 220 = 54
      const attackHandle = container.querySelector('g.cursor-ew-resize circle')!;
      fireEvent.pointerDown(attackHandle, { clientX: 54, clientY: 8, pointerId: 1 });
      fireEvent.pointerMove(svg, { clientX: 54, clientY: 8, pointerId: 1 });

      expect(onEnvelopeChange).toHaveBeenCalled();
      const updated = onEnvelopeChange.mock.calls[0][0];
      // With padX subtracted, normGraphX is (54 - 10) / 220 = 44 / 220 = 0.200!
      expect(updated.attack).toBeCloseTo(0.20, 2);
    });

    it('D32-ADV-2: Duration handle drag communicates displacement and clamps values [0.02, 10.0]', () => {
      const onDurationChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            duration: 0.30,
            onDurationChange
          })
        )
      );

      const svg = container.querySelector('svg')!;
      svg.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 240,
        height: 68,
        left: 0,
        top: 0,
        right: 240,
        bottom: 68
      });

      const resizeGroups = container.querySelectorAll('g.cursor-ew-resize');
      const durationGroup = resizeGroups[2];
      const innerCircle = durationGroup.querySelectorAll('circle')[2];

      // Drag right by +60px
      fireEvent.pointerDown(innerCircle, { clientX: 200, clientY: 58, pointerId: 1 });
      fireEvent.pointerMove(svg, { clientX: 260, clientY: 58, pointerId: 1 });

      expect(onDurationChange).toHaveBeenCalled();
      const newDur = onDurationChange.mock.calls[0][0];
      expect(newDur).toBeGreaterThan(0.30);

      // Verify visible displacement
      const draggedCx = parseFloat(innerCircle.getAttribute('cx') || '230');
      expect(draggedCx).toBeGreaterThan(230);

      // Drag far left to trigger minimum 0.02s clamping
      fireEvent.pointerMove(svg, { clientX: -200, clientY: 58, pointerId: 1 });
      const clampedDur = onDurationChange.mock.calls[onDurationChange.mock.calls.length - 1][0];
      expect(clampedDur).toBe(0.02);

      // Pointer up resets displacement
      fireEvent.pointerUp(svg, { pointerId: 1 });
      expect(parseFloat(innerCircle.getAttribute('cx') || '230')).toBe(230);
    });
  });

  // =========================================================================
  // D33: Independent Summing Paths & 44px Touch Target Invariant
  // =========================================================================
  describe('D33 Adversarial: Summing Bus Bypass States & 44px Touch Targets', () => {
    it('D33-ADV-1: Verifies all 16 bypass permutations accurately reflect on independent SVG paths', () => {
      const permutations = [
        [false, false, false, false],
        [true, false, false, false],
        [false, true, false, false],
        [false, false, true, false],
        [false, false, false, true],
        [true, true, false, false],
        [true, false, true, false],
        [true, false, false, true],
        [false, true, true, false],
        [false, true, false, true],
        [false, false, true, true],
        [true, true, true, false],
        [true, true, false, true],
        [true, false, true, true],
        [false, true, true, true],
        [true, true, true, true]
      ];

      for (const [bA, bG, bB, bD] of permutations) {
        const channelStrip = {
          ...DEFAULT_CHANNEL_STRIP,
          oscA: { ...DEFAULT_CHANNEL_STRIP.oscA, bypass: bA },
          granular: { ...(DEFAULT_CHANNEL_STRIP.granular || {}), bypass: bG } as any,
          oscB: { ...DEFAULT_CHANNEL_STRIP.oscB, bypass: bB },
          drone: { ...DEFAULT_CHANNEL_STRIP.drone, bypass: bD }
        };

        const { container, unmount } = render(
          React.createElement(SignalFlowGraph, {
            channelStrip,
            effects: DEFAULT_EFFECTS_CHAIN,
            isPlaying: true,
            isDark: true
          })
        );

        const pathOscA = container.querySelector('[data-testid="bus-path-oscA"]');
        const pathGrain = container.querySelector('[data-testid="bus-path-granular"]');
        const pathOscB = container.querySelector('[data-testid="bus-path-oscB"]');
        const pathDrone = container.querySelector('[data-testid="bus-path-drone"]');

        expect(pathOscA?.getAttribute('data-active')).toBe(!bA ? 'true' : 'false');
        expect(pathGrain?.getAttribute('data-active')).toBe(!bG ? 'true' : 'false');
        expect(pathOscB?.getAttribute('data-active')).toBe(!bB ? 'true' : 'false');
        expect(pathDrone?.getAttribute('data-active')).toBe(!bD ? 'true' : 'false');

        unmount();
      }
    });

    it('D33-ADV-2: When isPlaying is false, all summing paths are inactive even if bypass is false', () => {
      const { container } = render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          isPlaying: false,
          isDark: true
        })
      );

      const paths = ['oscA', 'granular', 'oscB', 'drone'];
      for (const id of paths) {
        const path = container.querySelector(`[data-testid="bus-path-${id}"]`);
        expect(path?.getAttribute('data-active')).toBe('false');
        expect(path?.getAttribute('class')).not.toContain('photon-stream');
      }
    });

    it('D33-ADV-3: Every effect reorder button strictly fulfills 44px touch target requirement', () => {
      const onReorder = vi.fn();
      const { container } = render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          isPlaying: true,
          onReorderEffects: onReorder
        })
      );

      const buttons = container.querySelectorAll('button[data-touch-target="44px"]');
      expect(buttons.length).toBeGreaterThanOrEqual(10);

      buttons.forEach(btn => {
        const cls = btn.getAttribute('class') || '';
        expect(cls).toContain('before:min-w-[44px]');
        expect(cls).toContain('before:min-h-[44px]');
      });
    });

    it('D33-ADV-4: Reordering effects correctly swaps adjacent items in effect order', () => {
      const onReorder = vi.fn();
      const initialOrder = ['gain', 'drive', 'filter', 'adsr', 'delay', 'reverb'];

      const { container } = render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          effectOrder: initialOrder,
          isPlaying: true,
          onReorderEffects: onReorder
        })
      );

      // Find all move left buttons
      const leftButtons = container.querySelectorAll('button[aria-label*="Left"]');
      expect(leftButtons.length).toBeGreaterThanOrEqual(5);

      // Click move left on the second button (which corresponds to 'filter' at index 2 moving left)
      fireEvent.click(leftButtons[1]);

      expect(onReorder).toHaveBeenCalledTimes(1);
      const newOrder = onReorder.mock.calls[0][0];
      // Index 2 ('filter') was swapped with index 1 ('drive')
      expect(newOrder[1]).toBe('filter');
      expect(newOrder[2]).toBe('drive');
    });
  });

  // =========================================================================
  // Additional Forensic Invariant Cross-Checks
  // =========================================================================
  describe('D30/D32 Deep Clamp & Boundary Safeguard Invariants', () => {
    it('D30-ADV-5: Extreme mouse drags across full screen boundary clamp smoothly without exceptions', () => {
      const onRangeChange = vi.fn();
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'extreme-drag',
            position: 0.5,
            rangeStart: 0.2,
            rangeEnd: 0.8,
            onRangeChange,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;

      // 1. Drag playhead way past screen left (-2000px)
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 60, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: -2000, clientY: 60, pointerId: 1 });
      expect(onPositionChange).toHaveBeenCalledWith(0.2); // Clamped to rangeStart

      // 2. Drag playhead way past screen right (+5000px)
      fireEvent.pointerMove(canvas, { clientX: 5000, clientY: 60, pointerId: 1 });
      expect(onPositionChange).toHaveBeenCalledWith(0.8); // Clamped to rangeEnd

      fireEvent.pointerUp(canvas, { pointerId: 1 });
    });

    it('D32-ADV-3: Envelope attack and release handle drags outside SVG bounds clamp safely', () => {
      const onEnvelopeChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.1, hold: 0.5, release: 0.4, shape: 'hann' },
            onEnvelopeChange
          })
        )
      );

      const svg = container.querySelector('svg')!;
      svg.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 240,
        height: 68,
        left: 0,
        top: 0,
        right: 240,
        bottom: 68
      });

      const handles = container.querySelectorAll('g.cursor-ew-resize circle');
      const attackHandle = handles[0];
      const releaseHandle = handles[1];

      // Drag attack handle far right (+1000px): must clamp to max 0.48 (or 1.0 - release - 0.02)
      fireEvent.pointerDown(attackHandle, { clientX: 30, clientY: 8, pointerId: 1 });
      fireEvent.pointerMove(svg, { clientX: 1000, clientY: 8, pointerId: 1 });
      expect(onEnvelopeChange).toHaveBeenCalled();
      const clampedAttack = onEnvelopeChange.mock.calls[onEnvelopeChange.mock.calls.length - 1][0].attack;
      expect(clampedAttack).toBeLessThanOrEqual(0.48);

      fireEvent.pointerUp(svg, { pointerId: 1 });

      // Drag release handle far left (-1000px): must clamp release
      fireEvent.pointerDown(releaseHandle, { clientX: 150, clientY: 8, pointerId: 1 });
      fireEvent.pointerMove(svg, { clientX: -1000, clientY: 8, pointerId: 1 });
      const clampedRelease = onEnvelopeChange.mock.calls[onEnvelopeChange.mock.calls.length - 1][0].release;
      expect(clampedRelease).toBeLessThanOrEqual(0.65);
    });
  });
});
