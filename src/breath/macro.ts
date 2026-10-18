import type { BreathStage } from '../types';

export interface AcousticModulationParams {
  filterCutoff: number;      // Hz: 90 .. 14000
  filterResonance: number;   // Q: 0.7 .. 3.5
  noiseGain: number;         // 0.0 .. 0.45
  noiseColor: number;        // 0.0 .. 1.0 (filter center)
  noiseFriction: number;     // 0.0 .. 1.0 (Q/resonance)
  reverbWet: number;         // 0.0 .. 1.0
  reverbDecay: number;       // seconds: 1.0 .. 8.0
  delayWet: number;          // 0.0 .. 1.0
  oscAWavetable: number;     // 0 .. 23
  oscAHarmonics: number;     // 0.0 .. 1.0
  pitchDriftCents: number;   // -50 .. +50 cents
  droneGainBoost: number;    // relative gain
}

const SIGMOID_MIN = 1.0 / (1.0 + Math.exp(5.0));
const SIGMOID_MAX = 1.0 / (1.0 + Math.exp(-5.0));
const SIGMOID_RANGE = SIGMOID_MAX - SIGMOID_MIN;

const HOLD_IN_PLATEAU: AcousticModulationParams = {
  filterCutoff: 12500,
  filterResonance: 2.8,
  noiseGain: 0.0,
  noiseColor: 0.0,
  noiseFriction: 0.0,
  reverbWet: 0.65,
  reverbDecay: 6.5,
  delayWet: 0.30,
  oscAWavetable: 15.0,
  oscAHarmonics: 1.0,
  pitchDriftCents: 4.0,
  droneGainBoost: 1.0
};

const HOLD_IN_FROM_INHALE: AcousticModulationParams = {
  filterCutoff: 14000,
  filterResonance: 3.5,
  noiseGain: 0.45,
  noiseColor: 0.8,
  noiseFriction: 0.7,
  reverbWet: 0.45,
  reverbDecay: 3.5,
  delayWet: 0.25,
  oscAWavetable: 15.0,
  oscAHarmonics: 1.0,
  pitchDriftCents: 4.0,
  droneGainBoost: 1.0
};

const HOLD_IN_TO_EXHALE: AcousticModulationParams = {
  filterCutoff: 12500,
  filterResonance: 2.8,
  noiseGain: 0.30,
  noiseColor: 0.4,
  noiseFriction: 0.3,
  reverbWet: 0.45,
  reverbDecay: 3.5,
  delayWet: 0.25,
  oscAWavetable: 15.0,
  oscAHarmonics: 0.7,
  pitchDriftCents: 4.0,
  droneGainBoost: 1.15
};

const HOLD_OUT_PLATEAU: AcousticModulationParams = {
  filterCutoff: 140,
  filterResonance: 0.7,
  noiseGain: 0.0,
  noiseColor: 0.0,
  noiseFriction: 0.0,
  reverbWet: 0.10,
  reverbDecay: 2.0,
  delayWet: 0.0,
  oscAWavetable: 0.0,
  oscAHarmonics: 0.3,
  pitchDriftCents: 0.0,
  droneGainBoost: 1.0
};

const HOLD_OUT_FROM_EXHALE: AcousticModulationParams = {
  filterCutoff: 180,
  filterResonance: 1.0,
  noiseGain: 0.0,
  noiseColor: 0.0,
  noiseFriction: 0.3,
  reverbWet: 0.20,
  reverbDecay: 3.5,
  delayWet: 0.05,
  oscAWavetable: 0.0,
  oscAHarmonics: 0.3,
  pitchDriftCents: 0.0,
  droneGainBoost: 1.15
};

const HOLD_OUT_TO_INHALE: AcousticModulationParams = {
  filterCutoff: 90,
  filterResonance: 1.2,
  noiseGain: 0.0,
  noiseColor: 0.3,
  noiseFriction: 0.3,
  reverbWet: 0.20,
  reverbDecay: 3.5,
  delayWet: 0.10,
  oscAWavetable: 0.0,
  oscAHarmonics: 0.4,
  pitchDriftCents: 0.0,
  droneGainBoost: 1.0
};

/**
 * Normalized Sigmoid curve for inhale expansion
 * 1 / (1 + exp(-10*(phi - 0.5))) scaled strictly to [0, 1]
 */
export function sigmoidInhale(phi: number): number {
  const safePhi = Number.isFinite(phi) ? phi : 0.0;
  const p = Math.max(0.0, Math.min(1.0, safePhi));
  const raw = 1.0 / (1.0 + Math.exp(-10.0 * (p - 0.5)));
  return Math.max(0.0, Math.min(1.0, (raw - SIGMOID_MIN) / SIGMOID_RANGE));
}

/**
 * Passive biological elastic recoil curve for exhale
 * (1 - phi)^1.8
 */
export function passiveExhale(phi: number): number {
  const safePhi = Number.isFinite(phi) ? phi : 0.0;
  const p = Math.max(0.0, Math.min(1.0, safePhi));
  return Math.max(0.0, Math.min(1.0, Math.pow(1.0 - p, 1.8)));
}

/**
 * Evaluates the global breath macro M in [0.0, 1.0] given stage and local progress
 */
export function calculateBreathMacro(
  stage: BreathStage,
  stageProgress: number,
  physiological = false
): number {
  const safeP = Number.isFinite(stageProgress) ? stageProgress : 0.0;
  const p = Math.max(0.0, Math.min(1.0, safeP));

  switch (stage) {
    case 'inhale':
      return physiological ? sigmoidInhale(p) : p;
    case 'holdIn':
      return 1.0;
    case 'exhale':
      return physiological ? passiveExhale(p) : 1.0 - p;
    case 'holdOut':
      return 0.0;
  }
}

/**
 * Logarithmic Cutoff Frequency Mapping from Breath Macro M
 * fc(M) = fmin * (fmax / fmin)^(M^1.15)
 */
export function calculateLogCutoff(macro: number, fmin = 90, fmax = 14000): number {
  const m = Math.max(0.0, Math.min(1.0, Number.isFinite(macro) ? macro : 0.0));
  const min = Math.max(10, fmin);
  const max = Math.max(min, fmax);
  return min * Math.pow(max / min, Math.pow(m, 1.15));
}

function smoothInterpolate(fromVal: number, toVal: number, t: number): number {
  const clamped = Math.max(0.0, Math.min(1.0, t));
  const s = clamped * clamped * (3.0 - 2.0 * clamped);
  return fromVal + (toVal - fromVal) * s;
}

function interpolateParams(
  from: AcousticModulationParams,
  to: AcousticModulationParams,
  t: number
): AcousticModulationParams {
  return {
    filterCutoff: smoothInterpolate(from.filterCutoff, to.filterCutoff, t),
    filterResonance: smoothInterpolate(from.filterResonance, to.filterResonance, t),
    noiseGain: smoothInterpolate(from.noiseGain, to.noiseGain, t),
    noiseColor: smoothInterpolate(from.noiseColor, to.noiseColor, t),
    noiseFriction: smoothInterpolate(from.noiseFriction, to.noiseFriction, t),
    reverbWet: smoothInterpolate(from.reverbWet, to.reverbWet, t),
    reverbDecay: smoothInterpolate(from.reverbDecay, to.reverbDecay, t),
    delayWet: smoothInterpolate(from.delayWet, to.delayWet, t),
    oscAWavetable: smoothInterpolate(from.oscAWavetable, to.oscAWavetable, t),
    oscAHarmonics: smoothInterpolate(from.oscAHarmonics, to.oscAHarmonics, t),
    pitchDriftCents: smoothInterpolate(from.pitchDriftCents, to.pitchDriftCents, t),
    droneGainBoost: smoothInterpolate(from.droneGainBoost, to.droneGainBoost, t)
  };
}

/**
 * Resolves full set of acoustic physical parameters according to the 4-stage biological rules
 */
export function calculateAcousticParameters(
  macro: number,
  stage: BreathStage,
  stageProgress: number
): AcousticModulationParams {
  const m = Math.max(0.0, Math.min(1.0, Number.isFinite(macro) ? macro : 0.0));
  const p = Math.max(0.0, Math.min(1.0, Number.isFinite(stageProgress) ? stageProgress : 0.0));

  switch (stage) {
    case 'inhale': {
      // High-frequency expansion, airway friction surge, wavetable morphing
      const filterCutoff = calculateLogCutoff(m, 90, 14000);
      const filterResonance = 1.2 + 2.3 * (m * m);
      const noiseGain = 0.45 * (m * m);
      const noiseColor = 0.3 + 0.5 * m;
      const noiseFriction = 0.3 + 0.4 * m;
      const reverbWet = 0.20 + 0.25 * m;
      const reverbDecay = 3.5;
      const delayWet = 0.10 + 0.15 * m;
      const oscAWavetable = m * 15.0;
      const oscAHarmonics = 0.4 + 0.6 * m;
      const pitchDriftCents = 4.0 * m;
      const droneGainBoost = 1.0;

      return {
        filterCutoff,
        filterResonance,
        noiseGain,
        noiseColor,
        noiseFriction,
        reverbWet,
        reverbDecay,
        delayWet,
        oscAWavetable,
        oscAHarmonics,
        pitchDriftCents,
        droneGainBoost
      };
    }

    case 'holdIn': {
      // Harmonic suspension: noise silenced, reverb expands with long decay, stable resonance
      const fadeWindow = 0.15;
      if (p < fadeWindow) {
        return interpolateParams(HOLD_IN_FROM_INHALE, HOLD_IN_PLATEAU, p / fadeWindow);
      }
      if (p > 1.0 - fadeWindow) {
        return interpolateParams(HOLD_IN_PLATEAU, HOLD_IN_TO_EXHALE, (p - (1.0 - fadeWindow)) / fadeWindow);
      }
      return { ...HOLD_IN_PLATEAU };
    }

    case 'exhale': {
      // Harmonic purge back to fundamental, gentle relaxing dissipation
      const release = 1.0 - p;
      const baseCutoff = 180;
      const filterCutoff = baseCutoff * Math.pow(12500 / baseCutoff, release);
      const filterResonance = 1.0 + 1.8 * release;
      const noiseGain = 0.30 * release;
      const noiseColor = 0.4 * release;
      const noiseFriction = 0.3;
      const reverbWet = 0.20 + 0.25 * release;
      const reverbDecay = 3.5;
      const delayWet = 0.05 + 0.20 * release;
      const oscAWavetable = 15.0 * release;
      const oscAHarmonics = 0.3 + 0.4 * release;
      const pitchDriftCents = 4.0 * release;
      const droneGainBoost = 1.15; // +1.5dB grounding

      return {
        filterCutoff,
        filterResonance,
        noiseGain,
        noiseColor,
        noiseFriction,
        reverbWet,
        reverbDecay,
        delayWet,
        oscAWavetable,
        oscAHarmonics,
        pitchDriftCents,
        droneGainBoost
      };
    }

    case 'holdOut': {
      // Void stillness: noise silenced, minimal root drone, minimal reverb
      const fadeWindow = 0.15;
      if (p < fadeWindow) {
        return interpolateParams(HOLD_OUT_FROM_EXHALE, HOLD_OUT_PLATEAU, p / fadeWindow);
      }
      if (p > 1.0 - fadeWindow) {
        return interpolateParams(HOLD_OUT_PLATEAU, HOLD_OUT_TO_INHALE, (p - (1.0 - fadeWindow)) / fadeWindow);
      }
      return { ...HOLD_OUT_PLATEAU };
    }
  }
}

/**
 * 15ms time-constant anti-zippering / de-zippering scheduler for Web Audio AudioParam
 */
export function scheduleDezipperedAudioParam(
  param: AudioParam,
  targetValue: number,
  currentTime: number,
  timeConstant = 0.015
): void {
  if (param && typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(targetValue, currentTime, timeConstant);
  }
}
