import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GrainSourceVisualizer } from '../../../src/ui/components/deck/GrainSourceVisualizer';
import { GrainEnvelopeScope } from '../../../src/ui/components/deck/GrainEnvelopeScope';
import { SignalFlowGraph } from '../../../src/ui/components/deck/SignalFlowGraph';
import { DEFAULT_CHANNEL_STRIP, DEFAULT_EFFECTS_CHAIN } from '../../../src/audio/engine';
import { ThemeProvider } from '../../../src/ui/theme';

describe('Milestone 4 Regression Test Suite (D27 - D33)', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;
  const yellowOrangeRegex = /\b(amber|yellow|orange|gold)\b|#(f59e0b|fbbf24|d97706|f97316|ea580c|eab308|facc15)/i;

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

  // --- D27: AudioContext leak & close() in finally ---
  describe('D27: GrainSourceVisualizer Dropzone AudioContext Lifecycle', () => {
    it('closes temporary AudioContext in finally block on successful drop decode', async () => {
      const closeSpy = vi.fn().mockResolvedValue(undefined);
      const decodeAudioDataSpy = vi.fn().mockResolvedValue({
        duration: 2.5,
        numberOfChannels: 2,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(1024)
      });

      const MockAudioContext = vi.fn().mockImplementation(() => ({
        decodeAudioData: decodeAudioDataSpy,
        createBuffer: vi.fn().mockReturnValue({
          duration: 2.5,
          numberOfChannels: 2,
          sampleRate: 44100,
          copyToChannel: vi.fn(),
          getChannelData: () => new Float32Array(1024)
        }),
        close: closeSpy
      }));

      (window as any).AudioContext = MockAudioContext;

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'test' })
        )
      );

      const dropZone = container.firstChild as HTMLElement;
      const file = new File(['fake-audio-bytes'], 'ambient_texture.wav', { type: 'audio/wav' });
      (file as any).arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file]
          }
        });
      });

      expect(MockAudioContext).toHaveBeenCalled();
      expect(decodeAudioDataSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('closes temporary AudioContext even if decodeAudioData throws an error', async () => {
      const closeSpy = vi.fn().mockResolvedValue(undefined);
      const decodeAudioDataSpy = vi.fn().mockRejectedValue(new Error('Corrupt audio data'));

      const MockAudioContext = vi.fn().mockImplementation(() => ({
        decodeAudioData: decodeAudioDataSpy,
        close: closeSpy
      }));

      (window as any).AudioContext = MockAudioContext;

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'test' })
        )
      );

      const dropZone = container.firstChild as HTMLElement;
      const file = new File(['corrupt-bytes'], 'broken.wav', { type: 'audio/wav' });

      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file]
          }
        });
      });

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  // --- D28: Retina DPR Scaling ---
  describe('D28: GrainSourceVisualizer Retina DPR Scaling Decoupling', () => {
    it('calls ctx.scale(dpr, dpr) inside ctx.save() and ctx.restore()', () => {
      window.devicePixelRatio = 2;

      render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'test', isPlaying: false })
        )
      );

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  // --- D29: hoverPosition Decoupling ---
  describe('D29: GrainSourceVisualizer hoverPosition Re-render Decoupling', () => {
    it('does not re-render component on pointer move across canvas', () => {
      let renderCount = 0;
      const TrackingComponent = () => {
        renderCount++;
        return React.createElement(GrainSourceVisualizer, { sampleId: 'test', isPlaying: false });
      };

      const { container } = render(
        React.createElement(ThemeProvider, null, React.createElement(TrackingComponent, null))
      );

      const initialCount = renderCount;
      const canvas = container.querySelector('canvas')!;

      // Simulate mouse move across multiple positions
      for (let x = 10; x <= 200; x += 10) {
        fireEvent.pointerMove(canvas, { clientX: x, clientY: 50 });
      }

      // Render count should NOT increase for each pointerMove event
      expect(renderCount).toBe(initialCount);
    });
  });

  // --- D30: Handle Hitbox & Priority ---
  describe('D30: GrainSourceVisualizer Handle Hit-Testing and Overlap Priority', () => {
    it('prioritizes rangeStart over playhead when both handles overlap at the same position', () => {
      const onRangeChange = vi.fn();
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'test',
            position: 0.2,
            rangeStart: 0.2,
            rangeEnd: 0.8,
            onRangeChange,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click right at normX = 0.2 (which is 80px on 400px width)
      fireEvent.pointerDown(canvas, { clientX: 80, clientY: 50, pointerId: 1 });

      // Drag to 0.25 (100px)
      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 50, pointerId: 1 });

      // Should have triggered onRangeChange (modifying rangeStart), NOT onPositionChange
      expect(onRangeChange).toHaveBeenCalled();
      const [newStart, newEnd] = onRangeChange.mock.calls[0];
      expect(newStart).toBeCloseTo(0.25, 2);
      expect(newEnd).toBe(0.8);
      expect(onPositionChange).not.toHaveBeenCalled();
    });

    it('activates rangeEnd within 16px hit radius', () => {
      const onRangeChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'test',
            position: 0.1,
            rangeStart: 0.0,
            rangeEnd: 0.8, // 0.8 * 400 = 320px
            onRangeChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click at 328px (within 16px of 320px)
      fireEvent.pointerDown(canvas, { clientX: 328, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 340, clientY: 50, pointerId: 1 });

      expect(onRangeChange).toHaveBeenCalled();
      const [start, end] = onRangeChange.mock.calls[0];
      expect(start).toBe(0.0);
      expect(end).toBeCloseTo(0.85, 2);
    });

    it('falls back to playhead when clicked outside range handles', () => {
      const onPositionChange = vi.fn();

      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'test',
            position: 0.1,
            rangeStart: 0.0,
            rangeEnd: 1.0,
            onPositionChange
          })
        )
      );

      const canvas = container.querySelector('canvas')!;
      // Click in the middle at 200px (normX = 0.5)
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 50, pointerId: 1 });

      expect(onPositionChange).toHaveBeenCalledWith(0.5);
    });
  });

  // --- D31: GrainEnvelopeScope Hann & Gaussian AHR Responsiveness ---
  describe('D31: GrainEnvelopeScope Hann and Gaussian Dynamic AHR Responsiveness', () => {
    it('dynamically adapts gaussian window curve path when attack/hold/release changes', () => {
      const { container, rerender } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.1, hold: 0.4, release: 0.5, shape: 'gaussian' }
          })
        )
      );

      const path1 = container.querySelector('path')?.getAttribute('d');
      expect(path1).toBeDefined();

      // Change attack and release fractions
      rerender(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.35, hold: 0.15, release: 0.5, shape: 'gaussian' }
          })
        )
      );

      const path2 = container.querySelector('path')?.getAttribute('d');
      expect(path2).toBeDefined();
      expect(path2).not.toEqual(path1);
    });

    it('dynamically adapts hann window curve path when attack/hold/release changes', () => {
      const { container, rerender } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.1, hold: 0.45, release: 0.45, shape: 'hann' }
          })
        )
      );

      const path1 = container.querySelector('path')?.getAttribute('d');
      expect(path1).toBeDefined();

      rerender(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.4, hold: 0.1, release: 0.5, shape: 'hann' }
          })
        )
      );

      const path2 = container.querySelector('path')?.getAttribute('d');
      expect(path2).toBeDefined();
      expect(path2).not.toEqual(path1);
    });
  });

  // --- D32: padX offset elimination & visible duration handle displacement ---
  describe('D32: GrainEnvelopeScope padX Offset and Duration Handle Drag Feedback', () => {
    it('eliminates 4.2% jump by properly subtracting padX = 10 from client offset', () => {
      const onEnvelopeChange = vi.fn();
      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            envelope: { attack: 0.1, hold: 0.45, release: 0.45, shape: 'trapezoid' },
            onEnvelopeChange
          })
        )
      );

      const svg = container.querySelector('svg')!;
      // Mock svg.getBoundingClientRect: vbW = 240, width = 240, left = 0
      svg.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 240,
        height: 68,
        left: 0,
        top: 0,
        right: 240,
        bottom: 68
      });

      // Find Attack control point handle
      const attackHandle = container.querySelector('g.cursor-ew-resize circle')!;
      fireEvent.pointerDown(attackHandle, { clientX: 10, clientY: 8, pointerId: 1 });

      // Move to clientX = 10 (which is exactly padX): normGraphX should be (10 - 10) / 220 = 0.0
      // Clamped to min 0.01
      fireEvent.pointerMove(svg, { clientX: 10, clientY: 8, pointerId: 1 });

      expect(onEnvelopeChange).toHaveBeenCalled();
      const updatedEnv = onEnvelopeChange.mock.calls[0][0];
      expect(updatedEnv.attack).toBe(0.01); // Exactly minimum, no 0.0417 jump!
    });

    it('provides visible horizontal displacement for duration handle during drag', () => {
      const onDurationChange = vi.fn();
      const { container } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainEnvelopeScope, {
            duration: 0.25,
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

      // Find the Duration End Node (the 3rd resize group)
      const resizeGroups = container.querySelectorAll('g.cursor-ew-resize');
      const durationGroup = resizeGroups[2];
      const circles = durationGroup.querySelectorAll('circle');
      const innerCircle = circles[2]; // inner indicator circle

      const initialCx = parseFloat(innerCircle.getAttribute('cx') || '230');
      expect(initialCx).toBe(230);

      // Start drag at x = 200
      fireEvent.pointerDown(innerCircle, { clientX: 200, clientY: 58, pointerId: 1 });

      // Drag right by +30px to clientX = 230
      fireEvent.pointerMove(svg, { clientX: 230, clientY: 58, pointerId: 1 });

      // After drag move, cx should have shifted horizontally (> 230)
      const draggedCx = parseFloat(innerCircle.getAttribute('cx') || '230');
      expect(draggedCx).toBeGreaterThan(initialCx);

      // End drag
      fireEvent.pointerUp(svg, { pointerId: 1 });
      const resetCx = parseFloat(innerCircle.getAttribute('cx') || '230');
      expect(resetCx).toBe(230);
    });
  });

  // --- D33: SignalFlowGraph Independent Paths, Photon Flow & 44px Touch Targets ---
  describe('D33: SignalFlowGraph Independent Paths and Touch Targets', () => {
    it('splits summing bus into 4 independent parallel SVG paths with individual active status', () => {
      // OSC A active, granular bypassed, OSC B active, Drone bypassed
      const channelStrip = {
        ...DEFAULT_CHANNEL_STRIP,
        oscA: { ...DEFAULT_CHANNEL_STRIP.oscA, bypass: false },
        granular: DEFAULT_CHANNEL_STRIP.granular
          ? { ...DEFAULT_CHANNEL_STRIP.granular, bypass: true }
          : undefined,
        oscB: { ...DEFAULT_CHANNEL_STRIP.oscB, bypass: false },
        drone: { ...DEFAULT_CHANNEL_STRIP.drone, bypass: true }
      };

      const { container } = render(
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

      expect(pathOscA).not.toBeNull();
      expect(pathGrain).not.toBeNull();
      expect(pathOscB).not.toBeNull();
      expect(pathDrone).not.toBeNull();

      // OSC A and OSC B should be active (#38bdf8 & photon-stream)
      expect(pathOscA?.getAttribute('data-active')).toBe('true');
      expect(pathOscA?.getAttribute('stroke')).toBe('#38bdf8');
      expect(pathOscA?.getAttribute('class')).toContain('photon-stream');

      expect(pathOscB?.getAttribute('data-active')).toBe('true');
      expect(pathOscB?.getAttribute('stroke')).toBe('#38bdf8');
      expect(pathOscB?.getAttribute('class')).toContain('photon-stream');

      // Granular and Drone are bypassed, so they should be inactive
      expect(pathGrain?.getAttribute('data-active')).toBe('false');
      expect(pathGrain?.getAttribute('stroke')).toBe('#262626');
      expect(pathGrain?.getAttribute('class')).not.toContain('photon-stream');

      expect(pathDrone?.getAttribute('data-active')).toBe('false');
      expect(pathDrone?.getAttribute('stroke')).toBe('#262626');
      expect(pathDrone?.getAttribute('class')).not.toContain('photon-stream');
    });

    it('ensures all effect reorder buttons have >= 44px touch targets', () => {
      const onReorder = vi.fn();
      render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          isPlaying: true,
          isDark: true,
          onReorderEffects: onReorder
        })
      );

      const reorderButtons = screen.getAllByRole('button');
      expect(reorderButtons.length).toBeGreaterThanOrEqual(10); // 5 left + 5 right

      for (const btn of reorderButtons) {
        expect(btn.getAttribute('data-touch-target')).toBe('44px');
        const className = btn.getAttribute('class') || '';
        expect(className).toMatch(/before:min-w-\[44px\]/);
        expect(className).toMatch(/before:min-h-\[44px\]/);
      }
    });
  });

  // --- S6 Compliance: Zero Emoji and Zero Yellow/Orange ---
  describe('Aesthetic Standards Compliance (Zero Emoji & Zero Yellow/Orange)', () => {
    it('strictly satisfies zero emoji in GrainSourceVisualizer, GrainEnvelopeScope, and SignalFlowGraph', () => {
      const { container: c1 } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'test' })
        )
      );
      expect(emojiRegex.test(c1.textContent || '')).toBe(false);

      const { container: c2 } = render(
        React.createElement(ThemeProvider, null, React.createElement(GrainEnvelopeScope, null))
      );
      expect(emojiRegex.test(c2.textContent || '')).toBe(false);

      const { container: c3 } = render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          isPlaying: true
        })
      );
      expect(emojiRegex.test(c3.textContent || '')).toBe(false);
    });

    it('strictly satisfies S6-5 zero yellow/orange compliance across all 3 visual components', () => {
      const { container: c1 } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, { sampleId: 'test' })
        )
      );
      expect(yellowOrangeRegex.test(c1.innerHTML)).toBe(false);

      const { container: c2 } = render(
        React.createElement(ThemeProvider, null, React.createElement(GrainEnvelopeScope, null))
      );
      expect(yellowOrangeRegex.test(c2.innerHTML)).toBe(false);

      const { container: c3 } = render(
        React.createElement(SignalFlowGraph, {
          channelStrip: DEFAULT_CHANNEL_STRIP,
          effects: DEFAULT_EFFECTS_CHAIN,
          isPlaying: true
        })
      );
      expect(yellowOrangeRegex.test(c3.innerHTML)).toBe(false);
    });
  });
});
