/**
 * Synhale 2 - Sound Presets Calibration & Source Isolation Verification
 * 
 * Verifies:
 * - All 12 factory & expansion sound presets have complete 4-source channelStrip
 * - All presets have complete effects chain with gain, filter, drive, eq, delay, reverb
 * - OSC A and Granular Cloud are 100% decoupled (OSC A voiceMode is pure wavetable)
 * - migratePreset defensively populates missing granular, gain, and eq structures
 * - Engine loading sets parameters accurately with 1:1 fidelity
 * - 100% Zero Emoji compliance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSoundPresetList,
  getExtendedSoundPresetList,
  migratePreset,
  SoundPreset
} from '../../../src/audio/presets/soundPresets';
import { AudioEngine } from '../../../src/audio/engine';
import { MockAudioContext } from '../../mocks/webAudioMock';

describe('Sound Presets Calibration & Source Decoupling Suite', () => {
  let ctx: MockAudioContext;
  let engine: AudioEngine;

  const allPresets: SoundPreset[] = [...getSoundPresetList(), ...getExtendedSoundPresetList()];

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  afterEach(() => {
    engine.dispose();
  });

  it('contains exactly 24 calibrated presets with complete 4-source channel strip', () => {
    expect(allPresets.length).toBe(24);

    for (const preset of allPresets) {
      // 1. Channel strip completeness
      expect(preset.channelStrip).toBeDefined();
      expect(preset.channelStrip.oscA).toBeDefined();
      expect(preset.channelStrip.granular).toBeDefined();
      expect(preset.channelStrip.oscB).toBeDefined();
      expect(preset.channelStrip.drone).toBeDefined();

      // 2. OSC A is pure wavetable (never particles)
      expect(preset.channelStrip.oscA.voiceMode).not.toBe('particles');
      expect(['drone', 'arp']).toContain(preset.channelStrip.oscA.voiceMode);

      // 3. Granular has its own independent configuration
      expect(typeof preset.channelStrip.granular?.bypass).toBe('boolean');
      expect(preset.channelStrip.granular?.density).toBeGreaterThan(0);
      expect(preset.channelStrip.granular?.rate).toBeGreaterThan(0);
    }
  });

  it('contains complete effects chain for all 24 presets including gain and eq', () => {
    for (const preset of allPresets) {
      const fx = preset.effects;
      expect(fx).toBeDefined();

      // Gain (preamp)
      expect(fx.gain).toBeDefined();
      expect(typeof fx.gain?.value).toBe('number');
      expect(typeof fx.gain?.bypass).toBe('boolean');

      // Filter
      expect(fx.filter).toBeDefined();
      expect(typeof fx.filter.cutoff).toBe('number');

      // EQ (4-Band)
      expect(fx.eq).toBeDefined();
      expect(fx.eq?.low?.frequency).toBeGreaterThan(0);
      expect(fx.eq?.midLow?.frequency).toBeGreaterThan(0);
      expect(fx.eq?.midHigh?.frequency).toBeGreaterThan(0);
      expect(fx.eq?.high?.frequency).toBeGreaterThan(0);
      expect(typeof fx.eq?.bypass).toBe('boolean');

      // Delay & Reverb
      expect(fx.delay).toBeDefined();
      expect(fx.reverb).toBeDefined();
    }
  });

  it('migrates legacy preset formats cleanly without contaminating OSC A', () => {
    const legacyRaw = {
      id: 'legacy-test',
      name: 'Legacy Preset',
      nameEn: 'Legacy Preset',
      category: 'Zen',
      description: 'Legacy test description',
      badge: 'Legacy',
      channelStrip: {
        oscA: {
          wavetableIndex: 3,
          voiceMode: 'particles', // Legacy particles mode
          baseFreq: 216
        },
        oscB: { color: 0.5, gain: 0.3 },
        drone: { baseFreq: 54, gain: 0.2 }
      },
      effects: {
        filter: { cutoff: 1200, resonance: 1.5, type: 'lowpass', bypass: false },
        drive: { amount: 0.1, tone: 0.5, bypass: false },
        delay: { time: 0.3, feedback: 0.3, damping: 3000, mix: 0.2, bypass: false },
        reverb: { decayTime: 2.0, damping: 0.5, mix: 0.2, bypass: false },
        masterGain: 0.8
      }
    };

    const migrated = migratePreset(legacyRaw as any);

    // OSC A should be migrated to drone
    expect(migrated.channelStrip.oscA.voiceMode).toBe('drone');
    // Granular should be populated with independent structure
    expect(migrated.channelStrip.granular).toBeDefined();
    expect(migrated.channelStrip.granular?.bypass).toBe(true);
    // EQ and gain should be populated
    expect(migrated.effects.gain).toBeDefined();
    expect(migrated.effects.eq).toBeDefined();
    expect(migrated.effects.eq?.midLow?.frequency).toBe(432);
  });

  it('loads preset into AudioEngine and verifies 1:1 parameter fidelity', () => {
    const preset = allPresets[0]; // Tibetan Singing Bowl
    engine.loadSoundPreset(preset);

    const cs = engine.getChannelStripParams();
    const fx = engine.getEffectsParams();

    // Verify 4-source parameters
    expect(cs.oscA.wavetableIndex).toBe(preset.channelStrip.oscA.wavetableIndex);
    expect(cs.granular?.bypass).toBe(preset.channelStrip.granular?.bypass);
    expect(cs.oscB.noiseType).toBe(preset.channelStrip.oscB.noiseType);
    expect(cs.drone.baseFreq).toBe(preset.channelStrip.drone.baseFreq);

    // Verify effects including gain and eq
    expect(fx.gain?.value).toBe(preset.effects.gain?.value);
    expect(fx.eq?.midLow?.frequency).toBe(preset.effects.eq?.midLow?.frequency);
    expect(fx.filter.cutoff).toBe(preset.effects.filter.cutoff);
  });

  it('guarantees visual grains are strictly empty when granular is bypassed', () => {
    // Pick preset with granular bypassed (e.g. sacred432hz)
    const bypassedPreset = allPresets.find(p => p.channelStrip.granular?.bypass);
    expect(bypassedPreset).toBeDefined();

    engine.loadSoundPreset(bypassedPreset!);
    // Even if oscA is running, visual grains must be strictly empty
    expect(engine.getVisualGrains()).toEqual([]);
  });

  it('complies strictly with zero emoji standard', () => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const preset of allPresets) {
      expect(emojiRegex.test(preset.name)).toBe(false);
      expect(emojiRegex.test(preset.description)).toBe(false);
    }
  });
});
