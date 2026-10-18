import { describe, it, expect, beforeEach } from 'vitest';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';
import {
  SOUND_PRESETS,
  DEFAULT_SOUND_PRESET_ID,
  type SoundPreset
} from '../../../src/audio/presets/soundPresets';
import { DEFAULT_MODULATION_ROUTES } from '../../../src/types/ui';
import {
  createCurveDataFromMultipliers,
  extractStageMultipliersFromCurve
} from '../../../src/audio/dsp/curveMath';
import { CURVE_PRESETS } from '../../../src/audio/presets/curvePresets';
import type { ModulationRoute } from '../../../src/types';

describe('Preset and Automation Curve State Synchronization', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  beforeEach(async () => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();
    engine.setModulationRoutes(DEFAULT_MODULATION_ROUTES);
  });

  it('bidirectional curveMath preserves stage characteristic multipliers', () => {
    const originalMultipliers = {
      inhale: 0.9,
      holdIn: 0.75,
      exhale: 0.4,
      holdOut: 0.05,
      curve: 'smooth' as const
    };

    // 1. Multipliers -> Full Breath Curve
    const generatedCurve = createCurveDataFromMultipliers(originalMultipliers);
    expect(generatedCurve.inhale.points.length).toBeGreaterThanOrEqual(2);
    expect(generatedCurve.holdIn.points.length).toBeGreaterThanOrEqual(2);
    expect(generatedCurve.exhale.points.length).toBeGreaterThanOrEqual(2);
    expect(generatedCurve.holdOut.points.length).toBeGreaterThanOrEqual(2);

    // 2. Full Breath Curve -> Multipliers
    const extractedMultipliers = extractStageMultipliersFromCurve(generatedCurve);
    expect(extractedMultipliers.inhale).toBeCloseTo(0.9, 1);
    expect(extractedMultipliers.holdIn).toBeCloseTo(0.75, 1);
    expect(extractedMultipliers.exhale).toBeCloseTo(0.4, 1);
    expect(extractedMultipliers.holdOut).toBeCloseTo(0.05, 1);
  });

  it('resets dirty modified curve data to default when switching to a preset without custom routes', () => {
    // 1. Simulate user customizing master-fader curve (e.g. Heroic Apex)
    const heroicCurve = CURVE_PRESETS['heroic-apex'].curveData;
    const heroicMultipliers = extractStageMultipliersFromCurve(heroicCurve);

    const modifiedRoute: ModulationRoute = {
      target: 'master-fader',
      source: 'stageProgress',
      depth: 1.0,
      bipolar: false,
      curveData: heroicCurve,
      stageMultipliers: heroicMultipliers
    };

    engine.setModulationRoute('master-fader', modifiedRoute);
    const routesAfterMod = engine.getModulationRoutes();
    expect(routesAfterMod['master-fader'].curveData?.inhale.points[1].value).toBe(0.95);
    expect(routesAfterMod['master-fader'].curveData?.inhale.points[2].value).toBe(1.0);

    // 2. Switch sound preset (e.g. to oceanicDrift which has no custom modulationRoutes)
    engine.loadSoundPreset('oceanicDrift');

    // 3. Verify master-fader was cleanly restored to default without dirty residue
    const routesAfterSwitch = engine.getModulationRoutes();
    expect(routesAfterSwitch['master-fader']).toBeDefined();
    // Default master-fader route has smooth stageMultipliers
    expect(routesAfterSwitch['master-fader'].stageMultipliers?.inhale).toBe(1.0);
    expect(routesAfterSwitch['master-fader'].stageMultipliers?.exhale).toBe(0.25);
    // Any custom curveData should be cleared or match the default
    if (routesAfterSwitch['master-fader'].curveData) {
      expect(routesAfterSwitch['master-fader'].curveData).toEqual(
        DEFAULT_MODULATION_ROUTES['master-fader'].curveData
      );
    }
  });

  it('accurately applies sound preset custom modulation routes when present', () => {
    // Custom preset with unique modulation routes
    const customRoute: ModulationRoute = {
      target: 'filter-cutoff',
      source: 'stageProgress',
      depth: 0.85,
      bipolar: true,
      stageMultipliers: { inhale: 0.6, holdIn: 0.9, exhale: 0.3, holdOut: 0.1, curve: 'smooth' }
    };

    const presetWithRoute: SoundPreset = {
      id: 'customTestPreset',
      name: '测试预设',
      nameEn: 'Test Custom Preset',
      description: '带有独立自动化调制的测试预设',
      badge: '测试',
      category: 'Zen',
      channelStrip: SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID].channelStrip,
      effects: SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID].effects,
      modulationRoutes: {
        'filter-cutoff': customRoute
      }
    };

    engine.loadSoundPreset(presetWithRoute);

    const activeRoutes = engine.getModulationRoutes();
    expect(activeRoutes['filter-cutoff']).toBeDefined();
    expect(activeRoutes['filter-cutoff'].depth).toBe(0.85);
    expect(activeRoutes['filter-cutoff'].bipolar).toBe(true);
    expect(activeRoutes['filter-cutoff'].stageMultipliers?.inhale).toBe(0.6);
  });
});
