/**
 * Synhale 2 - ScaleQuantizer (Therapeutic & Generative Scale System)
 * 
 * Generative musical quantizer providing harmonic scale mappings
 * for ambient, healing, and modular particle synthesis.
 * 
 * Features:
 * - Pentatonic (Eastern Zen, zero dissonance)
 * - Dorian (Deep mystical meditation)
 * - Lydian (Ethereal augmented 4th)
 * - Solfeggio (Sacred healing frequencies: 432Hz & 528Hz bases)
 * - Harmonic Minor (Contemplative twilight)
 * - Pure mathematical note frequency computation
 * - Strict zero-emoji compliance
 */

export type ScaleType = 'pentatonic' | 'dorian' | 'lydian' | 'solfeggio' | 'minor';

export interface ScaleDefinition {
  id: ScaleType;
  name: string;
  enName: string;
  intervals: number[]; // Semitone intervals within one octave
  description: string;
}

export const SCALES: Record<ScaleType, ScaleDefinition> = {
  pentatonic: {
    id: 'pentatonic',
    name: '五声音阶',
    enName: 'Pentatonic Zen',
    intervals: [0, 2, 4, 7, 9], // Major Pentatonic: 1, 2, 3, 5, 6
    description: '空灵纯净、东方禅意，任意音符叠加皆永不撞音的和谐调式'
  },
  dorian: {
    id: 'dorian',
    name: '多利亚调式',
    enName: 'Mystic Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10], // Dorian mode
    description: '深邃内敛的冥想调式，兼具小调的幽静与大六度的明澈'
  },
  lydian: {
    id: 'lydian',
    name: '利底亚调式',
    enName: 'Ethereal Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11], // Lydian mode (augmented 4th)
    description: '升四度带来的漂浮感与超脱感，宛若极光与星尘流转'
  },
  solfeggio: {
    id: 'solfeggio',
    name: '索尔菲吉奥疗愈',
    enName: 'Solfeggio 432/528',
    intervals: [0, 3, 5, 7, 10, 12], // Healing harmonic series
    description: '基于 432Hz 自然谐振与 528Hz DNA 转化频率的谐波共振'
  },
  minor: {
    id: 'minor',
    name: '自然小调',
    enName: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: '宁静沉思、夜色幽深的心灵归宿'
  }
};

export const SCALE_LIST: ScaleDefinition[] = Object.values(SCALES);

/**
 * Quantizes a semitone offset to the nearest interval in the target scale.
 */
export function quantizeToScale(semitoneOffset: number, scaleType: ScaleType): number {
  const scale = SCALES[scaleType] || SCALES.pentatonic;
  const intervals = scale.intervals;
  const safeOffset = Number.isFinite(semitoneOffset) ? Math.round(semitoneOffset) : 0;
  const octave = Math.floor(safeOffset / 12);
  const noteInOctave = ((safeOffset % 12) + 12) % 12;

  // Find nearest interval in octave
  let nearest = intervals[0];
  let minDiff = 999;
  for (const interval of intervals) {
    const diff = Math.abs(interval - noteInOctave);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = interval;
    }
  }

  return octave * 12 + nearest;
}

/**
 * Computes frequency in Hz from a base frequency, scale, and degree index.
 */
export function getScaleFrequency(baseFreq: number, scaleType: ScaleType, degreeIndex: number): number {
  const scale = SCALES[scaleType] || SCALES.pentatonic;
  const intervals = scale.intervals;
  const scaleLen = Math.max(1, intervals.length);

  const safeBaseFreq = Number.isFinite(baseFreq) && baseFreq > 0 ? baseFreq : 432;
  const safeDegreeIndex = Number.isFinite(degreeIndex) ? Math.round(degreeIndex) : 0;

  const octave = Math.floor(safeDegreeIndex / scaleLen);
  const indexInScale = ((safeDegreeIndex % scaleLen) + scaleLen) % scaleLen;
  const semitones = octave * 12 + intervals[indexInScale];

  const freq = safeBaseFreq * Math.pow(2, semitones / 12);
  // Clamp to safe audible frequencies [20Hz, 12000Hz]
  return Number.isFinite(freq) ? Math.max(20, Math.min(12000, freq)) : safeBaseFreq;
}

/**
 * Picks a random harmonious frequency from the specified scale within an octave span.
 */
export function getRandomScaleNote(
  baseFreq: number,
  scaleType: ScaleType,
  octaveSpan: number = 2
): number {
  const scale = SCALES[scaleType] || SCALES.pentatonic;
  const safeSpan = Number.isFinite(octaveSpan) ? Math.max(1, Math.min(4, Math.round(octaveSpan))) : 2;
  const totalNotes = scale.intervals.length * safeSpan;
  const randomIndex = Math.floor(Math.random() * totalNotes);
  return getScaleFrequency(baseFreq, scaleType, randomIndex);
}
