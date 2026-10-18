export type ModulationSource = 'breathMacro' | 'lfo1' | 'lfo2' | 'adsr' | 'stageProgress' | 'manual';
export type CurveInterpolation = 'smooth' | 'linear' | 'step';

export interface CurveControlPoint {
  id: string;
  time: number;    // 0..1 (Normalized progress within the breath stage)
  value: number;   // 0..1 (Normalized output value)
  tension: number; // -1..+1 (0 = linear, >0 = concave exponential, <0 = convex logarithmic)
}

export interface SingleStageCurve {
  stage: 'inhale' | 'holdIn' | 'exhale' | 'holdOut';
  points: CurveControlPoint[]; // At least 2 points: start (time: 0) and end (time: 1)
}

export interface FullBreathCurveData {
  inhale: SingleStageCurve;
  holdIn: SingleStageCurve;
  exhale: SingleStageCurve;
  holdOut: SingleStageCurve;
}

export interface CurvePreset {
  id: string;
  name: string;
  category: 'factory' | 'user';
  curveData: FullBreathCurveData;
}

export interface StageMultipliers {
  inhale: number;   // 0..1 (target value / depth ratio for inhale stage)
  holdIn: number;   // 0..1 (target value / depth ratio for holdIn stage)
  exhale: number;   // 0..1 (target value / depth ratio for exhale stage)
  holdOut: number;  // 0..1 (target value / depth ratio for holdOut stage)
  curve?: CurveInterpolation;
}

export interface ModulationRoute {
  source: ModulationSource;
  target: string;
  depth: number;           // -1.0 .. +1.0 (bipolar)
  bipolar: boolean;
  stageMultipliers?: StageMultipliers;
  curveData?: FullBreathCurveData;
}

export const DEFAULT_MODULATION_ROUTES: Record<string, ModulationRoute> = {
  'filter-cutoff': {
    target: 'filter-cutoff',
    source: 'breathMacro',
    depth: 0.60,
    bipolar: false
  },
  'osca-morph': {
    target: 'osca-morph',
    source: 'breathMacro',
    depth: 0.70,
    bipolar: false
  },
  'oscb-color': {
    target: 'oscb-color',
    source: 'stageProgress',
    depth: 0.50,
    bipolar: false,
    stageMultipliers: { inhale: 0.95, holdIn: 0.85, exhale: 0.30, holdOut: 0.10, curve: 'smooth' }
  },
  'drone-drift': {
    target: 'drone-drift',
    source: 'lfo1',
    depth: 0.35,
    bipolar: true
  },
  'filter-resonance': {
    target: 'filter-resonance',
    source: 'lfo2',
    depth: 0.25,
    bipolar: false
  },
  'master-fader': {
    target: 'master-fader',
    source: 'stageProgress',
    depth: 1.0,
    bipolar: false,
    stageMultipliers: { inhale: 1.0, holdIn: 0.85, exhale: 0.25, holdOut: 0.0, curve: 'smooth' }
  }
};
