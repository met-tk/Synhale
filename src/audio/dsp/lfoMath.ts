/**
 * Synhale 2 - Pure LFO DSP Mathematics & Waveform Generators
 * 
 * Provides deterministic [-1.0, 1.0] waveform calculation and live modulation
 * offset computation aligned with modern commercial synthesizer standards (Serum, Vital).
 */

import type { LfoShape, LfoSyncConfig } from '../../types/audio';

/**
 * Fast 32-bit integer mixer PRNG (Murmur3 / xxHash finalizer style)
 * Maps any integer cycle seed deterministically to [-1.0, 1.0].
 */
export function hashIntToBipolar(seed: number): number {
  let x = ((seed | 0) ^ 0x5bd1e995) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2d);
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2d);
  x = (x ^ (x >>> 15)) >>> 0;
  return (x / 4294967295) * 2.0 - 1.0;
}

/**
 * Resolves effective LFO oscillation rate (Hz) taking into account
 * BPM tempo divisions and breath cycle phase-locking.
 */
export function resolveEffectiveLfoRate(
  baseRate: number,
  sync?: LfoSyncConfig
): number {
  const safeBaseRate = typeof baseRate === 'number' && Number.isFinite(baseRate) ? baseRate : 1.0;

  if (!sync || sync.mode === 'free') {
    return Math.max(0.001, safeBaseRate);
  }

  if (sync.mode === 'breath') {
    const cycleDur = sync.totalCycleDuration;
    if (typeof cycleDur === 'number' && Number.isFinite(cycleDur) && cycleDur > 0.001) {
      return 1.0 / cycleDur; // Exact lock to full breath cycle (e.g. 16s cycle -> 0.0625 Hz)
    }
    return Math.max(0.001, safeBaseRate);
  }

  if (sync.mode === 'bpm') {
    const bpm = typeof sync.bpm === 'number' && Number.isFinite(sync.bpm) && sync.bpm > 0 ? sync.bpm : 120;
    const beatsPerSec = bpm / 60.0;
    switch (sync.division) {
      case '1/16': return beatsPerSec * 4.0;
      case '1/8': return beatsPerSec * 2.0;
      case '1/4': return beatsPerSec * 1.0;
      case '1/2': return beatsPerSec * 0.5;
      case '1/1': return beatsPerSec * 0.25;
      case '2/1': return beatsPerSec * 0.125;
      case 'breathCycle': {
        const cycleDur = sync.totalCycleDuration;
        if (typeof cycleDur === 'number' && Number.isFinite(cycleDur) && cycleDur > 0.001) {
          return 1.0 / cycleDur;
        }
        return beatsPerSec;
      }
      default: return beatsPerSec;
    }
  }

  return Math.max(0.001, safeBaseRate);
}

/**
 * Evaluates the normalized [-1.0, 1.0] output value for an LFO waveform
 * given its shape, normalized phase [0..1), and optional cycle index for S&H random.
 */
export function evaluateLfoWaveform(
  shape: LfoShape | undefined,
  phase: number,
  cycleIndex?: number
): number {
  const safePhase = Number.isFinite(phase) ? phase : 0;
  // Normalize phase to [0..1)
  const p = ((safePhase % 1) + 1) % 1;

  switch (shape) {
    case 'triangle': {
      // Linear triangle peak at 0.25 (1.0), trough at 0.75 (-1.0)
      const norm = (p + 0.25) % 1;
      return norm < 0.5 ? 4 * norm - 1 : 3 - 4 * norm;
    }
    case 'sawtooth': {
      // Downward ramp from +1.0 to -1.0
      return 1 - 2 * p;
    }
    case 'square': {
      // Bipolar square wave: +1.0 for first half, -1.0 for second half
      return p < 0.5 ? 1 : -1;
    }
    case 'random': {
      // Genuine Sample & Hold: locks a deterministic pseudo-random value per cycle
      const rawSeed = cycleIndex !== undefined ? cycleIndex : safePhase;
      const seed = Number.isFinite(rawSeed) ? Math.floor(rawSeed) : 0;
      return hashIntToBipolar(seed);
    }
    case 'sine':
    default: {
      // Smooth sinusoidal oscillation
      return Math.sin(p * Math.PI * 2);
    }
  }
}

/**
 * Computes live LFO modulation output scaled by depth and respecting bypass & polarity state.
 * Returns bipolar value in range [-depth, +depth] or unipolar value in [0, +depth] (or 0 if bypassed).
 */
export function computeLfoLiveValue(
  rate: number,
  depth: number,
  shape: LfoShape | undefined,
  bypass: boolean | undefined,
  timeSec: number,
  polarity: 'bipolar' | 'unipolar' = 'bipolar',
  sync?: LfoSyncConfig
): number {
  if (bypass) return 0;
  const effectiveRate = resolveEffectiveLfoRate(rate, sync);
  const safeDepth = typeof depth === 'number' && Number.isFinite(depth) ? depth : 0.0;
  const effectiveDepth = Math.max(0, Math.min(1, safeDepth));
  const t = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0);
  const totalPhase = effectiveRate * t;
  const cycleIndex = Math.floor(totalPhase);
  const phase = totalPhase % 1.0;
  const rawWave = evaluateLfoWaveform(shape, phase, cycleIndex);
  if (polarity === 'unipolar') {
    // Maps [-1.0, +1.0] to [0.0, 1.0], scaled by depth
    return Math.max(0, Math.min(1, ((rawWave + 1) / 2) * effectiveDepth));
  }
  return rawWave * effectiveDepth;
}
