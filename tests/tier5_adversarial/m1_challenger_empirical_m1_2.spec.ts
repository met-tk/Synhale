import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../src/audio/engine';
import { MockAudioContext } from '../mocks/webAudioMock';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GrainSourceVisualizer } from '../../src/ui/components/deck/GrainSourceVisualizer';
import { ThemeProvider } from '../../src/ui/theme';

describe('EMPIRICAL CHALLENGER (M1-2): Stress-Test Visual Telemetry, Engine Stability & Sub Drone Independence', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(async () => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Canvas mock for GrainSourceVisualizer
    const mockCanvasCtx = {
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
    } as unknown as CanvasRenderingContext2D;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasCtx);
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 120,
      top: 0,
      left: 0,
      right: 400,
      bottom: 120
    });
  });

  afterEach(() => {
    engine.dispose();
  });

  // =========================================================================
  // VERIFICATION 1: engine.getVisualGrains() Isolation & Never Accesses oscA
  // =========================================================================
  describe('Verification 1: engine.getVisualGrains() strictly returns [] when bypassed/idle and never accesses oscA', () => {
    it('strictly returns [] when Granular is bypassed even under 100 extreme OSC A parameter sweeps', () => {
      // Setup spy on OscAChannel to detect any access to getActiveVisualGrains or properties
      const oscAGrainsSpy = vi.spyOn(engine.oscA, 'getActiveVisualGrains');

      for (let i = 0; i < 100; i++) {
        const wtIndex = (i % 24);
        const detuneVal = ((i * 2) % 201) - 100;
        const gainVal = (i % 10) / 10;

        engine.updateChannelStrip({
          granular: { bypass: true, gain: 0.9, density: 16, rate: 20 },
          oscA: {
            bypass: false,
            gain: gainVal,
            wavetableIndex: wtIndex,
            detune: detuneVal,
            harmonics: (i % 100) / 100,
            unison: 1.0,
            unisonVoices: 16,
            warmth: 0.8,
            spread: 0.5,
            subGain: 0.5,
            voiceMode: i % 2 === 0 ? 'particles' : 'drone'
          }
        });

        ctx.advanceTime(0.02);

        const visualGrains = engine.getVisualGrains();
        expect(visualGrains).toEqual([]);
        expect(visualGrains.length).toBe(0);

        // Crucial: oscA must NEVER be queried for visual grains
        expect(oscAGrainsSpy).not.toHaveBeenCalled();
      }
    });

    it('strictly returns [] when Granular is idle (stopped and purged), without touching oscA', () => {
      const oscAGrainsSpy = vi.spyOn(engine.oscA, 'getActiveVisualGrains');

      // Stop and purge granular channel so it has 0 active particles (idle)
      engine.granular.stop();
      engine.granular.purge();
      ctx.advanceTime(2.0); // Advance past all grain lifetimes

      // Granular is un-bypassed, but idle
      engine.updateChannelStrip({
        granular: { bypass: false, gain: 0.8 },
        oscA: { bypass: false, gain: 1.0, wavetableIndex: 10, voiceMode: 'particles' }
      });

      // No grains scheduled -> strictly empty array
      const grains = engine.getVisualGrains();
      expect(grains).toEqual([]);
      expect(grains.length).toBe(0);
      expect(oscAGrainsSpy).not.toHaveBeenCalled();
    });

    it('returns empty array if engine.granular is uninitialized or null', () => {
      const savedGranular = (engine as any).granular;
      (engine as any).granular = null;

      expect(engine.getVisualGrains()).toEqual([]);

      (engine as any).granular = savedGranular;
    });
  });

  // =========================================================================
  // VERIFICATION 2: GrainSourceVisualizer Animation Loop Cancellation & 0 rAF
  // =========================================================================
  describe('Verification 2: GrainSourceVisualizer animation loop is properly canceled when bypassed (0 rAF invocations)', () => {
    it('executes 0 requestAnimationFrame calls while bypass is true (even with isPlaying: true and pointer activity)', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const getLiveGrainsSpy = vi.fn().mockReturnValue([
        { id: 1, startTime: 0, duration: 0.25, sampleOffset: 0.2, peakGain: 0.9, totalStopTime: 1.0 }
      ]);

      const { container, unmount } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'handpan',
            isPlaying: true,
            bypass: true, // BYPASSED!
            getLiveGrains: getLiveGrainsSpy,
            duration: 0.5
          })
        )
      );

      // Verify ZERO rAF calls on mount
      expect(rafSpy).toHaveBeenCalledTimes(0);

      // Simulate pointer movement across the canvas
      const canvas = container.querySelector('canvas');
      expect(canvas).not.toBeNull();
      if (canvas) {
        fireEvent.pointerMove(canvas, { clientX: 100, clientY: 50 });
        fireEvent.pointerMove(canvas, { clientX: 200, clientY: 50 });
        fireEvent.pointerLeave(canvas);
      }

      // Even after pointer interaction, rAF must strictly remain 0 during bypass
      expect(rafSpy).toHaveBeenCalledTimes(0);

      // getLiveGrains should NEVER be queried when bypassed
      expect(getLiveGrainsSpy).toHaveBeenCalledTimes(0);

      rafSpy.mockRestore();
      unmount();
    });

    it('properly cancels active rAF when switching from bypass: false to bypass: true', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      let rafCallCount = 0;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        rafCallCount++;
        return 999;
      });

      const { rerender, unmount } = render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'handpan',
            isPlaying: true,
            bypass: false // Active
          })
        )
      );

      // Loop should have started
      expect(rafCallCount).toBeGreaterThan(0);
      const callsBeforeBypass = rafCallCount;

      // Now bypass the granular cloud
      rerender(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(GrainSourceVisualizer, {
            sampleId: 'handpan',
            isPlaying: true,
            bypass: true // BYPASS TOGGLED
          })
        )
      );

      // cancelAnimationFrame must be invoked with the active animId
      expect(cancelSpy).toHaveBeenCalled();

      // No additional rAF calls must occur after bypass
      expect(rafCallCount).toBe(callsBeforeBypass);

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
      unmount();
    });
  });

  // =========================================================================
  // VERIFICATION 3: Sub Drone 432Hz Immunity to OSC A Parameters across 4 Breath Stages
  // =========================================================================
  describe('Verification 3: Sub Drone 432Hz output is completely unaffected by OSC A parameter changes across all 4 breath stages', () => {
    it('verifies Sub Drone 54Hz/432Hz baseFreq, gain, and bypass are strictly invariant to OSC A mutations in all 4 breath stages', () => {
      // 1. Establish initial Sub Drone state at 432Hz tuning (54Hz root sub-octave)
      engine.updateChannelStrip({
        drone: {
          baseFreq: 54, // 432Hz / 8 = 54Hz
          gain: 0.65,
          pitchDrift: 0.35,
          bypass: false
        }
      });
      ctx.advanceTime(0.05); // Allow initial 10ms ramp to reach steady state

      const stages: Array<'inhale' | 'holdIn' | 'exhale' | 'holdOut'> = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      const breathProgresses = [0.0, 0.25, 0.5, 0.75, 1.0];
      const macroValues = [0.0, 0.2, 0.5, 0.8, 1.0];

      let cycle = 0;
      for (const stage of stages) {
        for (const progress of breathProgresses) {
          for (const macro of macroValues) {
            cycle++;

            // Update breath modulation
            engine.updateBreathModulation(macro, stage, progress);

            // Apply extreme adversarial OSC A mutations
            engine.updateChannelStrip({
              oscA: {
                wavetableIndex: (cycle * 3) % 24,
                detune: ((cycle * 17) % 201) - 100,
                harmonics: (cycle % 10) / 10,
                gain: (cycle % 5) / 5,
                morphDepth: (cycle % 7) / 7,
                unison: (cycle % 4) / 4,
                unisonVoices: (cycle % 16) + 1,
                warmth: (cycle % 6) / 6,
                spread: (cycle % 8) / 8,
                subGain: (cycle % 9) / 9,
                voiceMode: cycle % 3 === 0 ? 'particles' : cycle % 3 === 1 ? 'drone' : 'arp',
                bypass: cycle % 2 === 0
              }
            });

            ctx.advanceTime(0.01);

            // Verify Sub Drone logical parameters remain 100% invariant
            const droneParams = engine.drone.getParams();
            expect(droneParams.baseFreq).toBe(54);
            expect(droneParams.gain).toBe(0.65);
            expect(droneParams.pitchDrift).toBe(0.35);
            expect(droneParams.bypass).toBe(false);

            // Verify Sub Drone physical audio node parameters remain 100% invariant
            const droneOsc = (engine.drone as any).droneOsc as OscillatorNode;
            const trackGain = (engine.drone as any).trackGain as GainNode;
            const bypassGain = (engine.drone as any).bypassGain as GainNode;

            expect(droneOsc.frequency.value).toBe(54);
            expect(trackGain.gain.value).toBeCloseTo(0.65, 2);
            expect(bypassGain.gain.value).toBe(1.0);

            // Verify no NaN values
            expect(Number.isFinite(droneOsc.frequency.value)).toBe(true);
            expect(Number.isFinite(trackGain.gain.value)).toBe(true);
            expect(Number.isFinite(bypassGain.gain.value)).toBe(true);
          }
        }
      }
    });

    it('verifies explicit modulation on Sub Drone operates independently of OSC A', () => {
      // Connect breathMacro to drone-gain with depth 0.5
      engine.setModulationRoute('drone-gain', {
        source: 'breathMacro',
        target: 'drone-gain',
        depth: 0.5,
        bipolar: false
      });

      engine.updateChannelStrip({
        drone: { baseFreq: 54, gain: 0.8, bypass: false },
        oscA: { gain: 0.2, wavetableIndex: 5 }
      });
      ctx.advanceTime(0.05);

      // Modulate at macro = 1.0 (gain should be 0.8 * (0.5 + 0.5 * 1.0) = 0.8)
      engine.updateBreathModulation(1.0, 'inhale', 0.5);
      ctx.advanceTime(0.05);
      expect((engine.drone as any).trackGain.gain.value).toBeCloseTo(0.8, 2);

      // Mutate OSC A drastically
      engine.updateChannelStrip({
        oscA: { gain: 1.0, wavetableIndex: 22, detune: 80, voiceMode: 'drone' }
      });

      // Drone gain must STILL be 0.8 (unaffected by OSC A changes)
      engine.updateBreathModulation(1.0, 'inhale', 0.5);
      ctx.advanceTime(0.05);
      expect((engine.drone as any).trackGain.gain.value).toBeCloseTo(0.8, 2);

      // Clear modulation route
      engine.setModulationRoute('drone-gain', null);
    });
  });

  // =========================================================================
  // EMPIRICAL FORENSICS: Granular Channel Bypass Physical Acoustic Leakage
  // =========================================================================
  describe('Empirical Forensics: Granular Channel Acoustic Output Decay Analysis', () => {
    it('documents the exact time required for GranularChannel.activeOutGain to reach acoustic silence', () => {
      engine.updateChannelStrip({
        granular: { bypass: false, gain: 0.8 }
      });
      ctx.advanceTime(0.05);

      const activeOutGainNode = (engine.granular as any).activeOutGain as GainNode;
      expect(activeOutGainNode.gain.value).toBe(1.0);

      // Now set bypass to true
      engine.updateChannelStrip({
        granular: { bypass: true }
      });

      // At t = 0.005s (5ms = 1 tau)
      ctx.advanceTime(0.005);
      const gainAt5ms = activeOutGainNode.gain.value;
      // Exponential decay: e^-1 ~ 0.368
      expect(gainAt5ms).toBeCloseTo(0.368, 2);

      // At t = 0.020s (20ms = 4 tau)
      ctx.advanceTime(0.015);
      const gainAt20ms = activeOutGainNode.gain.value;
      // Exponential decay: e^-4 ~ 0.0183
      expect(gainAt20ms).toBeCloseTo(0.018, 2);

      // At t = 0.050s (50ms = 10 tau)
      ctx.advanceTime(0.030);
      const gainAt50ms = activeOutGainNode.gain.value;
      // Exponential decay: e^-10 ~ 0.000045
      expect(gainAt50ms).toBeCloseTo(0.0, 3);
    });
  });
});
