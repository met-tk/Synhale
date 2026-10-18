import { describe, it, expect } from 'vitest';

describe('Tier 2 Boundaries - B19: Zero Emoji Security & Unicode Regex Boundaries', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('B19-1: Compound ZWJ emoji sequences (e.g. woman technologist) are intercepted', () => {
    // Zero-width joiner sequences
    expect(emojiRegex.test('👩‍💻')).toBe(true);
    expect(emojiRegex.test('🧘‍♂️')).toBe(true);
  });

  it('B19-2: Skin tone modifier emojis are intercepted', () => {
    expect(emojiRegex.test('👍🏽')).toBe(true);
    expect(emojiRegex.test('🙏🏿')).toBe(true);
  });

  it('B19-3: Common technical and musical ASCII punctuation passes without false positives', () => {
    const technicalSymbols = ['~', '#', '$', '%', '&', '*', '+', '-', '=', '|', '/', ':', ';', '<', '>', '432Hz', '24dB/oct'];
    for (const sym of technicalSymbols) {
      expect(emojiRegex.test(sym)).toBe(false);
    }
  });

  it('B19-4: Strings with single embedded trailing or leading emoji are caught', () => {
    expect(emojiRegex.test('Master Gain 🔊')).toBe(true);
    expect(emojiRegex.test('✨ Reverb Convolver')).toBe(true);
  });

  it('B19-5: Pure Chinese, Latin, and numeric typography passes 100% cleanly', () => {
    const validPhrases = [
      '四阶段呼吸状态机',
      '粉红气流摩擦噪声',
      '双阶梯级联多模滤波器',
      '0ms 绝对无残留即停硬切',
      'Semi-modular digital synthesizer'
    ];
    for (const phrase of validPhrases) {
      expect(emojiRegex.test(phrase)).toBe(false);
    }
  });
});
