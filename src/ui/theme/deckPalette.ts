/**
 * Runtime access to the active soft palette's CSS custom properties.
 *
 * Tailwind-class remapping (see index.css) covers DOM elements, but canvas
 * and SVG-attribute drawing code needs resolved color strings. These helpers
 * read the palette variables injected by ThemeProvider with a small cache;
 * the provider calls refreshDeckPalette() whenever the palette changes.
 */

const cache = new Map<string, string>();

export type AccentShade =
  | '50' | '100' | '200' | '300' | '400' | '500'
  | '600' | '700' | '800' | '900' | '950';

/** Clears the resolved-value cache (invoked by ThemeProvider on palette change). */
export function refreshDeckPalette(): void {
  cache.clear();
}

/** Reads a CSS custom property from :root, falling back when unavailable. */
export function readPaletteVar(name: string, fallback: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  let value = fallback;
  try {
    if (typeof document !== 'undefined') {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (raw) value = raw;
    }
  } catch {
    // Restricted environments keep the fallback
  }
  cache.set(name, value);
  return value;
}

/** Resolved accent color (hex) for canvas/SVG draw code. */
export function readAccent(shade: AccentShade, fallback: string): string {
  return readPaletteVar(`--acc-${shade}`, fallback);
}

/** Accent as an "r, g, b" triple for composing rgba() strings on canvas. */
export function readAccentRgb(shade: AccentShade, fallbackHex: string): string {
  const hex = readAccent(shade, fallbackHex);
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }
  return fallbackHex;
}

/** Live CSS var reference for SVG style props (updates without re-render). */
export function accentVar(shade: AccentShade): string {
  return `var(--acc-${shade}, var(--synhale-accent-fallback, #38bdf8))`;
}
