import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  DARK_THEME_TOKENS,
  LIGHT_THEME_TOKENS,
  STATUS_TOKENS,
  THEME_STORAGE_KEY
} from '../../../src/ui/theme';

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

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const ThemeTestConsumer: React.FC = () => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'current-theme' }, theme),
    React.createElement('span', { 'data-testid': 'is-dark' }, isDark ? 'true' : 'false'),
    React.createElement('button', { onClick: toggleTheme, 'data-testid': 'toggle-btn' }, 'Toggle'),
    React.createElement('button', { onClick: () => setTheme('light'), 'data-testid': 'set-light-btn' }, 'Set Light'),
    React.createElement('button', { onClick: () => setTheme('dark'), 'data-testid': 'set-dark-btn' }, 'Set Dark')
  );
};

describe('Theme System: ThemeProvider, Tokens & Hook (F20)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('provides default dark theme and applies dark class to root document', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeTestConsumer, null)
      )
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-dark').textContent).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('supports initialTheme prop to override default theme', () => {
    render(
      React.createElement(
        ThemeProvider,
        { initialTheme: 'light' },
        React.createElement(ThemeTestConsumer, null)
      )
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(screen.getByTestId('is-dark').textContent).toBe('false');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles theme between dark and light, persisting to localStorage', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeTestConsumer, null)
      )
    );

    const toggleBtn = screen.getByTestId('toggle-btn');

    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(screen.getByTestId('is-dark').textContent).toBe('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-dark').textContent).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('allows explicit theme setting via setTheme', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeTestConsumer, null)
      )
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-light-btn'));
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    act(() => {
      fireEvent.click(screen.getByTestId('set-dark-btn'));
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
  });

  it('throws descriptive error when useTheme is called outside ThemeProvider', () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    expect(() => render(React.createElement(ThemeTestConsumer, null))).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    console.error = originalConsoleError;
  });

  it('tokens satisfy WCAG AA contrast ratio (> 4.5:1) in both themes', () => {
    const darkRatio = getContrastRatio(DARK_THEME_TOKENS.textPrimary, DARK_THEME_TOKENS.cardSurface);
    expect(darkRatio).toBeGreaterThanOrEqual(10.0);

    const lightRatio = getContrastRatio(LIGHT_THEME_TOKENS.textPrimary, LIGHT_THEME_TOKENS.cardSurface);
    expect(lightRatio).toBeGreaterThanOrEqual(10.0);

    expect(STATUS_TOKENS.ledActive).toBe('#10b981');
    expect(STATUS_TOKENS.ledBypassed).toBe('#334155');
    expect(STATUS_TOKENS.moduleBypassedOpacity).toBe(0.4);
    expect(STATUS_TOKENS.moduleActiveOpacity).toBe(1.0);
  });
});
