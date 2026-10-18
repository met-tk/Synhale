import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../mocks/webAudioMock';
import type {
  BreathStage,
  ChannelStripParams,
  EffectsChainParams,
  BreathClockSnapshot,
  ModulationSource,
  VisualPresetId
} from '../../src/types';

describe('Feature F01: Project Scaffold & Test Environment', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(async () => {
    await ctx.close();
  });

  it('F01-1: Vitest runner executes within jsdom environment with DOM globals accessible', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(typeof document.createElement).toBe('function');
    const div = document.createElement('div');
    div.id = 'synhale-app-root';
    document.body.appendChild(div);
    expect(document.getElementById('synhale-app-root')).toBe(div);
    document.body.removeChild(div);
  });

  it('F01-2: MockAudioContext advances deterministic virtual time and tracks currentTime', () => {
    expect(ctx.currentTime).toBe(0);
    ctx.advanceTime(1.5);
    expect(ctx.currentTime).toBe(1.5);
    ctx.advanceTime(0.75);
    expect(ctx.currentTime).toBe(2.25);
    expect(() => ctx.advanceTime(-0.1)).toThrow('Cannot advance time backwards');
  });

  it('F01-3: Audio contracts export ChannelStripParams and EffectsChainParams adhering to specification', () => {
    const channelStrip: ChannelStripParams = {
      oscA: { wavetableIndex: 0, detune: 0, harmonics: 0.5, gain: 0.8, bypass: false },
      oscB: { color: 0.5, friction: 0.3, gain: 0.4, bypass: false },
      drone: { baseFreq: 64.27, pitchDrift: 0.05, gain: 0.6, bypass: false }
    };
    expect(channelStrip.oscA.wavetableIndex).toBe(0);
    expect(channelStrip.oscB.friction).toBe(0.3);
    expect(channelStrip.drone.baseFreq).toBeCloseTo(64.27, 2);

    const effects: EffectsChainParams = {
      filter: { type: 'lowpass', cutoff: 1200, resonance: 2.5, bypass: false },
      drive: { amount: 0.2, tone: 0.5, bypass: false },
      delay: { time: 0.25, feedback: 0.4, damping: 3000, mix: 0.3, bypass: false },
      reverb: { decayTime: 3.5, damping: 0.4, mix: 0.25, bypass: false },
      masterGain: 0.9
    };
    expect(effects.filter.type).toBe('lowpass');
    expect(effects.delay.damping).toBe(3000);
    expect(effects.masterGain).toBe(0.9);
  });

  it('F01-4: Breath, UI and Visual contracts validate required types and stages', () => {
    const validStages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
    expect(validStages).toHaveLength(4);

    const snapshot: BreathClockSnapshot = {
      isPlaying: true,
      currentStage: 'inhale',
      stageProgress: 0.42,
      stageRemainingSeconds: 2.32,
      cycleProgress: 0.15,
      breathMacro: 0.55,
      cycleCount: 3
    };
    expect(snapshot.currentStage).toBe('inhale');
    expect(snapshot.stageProgress).toBe(0.42);

    const modSources: ModulationSource[] = ['breathMacro', 'lfo1', 'stageProgress', 'manual'];
    expect(modSources).toContain('breathMacro');

    const presets: VisualPresetId[] = ['minimalRing', 'sacredGeometry', 'zenWaves', 'calmFocus'];
    expect(presets).toHaveLength(4);
  });

  it('F01-5: Scheduled audio params correctly interpolate values over virtual time progression', () => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0, 0.0);
    gain.gain.linearRampToValueAtTime(1.0, 2.0);

    ctx.advanceTime(1.0);
    expect(gain.gain.value).toBeCloseTo(0.5, 3);

    ctx.advanceTime(1.0);
    expect(gain.gain.value).toBeCloseTo(1.0, 3);
  });
});
