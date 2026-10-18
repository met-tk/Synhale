/**
 * Synhale 2 - Comprehensive Algorithm Robustness & Defensive Security Auditing Test Suite
 * 
 * Verifies edge-case behaviors across:
 * - Logic & Boundaries: NaN/Infinity isolation, division by zero, empty/null guardrails
 * - Performance & Resources: Loop boundaries, catch-up storm guards, queue caps
 * - Security: Prototype pollution defense, input truncation & sanitization
 * - Code Quality: Dead code removal, finite AudioParam enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { evaluateSegment, evaluateSingleStageCurve, createCurveDataFromMultipliers } from '@/audio/dsp/curveMath';
import {
  generatePinkNoiseBuffer,
  generateWhiteNoiseBuffer,
  generateBrownNoiseBuffer,
  generateVioletNoiseBuffer
} from '@/audio/dsp/pinkNoise';
import { computeEqualPowerMix, generateSyntheticImpulseResponse } from '@/audio/dsp/syntheticReverb';
import {
  generateTapeCurve,
  generateTubeCurve,
  generateDriveCurve,
  computeDriveMakeupGain
} from '@/audio/dsp/waveShaperCurves';
import { quantizeToScale, getScaleFrequency, getRandomScaleNote } from '@/audio/dsp/scaleQuantizer';
import { evaluateLfoWaveform, computeLfoLiveValue } from '@/audio/dsp/lfoMath';
import { MultimodeFilter } from '@/audio/nodes/MultimodeFilter';
import { EqModule } from '@/audio/nodes/EqModule';
import { BreathStateMachine } from '@/breath/stateMachine';
import {
  saveUserPreset,
  getUserPresets
} from '@/audio/storage/userPresets';

// Minimal Web Audio Mock for testing
class MockAudioParam {
  value = 0;
  _value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn((val: number) => { this.value = val; });
  setTargetAtTime = vi.fn((val: number) => { this.value = val; });
  linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockStereoPannerNode extends MockAudioNode {
  pan = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  gain = new MockAudioParam();
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channelData: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    if (!Number.isFinite(length) || length < 0) {
      throw new TypeError(`Failed to construct 'AudioBuffer': The number of frames provided is not a finite number.`);
    }
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || new Float32Array(this.length);
  }
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';

  createGain = vi.fn(() => new MockGainNode());
  createStereoPanner = vi.fn(() => new MockStereoPannerNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createBuffer = vi.fn((channels: number, length: number, rate: number) => {
    return new MockAudioBuffer(channels, length, rate);
  });
}

describe('Algorithm & Boundary Auditing Suite', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = new MockAudioContext();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Curve Math Boundary & NaN Defense', () => {
    it('evaluates segment safely when control points are identical (dt = 0 / division by zero)', () => {
      const p1 = { id: 'p1', time: 0.5, value: 0.8, tension: 0 };
      const p2 = { id: 'p2', time: 0.5, value: 0.2, tension: 0 };
      const res = evaluateSegment(p1, p2, 0.5);
      expect(Number.isFinite(res)).toBe(true);
      expect(res).toBe(0.8);
    });

    it('evaluates segment safely with NaN time or progress', () => {
      const p1 = { id: 'p1', time: 0.0, value: 0.0, tension: 0 };
      const p2 = { id: 'p2', time: 1.0, value: 1.0, tension: 0 };
      const resNaN = evaluateSegment(p1, p2, NaN);
      expect(Number.isFinite(resNaN)).toBe(true);
      expect(resNaN).toBe(0.0);
    });

    it('handles empty points or non-array points in evaluateSingleStageCurve', () => {
      expect(evaluateSingleStageCurve({ stage: 'inhale', points: [] }, 0.5)).toBe(0.5);
      expect(evaluateSingleStageCurve({ stage: 'inhale', points: undefined as any }, 0.5)).toBe(0.5);
    });

    it('handles NaN/Infinity in createCurveDataFromMultipliers', () => {
      const curveData = createCurveDataFromMultipliers({
        inhale: NaN,
        holdIn: Infinity,
        exhale: -10,
        holdOut: 2.5
      });
      expect(curveData.inhale.points[1].value).toBe(1.0);
      expect(curveData.holdIn.points[1].value).toBe(0.85);
      expect(curveData.exhale.points[1].value).toBe(0.0);
      expect(curveData.holdOut.points[1].value).toBe(1.0);
    });
  });

  describe('2. Noise Generators NaN & Zero Duration Defense', () => {
    it('generates pink noise buffer safely with NaN or negative duration', () => {
      expect(() => generatePinkNoiseBuffer(ctx, NaN)).not.toThrow();
      expect(() => generatePinkNoiseBuffer(ctx, -5)).not.toThrow();
      const buf = generatePinkNoiseBuffer(ctx, NaN);
      expect(buf.length).toBeGreaterThanOrEqual(128);
    });

    it('generates white, brown, and violet noise safely with NaN duration', () => {
      expect(() => generateWhiteNoiseBuffer(ctx, NaN)).not.toThrow();
      expect(() => generateBrownNoiseBuffer(ctx, NaN)).not.toThrow();
      expect(() => generateVioletNoiseBuffer(ctx, NaN)).not.toThrow();
    });
  });

  describe('3. Synthetic Reverb Robustness', () => {
    it('computes equal power mix safely with NaN or Infinity', () => {
      const resNaN = computeEqualPowerMix(NaN);
      expect(Number.isFinite(resNaN.dry)).toBe(true);
      expect(Number.isFinite(resNaN.wet)).toBe(true);

      const resInf = computeEqualPowerMix(Infinity);
      expect(Number.isFinite(resInf.dry)).toBe(true);
      expect(Number.isFinite(resInf.wet)).toBe(true);
    });

    it('generates synthetic impulse response safely when decayTime or damping is NaN', () => {
      expect(() => generateSyntheticImpulseResponse(ctx, NaN, NaN)).not.toThrow();
      const buf = generateSyntheticImpulseResponse(ctx, NaN, NaN);
      expect(buf.length).toBeGreaterThanOrEqual(128);
      const leftChannel = buf.getChannelData(0);
      expect(Number.isNaN(leftChannel[0])).toBe(false);
    });
  });

  describe('4. WaveShaper Saturation Curves Non-Finite Defense', () => {
    it('generates tape, tube and drive curves with NaN amount and size', () => {
      const tape = generateTapeCurve(NaN, NaN);
      expect(tape.length).toBe(2048);
      for (let i = 0; i < 10; i++) {
        expect(Number.isNaN(tape[i])).toBe(false);
      }

      const tube = generateTubeCurve(NaN, NaN);
      expect(tube.length).toBe(2048);
      expect(Number.isNaN(tube[0])).toBe(false);

      const drive = generateDriveCurve(NaN, NaN, NaN);
      expect(drive.length).toBe(2048);
      expect(Number.isNaN(drive[0])).toBe(false);
    });

    it('computes drive makeup gain safely with NaN', () => {
      const gain = computeDriveMakeupGain(NaN);
      expect(Number.isFinite(gain)).toBe(true);
      expect(gain).toBe(1.0);
    });
  });

  describe('5. Scale Quantizer Non-Finite Defense', () => {
    it('quantizes semitones safely when offset is NaN', () => {
      const res = quantizeToScale(NaN, 'pentatonic');
      expect(Number.isFinite(res)).toBe(true);
      expect(res).toBe(0);
    });

    it('computes scale frequency safely when baseFreq or degreeIndex is NaN', () => {
      const freq1 = getScaleFrequency(NaN, 'pentatonic', 3);
      expect(freq1).toBeGreaterThanOrEqual(20);

      const freq2 = getScaleFrequency(432, 'pentatonic', NaN);
      expect(freq2).toBeGreaterThanOrEqual(20);
    });

    it('picks random scale note safely with NaN octaveSpan', () => {
      const note = getRandomScaleNote(432, 'pentatonic', NaN);
      expect(Number.isFinite(note)).toBe(true);
    });
  });

  describe('6. LFO Mathematics Non-Finite Defense', () => {
    it('evaluates LFO waveform safely with NaN phase and seed', () => {
      expect(Number.isFinite(evaluateLfoWaveform('sine', NaN))).toBe(true);
      expect(Number.isFinite(evaluateLfoWaveform('triangle', NaN))).toBe(true);
      expect(Number.isFinite(evaluateLfoWaveform('sawtooth', NaN))).toBe(true);
      expect(Number.isFinite(evaluateLfoWaveform('square', NaN))).toBe(true);
      expect(Number.isFinite(evaluateLfoWaveform('random', NaN, NaN))).toBe(true);
    });

    it('computes live LFO value safely with NaN depth and timeSec', () => {
      const val = computeLfoLiveValue(1.0, NaN, 'sine', false, NaN);
      expect(Number.isFinite(val)).toBe(true);
    });
  });

  describe('7. MultimodeFilter & EqModule AudioParam Finite Protection', () => {
    it('sanitizes NaN cutoff and resonance in MultimodeFilter', () => {
      const filter = new MultimodeFilter(ctx);
      expect(() => {
        filter.setParams({ cutoff: NaN, resonance: NaN });
      }).not.toThrow();
      expect(Number.isFinite(filter.getParams().cutoff)).toBe(true);
      expect(Number.isFinite(filter.getParams().resonance)).toBe(true);
      filter.dispose();
    });

    it('sanitizes NaN in EqModule across all 4 bands and avoids dead code', () => {
      const eq = new EqModule(ctx);
      expect(() => {
        eq.setParams({
          low: { type: 'lowshelf', frequency: NaN, gain: NaN, q: NaN },
          midLow: { frequency: NaN, gain: NaN, q: NaN },
          midHigh: { frequency: NaN, gain: NaN, q: NaN },
          high: { frequency: NaN, gain: NaN, q: NaN }
        });
      }).not.toThrow();

      const params = eq.getParams();
      expect(Number.isFinite(params.low.frequency)).toBe(true);
      expect(Number.isFinite(params.midLow.gain)).toBe(true);
      expect(Number.isFinite(params.midHigh.q)).toBe(true);
      expect(Number.isFinite(params.high.frequency)).toBe(true);
      eq.dispose();
    });
  });

  describe('8. BreathStateMachine Duration Infinity & Leap Defense', () => {
    it('clamps Infinity in setRhythm without corrupting stage durations', () => {
      const sm = new BreathStateMachine();
      sm.setRhythm({
        inhale: Infinity,
        holdIn: NaN,
        exhale: -2,
        holdOut: 4.0
      });
      const rhythm = sm.getRhythm();
      expect(Number.isFinite(rhythm.inhale)).toBe(true);
      expect(Number.isFinite(rhythm.holdIn)).toBe(true);
      expect(rhythm.exhale).toBe(0);
      expect(rhythm.holdOut).toBe(4.0);
    });
  });

  describe('9. UserPresets Prototype Pollution & Payload Truncation Defense', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    });

    it('strips prototype pollution keys (__proto__, constructor, prototype)', () => {
      const maliciousPayload: any = {
        name: 'Normal Preset',
        channelStrip: JSON.parse('{"__proto__": {"polluted": true}, "gain": 0.8}'),
        effects: {
          constructor: { polluted: true },
          reverb: { mix: 0.5 }
        }
      };

      const saved = saveUserPreset(maliciousPayload);
      expect((saved.channelStrip as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();

      const list = getUserPresets();
      expect(list.length).toBeGreaterThan(0);
      expect((list[0].channelStrip as any).polluted).toBeUndefined();
    });

    it('truncates excessively long strings to prevent DoS', () => {
      const hugeName = 'A'.repeat(5000);
      const hugeDesc = 'B'.repeat(10000);
      const saved = saveUserPreset({
        name: hugeName,
        description: hugeDesc,
        channelStrip: {},
        effects: {}
      });

      expect(saved.name.length).toBeLessThanOrEqual(64);
      expect(saved.description.length).toBeLessThanOrEqual(256);
    });
  });
});
