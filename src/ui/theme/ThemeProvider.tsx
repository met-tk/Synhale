import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  DARK_THEME_TOKENS,
  LIGHT_THEME_TOKENS,
  ThemeTokens,
  ThemeMode,
  ThemeId,
  ThemePalette,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  PALETTE_STORAGE_KEY_DARK,
  PALETTE_STORAGE_KEY_LIGHT,
  getThemePalette,
  repairThemeId
} from './tokens';
import { refreshDeckPalette } from './deckPalette';

export const THEME_STORAGE_KEY = 'synhale_theme';

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  tokens: ThemeTokens;
  /** Active soft palette (one per mode, remembered independently) */
  themeId: ThemeId;
  palette: ThemePalette;
  setThemeId: (id: ThemeId) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    // Fall back to dark mode in restricted environments
  }
  return 'dark';
}

function loadPaletteId(mode: ThemeMode): ThemeId {
  if (typeof window === 'undefined') {
    return mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
  }
  try {
    const key = mode === 'dark' ? PALETTE_STORAGE_KEY_DARK : PALETTE_STORAGE_KEY_LIGHT;
    return repairThemeId(localStorage.getItem(key), mode);
  } catch {
    return mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
  }
}

function paletteStorageKey(mode: ThemeMode): string {
  return mode === 'dark' ? PALETTE_STORAGE_KEY_DARK : PALETTE_STORAGE_KEY_LIGHT;
}

export interface ThemeProviderProps {
  children?: React.ReactNode;
  initialTheme?: ThemeMode;
  initialThemeId?: ThemeId;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme, initialThemeId }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => initialTheme ?? getInitialTheme());
  const [themeId, setThemeIdState] = useState<ThemeId>(
    () => initialThemeId ?? loadPaletteId(initialTheme ?? getInitialTheme())
  );

  const isDark = theme === 'dark';
  const tokens = useMemo(() => (isDark ? DARK_THEME_TOKENS : LIGHT_THEME_TOKENS), [isDark]);
  const palette = useMemo(() => getThemePalette(themeId), [themeId]);

  // Apply palette custom properties synchronously during render so canvas/SVG
  // draw code resolves fresh colors within the same commit (idempotent writes
  // to documentElement.style; persistence and classes stay in the effect).
  useMemo(() => {
    if (typeof document === 'undefined') return null;
    const root = document.documentElement;
    root.style.setProperty('--synhale-bg', palette.bg);
    root.style.setProperty('--synhale-header-bg', palette.headerBg);
    root.style.setProperty('--synhale-panel-bg', palette.panelBg);
    root.style.setProperty('--synhale-deck-recess', palette.deck.recess);
    root.style.setProperty('--synhale-deck-surface', palette.deck.surface);
    root.style.setProperty('--synhale-deck-raised', palette.deck.raised);
    root.style.setProperty('--synhale-deck-card', palette.deck.card);
    root.style.setProperty('--synhale-deck-soft', palette.deck.soft);
    root.style.setProperty('--synhale-deck-tint', palette.deck.tint);
    root.style.setProperty('--deck-border', palette.border);
    root.style.setProperty('--deck-border-strong', palette.borderStrong);
    root.style.setProperty('--deck-border-light', palette.borderLight);
    root.style.setProperty('--deck-border-light-strong', palette.borderLightStrong);
    root.style.setProperty('--knob-track', palette.knob.track);
    root.style.setProperty('--knob-arc', palette.knob.arc);
    root.style.setProperty('--knob-face', palette.knob.face);
    root.style.setProperty('--knob-face-stroke', palette.knob.faceStroke);
    root.style.setProperty('--knob-needle', palette.knob.needle);
    const accentEntries = Object.entries(palette.accent) as [string, string][];
    for (const [shade, value] of accentEntries) {
      root.style.setProperty(`--acc-${shade}`, value);
    }
    root.style.setProperty('--synhale-accent-fallback', palette.accent['400']);
    document.body.style.backgroundColor = palette.bg;
    refreshDeckPalette();
    return null;
  }, [palette]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      root.style.colorScheme = theme;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      // Skip persisting during the transient frame right after a mode switch:
      // the stale cross-mode palette id must not pollute the target mode's key.
      if (palette.mode === theme) {
        localStorage.setItem(paletteStorageKey(theme), themeId);
      }
    } catch {
      // LocalStorage might be disabled or full
    }
  }, [theme, themeId, isDark, palette]);

  // Guard: switching mode always lands on a palette of that mode (its last
  // remembered choice, or the mode default) so the id and mode never disagree.
  useEffect(() => {
    if (palette.mode !== theme) {
      setThemeIdState(loadPaletteId(theme));
    }
  }, [theme, palette]);

  const setThemeId = (id: ThemeId) => {
    const next = getThemePalette(id);
    setThemeIdState(next.id);
    if (next.mode !== theme) {
      setThemeState(next.mode);
    }
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      isDark,
      tokens,
      themeId,
      palette,
      setThemeId,
      toggleTheme,
      setTheme
    }),
    [theme, isDark, tokens, themeId, palette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
