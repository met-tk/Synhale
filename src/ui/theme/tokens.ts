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

/**
 * Soft theme palettes: gentle low-saturation tints layered on the two contrast
 * modes (dark / light). The mode still drives every neutral Tailwind surface;
 * a palette only re-tints the base background layers (stage canvas, root
 * surface, header & panel glass) via CSS custom properties.
 */
export type ThemeMode = 'dark' | 'light';

export type ThemeId = 'midnight' | 'harbor' | 'mauve' | 'paper' | 'ivory' | 'mist';

export interface ThemePalette {
  id: ThemeId;
  mode: ThemeMode;
  nameZh: string;
  nameEn: string;
  /** Solid stage & root background */
  bg: string;
  /** Translucent glass surfaces (header / full drawer) */
  headerBg: string;
  panelBg: string;
  /** Two-tone swatch preview for the settings picker */
  swatch: [string, string];
  /** Deck console layered surfaces (scoped utility remap) */
  deck: {
    recess: string;  // deepest wells: module card shells, vignettes
    surface: string; // mid panels
    raised: string;  // raised controls & tracks
    card: string;    // light-mode card shells
    soft: string;    // light-mode soft panels
    tint: string;    // light-mode tinted chips
  };
  /** Interactive accent ramp (replaces the sky family inside the deck) */
  accent: {
    '50': string; '100': string; '200': string; '300': string; '400': string;
    '500': string; '600': string; '700': string; '800': string; '900': string; '950': string;
  };
  /** Structural hairline tints */
  border: string;       // dark-mode standard border (≈ neutral-800)
  borderStrong: string; // dark-mode strong border (≈ neutral-700)
  borderLight: string;  // light-mode standard border (≈ neutral-200)
  borderLightStrong: string; // light-mode strong border (≈ neutral-300)
  /** Knob hardware colors: groove, value arc, dial face & needle */
  knob: {
    track: string;      // recessed groove arc
    arc: string;        // active value arc (readable mid tone)
    face: string;       // dial center face fill
    faceStroke: string; // face hairline
    needle: string;     // pointer needle
  };
}

/** Tailwind sky ramp — the default accent identity (zero visual drift) */
const ACCENT_SKY = {
  '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc', '400': '#38bdf8',
  '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1', '800': '#075985', '900': '#0c4a6e', '950': '#082f49'
};
const ACCENT_CYAN = {
  '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9', '400': '#22d3ee',
  '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490', '800': '#155e75', '900': '#164e63', '950': '#083344'
};
const ACCENT_VIOLET = {
  '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd', '400': '#a78bfa',
  '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6', '900': '#4c1d95', '950': '#2e1065'
};
const ACCENT_ROSE = {
  '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185',
  '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337', '950': '#4c0519'
};
const ACCENT_BLUE = {
  '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa',
  '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a', '950': '#172554'
};

export const DARK_THEME_PALETTES: ThemePalette[] = [
  {
    id: 'midnight',
    mode: 'dark',
    nameZh: '曜黑',
    nameEn: 'Midnight',
    bg: '#09090b',
    headerBg: 'rgba(18, 20, 24, 0.85)',
    panelBg: 'rgba(9, 9, 11, 0.95)',
    swatch: ['#09090b', '#121418'],
    deck: { recess: '#0b0c10', surface: '#12141a', raised: '#1d2028', card: '#12141a', soft: '#0b0c10', tint: '#0b0c10' },
    accent: ACCENT_SKY,
    border: '#26282f', borderStrong: '#33363f', borderLight: '#e5e7eb', borderLightStrong: '#d1d5db',
    knob: { track: '#1d2028', arc: '#cbd5e1', face: '#12141a', faceStroke: '#26282f', needle: '#f1f5f9' }
  },
  {
    id: 'harbor',
    mode: 'dark',
    nameZh: '墨蓝',
    nameEn: 'Deep Harbor',
    bg: '#0a1017',
    headerBg: 'rgba(15, 23, 36, 0.85)',
    panelBg: 'rgba(10, 16, 23, 0.95)',
    swatch: ['#0a1017', '#0f1724'],
    deck: { recess: '#0a1220', surface: '#101b2b', raised: '#1a2a40', card: '#101b2b', soft: '#0a1220', tint: '#0a1220' },
    accent: ACCENT_CYAN,
    border: '#1e2c40', borderStrong: '#29405c', borderLight: '#dbe4ec', borderLightStrong: '#c3d2e0',
    knob: { track: '#162640', arc: '#c9d9ea', face: '#101b2b', faceStroke: '#1e2c40', needle: '#edf4fb' }
  },
  {
    id: 'mauve',
    mode: 'dark',
    nameZh: '黛紫',
    nameEn: 'Twilight Mauve',
    bg: '#0f0c15',
    headerBg: 'rgba(22, 18, 30, 0.85)',
    panelBg: 'rgba(15, 12, 21, 0.95)',
    swatch: ['#0f0c15', '#16121e'],
    deck: { recess: '#110e1a', surface: '#191527', raised: '#241f33', card: '#191527', soft: '#110e1a', tint: '#110e1a' },
    accent: ACCENT_VIOLET,
    border: '#2d2542', borderStrong: '#3d3355', borderLight: '#e7e3f0', borderLightStrong: '#d4cde6',
    knob: { track: '#251f36', arc: '#d6cfe8', face: '#191527', faceStroke: '#2d2542', needle: '#f4f1f9' }
  }
];

export const LIGHT_THEME_PALETTES: ThemePalette[] = [
  {
    id: 'paper',
    mode: 'light',
    nameZh: '素白',
    nameEn: 'Paper',
    bg: '#fcfbf9',
    headerBg: 'rgba(255, 255, 255, 0.85)',
    panelBg: 'rgba(252, 251, 249, 0.95)',
    swatch: ['#fcfbf9', '#ffffff'],
    deck: { recess: '#f1f2f5', surface: '#f8f9fb', raised: '#f1f2f5', card: '#ffffff', soft: '#f8f9fb', tint: '#f1f2f5' },
    accent: ACCENT_SKY,
    border: '#1f2937', borderStrong: '#374151', borderLight: '#e5e7eb', borderLightStrong: '#d1d5db',
    knob: { track: '#d4d4d4', arc: '#334155', face: '#ffffff', faceStroke: '#d4d4d4', needle: '#171717' }
  },
  {
    id: 'ivory',
    mode: 'light',
    nameZh: '暖米',
    nameEn: 'Warm Ivory',
    bg: '#f7f2e8',
    headerBg: 'rgba(255, 252, 245, 0.85)',
    panelBg: 'rgba(247, 242, 232, 0.95)',
    swatch: ['#f7f2e8', '#fffdf7'],
    deck: { recess: '#f3eee1', surface: '#faf6ec', raised: '#f3eee1', card: '#fffdf8', soft: '#faf6ec', tint: '#f3eee1' },
    accent: ACCENT_ROSE,
    border: '#44403c', borderStrong: '#57534e', borderLight: '#e9e1cd', borderLightStrong: '#d9cfb4',
    knob: { track: '#e6dcc6', arc: '#7d7259', face: '#fffdf8', faceStroke: '#e9e1cd', needle: '#3f382b' }
  },
  {
    id: 'mist',
    mode: 'light',
    nameZh: '雾蓝',
    nameEn: 'Mist Blue',
    bg: '#eef2f6',
    headerBg: 'rgba(252, 253, 255, 0.85)',
    panelBg: 'rgba(238, 242, 246, 0.95)',
    swatch: ['#eef2f6', '#fbfcfe'],
    deck: { recess: '#e9eef4', surface: '#f3f6fa', raised: '#e9eef4', card: '#fdfeff', soft: '#f3f6fa', tint: '#e9eef4' },
    accent: ACCENT_BLUE,
    border: '#1e293b', borderStrong: '#334155', borderLight: '#dce3ec', borderLightStrong: '#c6d2e0',
    knob: { track: '#dde5ee', arc: '#3d4c61', face: '#fdfeff', faceStroke: '#dce3ec', needle: '#1a2433' }
  }
];

export const THEME_PALETTES: ThemePalette[] = [...DARK_THEME_PALETTES, ...LIGHT_THEME_PALETTES];

export const DEFAULT_DARK_THEME_ID: ThemeId = 'midnight';
export const DEFAULT_LIGHT_THEME_ID: ThemeId = 'paper';

export const PALETTE_STORAGE_KEY_DARK = 'synhale_theme_palette_dark';
export const PALETTE_STORAGE_KEY_LIGHT = 'synhale_theme_palette_light';

export function getThemePalette(id: ThemeId): ThemePalette {
  return THEME_PALETTES.find(p => p.id === id) ?? THEME_PALETTES[0];
}

export function getPalettesByMode(mode: ThemeMode): ThemePalette[] {
  return mode === 'dark' ? DARK_THEME_PALETTES : LIGHT_THEME_PALETTES;
}

/** Maps any stored value to a valid palette id for the given mode. */
export function repairThemeId(raw: unknown, mode: ThemeMode): ThemeId {
  if (typeof raw === 'string') {
    const match = getPalettesByMode(mode).find(p => p.id === raw);
    if (match) return match.id;
  }
  return mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
}
