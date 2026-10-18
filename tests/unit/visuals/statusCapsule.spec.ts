import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  getStageBadgeText,
  formatCountdown,
  getLedGlow
} from '../../../src/visuals/statusCapsule';
import { StatusCapsule } from '../../../src/ui/components/capsule/StatusCapsule';
import type { BreathStage } from '../../../src/types';

describe('StatusCapsule Unit Tests', () => {
  const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

  describe('Mathematical & String Utilities', () => {
    it('maps all 4 BreathStage enum values to uppercase text with zero emojis', () => {
      const stages: BreathStage[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      const expected = ['INHALE', 'HOLD IN', 'EXHALE', 'HOLD OUT'];

      stages.forEach((stage, idx) => {
        const text = getStageBadgeText(stage);
        expect(text).toBe(expected[idx]);
        expect(EMOJI_REGEX.test(text)).toBe(false);
      });

      expect(getStageBadgeText('unknown' as BreathStage)).toBe('STANDBY');
    });

    it('formats countdown numbers to 1 decimal place with boundary protection', () => {
      expect(formatCountdown(4.23)).toBe('4.2s');
      expect(formatCountdown(0.05)).toBe('0.1s');
      expect(formatCountdown(0.0)).toBe('0.0s');
      expect(formatCountdown(-0.5)).toBe('0.0s');
      expect(formatCountdown(-10.2)).toBe('0.0s');
      expect(formatCountdown(99.99)).toBe('100.0s');
    });

    it('calculates LED glow opacity across stages with 0.15 - 1.0 clamping', () => {
      // Inhale: 0.2 -> 1.0
      expect(getLedGlow('inhale', 0.0)).toBeCloseTo(0.2, 2);
      expect(getLedGlow('inhale', 0.5)).toBeCloseTo(0.6, 2);
      expect(getLedGlow('inhale', 1.0)).toBeCloseTo(1.0, 2);

      // Hold In: 1.0
      expect(getLedGlow('holdIn', 0.0)).toBe(1.0);
      expect(getLedGlow('holdIn', 0.5)).toBe(1.0);
      expect(getLedGlow('holdIn', 1.0)).toBe(1.0);

      // Exhale: 1.0 -> 0.25
      expect(getLedGlow('exhale', 0.0)).toBeCloseTo(1.0, 2);
      expect(getLedGlow('exhale', 0.5)).toBeCloseTo(0.625, 2);
      expect(getLedGlow('exhale', 1.0)).toBeCloseTo(0.25, 2);

      // Hold Out: 0.15
      expect(getLedGlow('holdOut', 0.0)).toBe(0.15);
      expect(getLedGlow('holdOut', 0.5)).toBe(0.15);
      expect(getLedGlow('holdOut', 1.0)).toBe(0.15);

      // Out of bounds progress clamping
      expect(getLedGlow('inhale', -0.5)).toBeCloseTo(0.2, 2);
      expect(getLedGlow('inhale', 1.5)).toBeCloseTo(1.0, 2);
    });
  });

  describe('React StatusCapsule Component', () => {
    it('renders stage badge, formatted countdown, and play/pause icon without emojis', () => {
      const { container, rerender } = render(
        React.createElement(StatusCapsule, {
          stage: 'inhale',
          stageProgress: 0.5,
          remainingSeconds: 3.8,
          isPlaying: true,
          isDarkTheme: true
        })
      );

      expect(screen.getByText('INHALE')).toBeInTheDocument();
      expect(screen.getByText('3.8s')).toBeInTheDocument();

      // Zero emoji in the entire rendered DOM
      expect(EMOJI_REGEX.test(container.textContent || '')).toBe(false);
      expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);

      // Verify essential layout classes
      const capsule = screen.getByRole('button');
      expect(capsule.className).toContain('fixed');
      expect(capsule.className).toContain('bottom-6');
      expect(capsule.className).toContain('backdrop-blur-md');
      expect(capsule.className).toContain('rounded-full');

      // Rerender in paused state
      rerender(
        React.createElement(StatusCapsule, {
          stage: 'holdIn',
          stageProgress: 0.2,
          remainingSeconds: 7.0,
          isPlaying: false,
          isDarkTheme: false
        })
      );

      expect(screen.getByText('HOLD IN')).toBeInTheDocument();
      expect(screen.getByText('7.0s')).toBeInTheDocument();
      expect(EMOJI_REGEX.test(container.textContent || '')).toBe(false);
    });

    it('triggers onTogglePlay callback on click and keyboard activation', () => {
      const onToggle = vi.fn();
      render(
        React.createElement(StatusCapsule, {
          stage: 'exhale',
          stageProgress: 0.8,
          remainingSeconds: 1.2,
          isPlaying: true,
          onTogglePlay: onToggle
        })
      );

      const capsule = screen.getByRole('button');
      fireEvent.click(capsule);
      expect(onToggle).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(capsule, { key: 'Enter' });
      expect(onToggle).toHaveBeenCalledTimes(2);

      fireEvent.keyDown(capsule, { key: ' ' });
      expect(onToggle).toHaveBeenCalledTimes(3);
    });
  });
});
