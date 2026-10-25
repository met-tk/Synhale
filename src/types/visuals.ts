import type { BreathStage } from './audio';

export type VisualPresetId =
  | 'minimalRing'
  | 'sacredGeometry'
  | 'zenWaves'
  | 'calmFocus'
  | 'coronaOrbit'
  | 'hyperMetatron'
  | 'lissajousKnot'
  | 'magneticFlux'
  | 'spacetimeWarp'
  | 'keplerRosette'
  | 'tesseract4D'
  | 'hopfFibration';

export type VisualPresetGroup = 'classic' | 'optical' | 'cosmic';

export interface OrganicMotionMetrics {
  macro: number;          // Continuous physiological scale factor ~ [0.0..1.015]
  scale: number;          // 1.0 + 0.4 * macro
  luminance: number;      // 0.2 .. 1.0 factor for alpha and stroke intensity
  bloomBlur: number;      // 0 .. 14px monochrome glow blur
  bloomAlpha: number;     // 0.0 .. 0.35 monochrome glow alpha
  audioTremor: number;    // -0.014 .. +0.014 micro-harmonic tremor
  getLayerMacro: (layerIndex: number, totalLayers: number) => number;

  // Kinetic identity metrics
  velocity: number;       // Instantaneous rate dM/dt (~ -1.8..+1.9)
  tension: number;        // Elastic tension ~ [0.0..1.0]
  damping: number;        // Viscous damping factor ~ [0.0..1.0]
  aperture: number;       // Dynamic diaphragm opening ~ [0.0..1.0]
  waveDrift: number;      // Spatial propagation phase in radians
}

export interface VisualRenderParams {
  width: number;
  height: number;
  dpr: number;
  breathMacro: number;     // 0..1
  stage: BreathStage;
  stageProgress: number;   // 0..1
  isDarkTheme: boolean;
  /** Soft palette stage background; falls back to the neutral mode default */
  background?: string;
  preset: VisualPresetId;
  oscAActivity: number;    // 0..1
  oscBActivity: number;    // 0..1
  showMaxBoundary?: boolean;
  hideBoundaryGuide?: boolean;
  organicMotion?: OrganicMotionMetrics;
}

export interface VisualRenderer {
  render(ctx: CanvasRenderingContext2D, params: VisualRenderParams): void;
  reset(): void;
}
