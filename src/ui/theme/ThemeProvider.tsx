import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { DARK_THEME_TOKENS, LIGHT_THEME_TOKENS, ThemeTokens } from './tokens';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'synhale_theme';

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  tokens: ThemeTokens;
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

export interface ThemeProviderProps {
  children?: React.ReactNode;
  initialTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => initialTheme ?? getInitialTheme());

  const isDark = theme === 'dark';
  const tokens = useMemo(() => (isDark ? DARK_THEME_TOKENS : LIGHT_THEME_TOKENS), [isDark]);

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
    } catch {
      // LocalStorage might be disabled or full
    }
  }, [theme, isDark]);

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
      toggleTheme,
      setTheme
    }),
    [theme, isDark, tokens]
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
