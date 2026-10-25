import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CenterBreathIndicator } from '../../../src/ui/components/indicator/CenterBreathIndicator';
import {
  DEFAULT_INDICATOR_OPACITY,
  clampIndicatorOpacity,
  loadIndicatorOpacity,
  saveIndicatorOpacity,
  STORAGE_KEY_INDICATOR_OPACITY,
  loadIndicatorPrecision,
  saveIndicatorPrecision,
  STORAGE_KEY_INDICATOR_PRECISION
} from '../../../src/visuals/indicatorConfig';

describe('CenterBreathIndicator & IndicatorConfig', () => {
  const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
  const CHINESE_OR_ENGLISH_TEXT_REGEX = /[\u4e00-\u9fa5a-zA-Z]/;

  describe('Configuration & Persistence Logic', () => {
    it('clamps opacity to integer 0..100 range with safe fallbacks', () => {
      expect(clampIndicatorOpacity(20)).toBe(20);
      expect(clampIndicatorOpacity(0)).toBe(0);
      expect(clampIndicatorOpacity(100)).toBe(100);
      expect(clampIndicatorOpacity(-10)).toBe(0);
      expect(clampIndicatorOpacity(150)).toBe(100);
      expect(clampIndicatorOpacity(NaN)).toBe(DEFAULT_INDICATOR_OPACITY);
      expect(clampIndicatorOpacity('invalid')).toBe(DEFAULT_INDICATOR_OPACITY);
      expect(clampIndicatorOpacity(null)).toBe(DEFAULT_INDICATOR_OPACITY);
    });

    it('loads default opacity 20% when localStorage is empty', () => {
      window.localStorage.removeItem(STORAGE_KEY_INDICATOR_OPACITY);
      expect(loadIndicatorOpacity()).toBe(20);
    });

    it('saves and reloads opacity from localStorage', () => {
      saveIndicatorOpacity(45);
      expect(loadIndicatorOpacity()).toBe(45);

      saveIndicatorOpacity(0);
      expect(loadIndicatorOpacity()).toBe(0);

      saveIndicatorOpacity(100);
      expect(loadIndicatorOpacity()).toBe(100);

      // Clean up
      window.localStorage.removeItem(STORAGE_KEY_INDICATOR_OPACITY);
    });

    it('loads and saves precision preference from localStorage', () => {
      window.localStorage.removeItem(STORAGE_KEY_INDICATOR_PRECISION);
      expect(loadIndicatorPrecision()).toBe('decimal');

      saveIndicatorPrecision('integer');
      expect(loadIndicatorPrecision()).toBe('integer');

      saveIndicatorPrecision('decimal');
      expect(loadIndicatorPrecision()).toBe('decimal');

      window.localStorage.removeItem(STORAGE_KEY_INDICATOR_PRECISION);
    });
  });

  describe('CenterBreathIndicator Component Rendering', () => {
    it('renders pure Arabic numerals without letters, emojis, or words', () => {
      render(
        React.createElement(CenterBreathIndicator, {
          stage: 'inhale',
          stageProgress: 0.5,
          remainingSeconds: 4.2,
          breathMacro: 0.5,
          isPlaying: true,
          opacityPercent: 20
        })
      );

      const numEl = screen.getByText('4.2');
      expect(numEl).toBeInTheDocument();

      // Zero emojis
      expect(EMOJI_REGEX.test(numEl.textContent || '')).toBe(false);

      // Zero Chinese/English text inside the visible number span
      expect(CHINESE_OR_ENGLISH_TEXT_REGEX.test(numEl.textContent || '')).toBe(false);
    });

    it('does not render when opacity is set to 0%', () => {
      const { container } = render(
        React.createElement(CenterBreathIndicator, {
          stage: 'inhale',
          stageProgress: 0.5,
          remainingSeconds: 4.2,
          breathMacro: 0.5,
          isPlaying: true,
          opacityPercent: 0
        })
      );

      expect(container.firstChild).toBeNull();
    });

    it('smoothly scales number with breathMacro (0.0 to 1.0)', () => {
      const { rerender } = render(
        React.createElement(CenterBreathIndicator, {
          stage: 'inhale',
          stageProgress: 0.0,
          remainingSeconds: 4.0,
          breathMacro: 0.0, // Minimum expansion
          isPlaying: true,
          opacityPercent: 20
        })
      );

      const buttonEl = screen.getByRole('button');
      // 0.82 + 0.66 * 0 = 0.820
      expect(buttonEl.style.transform).toContain('scale(0.820)');
      expect(buttonEl.style.opacity).toBe('0.2');

      // Update to full inhale / holdIn
      rerender(
        React.createElement(CenterBreathIndicator, {
          stage: 'holdIn',
          stageProgress: 1.0,
          remainingSeconds: 4.0,
          breathMacro: 1.0, // Maximum expansion
          isPlaying: true,
          opacityPercent: 50
        })
      );

      // 0.82 + 0.66 * 1.0 = 1.480
      expect(buttonEl.style.transform).toContain('scale(1.480)');
      expect(buttonEl.style.opacity).toBe('0.5');
    });

    it('triggers onTogglePlay when clicked or key pressed', () => {
      const onToggle = vi.fn();
      render(
        React.createElement(CenterBreathIndicator, {
          stage: 'exhale',
          stageProgress: 0.3,
          remainingSeconds: 2.8,
          breathMacro: 0.7,
          isPlaying: true,
          opacityPercent: 20,
          onTogglePlay: onToggle
        })
      );

      const buttonEl = screen.getByRole('button');
      fireEvent.click(buttonEl);
      expect(onToggle).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(buttonEl, { key: 'Enter' });
      expect(onToggle).toHaveBeenCalledTimes(2);

      fireEvent.keyDown(buttonEl, { key: ' ' });
      expect(onToggle).toHaveBeenCalledTimes(3);
    });

    it('formats countdown as single integer when precision is set to integer', () => {
      const { rerender } = render(
        React.createElement(CenterBreathIndicator, {
          stage: 'inhale',
          stageProgress: 0.5,
          remainingSeconds: 3.8,
          breathMacro: 0.5,
          isPlaying: true,
          opacityPercent: 20,
          precision: 'integer'
        })
      );

      // Math.ceil(3.8) -> '4'
      expect(screen.getByText('4')).toBeInTheDocument();

      rerender(
        React.createElement(CenterBreathIndicator, {
          stage: 'inhale',
          stageProgress: 0.8,
          remainingSeconds: 0.3,
          breathMacro: 0.8,
          isPlaying: true,
          opacityPercent: 20,
          precision: 'integer'
        })
      );

      // Math.ceil(0.3) -> '1'
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('implements 1.0s heartbeat pulse and outward ripple for holdIn, hollow outline stroke for holdOut without colored light', () => {
      // 1. Hold In: Solid typography with animate-hold-in-heartbeat & hold-in-ripple
      const { rerender } = render(
        React.createElement(CenterBreathIndicator, {
          stage: 'holdIn',
          stageProgress: 0.5,
          remainingSeconds: 4.0,
          breathMacro: 1.0,
          isPlaying: true,
          opacityPercent: 20,
          isDarkTheme: true
        })
      );

      const holdInBtn = screen.getByRole('button');
      // Must be pure monochrome, NO sky or cyan colors
      expect(holdInBtn.className).toContain('text-white');
      expect(holdInBtn.className).not.toContain('sky');
      expect(holdInBtn.className).not.toContain('cyan');

      // Outward sonic wave ripple must be present during Hold In as a strict 1:1 circular shape
      const ripple = screen.getByTestId('hold-in-ripple');
      expect(ripple).toBeInTheDocument();
      expect(ripple.className).toContain('animate-hold-in-ripple');
      expect(ripple.className).toContain('border-white/60');
      expect(ripple.className).toContain('rounded-full');
      expect(ripple.className).toContain('aspect-square');

      // Number span has animate-hold-in-heartbeat class
      const holdInNumber = screen.getByTestId('breath-indicator-number');
      expect(holdInNumber.className).toContain('animate-hold-in-heartbeat');
      expect(holdInNumber.className).toContain('font-medium');

      // 2. Exhale: Neither heartbeat pulse nor ripple must be present on exhale
      rerender(
        React.createElement(CenterBreathIndicator, {
          stage: 'exhale',
          stageProgress: 0.2,
          remainingSeconds: 3.2,
          breathMacro: 0.8,
          isPlaying: true,
          opacityPercent: 20,
          isDarkTheme: true
        })
      );
      expect(holdInNumber.className).not.toContain('animate-hold-in-heartbeat');
      expect(screen.queryByTestId('hold-in-ripple')).toBeNull();

      // 3. Hold Out: Hollow outline stroke, no pulse, no ripple
      rerender(
        React.createElement(CenterBreathIndicator, {
          stage: 'holdOut',
          stageProgress: 0.5,
          remainingSeconds: 2.0,
          breathMacro: 0.0,
          isPlaying: true,
          opacityPercent: 20,
          isDarkTheme: true
        })
      );

      expect(holdInNumber.className).not.toContain('animate-hold-in-heartbeat');
      expect(screen.queryByTestId('hold-in-ripple')).toBeNull();
      const holdOutSpan = screen.getByText('2.0');
      expect(holdOutSpan.style.webkitTextStroke).toContain('1.5px');
      expect(holdOutSpan.style.color).toBe('transparent');
    });
  });
});
