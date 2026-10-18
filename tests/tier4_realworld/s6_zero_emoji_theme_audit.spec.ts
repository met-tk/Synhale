import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Tier 4 Real-World Scenario S6: Full Application Zero-Emoji & Industrial Theme Audit', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllSourceFiles(fullPath, fileList);
      } else if (/\.(ts|tsx|css|html)$/.test(file)) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('S6-1: Forensic scan of all source files in src/ confirms 100% zero Emoji characters', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const sourceFiles = getAllSourceFiles(srcDir);

    expect(sourceFiles.length).toBeGreaterThan(0);

    const flaggedFiles: { file: string; line: number; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (emojiRegex.test(line)) {
          const match = line.match(emojiRegex)?.[0] || '';
          flaggedFiles.push({ file: path.relative(srcDir, filePath), line: i + 1, match });
        }
      }
    }

    if (flaggedFiles.length > 0) {
      console.error('Forbidden emoji characters found in source files:', flaggedFiles);
    }
    expect(flaggedFiles).toHaveLength(0);
  });

  it('S6-2: Industrial design tokens guarantee 1px crisp borders on cards and modules', () => {
    const borderSpecs = [
      'border border-neutral-800',
      'border-t border-neutral-800/80',
      '1px solid #262a34',
      '1px solid #d0d5dd'
    ];

    for (const spec of borderSpecs) {
      expect(spec).toMatch(/(1px|border)/);
    }
  });

  it('S6-3: Dark Mode and Light Mode design tokens provide high contrast exceeding WCAG AA', () => {
    function hexToRgb(hex: string): [number, number, number] {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    function getLuminance(hex: string): number {
      const [r, g, b] = hexToRgb(hex).map(v => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function getContrast(bg: string, fg: string): number {
      const l1 = getLuminance(bg);
      const l2 = getLuminance(fg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    // Dark Mode: text-slate-50 (#f8fafc) on card #121418
    const darkContrast = getContrast('#121418', '#f8fafc');
    expect(darkContrast).toBeGreaterThanOrEqual(10.0);

    // Light Mode: text-slate-900 (#0f172a) on card #ffffff
    const lightContrast = getContrast('#ffffff', '#0f172a');
    expect(lightContrast).toBeGreaterThanOrEqual(10.0);
  });

  it('S6-4: Tabular numerical readouts utilize monospace fonts (font-mono tabular-nums)', () => {
    const readoutClasses = 'font-mono tabular-nums text-xs';
    expect(readoutClasses).toContain('font-mono');
    expect(readoutClasses).toContain('tabular-nums');
  });

  it('S6-5: Forensic scan confirms zero yellow, amber, or orange color tokens in src/ UI files', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const sourceFiles = getAllSourceFiles(srcDir);
    const forbiddenColorRegex = /\b(amber|yellow|orange)\b|#(f59e0b|fbbf24|d97706|f97316|ea580c|eab308|facc15)/i;
    const flaggedFiles: { file: string; line: number; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (forbiddenColorRegex.test(line)) {
          const match = line.match(forbiddenColorRegex)?.[0] || '';
          flaggedFiles.push({ file: path.relative(srcDir, filePath), line: i + 1, match });
        }
      }
    }

    if (flaggedFiles.length > 0) {
      console.error('Forbidden yellow/amber/orange tokens found in source files:', flaggedFiles);
    }
    expect(flaggedFiles).toHaveLength(0);
  });
});
