import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  DARK_THEME_TOKENS,
  LIGHT_THEME_TOKENS,
  STATUS_TOKENS,
  THEME_STORAGE_KEY,
  THEME_PALETTES,
  DARK_THEME_PALETTES,
  LIGHT_THEME_PALETTES,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  PALETTE_STORAGE_KEY_DARK,
  PALETTE_STORAGE_KEY_LIGHT,
  getThemePalette,
  repairThemeId
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

const PaletteTestConsumer: React.FC = () => {
  const { theme, isDark, themeId, palette, setThemeId, toggleTheme } = useTheme();
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'p-mode' }, theme),
    React.createElement('span', { 'data-testid': 'p-is-dark' }, isDark ? 'true' : 'false'),
    React.createElement('span', { 'data-testid': 'p-id' }, themeId),
    React.createElement('span', { 'data-testid': 'p-bg' }, palette.bg),
    React.createElement('button', { onClick: toggleTheme, 'data-testid': 'p-toggle-btn' }, 'Toggle'),
    React.createElement('button', { onClick: () => setThemeId('harbor'), 'data-testid': 'set-harbor-btn' }, 'Harbor'),
    React.createElement('button', { onClick: () => setThemeId('ivory'), 'data-testid': 'set-ivory-btn' }, 'Ivory')
  );
};

describe('Theme System: Soft Palettes', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('provides 6 soft palettes: 3 per contrast mode with unique ids', () => {
    expect(THEME_PALETTES).toHaveLength(6);
    expect(DARK_THEME_PALETTES.map(p => p.id)).toEqual(['midnight', 'harbor', 'mauve']);
    expect(LIGHT_THEME_PALETTES.map(p => p.id)).toEqual(['paper', 'ivory', 'mist']);
    expect(new Set(THEME_PALETTES.map(p => p.id)).size).toBe(6);
    expect(DEFAULT_DARK_THEME_ID).toBe('midnight');
    expect(DEFAULT_LIGHT_THEME_ID).toBe('paper');
    // Every palette carries complete styling fields
    for (const p of THEME_PALETTES) {
      expect(p.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.headerBg).toMatch(/^rgba\(/);
      expect(p.panelBg).toMatch(/^rgba\(/);
      expect(p.swatch).toHaveLength(2);
      expect(Object.keys(p.deck)).toEqual(['recess', 'surface', 'raised', 'card', 'soft', 'tint']);
      expect(Object.keys(p.knob)).toEqual(['track', 'arc', 'face', 'faceStroke', 'needle']);
      expect(p.knob.track).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Object.keys(p.accent)).toHaveLength(11);
      expect(p.accent['400']).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.borderLight).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('defaults to the mode palette and tints CSS variables', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(PaletteTestConsumer, null)
      )
    );

    expect(screen.getByTestId('p-id').textContent).toBe('midnight');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--synhale-bg')).toBe(getThemePalette('midnight').bg);
    expect(root.style.getPropertyValue('--synhale-header-bg')).toBe(getThemePalette('midnight').headerBg);
    expect(localStorage.getItem(PALETTE_STORAGE_KEY_DARK)).toBe('midnight');
  });

  it('setThemeId switches palette, persists it, and can cross modes', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(PaletteTestConsumer, null)
      )
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-harbor-btn'));
    });
    expect(screen.getByTestId('p-id').textContent).toBe('harbor');
    expect(screen.getByTestId('p-is-dark').textContent).toBe('true');
    expect(localStorage.getItem(PALETTE_STORAGE_KEY_DARK)).toBe('harbor');
    expect(document.documentElement.style.getPropertyValue('--synhale-bg')).toBe(getThemePalette('harbor').bg);

    // Ivory belongs to the light mode: provider switches the mode along with it
    act(() => {
      fireEvent.click(screen.getByTestId('set-ivory-btn'));
    });
    expect(screen.getByTestId('p-id').textContent).toBe('ivory');
    expect(screen.getByTestId('p-is-dark').textContent).toBe('false');
    expect(screen.getByTestId('p-mode').textContent).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(localStorage.getItem(PALETTE_STORAGE_KEY_LIGHT)).toBe('ivory');
  });

  it('mode toggle restores the last remembered palette of the target mode', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY_LIGHT, 'mist');
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(PaletteTestConsumer, null)
      )
    );

    // Dark default -> toggle -> light must land on the remembered 'mist'
    expect(screen.getByTestId('p-mode').textContent).toBe('dark');
    act(() => {
      fireEvent.click(screen.getByTestId('p-toggle-btn'));
    });
    expect(screen.getByTestId('p-mode').textContent).toBe('light');
    expect(screen.getByTestId('p-id').textContent).toBe('mist');
  });

  it('repairs invalid stored palette ids back to the mode default', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY_DARK, 'not-a-palette');
    localStorage.setItem(PALETTE_STORAGE_KEY_LIGHT, 'midnight'); // wrong mode on purpose
    expect(repairThemeId('garbage', 'dark')).toBe('midnight');
    expect(repairThemeId('midnight', 'light')).toBe('paper');
    expect(repairThemeId(42, 'dark')).toBe('midnight');
  });

  it('reads the remembered palette of the initial mode on mount', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY_DARK, 'mauve');
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(PaletteTestConsumer, null)
      )
    );
    expect(screen.getByTestId('p-id').textContent).toBe('mauve');
    expect(screen.getByTestId('p-bg').textContent).toBe(getThemePalette('mauve').bg);
  });
});
