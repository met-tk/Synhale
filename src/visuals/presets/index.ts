/**
 * Sacred Geometry Presets Index (F16)
 */

import type { VisualPresetId, VisualRenderParams } from '../../types';
import { renderMinimalRing } from './minimalRing';
import { renderSacredGeometry } from './sacredGeometry';
import { renderZenWaves } from './zenWaves';
import { renderCalmFocus } from './calmFocus';
import { renderCoronaOrbit } from './coronaOrbit';
import { renderHyperMetatron } from './hyperMetatron';
import { renderLissajousKnot } from './lissajousKnot';
import { renderMagneticFlux } from './magneticFlux';
import { renderSpacetimeWarp } from './spacetimeWarp';
import { renderKeplerRosette } from './keplerRosette';
import { renderTesseract4D } from './tesseract4D';
import { renderHopfFibration } from './hopfFibration';

export * from './minimalRing';
export * from './sacredGeometry';
export * from './zenWaves';
export * from './calmFocus';
export * from './coronaOrbit';
export * from './hyperMetatron';
export * from './lissajousKnot';
export * from './magneticFlux';
export * from './spacetimeWarp';
export * from './keplerRosette';
export * from './tesseract4D';
export * from './hopfFibration';

// Backward-compatibility aliases for legacy tests/imports
export const renderSilkCymatics = renderLissajousKnot;
export const renderCelestialGyro = renderMagneticFlux;

export type PresetRenderFunction = (
  ctx: CanvasRenderingContext2D,
  params: VisualRenderParams,
  time: number
) => void;

export const PRESET_RENDERERS: Record<
  'minimalRing' | 'sacredGeometry' | 'zenWaves' | 'calmFocus',
  PresetRenderFunction
> = {
  minimalRing: renderMinimalRing,
  sacredGeometry: renderSacredGeometry,
  zenWaves: renderZenWaves,
  calmFocus: renderCalmFocus
};

export const OPTICAL_PRESET_RENDERERS: Record<
  'coronaOrbit' | 'hyperMetatron' | 'lissajousKnot' | 'magneticFlux',
  PresetRenderFunction
> = {
  coronaOrbit: renderCoronaOrbit,
  hyperMetatron: renderHyperMetatron,
  lissajousKnot: renderLissajousKnot,
  magneticFlux: renderMagneticFlux
};

export const COSMIC_PRESET_RENDERERS: Record<
  'spacetimeWarp' | 'keplerRosette' | 'tesseract4D' | 'hopfFibration',
  PresetRenderFunction
> = {
  spacetimeWarp: renderSpacetimeWarp,
  keplerRosette: renderKeplerRosette,
  tesseract4D: renderTesseract4D,
  hopfFibration: renderHopfFibration
};

export const ALL_PRESET_RENDERERS: Record<VisualPresetId, PresetRenderFunction> = {
  ...PRESET_RENDERERS,
  ...OPTICAL_PRESET_RENDERERS,
  ...COSMIC_PRESET_RENDERERS
};
