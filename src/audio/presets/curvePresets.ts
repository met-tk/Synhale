import { FACTORY_CURVE_PRESETS } from '../storage/curvePresets';
import type { CurvePreset } from '../../types';

export * from '../storage/curvePresets';

export const CURVE_PRESETS: Record<string, CurvePreset> = {
  'natural-breath': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-natural-breath')!,
  'heroic-apex': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-heroic-apex')!,
  'square-pulse': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-square-pulse')!,
  'zen-stillness': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-zen-stillness')!,
  'pluck-strike': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-pluck-strike')!,
  'gentle-breeze': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-gentle-breeze')!,
  'rhythmic-steps': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-rhythmic-steps')!,
  'reverse-swell': FACTORY_CURVE_PRESETS.find(p => p.id === 'factory-reverse-swell')!,
};

