export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peak' | 'ladder';
export type BreathStage = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';
export type NoiseType = 'pink' | 'white' | 'brown' | 'violet';
export type VoiceMode = 'drone' | 'particles' | 'arp';

export interface ParticleParams {
  rate: number;         // 0.1..50.0 Hz (Particle generation / note trigger rate)
  density: number;      // 1..32 (Max concurrent particle voices)
  octaveRange: number;  // 1..4 (Harmonic pitch range span)
  scale: 'pentatonic' | 'dorian' | 'lydian' | 'solfeggio' | 'minor';
  randomPan: number;    // 0..1 (Stereo scatter width)
  duration: number;     // 0.05..4.0 s (Nominal note duration)
  probability: number;  // 0.1..1.0 (Trigger chance per cycle)
  spray?: number;       // 1..4 (Grains emitted per burst trigger)
  pitchJitter?: number; // 0..50 cents (Microtonal analog wander / detune dispersion)
  wavetableJitter?: number; // 0..8 slices (Harmonic wavetable slice scatter)
  grainShape?: 'gaussian' | 'percussive' | 'smooth'; // Micro-grain envelope window curve
}

export const DEFAULT_PARTICLE_PARAMS: ParticleParams = {
  rate: 1.5,
  density: 4,
  octaveRange: 2,
  scale: 'pentatonic',
  randomPan: 0.6,
  duration: 1.2,
  probability: 0.85,
  spray: 1,
  pitchJitter: 12,
  wavetableJitter: 2,
  grainShape: 'smooth'
};

/**
 * Standard Audio Source Generator Node (Wavetable OSC, Granular, Noise, Sampler)
 */
export interface AudioSourceNode {
  readonly id: string;
  readonly outputNode: AudioNode;
  start(when?: number): void;
  stop(when?: number): void;
  purge?(): void;
  restore?(): void;
  dispose(): void;
  setParams(params: any): void;
  getParams(): any;
}

/**
 * Standard Audio Effect Processor Node (Preamp, Drive, Filter, Delay, Reverb)
 */
export interface AudioEffectNode {
  readonly id: string;
  readonly inputNode: AudioNode;
  readonly outputNode: AudioNode;
  purge?(): void;
  restore?(): void;
  dispose(): void;
  setParams(params: any): void;
  getParams(): any;
  connect(destination: AudioNode): void;
  disconnect(): void;
}

export type GrainDirection = 'forward' | 'reverse' | 'pingpong';
export type GrainWindowShape = 'gaussian' | 'trapezoid' | 'hann' | 'smooth' | 'triangle' | 'sine';

export interface GrainEnvelopeConfig {
  attack?: number;   // 0..1 (fraction of duration)
  hold?: number;     // 0..1 (fraction of duration)
  release?: number;  // 0..1 (fraction of duration)
  shape?: GrainWindowShape;
}

export interface GranularParams extends ParticleParams {
  gain?: number;        // 0..1 (Channel output volume)
  pan?: number;         // -1..+1 (Center stereo balance)
  bypass?: boolean;
  baseFreq?: number;    // Fundamental frequency (Hz)
  wavetableIndex?: number; // Base wavetable slice (0..23)
  mode?: 'ambient' | 'arp' | 'burst';

  // Phase Plant Mother Physical Parameters (Upper Row)
  sampleId?: string;           // Built-in acoustic sample / wavetable ID
  octave?: number;             // -4..+4 coarse octave shift (default 0)
  level?: number;              // 0..1 (Base grain level, default 1.0)
  semi?: number;               // -24..+24 semitones (default 0)
  cent?: number;               // -100..+100 cents (default 0)
  harmonic?: number;           // 0.25..8.0 multiplier (default 1.0)
  shift?: number;              // -200..+200 Hz frequency shifter offset (default 0)
  keyTrack?: number;           // 0..1 key / root pitch tracking ratio (default 1.0)
  phase?: number;              // 0..360 degrees initial phase offset (default 0)
  phaseJitter?: number;        // 0..180 degrees random phase dispersion (default 0)
  direction?: GrainDirection;  // 'forward' | 'reverse' | 'pingpong' (default 'forward')

  // Phase Plant Grain Wander & Spatial Parameters (Lower Row)
  position?: number;           // 0..1 sample playhead position (default 0.25)
  positionJitter?: number;     // 0..1 timing / position spray wander (default 0.0)
  rangeStart?: number;         // 0..1 sample crop start boundary (default 0.0)
  rangeEnd?: number;           // 0..1 sample crop end boundary (default 1.0)
  timingJitter?: number;       // 0..1 timing trigger jitter (default 0.35)
  levelJitter?: number;        // 0..1 random level dispersion (default 0.0)
  panJitter?: number;          // 0..1 random stereo pan dispersion (default 0.0)
  reverseChance?: number;      // 0..1 probability of reverse grain (default 0.12)
  sync?: boolean;              // Free Hz vs Tempo Sync alignment (default false)
  syncRate?: string;           // '1/64' | '1/32' | '1/16' | '1/8' | '1/4' (default '1/16')
  bpm?: number;                // Beats per minute for tempo sync (default 120)
  grainEnvelope?: GrainEnvelopeConfig;
}

export const DEFAULT_GRANULAR_PARAMS: GranularParams = {
  ...DEFAULT_PARTICLE_PARAMS,
  gain: 0.75,
  pan: 0.0,
  randomPan: 1.0,
  pitchJitter: 12,
  bypass: false,
  baseFreq: 216,
  wavetableIndex: 0,
  mode: 'ambient',

  // Phase Plant defaults according to exact user calibration
  sampleId: 'handpan',
  octave: 0,
  level: 1.0,
  semi: 0,
  cent: 0,
  harmonic: 1.0,
  shift: 0,
  keyTrack: 1.0,
  phase: 0,
  phaseJitter: 0,
  direction: 'forward',

  position: 0.25,
  positionJitter: 0.0,
  rangeStart: 0.0,
  rangeEnd: 1.0,
  timingJitter: 0.35,
  levelJitter: 0.0,
  panJitter: 0.0,
  reverseChance: 0.12,
  sync: false,
  syncRate: '1/16',
  bpm: 120,
  grainEnvelope: {
    attack: 0.10,
    hold: 0.45,
    release: 0.45,
    shape: 'trapezoid'
  }
};

export type WarpMode = 'off' | 'pwm' | 'sync' | 'bend' | 'mirror';

export type ChordType =
  | 'octave'
  | 'fifth'
  | 'major'
  | 'minor'
  | 'sus4'
  | 'dom7'
  | 'maj7'
  | 'min7'
  | 'sacred';

export const CHORD_INTERVALS: Record<ChordType, number[]> = {
  octave: [0, 12, 24],
  fifth: [0, 7, 12],
  major: [0, 4, 7, 12],
  minor: [0, 3, 7, 12],
  sus4: [0, 5, 7, 12],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sacred: [0, 7, 14, 21]
};

export interface OscAParams {
  wavetableIndex: number; // 0..7 (Discrete multi-frame wavetable collection index)
  wtPosition?: number;    // 0..1 (Continuous internal wavetable position)
  detune: number;         // cents: -100..+100 (Fine tune)
  harmonics: number;      // 0..1 (Dynamic harmonic lowpass damping)
  gain: number;           // 0..1 (Channel output level)
  bypass: boolean;
  baseFreq?: number;      // Fundamental frequency (Hz)

  // Serum-Style Musical Pitch Tuning (十二平均律音程调谐)
  octave?: number;        // -4..+4 Octaves (default 0)
  semi?: number;          // -12..+12 Semitones (default 0)
  fine?: number;          // -100..+100 Cents (default 0)

  // Serum-Style Wavetable Warp Section (波表非线性塑形)
  warp?: number;          // 0..1 (Warp depth/intensity, default 0)
  warpMode?: WarpMode;    // 'off' | 'pwm' | 'sync' | 'bend' | 'mirror' (default 'off')

  // Serum-Style Phase & Dispersion (相位与随机去相干)
  phase?: number;         // 0..360 degrees (Initial trigger phase, default 0)
  phaseRand?: number;     // 0..1 (Phase randomization dispersion, default 1.0)

  // Stereo Pan Position (单轨立体声像)
  pan?: number;           // -1..+1 (L100%..R100%, default 0.0)

  // Dedicated Chord Mode (专属和弦模式)
  chordMode?: boolean;    // Enabled/Disabled (default false)
  chordType?: ChordType;  // 'octave' | 'fifth' | 'major' | 'minor' | 'sus4' | 'dom7' | 'maj7' | 'min7' | 'sacred'

  // Unison & Stereo Voicing (齐奏与立体声扩散)
  unison?: number;        // 0..1 (Unison blend level, default 0.35)
  unisonVoices?: number;  // 1..16 (Unison voices count, default 2)
  unisonDetune?: number;  // 0..1 (Unison spread detune amount, default 0.25)
  spread?: number;        // 0..1 (Stereo detune spread width, default 0.2)
  blend?: number;         // 0..1 (Unison blend UI alias, default 0.7. Mirrors unison semantics for UI layer.)

  // Acoustic Character & Legacy (温润模拟饱和与次低音基底)
  subGain?: number;       // 0..1 (Warm sub-harmonic octave foundation)
  warmth?: number;        // 0..1 (Analog warmth soft saturation)
  morphDepth?: number;    // @deprecated (Mapped to wtPosition for backward compatibility)
  voiceMode?: VoiceMode;  // 'drone' | 'particles' | 'arp' (Maintained for backward compatibility)
  particles?: Partial<ParticleParams>;
}

export const DEFAULT_OSC_A_PARAMS: OscAParams = {
  wavetableIndex: 0,
  wtPosition: 0.0,
  detune: 0,
  harmonics: 0.85,
  gain: 0.75,
  bypass: false,
  baseFreq: 216,
  octave: 0,
  semi: 0,
  fine: 0,
  warp: 0.0,
  warpMode: 'off',
  phase: 0,
  phaseRand: 1.0,
  pan: 0.0,
  chordMode: false,
  chordType: 'octave',
  unison: 0.35,
  unisonVoices: 2,
  unisonDetune: 0.25,
  subGain: 0.15,
  warmth: 0.15,
  spread: 0.25,
  morphDepth: 0.0,
  voiceMode: 'drone'
};

export interface OscBParams {
  color: number;          // 0..1 (filter center frequency)
  friction: number;       // 0..1 (resonance / Q)
  gain: number;           // 0..1
  bypass: boolean;
  noiseType?: NoiseType;  // 'pink' | 'white' | 'brown' | 'violet'
  lowCut?: number;        // Hz: 20..1000 (HPF rumble clear)
  motion?: number;        // 0..1 (Dynamic airflow flutter)
  stereoWidth?: number;   // 0..1 (Stereo diffusion width)
}

export interface DroneParams {
  baseFreq: number;       // Hz (e.g. 54Hz for 432Hz tuning)
  pitchDrift: number;     // 0..1
  gain: number;           // 0..1
  bypass: boolean;
}

export type AmbientSoundscapeId =
  // Page 1 (0..9): 江海潮涌 (Ocean & Waves)
  | 'oceanTide'
  | 'lakeLapping'
  | 'underwaterReef'
  | 'rollingSwell'
  | 'pebbleBeach'
  | 'coastalBreaker'
  | 'tidalBasin'
  | 'calmHarbor'
  | 'deepSeaLow'
  | 'seaSpray'
  // Page 2 (10..19): 雨境雨幕 (Rain & Storms)
  | 'gentleRain'
  | 'heavyRain'
  | 'distantThunder'
  | 'roofRain'
  | 'gutterDrip'
  | 'forestDrizzle'
  | 'windowRain'
  | 'thunderShower'
  | 'mistPrecipitation'
  | 'summerShower'
  // Page 3 (20..29): 林泉飞瀑 (Streams & Cascades)
  | 'forestStream'
  | 'alpineWaterfall'
  | 'caveDroplets'
  | 'rockyBrook'
  | 'mountainCascade'
  | 'canyonRapid'
  | 'babblingBrook'
  | 'meltingCreek'
  | 'hotSpringBubble'
  | 'valleyRiver'
  // Page 4 (30..39): 风啸寒原 (Wind & Blizzard)
  | 'canopyBreeze'
  | 'autumnGale'
  | 'arcticBlizzard'
  | 'bambooWhisper'
  | 'valleyBreeze'
  | 'desertDune'
  | 'mountainPineMist'
  | 'canyonEcho'
  | 'wheatFieldBreeze'
  | 'winterFrost'
  // Page 5 (40..49): 温暖地火 (Fire & Embers)
  | 'cozyFire'
  | 'campfire'
  | 'charcoalEmbers'
  | 'pineConeCrackle'
  | 'hearthBlaze'
  | 'forestBonfire'
  | 'peatFire'
  | 'dryTwigSnap'
  | 'leafEmber'
  | 'geothermalSteam'
  // Page 6 (50..59): 原野生态 (Forest & Biosphere)
  | 'summerCrickets'
  | 'cicadaSummer'
  | 'rainforestCanopy'
  | 'peatBogNight'
  | 'pineNeedleFall'
  | 'morningBirdsong'
  | 'frogPond'
  | 'forestInsects'
  | 'reedMarsh'
  | 'wildernessDawn'
  // Page 7 (60..69): 复合声景 I (Curated Mixes I)
  | 'mixDeepForest'
  | 'mixZenGarden'
  | 'mixCozyFireplace'
  | 'mixRainOnTent'
  | 'mixCoastalCalm'
  | 'mixRainyCafe'
  | 'mixSleepyStorm'
  | 'mixStudyLofi'
  | 'mixUnderwaterAbyss'
  | 'mixWhaleDive'
  // Page 8 (70..79): 复合声景 II (Curated Mixes II)
  | 'mixLakesideDawn'
  | 'mixNightGarden'
  | 'mixNordicWinter'
  | 'mixOceanFlight'
  | 'mixRainyTrain'
  | 'mixSakuraGarden'
  | 'mixDesertNight'
  | 'mixMidnightJungle'
  | 'mixMorningMeadow'
  | 'mixCabinRetreat'
  // Page 9 (80..89): 飞鸟游鲸 (Wildlife & Marine)
  | 'whaleSong'
  | 'dolphins'
  | 'birdsong'
  | 'nightingale'
  | 'owl'
  | 'cuckoo'
  | 'seagulls'
  | 'dawnChorus'
  | 'loonCalls'
  | 'parrots'
  // Page 10 (90..99): 原野伴生 (Animals & Insects)
  | 'catPurr'
  | 'crickets'
  | 'frogs'
  | 'cicadas'
  | 'bees'
  | 'wolf'
  | 'duck'
  | 'pigeons'
  | 'rooster'
  | 'sparrows'
  // Page 11 (100..109): 冥想器乐 (Meditation & Acoustic)
  | 'singingBowl'
  | 'tibetanBowl'
  | 'crystalBowl'
  | 'windChimes'
  | 'meditationBell'
  | 'harp'
  | 'flute'
  | 'piano'
  | 'guitar'
  | 'musicBox'
  // Page 12 (110..119): 城市生活 (Urban & Living)
  | 'coffeeShop'
  | 'train'
  | 'metro'
  | 'boat'
  | 'cityAmbiance'
  | 'clockTick'
  | 'fan'
  | 'typing'
  | 'whiteNoise'
  | 'pinkNoise'
  // Deprecated Legacy IDs (mapped automatically to natural equivalents)
  | 'templeChimes'
  | 'tibetanSingingBowl'
  | 'crystalChimes'
  | 'templeBell'
  | 'deepOmDrone'
  | 'auroraEther'
  | 'zenPondShishi'
  | 'gongBath'
  | 'rainStick'
  | 'tingshaChimes'
  | 'shamanicDrum'
  | 'monasteryChant'
  | 'deepGeothermal'
  | 'ancientGlacier'
  | 'stellarDust';

export interface AmbientSoundscapeParams {
  sampleId: AmbientSoundscapeId;
  gain: number;         // 0..1 (default 0.50)
  tone: number;         // 0..1 (default 0.50, lowpass/tilt filter shaping)
  breathSync: number;   // 0..1 (default 0.35, depth of breath macro dynamic swell)
  width: number;        // 0..1 (default 0.65, stereo width spread)
  bypass: boolean;      // default false
}

export const DEFAULT_AMBIENT_PARAMS: AmbientSoundscapeParams = {
  sampleId: 'oceanTide',
  gain: 0.50,
  tone: 0.50,
  breathSync: 0.35,
  width: 0.65,
  bypass: false
};

export interface ChannelStripParams {
  oscA: OscAParams;
  oscB: OscBParams;
  drone: DroneParams;
  granular?: GranularParams;
  ambient?: AmbientSoundscapeParams;
  instances?: Record<string, any>;
  sourceOrder?: string[];
}

export type LfoShape = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'random';

export type LfoSyncMode = 'free' | 'bpm' | 'breath';

export type LfoSyncDivision =
  | '1/16'
  | '1/8'
  | '1/4'
  | '1/2'
  | '1/1'
  | '2/1'
  | 'breathCycle';

export interface LfoSyncConfig {
  mode?: LfoSyncMode;
  bpm?: number;
  division?: LfoSyncDivision;
  totalCycleDuration?: number; // Breath cycle duration in seconds for phase-locking
}

export interface Lfo1Params {
  rate: number;       // 0.05..10.0 Hz (Organic slow drift to natural vibrato)
  depth: number;      // 0..1 (0..25 cents pitch modulation)
  shape?: LfoShape;
  polarity?: 'bipolar' | 'unipolar';
  bypass: boolean;
  sync?: LfoSyncConfig;
}

export interface Lfo2Params {
  rate: number;       // 0.02..5.0 Hz (Slow breathing swell)
  depth: number;      // 0..1 (Global LFO 2 intensity)
  filterMod?: number; // 0..1 (Legacy cutoff swell parameter)
  panMod?: number;    // 0..1 (Legacy stereo auto-pan parameter)
  tremoloMod?: number;// 0..1 (Legacy amplitude swell parameter)
  shape?: LfoShape;
  polarity?: 'bipolar' | 'unipolar';
  bypass: boolean;
  sync?: LfoSyncConfig;
}

export interface AdsrParams {
  attack: number;   // 0.01..10.0 s (Time to reach peak amplitude)
  decay: number;    // 0.01..10.0 s (Time to decay from peak to sustain level)
  sustain: number;  // 0.0..1.0 (Sustain amplitude ratio during hold)
  release: number;  // 0.01..15.0 s (Time to fade out to silence on release)
  bypass?: boolean;
}

export interface GainParams {
  value: number;       // -12..+24 dB (0 dB is unity gain 1.0)
  bypass: boolean;
  softClip?: boolean;  // Optional warm soft-clipping protection
}

export interface EqBandConfig {
  frequency: number; // Hz (20..20000)
  gain: number;      // dB (-18..+18)
  q: number;         // 0.1..10.0
}

export interface EqParams {
  low: EqBandConfig & { type: 'lowshelf' | 'highpass' };
  midLow: EqBandConfig;  // 432Hz Peaking sacred tuning band
  midHigh: EqBandConfig; // 2160Hz Peaking breath harmonic band
  high: EqBandConfig;    // 8000Hz Highshelf airy band
  bypass: boolean;
}

export const DEFAULT_EQ_PARAMS: EqParams = {
  low: {
    frequency: 80,
    gain: 0.0,
    q: 0.707,
    type: 'lowshelf'
  },
  midLow: {
    frequency: 432,
    gain: 0.0,
    q: 1.414
  },
  midHigh: {
    frequency: 2160,
    gain: 0.0,
    q: 1.414
  },
  high: {
    frequency: 8000,
    gain: 0.0,
    q: 0.707
  },
  bypass: false
};

export type LaneId = 'laneA' | 'laneB' | 'thru';

export type SoundSourceType = 'oscA' | 'granular' | 'oscB' | 'drone' | 'ambient';

export type SoundSourceId = SoundSourceType | (string & {});

export type SourceRouteMap = Record<string, LaneId>;

export const DEFAULT_SOURCE_ROUTES: SourceRouteMap = {
  oscA: 'laneA',
  granular: 'laneA',
  oscB: 'laneA',
  drone: 'laneA',
  ambient: 'laneA'
};

export const DEFAULT_LANE_A_ORDER: string[] = ['gain', 'drive', 'filter', 'eq', 'adsr', 'lfo', 'delay', 'reverb'];
export const DEFAULT_LANE_B_ORDER: string[] = [];

export interface EffectsChainParams {
  gain?: GainParams;
  eq?: EqParams;
  filter: {
    type: FilterType;
    cutoff: number;         // 20..20000 Hz
    resonance: number;      // 0.1..18
    bypass: boolean;
  };
  drive: {
    amount: number;         // 0..1
    tone: number;           // 0..1
    bypass: boolean;
  };
  delay: {
    time: number;           // 0.05..1.5 s
    feedback: number;       // 0..0.85
    damping: number;        // 500..12000 Hz
    mix: number;            // 0..1
    bypass: boolean;
  };
  reverb: {
    decayTime: number;      // 0.5..12.0 s
    damping: number;        // 0..1
    mix: number;            // 0..1
    bypass: boolean;
  };
  masterGain: number;       // 0..1
  masterPan?: number;       // -1.0..+1.0 (Center 0.0)
  busMix?: number;          // 0.0..1.0 (0.0: BUS A only, 0.5: Equal-Power Sum, 1.0: BUS B only)
  busLevelA?: number;       // 0.0..1.0 (BUS A Master Fader level, default 1.0)
  busLevelB?: number;       // 0.0..1.0 (BUS B Master Fader level, default 1.0)
  lfo1?: Lfo1Params;
  lfo2?: Lfo2Params;
  lfo?: {
    bypass?: boolean;
  };
  adsr?: AdsrParams;
  sourceRoutes?: SourceRouteMap;
  laneAOrder?: string[];
  laneBOrder?: string[];
  /**
   * Dedicated parameter snapshots per modular effect instance ID (e.g. 'filter_2', 'delay_2', 'gain_2').
   * Prevents parameter crosstalk between parallel lanes (BUS A vs BUS B).
   */
  instances?: Record<string, any>;
  [key: string]: any;
}

export const DEFAULT_GAIN_PARAMS: GainParams = {
  value: 0.0,
  bypass: false,
  softClip: true
};

export const DEFAULT_FILTER_PARAMS = {
  type: 'lowpass' as FilterType,
  cutoff: 2400,
  resonance: 1.0,
  bypass: false
};

export const DEFAULT_DRIVE_PARAMS = {
  amount: 0.15,
  tone: 0.5,
  bypass: false
};

export const DEFAULT_DELAY_PARAMS = {
  time: 0.35,
  feedback: 0.3,
  damping: 4000,
  mix: 0.25,
  bypass: false
};

export const DEFAULT_REVERB_PARAMS = {
  decayTime: 2.5,
  damping: 0.5,
  mix: 0.3,
  bypass: false
};

export const DEFAULT_ADSR_PARAMS: AdsrParams = {
  attack: 0.8,
  decay: 1.5,
  sustain: 0.75,
  release: 2.5,
  bypass: false
};

export const DEFAULT_LFO1_PARAMS: Lfo1Params = {
  rate: 0.15,
  depth: 0.25,
  shape: 'sine',
  polarity: 'bipolar',
  bypass: false
};

export const DEFAULT_LFO2_PARAMS: Lfo2Params = {
  rate: 0.08,
  depth: 0.4,
  filterMod: 0.35,
  panMod: 0.3,
  tremoloMod: 0.1,
  shape: 'sine',
  polarity: 'bipolar',
  bypass: false
};

export function getDefaultEffectParams(moduleType: EffectModuleType): any {
  switch (moduleType) {
    case 'gain': return { ...DEFAULT_GAIN_PARAMS };
    case 'drive': return { ...DEFAULT_DRIVE_PARAMS };
    case 'filter': return { ...DEFAULT_FILTER_PARAMS };
    case 'eq': return { ...DEFAULT_EQ_PARAMS };
    case 'delay': return { ...DEFAULT_DELAY_PARAMS };
    case 'reverb': return { ...DEFAULT_REVERB_PARAMS };
    case 'adsr': return { ...DEFAULT_ADSR_PARAMS };
    case 'lfo': return { bypass: false, lfo1: { ...DEFAULT_LFO1_PARAMS }, lfo2: { ...DEFAULT_LFO2_PARAMS } };
    default: return {};
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: NonNullable<T[P]> extends object ? DeepPartial<NonNullable<T[P]>> : T[P];
};

export interface AudioEngineApi {
  init(): Promise<void>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  executeZeroResidueHardCut(): void;
  updateBreathModulation(macroValue: number, stage: BreathStage, stageProgress: number): void;
  updateChannelStrip(params: DeepPartial<ChannelStripParams>): void;
  updateEffects(params: DeepPartial<EffectsChainParams>): void;
  setSourceRoute?(sourceId: SoundSourceId, lane: LaneId): void;
  reorderLaneEffects?(lane: 'laneA' | 'laneB', order: string[]): void;
  moveEffectBetweenLanes?(effectId: string, targetLane: 'laneA' | 'laneB'): void;
  addEffectToLane?(lane: 'laneA' | 'laneB', effectId: string, index?: number): void;
  removeEffectFromLane?(lane: 'laneA' | 'laneB', effectId: string): void;
  reorderEffects?(order: string[]): void;
  getEffectOrder?(): string[];
  addSoundSource?(sourceId: string, type: SoundSourceType, initialParams?: any, targetLane?: LaneId): void;
  removeSoundSource?(sourceId: string): void;
  dispose(): void;
}

export type EffectModuleType = 'filter' | 'drive' | 'gain' | 'eq' | 'adsr' | 'delay' | 'reverb' | 'lfo';

export interface EffectModuleRule {
  type: EffectModuleType;
  code: string;
  name: string;
  cnName: string;
  desc: string;
  maxInstancesPerLane: number;
  maxInstancesGlobal: number;
  isSingleton?: boolean;
}

export const EFFECT_MODULE_RULES: Record<EffectModuleType, EffectModuleRule> = {
  filter: {
    type: 'filter',
    code: 'FLT',
    name: 'Analog Filter',
    cnName: '模拟滤波器',
    desc: '12/24dB 多模式状态变量滤波',
    maxInstancesPerLane: 2,
    maxInstancesGlobal: 4
  },
  drive: {
    type: 'drive',
    code: 'DRV',
    name: 'Tape Saturation',
    cnName: '饱和染色',
    desc: '温润双曲正切模拟染色失真',
    maxInstancesPerLane: 1,
    maxInstancesGlobal: 2
  },
  gain: {
    type: 'gain',
    code: 'PRE',
    name: 'Preamp Gain',
    cnName: '前级增益',
    desc: '纯净电平增益与软削波保护',
    maxInstancesPerLane: 2,
    maxInstancesGlobal: 4
  },
  eq: {
    type: 'eq',
    code: 'EQ4',
    name: 'Parametric EQ',
    cnName: '四段均衡',
    desc: '低频/中低/中高/高频四段参量滤波',
    maxInstancesPerLane: 2,
    maxInstancesGlobal: 4
  },
  adsr: {
    type: 'adsr',
    code: 'ENV',
    name: 'Breath Envelope',
    cnName: '呼吸包络',
    desc: '基于呼吸周期的动态振幅塑形',
    maxInstancesPerLane: 1,
    maxInstancesGlobal: 2,
    isSingleton: false
  },
  delay: {
    type: 'delay',
    code: 'DLY',
    name: 'Ping-Pong Delay',
    cnName: '灵性延迟',
    desc: '立体声乒乓交替反馈空间延迟',
    maxInstancesPerLane: 2,
    maxInstancesGlobal: 4
  },
  reverb: {
    type: 'reverb',
    code: 'REV',
    name: 'Shimmer Reverb',
    cnName: '空间混响',
    desc: '卷积脉冲/算法漫反射空灵残响',
    maxInstancesPerLane: 1,
    maxInstancesGlobal: 2
  },
  lfo: {
    type: 'lfo',
    code: 'LFO',
    name: 'Dual LFO Modulation',
    cnName: '双低频调制器',
    desc: '双通道自由波形调制源与空间颤音',
    maxInstancesPerLane: 1,
    maxInstancesGlobal: 2
  }
};

export function getEffectModuleType(effectId: string): EffectModuleType {
  const base = effectId.replace(/_[0-9]+$/, '') as EffectModuleType;
  if (base in EFFECT_MODULE_RULES) return base;
  return 'gain';
}

export function validateAddEffectToLane(
  moduleType: EffectModuleType,
  targetLane: 'laneA' | 'laneB',
  laneAOrder: string[],
  laneBOrder: string[]
): { allowed: boolean; reason?: string } {
  const rule = EFFECT_MODULE_RULES[moduleType];
  if (!rule) return { allowed: false, reason: '未知模块' };

  const targetOrder = targetLane === 'laneA' ? laneAOrder : laneBOrder;
  const currentCountInLane = targetOrder.filter(id => getEffectModuleType(id) === moduleType).length;
  const totalCountGlobal = [...laneAOrder, ...laneBOrder].filter(id => getEffectModuleType(id) === moduleType).length;

  if (rule.isSingleton && totalCountGlobal >= 1) {
    return { allowed: false, reason: '全局唯一模块（已在轨）' };
  }
  if (currentCountInLane >= rule.maxInstancesPerLane) {
    return { allowed: false, reason: `该轨已达上限（最大 ${rule.maxInstancesPerLane} 个）` };
  }
  if (totalCountGlobal >= rule.maxInstancesGlobal) {
    return { allowed: false, reason: `全局已达上限（最大 ${rule.maxInstancesGlobal} 个）` };
  }
  return { allowed: true };
}

export function validateMoveEffectBetweenLanes(
  effectId: string,
  fromLane: 'laneA' | 'laneB',
  toLane: 'laneA' | 'laneB',
  laneAOrder: string[],
  laneBOrder: string[]
): { allowed: boolean; reason?: string } {
  if (fromLane === toLane) return { allowed: true };
  const moduleType = getEffectModuleType(effectId);
  const rule = EFFECT_MODULE_RULES[moduleType];
  if (!rule) return { allowed: false, reason: '未知模块' };

  const targetOrder = toLane === 'laneA' ? laneAOrder : laneBOrder;
  const currentCountInTarget = targetOrder.filter(id => getEffectModuleType(id) === moduleType).length;

  if (currentCountInTarget >= rule.maxInstancesPerLane) {
    return { allowed: false, reason: `目标轨已达此模块上限（最多 ${rule.maxInstancesPerLane} 个）` };
  }
  return { allowed: true };
}

export function generateNextEffectInstanceId(
  moduleType: EffectModuleType,
  allExistingIds: string[]
): string {
  if (!allExistingIds.includes(moduleType)) {
    return moduleType;
  }
  let index = 2;
  while (allExistingIds.includes(`${moduleType}_${index}`)) {
    index++;
  }
  return `${moduleType}_${index}`;
}

export function getSoundSourceType(sourceId: string): SoundSourceType {
  const base = sourceId.replace(/_[0-9]+$/, '') as SoundSourceType;
  if (['oscA', 'granular', 'oscB', 'drone', 'ambient'].includes(base)) return base;
  return 'oscA';
}

export function generateNextSourceInstanceId(
  sourceType: SoundSourceType,
  allExistingIds: string[]
): string {
  let index = 2;
  while (allExistingIds.includes(`${sourceType}_${index}`)) {
    index++;
  }
  return `${sourceType}_${index}`;
}


