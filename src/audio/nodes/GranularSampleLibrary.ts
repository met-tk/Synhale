/**
 * Synhale 2 - Granular Acoustic Sample Library & Loader
 * 
 * Curated acoustic sound therapy & physical modeling samples for Phase Plant-grade granular synthesis:
 * Categories:
 * - Acoustic: Handpan (手碟), Kalimba (卡林巴), Cello Pad (大提琴), Zen Harp (空灵竖琴)
 * - Temple: Bodhi Singing Bowl (西藏颂钵), Tibetan Gong (西藏大锣), Tingsha Bells (引磬双铃), Zen Woodblock (温润木磬), Deep Sub Bowl (暖腹深钵)
 * - Nature: Zen Water Drop (山泉水滴), Wind Chimes (空谷风铃), Ocean Tide (深海潮汐), Forest Rain (森林细雨), Bamboo Flute (禅意竹笛)
 * - Synthetic: Shimmer Cloud (流光云垫), Modular Sub Drone (暗黑低音), Celestial Wavetable (梵天波表)
 * - Custom: User drag-and-drop imported audio files
 * 
 * Strict industrial aesthetics: zero emoji, zero latency, 100% offline procedural resilience.
 */

export interface GranularSamplePreset {
  id: string;
  name: string;
  enName: string;
  category: 'Acoustic' | 'Temple' | 'Nature' | 'Synthetic' | 'Custom';
  url?: string;
  baseFreq: number;
  rootNote: string;
  description: string;
  duration?: number;
}

export const GRANULAR_SAMPLE_PRESETS: Record<string, GranularSamplePreset> = {
  // --- Acoustic Category ---
  handpan: {
    id: 'handpan',
    name: '手碟原声',
    enName: 'Handpan Ding D3',
    category: 'Acoustic',
    url: '/audio/granular/handpan_hang_drum.mp3',
    baseFreq: 146.83, // D3 Fundamental
    rootNote: 'D 3 +00',
    description: '手工手碟纯净基音与五重谐波共振，金属腔体温润回响',
    duration: 3.6
  },
  kalimba: {
    id: 'kalimba',
    name: '卡林巴琴',
    enName: 'Kalimba Pluck C4',
    category: 'Acoustic',
    url: '/audio/granular/kalimba_sample.mp3',
    baseFreq: 261.63, // C4
    rootNote: 'C 4 +00',
    description: '清脆金属拨片击弦瞬间与空心木盒温暖箱体共振',
    duration: 3.5
  },
  celloPad: {
    id: 'celloPad',
    name: '大提琴弦',
    enName: 'Cello Bowed Pad C3',
    category: 'Acoustic',
    url: '/audio/granular/cello_bowed_c3.mp3',
    baseFreq: 130.81, // C3
    rootNote: 'C 3 +00',
    description: '温润的大提琴松香运弓擦弦声与宽阔低音微颤音',
    duration: 3.2
  },
  zenHarp: {
    id: 'zenHarp',
    name: '空灵竖琴',
    enName: 'Zen Harp Pluck E4',
    category: 'Acoustic',
    url: '/audio/granular/harp.mp3',
    baseFreq: 329.63, // E4
    rootNote: 'E 4 +00',
    description: '空灵飘渺的尼龙竖琴单音拨奏与长尾空气谐波',
    duration: 3.2
  },

  // --- Temple Category ---
  singingBowl: {
    id: 'singingBowl',
    name: '西藏颂钵',
    enName: 'Bodhi Singing Bowl F#3',
    category: 'Temple',
    url: '/audio/granular/singing_bowl_strike.mp3',
    baseFreq: 184.0, // Sacred Bodhi F#3
    rootNote: 'F# 3 -12',
    description: '纯铜西藏颂钵实录，悠远持久的双耳拍频与古刹回响',
    duration: 4.5
  },
  tibetanGong: {
    id: 'tibetanGong',
    name: '西藏大锣',
    enName: 'Tibetan Ceremony Gong G2',
    category: 'Temple',
    url: '/audio/granular/tibetan_vibrant_gong.mp3',
    baseFreq: 98.0, // G2
    rootNote: 'G 2 +00',
    description: '仪式大铜锣深沉撞击与层层展开的厚重非谐波金属浪潮',
    duration: 4.5
  },
  tingshaBells: {
    id: 'tingshaBells',
    name: '引磬双铃',
    enName: 'Tingsha Brass Bells C6',
    category: 'Temple',
    url: '/audio/granular/meditation_bell.mp3',
    baseFreq: 1046.5, // C6
    rootNote: 'C 6 +00',
    description: '尼泊尔纯铜引磬轻碰，极高频双耳超长微澜延音',
    duration: 3.8
  },
  woodenTemple: {
    id: 'woodenTemple',
    name: '温润木磬',
    enName: 'Zen Temple Wood G3',
    category: 'Temple',
    url: '/audio/cues/woodenTemple.ogg',
    baseFreq: 196.0, // G3
    rootNote: 'G 3 +00',
    description: '禅意木磬实录与空心原木腔体共鸣',
    duration: 1.5
  },
  deepSubPing: {
    id: 'deepSubPing',
    name: '暖腹深钵',
    enName: 'Deep Sub Bowl D2',
    category: 'Temple',
    url: '/audio/cues/deepSubPing.ogg',
    baseFreq: 73.42, // D2
    rootNote: 'D 2 +00',
    description: '极低频 73.4Hz 暖腹藏钵次低音共鸣，深沉安定',
    duration: 2.4
  },

  // --- Nature Category ---
  zenWaterDrop: {
    id: 'zenWaterDrop',
    name: '山泉水滴',
    enName: 'Mountain Water Droplet A4',
    category: 'Nature',
    url: '/audio/cues/zenWaterDrop.ogg',
    baseFreq: 432.0, // A4 Sacred Natural
    rootNote: 'A 4 +00',
    description: '山涧灵动大水滴入水波微澜，圆润水珠张力',
    duration: 1.2
  },
  crystalHarmonics: {
    id: 'crystalHarmonics',
    name: '空谷风铃',
    enName: 'Crystal Wind Chimes A5',
    category: 'Nature',
    url: '/audio/cues/crystalHarmonics.ogg',
    baseFreq: 880.0, // A5
    rootNote: 'A 5 +00',
    description: '空谷山风拂动高阶金属谐波风铃，晶莹剔透',
    duration: 2.8
  },
  oceanTide: {
    id: 'oceanTide',
    name: '深海潮汐',
    enName: 'Binaural Ocean Tide',
    category: 'Nature',
    url: '/audio/granular/ocean_tide.mp3',
    baseFreq: 110.0, // A2 Anchor
    rootNote: 'A 2 +00',
    description: '双耳深海涌动潮浪与粉红噪声起伏呼吸声场',
    duration: 4.0
  },
  forestRain: {
    id: 'forestRain',
    name: '森林细雨',
    enName: 'Forest Rain Canopy',
    category: 'Nature',
    url: '/audio/granular/forest_rain.mp3',
    baseFreq: 330.0,
    rootNote: 'E 4 +00',
    description: '雨滴洒落林间叶片与微湿泥土的有机自然微粒',
    duration: 4.0
  },
  meditationBell: {
    id: 'meditationBell',
    name: '空灵磬钟',
    enName: 'Meditation Brass Bell',
    category: 'Acoustic',
    url: '/audio/granular/meditation_bell.mp3',
    baseFreq: 432.0,
    rootNote: 'A 4 +00',
    description: '真实寺院铜磬清澈敲击，悠远长尾双耳泛音与空灵回响',
    duration: 3.5
  },

  // --- Synthetic Category ---
  shimmerCloud: {
    id: 'shimmerCloud',
    name: '流光云垫',
    enName: 'Shimmering Astral Cloud',
    category: 'Synthetic',
    url: '/audio/granular/shimmer_drone.mp3',
    baseFreq: 216.0,
    rootNote: 'A 3 +00',
    description: '八度级联音高漂移云雾，闪烁弥漫的高维声场',
    duration: 5.0
  },
  modularSubDrone: {
    id: 'modularSubDrone',
    name: '暗黑低音',
    enName: 'Modular Saturated Sub C2',
    category: 'Synthetic',
    url: '/audio/granular/modular_sub.mp3',
    baseFreq: 65.41, // C2
    rootNote: 'C 2 +00',
    description: '模拟磁带饱和微抖动次低音，厚实温暖',
    duration: 4.0
  },
  celestialWavetable: {
    id: 'celestialWavetable',
    name: '梵天波表',
    enName: 'Celestial Wavetable',
    category: 'Synthetic',
    url: '/audio/granular/sitar.mp3',
    baseFreq: 216.0,
    rootNote: 'A 3 +00',
    description: '古典印度西塔琴共鸣弦谐波泛音',
    duration: 3.0
  },
  celesta: {
    id: 'celesta',
    name: '仙境钢琴',
    enName: 'Celestial Celesta C5',
    category: 'Acoustic',
    url: '/audio/granular/piano.mp3',
    baseFreq: 523.25,
    rootNote: 'C 5 +00',
    description: '晶莹通透的原声钢琴延音，纯净轻柔',
    duration: 3.2
  },
  crystalHarp: {
    id: 'crystalHarp',
    name: '水晶竖琴',
    enName: 'Crystal Glass Harp F4',
    category: 'Acoustic',
    url: '/audio/granular/harp.mp3',
    baseFreq: 349.23,
    rootNote: 'F 4 +00',
    description: '空灵竖琴拨弦与微泛音共鸣',
    duration: 3.6
  },
  tibetanChimes: {
    id: 'tibetanChimes',
    name: '金刚风铃',
    enName: 'Tibetan Temple Chimes D5',
    category: 'Temple',
    url: '/audio/granular/wind_chimes.mp3',
    baseFreq: 587.33,
    rootNote: 'D 5 +00',
    description: '高原寺院铜质风铃随风微荡，清脆长尾双耳泛音与空灵回响',
    duration: 3.8
  },
  windBreeze: {
    id: 'windBreeze',
    name: '松涛微风',
    enName: 'Pine Forest Wind Breath',
    category: 'Nature',
    url: '/audio/granular/wind_breeze.mp3',
    baseFreq: 220.0,
    rootNote: 'A 3 +00',
    description: '微风拂过高山松林枝叶的有机起伏气流，轻柔深呼吸感',
    duration: 4.2
  },
  singingForest: {
    id: 'singingForest',
    name: '林海幽谷',
    enName: 'Singing Forest Canopy',
    category: 'Nature',
    url: '/audio/granular/singing_forest.mp3',
    baseFreq: 261.63,
    rootNote: 'C 4 +00',
    description: '静谧林海晨雾与远方空谷自然微声，深层舒缓中枢神经',
    duration: 4.0
  },
  whaleSong: {
    id: 'whaleSong',
    name: '深海巨鲸',
    enName: 'Humpback Whale Song',
    category: 'Nature',
    url: '/audio/granular/whale_song.mp3',
    baseFreq: 72.0,
    rootNote: 'D 2 +00',
    description: '深海座头鲸幽远低鸣与空灵水下回响',
    duration: 4.5
  }
};

export const LEGACY_SAMPLE_ALIASES: Record<string, string> = {
  oceanWaves: 'oceanTide',
  rainDrops: 'forestRain',
  monasteryChant: 'singingBowl',
  bambooFlute: 'meditationBell',
  templeGong: 'tibetanGong',
  tibetanSingingBowl: 'singingBowl'
};

export function resolveSampleId(id: string): string {
  return LEGACY_SAMPLE_ALIASES[id] || id;
}

export let GRANULAR_SAMPLE_LIST: GranularSamplePreset[] = Object.values(GRANULAR_SAMPLE_PRESETS);

// Cache decoded AudioBuffers per BaseAudioContext
const sampleBufferCache = new Map<string, AudioBuffer>();
const reversedBufferCache = new WeakMap<AudioBuffer, AudioBuffer>();
const peakCache = new Map<string, Float32Array>();

/**
 * 自动识别并返回采样的物理真实时长（秒）
 * 优先读取 AudioBuffer 真实解码时长，自适应支持内置与未来用户拖入的任意自定义音频
 */
export function getSampleDuration(sampleId: string): number | null {
  const resolved = resolveSampleId(sampleId);
  for (const [key, buf] of sampleBufferCache.entries()) {
    if ((key.startsWith(resolved) || key.startsWith(sampleId)) && buf.duration > 0) {
      return buf.duration;
    }
  }
  if (GRANULAR_SAMPLE_PRESETS[resolved]?.duration) {
    return GRANULAR_SAMPLE_PRESETS[resolved].duration!;
  }
  return null;
}

/**
 * Creates or retrieves a mirrored reverse copy of an AudioBuffer
 */
export function getReversedAudioBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  if (reversedBufferCache.has(buffer)) {
    return reversedBufferCache.get(buffer)!;
  }

  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const rev = ctx.createBuffer(numChannels, length, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = rev.getChannelData(c);
    for (let i = 0; i < length; i++) {
      dest[i] = src[length - 1 - i];
    }
  }

  reversedBufferCache.set(buffer, rev);
  return rev;
}

/**
 * Extract normalized waveform peak contour for 60fps UI visualizer
 */
export function getSampleWaveformPeaks(buffer: AudioBuffer, numPoints = 160): Float32Array {
  const peaks = new Float32Array(numPoints);
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / numPoints));

  for (let i = 0; i < numPoints; i++) {
    let max = 0;
    const start = i * step;
    const end = Math.min(start + step, data.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(data[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = Math.max(0.02, Math.min(1.0, max));
  }

  return peaks;
}

/**
 * Registers a user custom audio sample from drag & drop or file upload
 */
export function registerCustomAudioSample(
  ctx: BaseAudioContext,
  fileName: string,
  buffer: AudioBuffer
): GranularSamplePreset {
  const customId = `custom_${Date.now()}`;
  const cleanName = fileName.replace(/\.[^/.]+$/, '').slice(0, 16);
  
  const preset: GranularSamplePreset = {
    id: customId,
    name: cleanName || '自定义音频',
    enName: cleanName || 'Custom Sample',
    category: 'Custom',
    baseFreq: 261.63, // Default C4 anchor
    rootNote: 'C 4 +00',
    description: `用户本地导入音频: ${fileName} (${buffer.duration.toFixed(2)}s)`,
    duration: buffer.duration
  };

  GRANULAR_SAMPLE_PRESETS[customId] = preset;
  GRANULAR_SAMPLE_LIST = Object.values(GRANULAR_SAMPLE_PRESETS);

  const cacheKey = `${customId}_${ctx.sampleRate}`;
  sampleBufferCache.set(cacheKey, buffer);
  peakCache.set(customId, getSampleWaveformPeaks(buffer));
  getReversedAudioBuffer(ctx, buffer);

  return preset;
}

/**
 * Asynchronously loads and decodes sample buffer with defensive graceful fallbacks.
 * 100% Real acoustic audio recordings, strictly zero code-generated sound materials.
 */
export async function loadGranularSampleBuffer(
  ctx: BaseAudioContext,
  sampleId: string
): Promise<AudioBuffer | null> {
  const resolvedId = resolveSampleId(sampleId);
  const cacheKey = `${resolvedId}_${ctx.sampleRate}`;
  if (sampleBufferCache.has(cacheKey)) {
    return sampleBufferCache.get(cacheKey)!;
  }

  // Check if there is an external URL to attempt fetching
  const preset = GRANULAR_SAMPLE_PRESETS[resolvedId];
  if (preset?.url && typeof fetch !== 'undefined') {
    try {
      const urlToFetch = preset.url.startsWith('/') && !preset.url.startsWith('//')
        ? '.' + preset.url
        : preset.url;
      let res = await fetch(urlToFetch).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(preset.url).catch(() => null);
      }
      if (res && res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (typeof ctx.decodeAudioData === 'function') {
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          sampleBufferCache.set(cacheKey, decoded);
          peakCache.set(resolvedId, getSampleWaveformPeaks(decoded));
          if (sampleId !== resolvedId) {
            peakCache.set(sampleId, peakCache.get(resolvedId)!);
          }
          getReversedAudioBuffer(ctx, decoded);
          return decoded;
        }
      }
    } catch {
      // Fall through to silent buffer
    }
  }

  // Pure silent buffer fallback: strictly zero procedural noise / synthesized sound
  const silentBuffer = ctx.createBuffer(
    2,
    Math.max(128, Math.floor((ctx.sampleRate || 44100) * (preset?.duration || 2.0))),
    ctx.sampleRate || 44100
  );
  sampleBufferCache.set(cacheKey, silentBuffer);
  peakCache.set(resolvedId, getSampleWaveformPeaks(silentBuffer));
  if (sampleId !== resolvedId) {
    peakCache.set(sampleId, peakCache.get(resolvedId)!);
  }
  getReversedAudioBuffer(ctx, silentBuffer);
  return silentBuffer;
}

/**
 * Synchronously retrieves cached peak contour or returns an acoustic silhouette
 */
export function getCachedSamplePeaks(sampleId: string, numPoints = 160): Float32Array {
  const resolvedId = resolveSampleId(sampleId);
  if (peakCache.has(resolvedId)) {
    return peakCache.get(resolvedId)!;
  }
  if (peakCache.has(sampleId)) {
    return peakCache.get(sampleId)!;
  }

  // Deterministic acoustic envelope curve for initial rendering
  const peaks = new Float32Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const env = Math.exp(-t * 2.5) * (0.8 + 0.2 * Math.sin(t * 30));
    peaks[i] = Math.max(0.04, Math.min(0.98, env));
  }
  return peaks;
}
