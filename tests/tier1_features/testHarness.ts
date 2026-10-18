/**
 * Synhale 2 - Tier 1 Test Harness & Reference Specifications
 * Authoritative algorithms and mathematical models derived from:
 * - ORIGINAL_REQUEST.md (R1 - R5)
 * - PROJECT.md (Architecture & Contracts)
 * - Explorer 1 (Audio DSP & 0ms Hard Cut)
 * - Explorer 2 (Breath Clock & Timeline Tension)
 * - Explorer 3 (Sacred Geometry & Hardware UI)
 */

import { MockAudioContext } from '../mocks/webAudioMock';
import type { BreathRhythmConfig } from '../../src/types';

// ==========================================
// 1. Audio DSP Reference Algorithms
// ==========================================

/**
 * 432Hz Natural Tuning Formula
 * f(midiNote, Abase) = Abase * 2^((midiNote - 69) / 12)
 */
export function calculateMidiFrequency(midiNote: number, baseA4 = 432): number {
  return baseA4 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Equal-Power Crossfade Laws:
 * G1 = cos(alpha * pi / 2)
 * G2 = sin(alpha * pi / 2)
 * G1^2 + G2^2 = 1.0 (constant acoustic power)
 */
export function equalPowerCrossfade(alpha: number): { g1: number; g2: number } {
  const norm = Math.max(0, Math.min(1, alpha));
  const angle = norm * (Math.PI / 2);
  const g1 = Math.cos(angle);
  const g2 = Math.sin(angle);
  return { g1, g2 };
}

/**
 * Paul Kellet Pink Noise Generation (1/f Spectrum)
 * 6-pole IIR filter on white noise.
 */
export function generatePaulKelletPinkNoise(numSamples: number): Float32Array {
  const out = new Float32Array(numSamples);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < numSamples; i++) {
    const white = (Math.random() * 2 - 1);
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    out[i] = pink * 0.11;
  }
  return out;
}

/**
 * Tanh Soft Saturation Curve for WaveShaperNode:
 * f(x, k) = tanh(k * x) / tanh(k)
 */
export function makeTanhDistortionCurve(samples = 1024, k = 3.0): Float32Array {
  const curve = new Float32Array(samples);
  const denom = Math.tanh(k);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / denom;
  }
  return curve;
}

/**
 * Tube Harmonics Asymmetric Saturation Curve:
 * f(x) = (x + 0.18 * x^2) / (1 + 0.18 * |x|)
 */
export function makeTubeDistortionCurve(samples = 1024): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = (x + 0.18 * x * x) / (1 + 0.18 * Math.abs(x));
  }
  return curve;
}

/**
 * Auto-Makeup Gain for Drive Saturation:
 * Gcomp = 1 / sqrt(1 + 0.6 * (drive - 1))
 */
export function calculateDriveAutoMakeupGain(drive: number): number {
  if (drive <= 1.0) return 1.0;
  return 1 / Math.sqrt(1 + 0.6 * (drive - 1));
}

/**
 * Logarithmic Cutoff Frequency Mapping from Breath Macro M:
 * fc(M) = fmin * (fmax / fmin)^(M^1.15)
 */
export function calculateLogCutoff(macro: number, fmin = 90, fmax = 14000): number {
  const m = Math.max(0, Math.min(1, macro));
  return fmin * Math.pow(fmax / fmin, Math.pow(m, 1.15));
}

/**
 * Synthetic Impulse Response Generator for Convolver Reverb:
 * h(t) = w(t) * exp(-3t / T60) * damping
 */
export function generateSyntheticImpulseResponse(
  ctx: MockAudioContext,
  decaySeconds = 3.5,
  damping = 0.5
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * decaySeconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const white = (Math.random() * 2 - 1);
      const envelope = Math.exp((-3 * t) / decaySeconds);
      const damp = 1 - (damping * (t / decaySeconds));
      data[i] = white * envelope * Math.max(0, damp);
    }
  }
  return buffer;
}

// ==========================================
// 2. Breath Clock & Timeline Interpolation
// ==========================================

/**
 * Symmetric Exponential Tension Interpolation Formula:
 * For phi in [0, 1], Tension T in [-1, 1]
 * T = 0: linear
 * T < 0: convex ease-out, k = 6 * |T|
 * T > 0: concave ease-in, k = 6 * T
 */
export function evaluateTensionCurve(phi: number, startVal: number, endVal: number, tension: number): number {
  const p = Math.max(0, Math.min(1, phi));
  let y = p;
  if (Math.abs(tension) >= 0.001) {
    const k = 6 * Math.abs(tension);
    if (tension < 0) {
      // Ease-out
      y = (1 - Math.exp(-k * p)) / (1 - Math.exp(-k));
    } else {
      // Ease-in
      y = (Math.exp(k * p) - 1) / (Math.exp(k) - 1);
    }
  }
  return startVal + (endVal - startVal) * y;
}

/**
 * Factory Breath Rhythm Presets (R2 Specification)
 */
export const FACTORY_RHYTHMS: Record<string, BreathRhythmConfig & { name: string; id: string }> = {
  box: { id: 'box-4-4-4-4', name: 'Box 4-4-4-4', inhale: 4.0, holdIn: 4.0, exhale: 4.0, holdOut: 4.0 },
  sleep: { id: 'relax-4-7-8-0', name: 'Relax 4-7-8', inhale: 4.0, holdIn: 7.0, exhale: 8.0, holdOut: 0.0 },
  coherent: { id: 'coherent-55', name: 'Coherent 5.5s', inhale: 5.5, holdIn: 0.0, exhale: 5.5, holdOut: 0.0 },
  prana: { id: 'prana-energize', name: 'Prana Energize', inhale: 4.0, holdIn: 4.0, exhale: 2.0, holdOut: 0.0 },
  calm: { id: 'deep-calm-4-2-6-2', name: 'Deep Calm', inhale: 4.0, holdIn: 2.0, exhale: 6.0, holdOut: 2.0 }
};

// ==========================================
// 3. UI, Tap Gesture, & Canvas Math
// ==========================================

/**
 * Tap Gesture Detector:
 * deltaT < 220ms AND distance < 8px
 */
export function isTapGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number
): boolean {
  if (durationMs >= 220) return false;
  const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  return dist < 8.0;
}

/**
 * Long-Press Knob Detector:
 * Hold >= 320ms AND displacement <= 5px
 */
export function isLongPressKnob(
  dx: number,
  dy: number,
  holdDurationMs: number
): boolean {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 5.0) return false;
  return holdDurationMs >= 320;
}

/**
 * Magnetic Center Detent for Bipolar Fader:
 * |value| < 0.03 clamps to 0.00
 */
export function applyMagneticCenterDetent(val: number): number {
  if (Math.abs(val) < 0.03) return 0.0;
  return Math.max(-1.0, Math.min(1.0, val));
}
