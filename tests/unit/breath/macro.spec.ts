import { describe, it, expect, vi } from 'vitest';
import {
  calculateBreathMacro,
  sigmoidInhale,
  passiveExhale,
  calculateLogCutoff,
  calculateAcousticParameters,
  scheduleDezipperedAudioParam
} from '../../../src/breath/macro';

describe('Breath Macro & Stage Acoustics Unit Tests', () => {
  it('calculates linear breath macro M across 4 stages', () => {
    // Inhale
    expect(calculateBreathMacro('inhale', 0.0)).toBeCloseTo(0.0, 4);
    expect(calculateBreathMacro('inhale', 0.5)).toBeCloseTo(0.5, 4);
    expect(calculateBreathMacro('inhale', 1.0)).toBeCloseTo(1.0, 4);

    // Hold In
    expect(calculateBreathMacro('holdIn', 0.0)).toBe(1.0);
    expect(calculateBreathMacro('holdIn', 0.5)).toBe(1.0);
    expect(calculateBreathMacro('holdIn', 1.0)).toBe(1.0);

    // Exhale
    expect(calculateBreathMacro('exhale', 0.0)).toBeCloseTo(1.0, 4);
    expect(calculateBreathMacro('exhale', 0.5)).toBeCloseTo(0.5, 4);
    expect(calculateBreathMacro('exhale', 1.0)).toBeCloseTo(0.0, 4);

    // Hold Out
    expect(calculateBreathMacro('holdOut', 0.0)).toBe(0.0);
    expect(calculateBreathMacro('holdOut', 0.5)).toBe(0.0);
    expect(calculateBreathMacro('holdOut', 1.0)).toBe(0.0);
  });

  it('evaluates physiological sigmoid curve for organic inhale expansion', () => {
    expect(sigmoidInhale(0.0)).toBeCloseTo(0.0, 4);
    expect(sigmoidInhale(0.5)).toBeCloseTo(0.5, 4);
    expect(sigmoidInhale(1.0)).toBeCloseTo(1.0, 4);

    // S-curve derivative at center is steeper than near boundaries
    const slopeCenter = sigmoidInhale(0.55) - sigmoidInhale(0.45);
    const slopeStart = sigmoidInhale(0.1) - sigmoidInhale(0.0);
    expect(slopeCenter).toBeGreaterThan(slopeStart * 2);

    const macroInhalePhys = calculateBreathMacro('inhale', 0.5, true);
    expect(macroInhalePhys).toBeCloseTo(0.5, 4);
  });

  it('evaluates passive biological recoil curve for exhale', () => {
    expect(passiveExhale(0.0)).toBeCloseTo(1.0, 4);
    expect(passiveExhale(1.0)).toBeCloseTo(0.0, 4);

    const macroExhalePhys = calculateBreathMacro('exhale', 0.5, true);
    expect(macroExhalePhys).toBeLessThan(0.5); // (1 - 0.5)^1.8 = 0.5^1.8 ≈ 0.287
    expect(macroExhalePhys).toBeGreaterThan(0.2);
  });

  it('maps breath macro to logarithmic cutoff frequency between 90Hz and 14000Hz', () => {
    expect(calculateLogCutoff(0.0, 90, 14000)).toBeCloseTo(90.0, 1);
    expect(calculateLogCutoff(1.0, 90, 14000)).toBeCloseTo(14000.0, 1);

    const midCutoff = calculateLogCutoff(0.5, 90, 14000);
    expect(midCutoff).toBeGreaterThan(500);
    expect(midCutoff).toBeLessThan(2000);

    // Clamps under 0 and over 1
    expect(calculateLogCutoff(-1.0, 90, 14000)).toBeCloseTo(90.0, 1);
    expect(calculateLogCutoff(2.0, 90, 14000)).toBeCloseTo(14000.0, 1);
  });

  it('calculates physical acoustic parameters during Inhale stage', () => {
    const paramsStart = calculateAcousticParameters(0.0, 'inhale', 0.0);
    expect(paramsStart.filterCutoff).toBeCloseTo(90, 1);
    expect(paramsStart.noiseGain).toBe(0.0);
    expect(paramsStart.oscAWavetable).toBe(0.0);

    const paramsEnd = calculateAcousticParameters(1.0, 'inhale', 1.0);
    expect(paramsEnd.filterCutoff).toBeCloseTo(14000, 1);
    expect(paramsEnd.filterResonance).toBeCloseTo(3.5, 2);
    expect(paramsEnd.noiseGain).toBeCloseTo(0.45, 2);
    expect(paramsEnd.reverbWet).toBeCloseTo(0.45, 2);
    expect(paramsEnd.oscAWavetable).toBeCloseTo(15.0, 1);
    expect(paramsEnd.pitchDriftCents).toBeCloseTo(4.0, 1);
  });

  it('calculates harmonic suspension during Hold In stage (noise silenced, long reverb)', () => {
    const params = calculateAcousticParameters(1.0, 'holdIn', 0.5);
    expect(params.noiseGain).toBe(0.0);
    expect(params.filterCutoff).toBe(12500);
    expect(params.filterResonance).toBe(2.8);
    expect(params.reverbWet).toBe(0.65);
    expect(params.reverbDecay).toBe(6.5);
    expect(params.delayWet).toBe(0.30);
    expect(params.oscAWavetable).toBe(15.0);
    expect(params.pitchDriftCents).toBe(4.0);
  });

  it('calculates harmonic collapse and grounding during Exhale stage', () => {
    const paramsStart = calculateAcousticParameters(1.0, 'exhale', 0.0);
    expect(paramsStart.filterCutoff).toBe(12500);
    expect(paramsStart.noiseGain).toBeCloseTo(0.30, 2);
    expect(paramsStart.oscAWavetable).toBeCloseTo(15.0, 1);

    const paramsEnd = calculateAcousticParameters(0.0, 'exhale', 1.0);
    expect(paramsEnd.filterCutoff).toBeCloseTo(180, 1);
    expect(paramsEnd.noiseGain).toBe(0.0);
    expect(paramsEnd.oscAWavetable).toBe(0.0);
    expect(paramsEnd.droneGainBoost).toBe(1.15); // +1.5dB grounding
  });

  it('calculates stillness and void during Hold Out stage', () => {
    const params = calculateAcousticParameters(0.0, 'holdOut', 0.5);
    expect(params.noiseGain).toBe(0.0);
    expect(params.oscAWavetable).toBe(0.0);
    expect(params.filterCutoff).toBe(140);
    expect(params.filterResonance).toBe(0.7);
    expect(params.reverbWet).toBe(0.10);
    expect(params.delayWet).toBe(0.0);
    expect(params.pitchDriftCents).toBe(0.0);
  });

  it('schedules de-zippered AudioParam with 15ms time-constant', () => {
    const mockAudioParam = {
      setTargetAtTime: vi.fn()
    } as unknown as AudioParam;

    scheduleDezipperedAudioParam(mockAudioParam, 440, 1.25);
    expect(mockAudioParam.setTargetAtTime).toHaveBeenCalledWith(440, 1.25, 0.015);

    // Custom timeConstant
    scheduleDezipperedAudioParam(mockAudioParam, 880, 2.0, 0.030);
    expect(mockAudioParam.setTargetAtTime).toHaveBeenCalledWith(880, 2.0, 0.030);
  });
});
