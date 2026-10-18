export interface ThemeTokens {
  canvasBg: string;
  cardSurface: string;
  borderPrimary: string;
  textPrimary: string;
  textSecondary: string;
  borderWidth: number;
}

export interface StatusTokens {
  ledActive: string;
  ledBypassed: string;
  moduleActiveOpacity: number;
  moduleBypassedOpacity: number;
}

export const DARK_THEME_TOKENS: ThemeTokens = {
  canvasBg: '#0a0b0d',
  cardSurface: '#121418',
  borderPrimary: '#262a34',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  borderWidth: 1
};

export const LIGHT_THEME_TOKENS: ThemeTokens = {
  canvasBg: '#f5f6f8',
  cardSurface: '#ffffff',
  borderPrimary: '#d0d5dd',
  textPrimary: '#0f172a',
  textSecondary: '#475467',
  borderWidth: 1
};

export const STATUS_TOKENS: StatusTokens = {
  ledActive: '#10b981',
  ledBypassed: '#334155',
  moduleActiveOpacity: 1.0,
  moduleBypassedOpacity: 0.4
};
