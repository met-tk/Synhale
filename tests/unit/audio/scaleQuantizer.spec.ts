import { describe, it, expect } from 'vitest';
import {
  SCALES,
  SCALE_LIST,
  quantizeToScale,
  getScaleFrequency,
  getRandomScaleNote
} from '../../../src/audio/dsp/scaleQuantizer';

describe('ScaleQuantizer DSP Module', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('provides 5 curated therapeutic scales adhering to zero-emoji policy', () => {
    expect(SCALE_LIST).toHaveLength(5);
    expect(SCALES.pentatonic).toBeDefined();
    for (const scale of SCALE_LIST) {
      expect(scale.id).toBeDefined();
      expect(scale.name.length).toBeGreaterThan(0);
      expect(scale.enName.length).toBeGreaterThan(0);
      expect(scale.intervals.length).toBeGreaterThanOrEqual(5);
      expect(scale.description.length).toBeGreaterThan(0);

      // Zero-emoji audit
      expect(emojiRegex.test(scale.name)).toBe(false);
      expect(emojiRegex.test(scale.enName)).toBe(false);
      expect(emojiRegex.test(scale.description)).toBe(false);
    }
  });

  it('quantizes semitone offsets to Pentatonic scale correctly', () => {
    // Pentatonic intervals: [0, 2, 4, 7, 9]
    expect(quantizeToScale(0, 'pentatonic')).toBe(0);
    expect(quantizeToScale(1, 'pentatonic')).toBe(0); // Nearest to 0 or 2
    expect(quantizeToScale(2, 'pentatonic')).toBe(2);
    expect(quantizeToScale(3, 'pentatonic')).toBe(2); // 3 is equidistant or closer to 2/4
    expect(quantizeToScale(4, 'pentatonic')).toBe(4);
    expect(quantizeToScale(7, 'pentatonic')).toBe(7);
    expect(quantizeToScale(12, 'pentatonic')).toBe(12); // Octave
    expect(quantizeToScale(14, 'pentatonic')).toBe(14); // 12 + 2
  });

  it('computes harmonious scale frequencies without NaN or infinity', () => {
    const baseFreq = 216; // A3 root
    const rootFreq = getScaleFrequency(baseFreq, 'pentatonic', 0);
    expect(rootFreq).toBeCloseTo(216, 1);

    const octaveFreq = getScaleFrequency(baseFreq, 'pentatonic', 5);
    expect(octaveFreq).toBeCloseTo(432, 1); // 5 notes in pentatonic -> 1 octave up

    const subOctaveFreq = getScaleFrequency(baseFreq, 'pentatonic', -5);
    expect(subOctaveFreq).toBeCloseTo(108, 1);
  });

  it('picks random scale notes within safe audible boundaries', () => {
    const baseFreq = 216;
    for (let i = 0; i < 50; i++) {
      const freq = getRandomScaleNote(baseFreq, 'solfeggio', 3);
      expect(Number.isFinite(freq)).toBe(true);
      expect(freq).toBeGreaterThanOrEqual(20);
      expect(freq).toBeLessThanOrEqual(12000);
    }
  });
});
