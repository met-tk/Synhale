/**
 * Synhale 2 - Curated Sound Therapy Presets
 * 
 * 24 bespoke acoustic presets engineered for meditation, deep relaxation, and sound healing:
 * 
 * Factory Core (5 Presets):
 * 1. Tibetan Singing Bowl (神圣钟磬): 216Hz sacred singing bowl harmonics with spacious monastery reverberation
 * 2. Oceanic Drift (深海潮汐): 144Hz tidal sine with organic tidal breath noise and deep underwater sub-flow
 * 3. Ambient Shimmer (极光以太): 432Hz crystalline prism harmonics with sparkling stereo ping-pong diffusion
 * 4. Deep Theta (脑波深眠): 108Hz warm sinusoidal foundation with soothing bedtime pink noise
 * 5. Zen Temple (禅定古刹): 324Hz ancient bronze temple bell chime with bamboo wind echoes
 * 
 * Expansion Collection (7 Presets):
 * 6. Aurora Harp (极光竖琴): 432Hz celestial aurora harp harmonics with sparkling crystal shimmer
 * 7. Tidal Chimes (潮汐风铃): 528Hz transformation chime with organic tidal surf noise
 * 8. Forest Dawn (竹林晨曦): 288Hz bamboo flute harmonics with morning breeze micro-textures
 * 9. Forest Stream (林泉幽境): 216Hz flowing mountain stream with bamboo wind chime resonance
 * 10. Celestial Choir (天籁颂歌): 432Hz cathedral choir vocal resonance with lush diffusion
 * 11. Crystal Glacier (水晶冰川): 432Hz crystal bowl harmonics with crystalline airy highshelf brilliance
 * 12. Chakra Bowl (脉轮颂钵): 216Hz chakra resonance with handcrafted bronze gong wash and long reverb
 * 
 * Soundscape Suite (12 Presets linked to 12 Soundscape Themes):
 * 13. Abyssal Voyage (深海远航 - Page 1): 108Hz sub-bass with oceanic tidal swells and reverse grains
 * 14. Monsoon Canopy (雨夜苍穹 - Page 2): 288Hz fifths chord with rain on tent textures and cathedral reverb
 * 15. Mountain Cascade (幽涧清泉 - Page 3): 324Hz crystal clean fundamental with flowing stream grains
 * 16. Arctic Blizzard (极地风息 - Page 4): 144Hz sub-zero sine unison with arctic blizzard noise sweep
 * 17. Hearth Embers (古炉余温 - Page 5): 174Hz warm grounding tone with crackling campfire embers
 * 18. Wilderness Dusk (原野暮色 - Page 6): 216Hz twilight harmonic drone with summer crickets biosphere
 * 19. Zen Garden (枯山水庭 - Page 7): 432Hz sacred geometry foundation with zen garden bells and water
 * 20. Nordic Cabin (北欧谧舍 - Page 8): 192Hz warm analog brass drone with cozy cabin retreat ambience
 * 21. Whale Sanctuary (深海巨鲸 - Page 9): 72Hz ultra-deep sub drone with humpback whale songs
 * 22. Creature Night (草木灵音 - Page 10): 256Hz scientific C root with comforting purr vibration
 * 23. Crystal Mandala (水晶梵境 - Page 11): 528Hz crystal singing bowl harmonics with air brilliance
 * 24. Study Flow (心流自修 - Page 12): 174Hz Rhodes foundation with study room lofi paper textures
 * 
 * Strict industrial aesthetics: 100% zero emoji, precision acoustic engineering.
 */

import {
  DEFAULT_GRANULAR_PARAMS,
  DEFAULT_OSC_A_PARAMS,
  DEFAULT_AMBIENT_PARAMS,
  DEFAULT_EQ_PARAMS,
  DEFAULT_SOURCE_ROUTES,
  DEFAULT_LANE_A_ORDER,
  DEFAULT_LANE_B_ORDER,
  type ChannelStripParams,
  type EffectsChainParams,
  type ModulationRoute
} from '../../types';
import { LEGACY_AMBIENT_MAP } from '../nodes/AmbientSoundscapeLibrary';

export interface SoundPreset {
  id: string;
  name: string;
  nameEn: string;
  category: 'Tibetan' | 'Nature' | 'Celestial' | 'Theta' | 'Zen' | 'Futuristic' | 'Organic' | 'Cosmic' | 'Crystal' | 'User';
  description: string;
  badge: string;
  channelStrip: ChannelStripParams;
  effects: EffectsChainParams;
  modulationRoutes?: Record<string, ModulationRoute>;
}

export const SOUND_PRESETS: Record<string, SoundPreset> = {
  tibetanBowl: {
    id: 'tibetanBowl',
    name: '神圣钟磬',
    nameEn: 'Sacred Bell Resonance',
    category: 'Tibetan',
    description: '432Hz 颂钵磬鸣，殿堂深响',
    badge: 'Sacred Bell',
    channelStrip: {
      oscA: {
        baseFreq: 216, // Sacred 432Hz subharmonic singing bowl root
        wavetableIndex: 1, // Bank 1: Tibetan Bowls
        wtPosition: 0.55,
        detune: 0,
        harmonics: 0.70,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'sacred',
        morphDepth: 0.55,
        unison: 0.32,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.18,
        warmth: 0.30,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'tibetanChimes',
        gain: 0.48,
        rate: 1.2,
        density: 5,
        duration: 0.55,
        position: 0.15,
        positionJitter: 0.25,
        panJitter: 0.60,
        timingJitter: 0.40,
        reverseChance: 0.15,
        bypass: false, // Bypassed by default for pure wavetable bowl focus, togglable for grains
        grainEnvelope: {
          attack: 0.18,
          hold: 0.35,
          release: 0.47,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.22,
        gain: 0.10,
        bypass: false,
        noiseType: 'pink',
        lowCut: 90,
        motion: 0.20,
        stereoWidth: 0.50
      },
      drone: {
        baseFreq: 54, // 432Hz sub-subharmonic foundation (432 / 8)
        pitchDrift: 0.30,
        gain: 0.14,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -2.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 2.5, q: 1.8 }, // 432Hz sacred resonance boost
        midHigh: { frequency: 2160, gain: 1.2, q: 1.414 }, // Airflow clarity
        high: { frequency: 8000, gain: -1.0, q: 0.707 }, // Warm high damping
        bypass: false
      },
      filter: {
        cutoff: 2600,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.04,
        tone: 0.35,
        bypass: false
      },
      delay: {
        time: 0.42,
        feedback: 0.38,
        damping: 3200,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 7.5,
        damping: 0.35,
        mix: 0.50,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.06,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.035,
        depth: 0.22,
        filterMod: 0.18,
        panMod: 0.28,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.6,
        decay: 2.8,
        sustain: 0.80,
        release: 5.8,
        bypass: false
      }
    }
  },

  oceanicDrift: {
    id: 'oceanicDrift',
    name: '深海潮汐',
    nameEn: 'Oceanic Drift',
    category: 'Nature',
    description: '144Hz 深海正弦，潮汐涨落',
    badge: 'Tidal Flow',
    channelStrip: {
      oscA: {
        baseFreq: 144, // 144Hz subharmonic root
        wavetableIndex: 6, // Bank 6: Cosmic Ethereal
        wtPosition: 0.40,
        detune: -2,
        harmonics: 0.45,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.40,
        unison: 0.35,
        unisonVoices: 2,
        unisonDetune: 0.20,
        subGain: 0.25,
        warmth: 0.25,
        spread: 0.45,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'oceanTide',
        gain: 0.54,
        rate: 0.8,
        density: 5,
        duration: 0.80,
        position: 0.30,
        positionJitter: 0.45,
        reverseChance: 0.30,
        panJitter: 0.65,
        timingJitter: 0.45,
        bypass: false,
        grainEnvelope: {
          attack: 0.25,
          hold: 0.40,
          release: 0.35,
          shape: 'smooth'
        }
      },
      oscB: {
        color: 0.55,
        friction: 0.40,
        gain: 0.24,
        bypass: false,
        noiseType: 'brown',
        lowCut: 60,
        motion: 0.50,
        stereoWidth: 0.70
      },
      drone: {
        baseFreq: 36, // 144Hz / 4 deep underwater sub
        pitchDrift: 0.45,
        gain: 0.20,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 2.8, q: 0.707, type: 'lowshelf' }, // Deep oceanic bass weight
        midLow: { frequency: 432, gain: -1.0, q: 1.2 }, // Mid scoop to let waters breathe
        midHigh: { frequency: 2160, gain: 1.5, q: 1.414 }, // Sea spray air presence
        high: { frequency: 8000, gain: 0.5, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 1450,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.55,
        feedback: 0.40,
        damping: 2200,
        mix: 0.30,
        bypass: false
      },
      reverb: {
        decayTime: 8.0,
        damping: 0.45,
        mix: 0.54,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.05,
        depth: 0.25,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.03,
        depth: 0.32,
        filterMod: 0.28,
        panMod: 0.38,
        tremoloMod: 0.06,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 2.2, // Gentle slow swell attack
        decay: 2.5,
        sustain: 0.85,
        release: 5.5,
        bypass: false
      }
    }
  },

  ambientShimmer: {
    id: 'ambientShimmer',
    name: '极光以太',
    nameEn: 'Crystalline Shimmer Drone',
    category: 'Celestial',
    description: '432Hz 结晶长鸣，微光泛音',
    badge: 'Shimmer Drone',
    channelStrip: {
      oscA: {
        baseFreq: 432, // Sacred 432Hz root
        wavetableIndex: 4, // Bank 4: Spectral Textures
        wtPosition: 0.70,
        detune: 0,
        harmonics: 0.85,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'maj7',
        morphDepth: 0.70,
        unison: 0.45,
        unisonVoices: 3,
        unisonDetune: 0.26,
        subGain: 0.10,
        warmth: 0.15,
        spread: 0.65,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'crystalHarp',
        gain: 0.52,
        rate: 2.0,
        density: 6,
        duration: 0.42,
        position: 0.25,
        positionJitter: 0.40,
        reverseChance: 0.25,
        panJitter: 0.75,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'hann'
        }
      },
      oscB: {
        color: 0.45,
        friction: 0.18,
        gain: 0.08,
        bypass: false,
        noiseType: 'violet',
        lowCut: 150,
        motion: 0.30,
        stereoWidth: 0.80
      },
      drone: {
        baseFreq: 54,
        pitchDrift: 0.20,
        gain: 0.10,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -3.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.0, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.0, q: 1.414 },
        high: { frequency: 8000, gain: 3.5, q: 0.707 }, // Crystalline airy highshelf boost
        bypass: false
      },
      filter: {
        cutoff: 4800,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.38,
        feedback: 0.42,
        damping: 4500,
        mix: 0.32,
        bypass: false
      },
      reverb: {
        decayTime: 8.5,
        damping: 0.28,
        mix: 0.56,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.09,
        depth: 0.20,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.045,
        depth: 0.26,
        filterMod: 0.18,
        panMod: 0.45,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.5,
        decay: 2.8,
        sustain: 0.82,
        release: 5.5,
        bypass: false
      }
    }
  },

  deepTheta: {
    id: 'deepTheta',
    name: '脑波深眠',
    nameEn: 'Deep Theta Sleep Harmonic',
    category: 'Theta',
    description: '108Hz 正弦与粉噪，深眠场域',
    badge: 'Theta Slumber',
    channelStrip: {
      oscA: {
        baseFreq: 108, // Sacred 432Hz quarter subharmonic
        wavetableIndex: 0, // Bank 0: Classic Shapes
        wtPosition: 0.20,
        detune: 0,
        harmonics: 0.28,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.20,
        unison: 0.22,
        unisonVoices: 2,
        unisonDetune: 0.12,
        subGain: 0.32,
        warmth: 0.40,
        spread: 0.25,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'deepSubPing',
        gain: 0.42,
        rate: 0.6,
        density: 3,
        duration: 0.90,
        position: 0.10,
        positionJitter: 0.15,
        reverseChance: 0.05,
        panJitter: 0.35,
        timingJitter: 0.30,
        bypass: true,
        grainEnvelope: {
          attack: 0.30,
          hold: 0.40,
          release: 0.30,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.25,
        friction: 0.15,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 50,
        motion: 0.15,
        stereoWidth: 0.40
      },
      drone: {
        baseFreq: 27, // 108Hz / 4 Deep Theta foundation
        pitchDrift: 0.25,
        gain: 0.25,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 3.5, q: 0.707, type: 'lowshelf' }, // Warm comforting cushion
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: -2.0, q: 1.414 }, // Tamed harshness
        high: { frequency: 8000, gain: -4.0, q: 0.707 }, // Smooth highshelf roll-off
        bypass: false
      },
      filter: {
        cutoff: 820,
        resonance: 0.85,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.04,
        tone: 0.25,
        bypass: false
      },
      delay: {
        time: 0.60,
        feedback: 0.25,
        damping: 1500,
        mix: 0.20,
        bypass: false
      },
      reverb: {
        decayTime: 6.0,
        damping: 0.60,
        mix: 0.42,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.04,
        depth: 0.15,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.025,
        depth: 0.20,
        filterMod: 0.15,
        panMod: 0.20,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 2.0,
        decay: 2.2,
        sustain: 0.90,
        release: 5.0,
        bypass: false
      }
    }
  },

  zenTemple: {
    id: 'zenTemple',
    name: '禅定古刹',
    nameEn: 'Ancient Bronze Chime',
    category: 'Zen',
    description: '324Hz 青铜编钟，竹风静谧',
    badge: 'Bronze Chime',
    channelStrip: {
      oscA: {
        baseFreq: 324, // 324Hz ancient bronze bell frequency
        wavetableIndex: 1, // Bank 1: Tibetan Bowls
        wtPosition: 0.65,
        detune: 0,
        harmonics: 0.72,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'sus4',
        morphDepth: 0.50,
        unison: 0.32,
        unisonVoices: 2,
        unisonDetune: 0.20,
        subGain: 0.16,
        warmth: 0.28,
        spread: 0.40,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'tibetanChimes',
        gain: 0.52,
        rate: 1.2,
        density: 4,
        duration: 0.65,
        position: 0.20,
        positionJitter: 0.30,
        reverseChance: 0.15,
        panJitter: 0.60,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.18,
          hold: 0.42,
          release: 0.40,
          shape: 'smooth'
        }
      },
      oscB: {
        color: 0.40,
        friction: 0.26,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 100,
        motion: 0.25,
        stereoWidth: 0.50
      },
      drone: {
        baseFreq: 81, // 324Hz / 4 sub-octave
        pitchDrift: 0.30,
        gain: 0.12,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -1.5, q: 0.707, type: 'highpass' }, // Clean bell strike bottom
        midLow: { frequency: 432, gain: 1.5, q: 1.6 },
        midHigh: { frequency: 2160, gain: 2.5, q: 1.8 }, // Metallic chime resonance peak
        high: { frequency: 8000, gain: 1.0, q: 0.707 }, // Airy bell decay
        bypass: false
      },
      filter: {
        cutoff: 2800,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.03,
        tone: 0.40,
        bypass: false
      },
      delay: {
        time: 0.45,
        feedback: 0.40,
        damping: 3500,
        mix: 0.30,
        bypass: false
      },
      reverb: {
        decayTime: 7.5,
        damping: 0.40,
        mix: 0.50,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.08,
        depth: 0.20,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.045,
        depth: 0.25,
        filterMod: 0.22,
        panMod: 0.30,
        tremoloMod: 0.05,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.4,
        decay: 3.0,
        sustain: 0.75,
        release: 5.8,
        bypass: false
      }
    }
  }
};

export const EXTENDED_SOUND_PRESETS: Record<string, SoundPreset> = {
  auroraHarp: {
    id: 'auroraHarp',
    name: '极光竖琴',
    nameEn: 'Ethereal Aurora Harp',
    category: 'Celestial',
    description: '432Hz 天体竖琴，流云微光',
    badge: 'Aurora Harp',
    channelStrip: {
      oscA: {
        baseFreq: 432,
        wavetableIndex: 4, // Bank 4: Spectral Textures
        wtPosition: 0.65,
        detune: 0,
        harmonics: 0.85,
        gain: 0.10,
        bypass: false,
        chordMode: true,
        chordType: 'maj7',
        morphDepth: 0.65,
        unison: 0.42,
        unisonVoices: 3,
        unisonDetune: 0.26,
        subGain: 0.10,
        warmth: 0.18,
        spread: 0.65,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'crystalHarp',
        gain: 0.52,
        rate: 1.6,
        density: 5,
        duration: 0.50,
        position: 0.25,
        positionJitter: 0.35,
        reverseChance: 0.20,
        panJitter: 0.70,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'hann'
        }
      },
      oscB: {
        color: 0.40,
        friction: 0.18,
        gain: 0.08,
        bypass: false,
        noiseType: 'violet',
        lowCut: 150,
        motion: 0.25,
        stereoWidth: 0.75
      },
      drone: {
        baseFreq: 54,
        pitchDrift: 0.18,
        gain: 0.08,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -2.5, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.0, q: 1.414 },
        high: { frequency: 8000, gain: 3.0, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 3600,
        resonance: 1.2,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.38,
        feedback: 0.40,
        damping: 4500,
        mix: 0.30,
        bypass: false
      },
      reverb: {
        decayTime: 8.2,
        damping: 0.30,
        mix: 0.52,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.08,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.04,
        depth: 0.25,
        filterMod: 0.18,
        panMod: 0.40,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.4,
        decay: 2.8,
        sustain: 0.80,
        release: 5.5,
        bypass: false
      }
    }
  },

  tidalChimes: {
    id: 'tidalChimes',
    name: '潮汐风铃',
    nameEn: 'Tidal Chimes Harmony',
    category: 'Nature',
    description: '528Hz 金属微粒与海潮交织',
    badge: 'Chime & Surf',
    channelStrip: {
      oscA: {
        baseFreq: 528, // 528Hz Transformation chime
        wavetableIndex: 3, // Bank 3: Bell & Metallic
        wtPosition: 0.45,
        detune: 4,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'maj7',
        morphDepth: 0.45,
        unison: 0.42,
        unisonVoices: 2,
        unisonDetune: 0.24,
        subGain: 0.12,
        warmth: 0.18,
        spread: 0.60,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'crystalHarmonics',
        gain: 0.52,
        rate: 1.8,
        density: 6,
        duration: 0.45,
        position: 0.25,
        positionJitter: 0.40,
        reverseChance: 0.25,
        panJitter: 0.70,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.12,
          hold: 0.45,
          release: 0.43,
          shape: 'hann'
        }
      },
      oscB: {
        color: 0.60,
        friction: 0.30,
        gain: 0.18,
        bypass: false,
        noiseType: 'pink',
        lowCut: 100,
        motion: 0.40,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 66,
        pitchDrift: 0.15,
        gain: 0.08,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -2.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.0, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.5, q: 1.414 },
        high: { frequency: 8000, gain: 3.0, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 3800,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.35,
        feedback: 0.45,
        damping: 4500,
        mix: 0.32,
        bypass: false
      },
      reverb: {
        decayTime: 7.8,
        damping: 0.35,
        mix: 0.52,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.09,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.04,
        depth: 0.30,
        filterMod: 0.25,
        panMod: 0.45,
        tremoloMod: 0.05,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.2,
        decay: 2.8,
        sustain: 0.75,
        release: 5.2,
        bypass: false
      }
    }
  },

  forestDawn: {
    id: 'forestDawn',
    name: '竹林晨曦',
    nameEn: 'Forest Dawn Respiration',
    category: 'Organic',
    description: '288Hz 竹笛谐波，晨风拂叶',
    badge: 'Bamboo Breeze',
    channelStrip: {
      oscA: {
        baseFreq: 288,
        wavetableIndex: 2, // Bank 2: Vocal Formants
        wtPosition: 0.50,
        detune: 0,
        harmonics: 0.65,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.50,
        unison: 0.32,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.15,
        warmth: 0.25,
        spread: 0.40,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'singingForest',
        gain: 0.52,
        rate: 1.3,
        density: 5,
        duration: 0.60,
        position: 0.20,
        positionJitter: 0.35,
        reverseChance: 0.18,
        panJitter: 0.60,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.20,
          hold: 0.40,
          release: 0.40,
          shape: 'smooth'
        }
      },
      oscB: {
        color: 0.45,
        friction: 0.35,
        gain: 0.16,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.55
      },
      drone: {
        baseFreq: 72,
        pitchDrift: 0.25,
        gain: 0.10,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -1.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.0, q: 1.6 },
        high: { frequency: 8000, gain: 2.0, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 3200,
        resonance: 1.2,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.03,
        tone: 0.35,
        bypass: false
      },
      delay: {
        time: 0.44,
        feedback: 0.38,
        damping: 3800,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 7.2,
        damping: 0.40,
        mix: 0.50,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.08,
        depth: 0.20,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.035,
        depth: 0.28,
        filterMod: 0.20,
        panMod: 0.35,
        tremoloMod: 0.05,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.4,
        decay: 2.5,
        sustain: 0.80,
        release: 5.0,
        bypass: false
      }
    }
  },

  forestStream: {
    id: 'forestStream',
    name: '碧涧流泉',
    nameEn: 'Forest Stream Harmony',
    category: 'Nature',
    description: '528Hz 溪泉流动，林间微风',
    badge: 'Forest Spring',
    channelStrip: {
      oscA: {
        baseFreq: 528,
        wavetableIndex: 0, // Bank 0: Pure meditative sinewave harmonic series
        wtPosition: 0.40,
        detune: 2,
        harmonics: 0.60,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.40,
        unison: 0.35,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.15,
        warmth: 0.25,
        spread: 0.50,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'zenWaterDrop',
        gain: 0.52,
        rate: 1.2,
        density: 5,
        duration: 0.60,
        position: 0.20,
        positionJitter: 0.35,
        reverseChance: 0.15,
        panJitter: 0.65,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.18,
          hold: 0.42,
          release: 0.40,
          shape: 'smooth'
        }
      },
      oscB: {
        color: 0.45,
        friction: 0.25,
        gain: 0.14,
        bypass: false,
        noiseType: 'pink',
        lowCut: 90,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 66,
        pitchDrift: 0.25,
        gain: 0.12,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -1.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.2, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.0, q: 1.414 },
        high: { frequency: 8000, gain: 2.2, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 3400,
        resonance: 1.2,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.42,
        feedback: 0.38,
        damping: 4200,
        mix: 0.30,
        bypass: false
      },
      reverb: {
        decayTime: 7.6,
        damping: 0.36,
        mix: 0.50,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.07,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.035,
        depth: 0.25,
        filterMod: 0.18,
        panMod: 0.35,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.4,
        decay: 2.5,
        sustain: 0.80,
        release: 5.2,
        bypass: false
      }
    }
  },

  celestialChoir: {
    id: 'celestialChoir',
    name: '梵音颂唱',
    nameEn: 'Celestial Choir Resonance',
    category: 'Celestial',
    description: '216Hz 神圣八度，空灵人声',
    badge: 'Celestial Choir',
    channelStrip: {
      oscA: {
        baseFreq: 216,
        wavetableIndex: 2, // Bank 2: Vocal Formants
        wtPosition: 0.55,
        detune: 0,
        harmonics: 0.78,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'sacred',
        morphDepth: 0.55,
        unison: 0.45,
        unisonVoices: 3,
        unisonDetune: 0.25,
        subGain: 0.20,
        warmth: 0.30,
        spread: 0.65,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'celesta',
        gain: 0.50,
        rate: 1.0,
        density: 4,
        duration: 0.70,
        position: 0.20,
        positionJitter: 0.35,
        reverseChance: 0.15,
        panJitter: 0.60,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.25,
          hold: 0.45,
          release: 0.30,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.20,
        gain: 0.10,
        bypass: false,
        noiseType: 'pink',
        lowCut: 100,
        motion: 0.25,
        stereoWidth: 0.65
      },
      drone: {
        baseFreq: 54,
        pitchDrift: 0.20,
        gain: 0.15,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 0.5, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 2.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 1.5, q: 1.414 },
        high: { frequency: 8000, gain: 1.8, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 2800,
        resonance: 1.25,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.46,
        feedback: 0.40,
        damping: 3600,
        mix: 0.32,
        bypass: false
      },
      reverb: {
        decayTime: 8.4,
        damping: 0.32,
        mix: 0.55,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.05,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.03,
        depth: 0.28,
        filterMod: 0.20,
        panMod: 0.35,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.8,
        decay: 2.8,
        sustain: 0.84,
        release: 6.0,
        bypass: false
      }
    }
  },

  crystalGlacier: {
    id: 'crystalGlacier',
    name: '水晶冰川',
    nameEn: 'Crystal Glacier Shimmer',
    category: 'Crystal',
    description: '432Hz 水晶钵高频结晶谐波',
    badge: 'Crystal Frost',
    channelStrip: {
      oscA: {
        baseFreq: 432,
        wavetableIndex: 4, // Bank 4: Spectral Textures
        wtPosition: 0.60,
        detune: 0,
        harmonics: 0.90,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'sacred',
        morphDepth: 0.60,
        unison: 0.48,
        unisonVoices: 3,
        unisonDetune: 0.30,
        subGain: 0.08,
        warmth: 0.12,
        spread: 0.70,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'celesta',
        gain: 0.50,
        rate: 2.0,
        density: 6,
        duration: 0.40,
        position: 0.20,
        positionJitter: 0.40,
        reverseChance: 0.20,
        panJitter: 0.80,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.10,
          hold: 0.45,
          release: 0.45,
          shape: 'hann'
        }
      },
      oscB: {
        color: 0.30,
        friction: 0.15,
        gain: 0.08,
        bypass: false,
        noiseType: 'white',
        lowCut: 160,
        motion: 0.25,
        stereoWidth: 0.75
      },
      drone: {
        baseFreq: 108,
        pitchDrift: 0.15,
        gain: 0.08,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -3.5, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 2.5, q: 1.414 },
        high: { frequency: 8000, gain: 4.0, q: 0.707 }, // Crystal brilliance highshelf boost
        bypass: false
      },
      filter: {
        cutoff: 4800,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.0,
        tone: 0.5,
        bypass: true
      },
      delay: {
        time: 0.32,
        feedback: 0.45,
        damping: 6000,
        mix: 0.32,
        bypass: false
      },
      reverb: {
        decayTime: 8.5,
        damping: 0.25,
        mix: 0.54,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.11,
        depth: 0.20,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.05,
        depth: 0.25,
        filterMod: 0.20,
        panMod: 0.45,
        tremoloMod: 0.04,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.2,
        decay: 2.5,
        sustain: 0.78,
        release: 5.5,
        bypass: false
      }
    }
  },

  chakraBowl: {
    id: 'chakraBowl',
    name: '脉轮颂钵',
    nameEn: 'Chakra Tibetan Harmony',
    category: 'Tibetan',
    description: '216/432Hz 双脉轮藏钵共鸣',
    badge: 'Chakra Bowl',
    channelStrip: {
      oscA: {
        baseFreq: 216,
        wavetableIndex: 1, // Bank 1: Tibetan Bowls
        wtPosition: 0.55,
        detune: 0,
        harmonics: 0.72,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'sacred',
        morphDepth: 0.55,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.20,
        subGain: 0.20,
        warmth: 0.28,
        spread: 0.40,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'singingBowl',
        gain: 0.50,
        rate: 1.0,
        density: 4,
        duration: 0.65,
        position: 0.25,
        positionJitter: 0.30,
        reverseChance: 0.15,
        panJitter: 0.55,
        timingJitter: 0.35,
        bypass: false,
        grainEnvelope: {
          attack: 0.20,
          hold: 0.40,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.22,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 90,
        motion: 0.25,
        stereoWidth: 0.50
      },
      drone: {
        baseFreq: 54,
        pitchDrift: 0.30,
        gain: 0.15,
        bypass: false
      }
    },
    effects: {
      gain: {
        value: 0.0,
        softClip: true,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: -1.0, q: 0.707, type: 'highpass' },
        midLow: { frequency: 432, gain: 3.0, q: 2.0 }, // Sacred 432Hz Chakra resonance
        midHigh: { frequency: 2160, gain: 1.2, q: 1.414 },
        high: { frequency: 8000, gain: -1.0, q: 0.707 },
        bypass: false
      },
      filter: {
        cutoff: 2700,
        resonance: 1.3,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.05,
        tone: 0.35,
        bypass: false
      },
      delay: {
        time: 0.42,
        feedback: 0.36,
        damping: 3200,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 7.8,
        damping: 0.38,
        mix: 0.52,
        bypass: false
      },
      masterGain: 0.85,
      lfo1: {
        rate: 0.07,
        depth: 0.18,
        shape: 'sine',
        bypass: false
      },
      lfo2: {
        rate: 0.038,
        depth: 0.26,
        filterMod: 0.22,
        panMod: 0.30,
        tremoloMod: 0.05,
        shape: 'sine',
        bypass: false
      },
      adsr: {
        attack: 1.6,
        decay: 2.6,
        sustain: 0.82,
        release: 6.0,
        bypass: false
      }
    }
  },

  // ==========================================
  // EXPANSION SOUNDSCAPE SUITE (12 Presets linked to 12 Soundscape Themes)
  // ==========================================
  abyssalVoyage: {
    id: 'abyssalVoyage',
    name: '深海远航',
    nameEn: 'Abyssal Voyage',
    category: 'Nature',
    description: '108Hz 潜波涌浪，深海回响',
    badge: 'Abyssal',
    channelStrip: {
      oscA: {
        baseFreq: 108,
        wavetableIndex: 6,
        wtPosition: 0.45,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.45,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.35,
        warmth: 0.25,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'oceanWaves',
        gain: 0.45,
        rate: 1.4,
        density: 4,
        duration: 0.65,
        position: 0.3,
        positionJitter: 0.35,
        reverseChance: 0.35,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'dorian',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.25,
        friction: 0.25,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 36,
        pitchDrift: 0.20,
        gain: 0.22,
        bypass: false
      },
      ambient: {
        sampleId: 'rollingSwell',
        gain: 0.55,
        tone: 0.45,
        breathSync: 0.4,
        width: 0.75,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 1800,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.12,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.42,
        feedback: 0.38,
        damping: 2800,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 6.5,
        damping: 0.4,
        mix: 0.45,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 2.5, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.2, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.5, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.08,
        lfo1Depth: 0.25,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.05,
        lfo2Depth: 0.3,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  monsoonCanopy: {
    id: 'monsoonCanopy',
    name: '雨夜苍穹',
    nameEn: 'Monsoon Canopy',
    category: 'Nature',
    description: '288Hz 竹韵和弦与骤雨水滴',
    badge: 'Monsoon',
    channelStrip: {
      oscA: {
        baseFreq: 288,
        wavetableIndex: 3,
        wtPosition: 0.55,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.55,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.18,
        warmth: 0.3,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'rainDrops',
        gain: 0.5,
        rate: 2.2,
        density: 6,
        duration: 0.35,
        position: 0.2,
        positionJitter: 0.35,
        reverseChance: 0.1,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.55,
        friction: 0.25,
        gain: 0.14,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 72,
        pitchDrift: 0.20,
        gain: 0.16,
        bypass: false
      },
      ambient: {
        sampleId: 'thunderShower',
        gain: 0.52,
        tone: 0.55,
        breathSync: 0.35,
        width: 0.8,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2400,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.18,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.38,
        feedback: 0.32,
        damping: 3600,
        mix: 0.26,
        bypass: false
      },
      reverb: {
        decayTime: 5.2,
        damping: 0.45,
        mix: 0.4,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 1.5, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.8, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 1.2, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.12,
        lfo1Depth: 0.3,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.09,
        lfo2Depth: 0.25,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  mountainCascade: {
    id: 'mountainCascade',
    name: '幽涧清泉',
    nameEn: 'Mountain Cascade',
    category: 'Zen',
    description: '324Hz 高山溪流，山谷回响',
    badge: 'Cascade',
    channelStrip: {
      oscA: {
        baseFreq: 324,
        wavetableIndex: 2,
        wtPosition: 0.6,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.6,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.15,
        warmth: 0.2,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'meditationBell',
        gain: 0.48,
        rate: 1.8,
        density: 5,
        duration: 0.45,
        position: 0.35,
        positionJitter: 0.35,
        reverseChance: 0.2,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.42,
        friction: 0.25,
        gain: 0.1,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 81,
        pitchDrift: 0.20,
        gain: 0.14,
        bypass: false
      },
      ambient: {
        sampleId: 'alpineWaterfall',
        gain: 0.5,
        tone: 0.6,
        breathSync: 0.3,
        width: 0.7,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 3200,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.08,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.32,
        feedback: 0.28,
        damping: 4200,
        mix: 0.24,
        bypass: false
      },
      reverb: {
        decayTime: 4.8,
        damping: 0.5,
        mix: 0.35,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 0.5, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 1.5, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.15,
        lfo1Depth: 0.22,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.1,
        lfo2Depth: 0.35,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  arcticBlizzard: {
    id: 'arcticBlizzard',
    name: '极地风息',
    nameEn: 'Arctic Blizzard',
    category: 'Celestial',
    description: '144Hz 冰川谐振与寒风冰晶',
    badge: 'Blizzard',
    channelStrip: {
      oscA: {
        baseFreq: 144,
        wavetableIndex: 4,
        wtPosition: 0.7,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.7,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.25,
        warmth: 0.1,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'crystalHarp',
        gain: 0.46,
        rate: 2.0,
        density: 4,
        duration: 0.55,
        position: 0.4,
        positionJitter: 0.35,
        reverseChance: 0.25,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'lydian',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.65,
        friction: 0.25,
        gain: 0.15,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 48,
        pitchDrift: 0.20,
        gain: 0.2,
        bypass: false
      },
      ambient: {
        sampleId: 'arcticBlizzard',
        gain: 0.54,
        tone: 0.5,
        breathSync: 0.38,
        width: 0.85,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2200,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.1,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.48,
        feedback: 0.4,
        damping: 3000,
        mix: 0.32,
        bypass: false
      },
      reverb: {
        decayTime: 8.5,
        damping: 0.3,
        mix: 0.5,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 2.0, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 0.8, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 2.2, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.06,
        lfo1Depth: 0.35,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.04,
        lfo2Depth: 0.4,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  hearthEmbers: {
    id: 'hearthEmbers',
    name: '古炉余温',
    nameEn: 'Hearth Embers',
    category: 'Organic',
    description: '174Hz 壁炉木柴，温热低语',
    badge: 'Embers',
    channelStrip: {
      oscA: {
        baseFreq: 174,
        wavetableIndex: 0,
        wtPosition: 0.3,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.3,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.28,
        warmth: 0.45,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'handpan',
        gain: 0.44,
        rate: 1.3,
        density: 4,
        duration: 0.7,
        position: 0.15,
        positionJitter: 0.35,
        reverseChance: 0.1,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.3,
        friction: 0.25,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 58,
        pitchDrift: 0.20,
        gain: 0.18,
        bypass: false
      },
      ambient: {
        sampleId: 'campfire',
        gain: 0.52,
        tone: 0.48,
        breathSync: 0.3,
        width: 0.65,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2000,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.25,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.35,
        feedback: 0.25,
        damping: 2500,
        mix: 0.2,
        bypass: false
      },
      reverb: {
        decayTime: 3.2,
        damping: 0.6,
        mix: 0.28,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 2.2, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 2.4, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: -0.5, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.09,
        lfo1Depth: 0.2,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.07,
        lfo2Depth: 0.25,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  wildernessDusk: {
    id: 'wildernessDusk',
    name: '原野暮色',
    nameEn: 'Wilderness Dusk',
    category: 'Organic',
    description: '216Hz 黄昏和弦，晚风促织',
    badge: 'Wilderness',
    channelStrip: {
      oscA: {
        baseFreq: 216,
        wavetableIndex: 1,
        wtPosition: 0.4,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.4,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.2,
        warmth: 0.32,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'singingBowl',
        gain: 0.45,
        rate: 1.5,
        density: 4,
        duration: 0.5,
        position: 0.25,
        positionJitter: 0.35,
        reverseChance: 0.15,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'minor',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.38,
        friction: 0.25,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 54,
        pitchDrift: 0.20,
        gain: 0.16,
        bypass: false
      },
      ambient: {
        sampleId: 'summerCrickets',
        gain: 0.5,
        tone: 0.52,
        breathSync: 0.32,
        width: 0.7,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2600,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.14,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.4,
        feedback: 0.3,
        damping: 3200,
        mix: 0.25,
        bypass: false
      },
      reverb: {
        decayTime: 4.5,
        damping: 0.52,
        mix: 0.32,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 1.2, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.6, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.8, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.1,
        lfo1Depth: 0.25,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.08,
        lfo2Depth: 0.3,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  zenGardenMix: {
    id: 'zenGardenMix',
    name: '枯山水庭',
    nameEn: 'Zen Garden',
    category: 'Zen',
    description: '432Hz 纯音清泉，石庭风铃',
    badge: 'Zen Stone',
    channelStrip: {
      oscA: {
        baseFreq: 432,
        wavetableIndex: 1,
        wtPosition: 0.5,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.5,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.15,
        warmth: 0.25,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'tibetanChimes',
        gain: 0.46,
        rate: 1.6,
        density: 4,
        duration: 0.6,
        position: 0.2,
        positionJitter: 0.35,
        reverseChance: 0.18,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'solfeggio',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.25,
        gain: 0.1,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 108,
        pitchDrift: 0.20,
        gain: 0.15,
        bypass: false
      },
      ambient: {
        sampleId: 'mixZenGarden',
        gain: 0.52,
        tone: 0.55,
        breathSync: 0.28,
        width: 0.72,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2800,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.06,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.45,
        feedback: 0.35,
        damping: 3800,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 5.8,
        damping: 0.45,
        mix: 0.38,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 0.8, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 2.2, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 1.0, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.07,
        lfo1Depth: 0.2,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.05,
        lfo2Depth: 0.3,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  nordicCabin: {
    id: 'nordicCabin',
    name: '北欧谧舍',
    nameEn: 'Nordic Cabin',
    category: 'Cosmic',
    description: '192Hz 温暖纯音，木屋低频',
    badge: 'Cabin',
    channelStrip: {
      oscA: {
        baseFreq: 192,
        wavetableIndex: 3,
        wtPosition: 0.45,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: false,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.45,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.24,
        warmth: 0.38,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'meditationBell',
        gain: 0.44,
        rate: 1.4,
        density: 4,
        duration: 0.55,
        position: 0.3,
        positionJitter: 0.35,
        reverseChance: 0.15,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.32,
        friction: 0.25,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 64,
        pitchDrift: 0.20,
        gain: 0.18,
        bypass: false
      },
      ambient: {
        sampleId: 'mixCabinRetreat',
        gain: 0.5,
        tone: 0.5,
        breathSync: 0.32,
        width: 0.68,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2200,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.2,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.36,
        feedback: 0.28,
        damping: 3000,
        mix: 0.22,
        bypass: false
      },
      reverb: {
        decayTime: 4.2,
        damping: 0.55,
        mix: 0.3,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 1.8, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.8, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.5, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.09,
        lfo1Depth: 0.22,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.06,
        lfo2Depth: 0.28,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  whaleSanctuary: {
    id: 'whaleSanctuary',
    name: '深海巨鲸',
    nameEn: 'Whale Sanctuary',
    category: 'Nature',
    description: '72Hz 鲸吟次声，洋流深潜',
    badge: 'Whale',
    channelStrip: {
      oscA: {
        baseFreq: 72,
        wavetableIndex: 6,
        wtPosition: 0.5,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.5,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.38,
        warmth: 0.3,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'oceanWaves',
        gain: 0.46,
        rate: 1.2,
        density: 4,
        duration: 0.75,
        position: 0.35,
        positionJitter: 0.35,
        reverseChance: 0.3,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'dorian',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.22,
        friction: 0.25,
        gain: 0.14,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 24,
        pitchDrift: 0.20,
        gain: 0.25,
        bypass: false
      },
      ambient: {
        sampleId: 'whaleSong',
        gain: 0.55,
        tone: 0.42,
        breathSync: 0.42,
        width: 0.8,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 1600,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.15,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.5,
        feedback: 0.42,
        damping: 2400,
        mix: 0.3,
        bypass: false
      },
      reverb: {
        decayTime: 8.0,
        damping: 0.35,
        mix: 0.48,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 3.0, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.0, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.0, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.05,
        lfo1Depth: 0.3,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.03,
        lfo2Depth: 0.35,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  creatureNight: {
    id: 'creatureNight',
    name: '草木灵音',
    nameEn: 'Creature Night',
    category: 'Organic',
    description: '256Hz 猫咪呼噜，体感共振',
    badge: 'Creature',
    channelStrip: {
      oscA: {
        baseFreq: 256,
        wavetableIndex: 0,
        wtPosition: 0.25,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'octave',
        morphDepth: 0.25,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.22,
        warmth: 0.4,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'handpan',
        gain: 0.45,
        rate: 1.5,
        density: 4,
        duration: 0.45,
        position: 0.2,
        positionJitter: 0.35,
        reverseChance: 0.1,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.25,
        gain: 0.1,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 64,
        pitchDrift: 0.20,
        gain: 0.16,
        bypass: false
      },
      ambient: {
        sampleId: 'catPurr',
        gain: 0.52,
        tone: 0.45,
        breathSync: 0.28,
        width: 0.65,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2200,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.16,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.32,
        feedback: 0.24,
        damping: 3000,
        mix: 0.2,
        bypass: false
      },
      reverb: {
        decayTime: 3.5,
        damping: 0.6,
        mix: 0.26,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 2.0, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 2.0, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.0, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.08,
        lfo1Depth: 0.18,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.06,
        lfo2Depth: 0.25,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  crystalMandala: {
    id: 'crystalMandala',
    name: '水晶梵境',
    nameEn: 'Crystal Mandala',
    category: 'Crystal',
    description: '528Hz 石英声钵，竖琴微光',
    badge: 'Mandala',
    channelStrip: {
      oscA: {
        baseFreq: 528,
        wavetableIndex: 5,
        wtPosition: 0.65,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'maj7',
        morphDepth: 0.65,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.12,
        warmth: 0.15,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'crystalHarp',
        gain: 0.5,
        rate: 1.8,
        density: 5,
        duration: 0.5,
        position: 0.3,
        positionJitter: 0.35,
        reverseChance: 0.2,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'lydian',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.5,
        friction: 0.25,
        gain: 0.1,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 132,
        pitchDrift: 0.20,
        gain: 0.14,
        bypass: false
      },
      ambient: {
        sampleId: 'crystalBowl',
        gain: 0.54,
        tone: 0.65,
        breathSync: 0.3,
        width: 0.75,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 3600,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.05,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.4,
        feedback: 0.35,
        damping: 4500,
        mix: 0.28,
        bypass: false
      },
      reverb: {
        decayTime: 6.8,
        damping: 0.35,
        mix: 0.42,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 0.0, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.5, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 2.5, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.09,
        lfo1Depth: 0.22,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.06,
        lfo2Depth: 0.32,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  },
  studyFlow: {
    id: 'studyFlow',
    name: '心流自修',
    nameEn: 'Study Flow',
    category: 'Futuristic',
    description: '174Hz 沉浸和弦，纸页低保真',
    badge: 'Flow',
    channelStrip: {
      oscA: {
        baseFreq: 174,
        wavetableIndex: 2,
        wtPosition: 0.4,
        detune: 0,
        harmonics: 0.80,
        gain: 0.10,
        bypass: true,
        chordMode: true,
        chordType: 'fifth',
        morphDepth: 0.4,
        unison: 0.30,
        unisonVoices: 2,
        unisonDetune: 0.18,
        subGain: 0.25,
        warmth: 0.35,
        spread: 0.35,
        voiceMode: 'drone'
      },
      granular: {
        ...DEFAULT_GRANULAR_PARAMS,
        sampleId: 'monasteryChant',
        gain: 0.45,
        rate: 1.4,
        density: 4,
        duration: 0.55,
        position: 0.25,
        positionJitter: 0.35,
        reverseChance: 0.15,
        panJitter: 0.65,
        timingJitter: 0.30,
        scale: 'pentatonic',
        mode: 'ambient',
        bypass: false,
        grainEnvelope: {
          attack: 0.15,
          hold: 0.45,
          release: 0.40,
          shape: 'gaussian'
        }
      },
      oscB: {
        color: 0.35,
        friction: 0.25,
        gain: 0.12,
        bypass: false,
        noiseType: 'pink',
        lowCut: 80,
        motion: 0.30,
        stereoWidth: 0.60
      },
      drone: {
        baseFreq: 87,
        pitchDrift: 0.20,
        gain: 0.18,
        bypass: false
      },
      ambient: {
        sampleId: 'mixStudyLofi',
        gain: 0.52,
        tone: 0.48,
        breathSync: 0.3,
        width: 0.68,
        bypass: false
      }
    },
    effects: {
      masterGain: 0.85,
      busMix: 0.50,
      busLevelA: 1.0,
      busLevelB: 0.85,
      sourceRoutes: {
        oscA: 'laneA',
        granular: 'laneB',
        oscB: 'laneA',
        drone: 'laneA',
        ambient: 'laneB'
      },
      laneAOrder: ['drive', 'filter'],
      laneBOrder: ['delay', 'reverb'],
      filter: {
        cutoff: 2400,
        resonance: 1.1,
        type: 'lowpass',
        bypass: false
      },
      drive: {
        amount: 0.18,
        tone: 0.45,
        bypass: false
      },
      delay: {
        time: 0.35,
        feedback: 0.28,
        damping: 3200,
        mix: 0.22,
        bypass: false
      },
      reverb: {
        decayTime: 3.8,
        damping: 0.55,
        mix: 0.3,
        bypass: false
      },
      eq: {
        ...DEFAULT_EQ_PARAMS,
        low: { frequency: 80, gain: 1.5, q: 0.707, type: 'lowshelf' },
        midLow: { frequency: 432, gain: 1.6, q: 1.414 },
        midHigh: { frequency: 2160, gain: 0.0, q: 1.414 },
        high: { frequency: 8000, gain: 0.8, q: 0.707 },
        bypass: false
      },
      dualLfo: {
        lfo1Rate: 0.1,
        lfo1Depth: 0.2,
        lfo1Waveform: 'sine',
        lfo1Target: 'filterCutoff',
        lfo2Rate: 0.07,
        lfo2Depth: 0.26,
        lfo2Waveform: 'triangle',
        lfo2Target: 'pan',
        bypass: false
      }
    }
  }
};

export const DEFAULT_SOUND_PRESET_ID = 'tibetanBowl';

/**
 * Normalizes preset with bidirectional migration:
 * Promotes legacy oscA.particles to top-level granular channel strip,
 * and maintains forward-compatible mirror back to oscA.particles.
 */
export function migratePreset(preset: SoundPreset): SoundPreset {
  if (!preset || !preset.channelStrip) return preset;
  const channelStrip: ChannelStripParams = { ...preset.channelStrip };
  if (channelStrip.oscA) {
    const oscA = {
      ...DEFAULT_OSC_A_PARAMS,
      ...channelStrip.oscA
    };
    if ((oscA.voiceMode as string) === 'particles') {
      oscA.voiceMode = 'drone';
    }
    if (oscA.wtPosition === undefined) {
      const morph = oscA.morphDepth ?? 0;
      oscA.wtPosition = Number(Math.max(0, Math.min(1.0, morph)).toFixed(3));
    } else if (oscA.wtPosition > 1.0 && oscA.wtPosition <= 23.0) {
      // Automatic normalization for legacy presets stored with 0..23 values
      oscA.wtPosition = Number((oscA.wtPosition / 23.0).toFixed(3));
    } else {
      oscA.wtPosition = Math.max(0, Math.min(1.0, oscA.wtPosition));
    }
    oscA.octave = Number.isFinite(oscA.octave) ? Math.max(-4, Math.min(4, Math.round(oscA.octave!))) : 0;
    oscA.semi = Number.isFinite(oscA.semi) ? Math.max(-12, Math.min(12, Math.round(oscA.semi!))) : 0;
    oscA.fine = Number.isFinite(oscA.fine) ? Math.max(-100, Math.min(100, Math.round(oscA.fine!))) : 0;
    oscA.warp = Number.isFinite(oscA.warp) ? Math.max(0, Math.min(1.0, oscA.warp!)) : 0.0;
    oscA.warpMode = oscA.warpMode ?? 'off';
    oscA.phase = Number.isFinite(oscA.phase) ? Math.max(0, Math.min(360, oscA.phase!)) : 0;
    oscA.phaseRand = Number.isFinite(oscA.phaseRand) ? Math.max(0, Math.min(1.0, oscA.phaseRand!)) : 1.0;
    oscA.pan = Number.isFinite(oscA.pan) ? Math.max(-1.0, Math.min(1.0, oscA.pan!)) : 0.0;
    oscA.chordMode = Boolean(oscA.chordMode);
    oscA.chordType = oscA.chordType ?? 'octave';
    oscA.unisonDetune = Number.isFinite(oscA.unisonDetune) ? Math.max(0, Math.min(1.0, oscA.unisonDetune!)) : 0.25;
    channelStrip.oscA = oscA;
  }
  if (!channelStrip.granular) {
    channelStrip.granular = {
      ...DEFAULT_GRANULAR_PARAMS,
      bypass: true
    };
  } else {
    const rawGran = { ...channelStrip.granular };
    if (rawGran.duration !== undefined) {
      const validDur = Number.isFinite(rawGran.duration) ? rawGran.duration : 0.245;
      const durSec = validDur > 15.0 ? validDur / 1000.0 : validDur;
      rawGran.duration = Number(Math.max(0.02, Math.min(10.0, durSec)).toFixed(3));
    }
    if (rawGran.position !== undefined) {
      const validPos = Number.isFinite(rawGran.position) ? rawGran.position : 0.25;
      rawGran.position = Math.max(0.0, Math.min(1.0, validPos));
    }
    if (rawGran.positionJitter !== undefined) {
      const validJitter = Number.isFinite(rawGran.positionJitter) ? rawGran.positionJitter : 0.0;
      rawGran.positionJitter = Math.max(0.0, Math.min(1.0, validJitter));
    }
    if (rawGran.reverseChance !== undefined) {
      const validRev = Number.isFinite(rawGran.reverseChance) ? rawGran.reverseChance : 0.0;
      rawGran.reverseChance = Math.max(0.0, Math.min(1.0, validRev));
    }
    if (rawGran.gain !== undefined) {
      const validGain = Number.isFinite(rawGran.gain) ? rawGran.gain : 0.75;
      rawGran.gain = Math.max(0.0, Math.min(1.0, validGain));
    }
    if (rawGran.rate !== undefined) {
      const validRate = Number.isFinite(rawGran.rate) ? rawGran.rate : 1.5;
      rawGran.rate = Math.max(0.1, Math.min(50.0, validRate));
    }
    if (rawGran.density !== undefined) {
      const validDen = Number.isFinite(rawGran.density) ? rawGran.density : 4;
      rawGran.density = Math.max(1, Math.min(32, Math.round(validDen)));
    }
    if (rawGran.sampleId === 'bambooFlute') {
      rawGran.sampleId = 'meditationBell';
    }
    channelStrip.granular = {
      ...DEFAULT_GRANULAR_PARAMS,
      ...rawGran
    };
  }
  if (!channelStrip.ambient) {
    channelStrip.ambient = {
      ...DEFAULT_AMBIENT_PARAMS,
      bypass: false
    };
  } else {
    const rawAmb = { ...channelStrip.ambient };
    const mappedSampleId = (rawAmb.sampleId && LEGACY_AMBIENT_MAP[rawAmb.sampleId]) || rawAmb.sampleId || DEFAULT_AMBIENT_PARAMS.sampleId;
    channelStrip.ambient = {
      ...DEFAULT_AMBIENT_PARAMS,
      ...rawAmb,
      sampleId: mappedSampleId,
      gain: Number.isFinite(rawAmb.gain) ? Math.max(0, Math.min(1.0, rawAmb.gain)) : DEFAULT_AMBIENT_PARAMS.gain,
      tone: Number.isFinite(rawAmb.tone) ? Math.max(0, Math.min(1.0, rawAmb.tone)) : DEFAULT_AMBIENT_PARAMS.tone,
      breathSync: Number.isFinite(rawAmb.breathSync) ? Math.max(0, Math.min(1.0, rawAmb.breathSync)) : DEFAULT_AMBIENT_PARAMS.breathSync,
      width: Number.isFinite(rawAmb.width) ? Math.max(0, Math.min(1.0, rawAmb.width)) : DEFAULT_AMBIENT_PARAMS.width,
      bypass: rawAmb.bypass ?? false
    };
  }
  const rawEq = preset.effects?.eq;
  const effects: EffectsChainParams = {
    ...preset.effects,
    gain: preset.effects?.gain ? { ...preset.effects.gain } : { value: 0.0, softClip: true, bypass: false },
    eq: rawEq ? {
      ...DEFAULT_EQ_PARAMS,
      ...rawEq,
      low: { ...DEFAULT_EQ_PARAMS.low, ...(rawEq.low || {}) },
      midLow: { ...DEFAULT_EQ_PARAMS.midLow, ...(rawEq.midLow || {}) },
      midHigh: { ...DEFAULT_EQ_PARAMS.midHigh, ...(rawEq.midHigh || {}) },
      high: { ...DEFAULT_EQ_PARAMS.high, ...(rawEq.high || {}) },
      bypass: rawEq.bypass ?? false
    } : { ...DEFAULT_EQ_PARAMS }
  };
  const migratedEffects: EffectsChainParams = {
    ...effects,
    sourceRoutes: {
      ...DEFAULT_SOURCE_ROUTES,
      ...(preset.effects?.sourceRoutes || {})
    },
    laneAOrder: preset.effects?.laneAOrder ? [...preset.effects.laneAOrder] : [...DEFAULT_LANE_A_ORDER],
    laneBOrder: preset.effects?.laneBOrder ? [...preset.effects.laneBOrder] : [...DEFAULT_LANE_B_ORDER]
  };
  return { ...preset, channelStrip, effects: migratedEffects };
}

/**
 * Returns the 5 core factory presets (preserving 100% test compatibility)
 */
export function getSoundPresetList(): SoundPreset[] {
  return Object.values(SOUND_PRESETS).map(migratePreset);
}

/**
 * Returns the 7 extended sound therapy presets
 */
export function getExtendedSoundPresetList(): SoundPreset[] {
  return Object.values(EXTENDED_SOUND_PRESETS).map(migratePreset);
}

/**
 * Returns all default factory sound presets (all 12 curated distinct presets: 5 core + 7 expansion)
 */
export function getAllFactoryPresets(): SoundPreset[] {
  return [...Object.values(SOUND_PRESETS), ...Object.values(EXTENDED_SOUND_PRESETS)].map(migratePreset);
}

export function getSoundPresetById(id: string): SoundPreset {
  const hasProp = (obj: Record<string, SoundPreset>, key: string) =>
    typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
  const p = (hasProp(SOUND_PRESETS, id) ? SOUND_PRESETS[id] : undefined)
    || (hasProp(EXTENDED_SOUND_PRESETS, id) ? EXTENDED_SOUND_PRESETS[id] : undefined)
    || SOUND_PRESETS[DEFAULT_SOUND_PRESET_ID];
  return migratePreset(p);
}
