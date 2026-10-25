/**
 * Center Breath Indicator Configuration & Persistence
 * Manages zero-text central countdown indicator opacity (0..100) and defaults to softest visibility (20%).
 */

export const STORAGE_KEY_INDICATOR_OPACITY = 'synhale_indicator_opacity';
export const STORAGE_KEY_INDICATOR_PRECISION = 'synhale_indicator_precision';

export type IndicatorPrecision = 'decimal' | 'integer';

/**
 * Default opacity for the central breath indicator (20% = softest, unobtrusive glow)
 */
export const DEFAULT_INDICATOR_OPACITY = 20;

/**
 * Default precision for the central countdown (decimal: e.g. 4.2)
 */
export const DEFAULT_INDICATOR_PRECISION: IndicatorPrecision = 'decimal';

/**
 * Clamps input to a safe integer percentage between 0 and 100
 */
export function clampIndicatorOpacity(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_INDICATOR_OPACITY;
  }
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Loads the saved indicator opacity from localStorage with safe fallback to 20%
 */
export function loadIndicatorOpacity(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_INDICATOR_OPACITY;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_INDICATOR_OPACITY);
    if (raw === null || raw === undefined) {
      return DEFAULT_INDICATOR_OPACITY;
    }
    const parsed = Number(raw);
    return clampIndicatorOpacity(parsed);
  } catch {
    return DEFAULT_INDICATOR_OPACITY;
  }
}

/**
 * Saves the indicator opacity to localStorage (0..100)
 */
export function saveIndicatorOpacity(opacity: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = clampIndicatorOpacity(opacity);
    window.localStorage.setItem(STORAGE_KEY_INDICATOR_OPACITY, clamped.toString());
  } catch {
    // Fail-safe silent catch for private browsing quotas
  }
}

/**
 * Loads the saved indicator precision from localStorage (decimal or integer)
 */
export function loadIndicatorPrecision(): IndicatorPrecision {
  if (typeof window === 'undefined') {
    return DEFAULT_INDICATOR_PRECISION;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_INDICATOR_PRECISION);
    if (raw === 'integer' || raw === 'decimal') {
      return raw;
    }
    return DEFAULT_INDICATOR_PRECISION;
  } catch {
    return DEFAULT_INDICATOR_PRECISION;
  }
}

/**
 * Saves the indicator precision to localStorage
 */
export function saveIndicatorPrecision(precision: IndicatorPrecision): void {
  if (typeof window === 'undefined') return;
  try {
    const safeVal: IndicatorPrecision = precision === 'integer' ? 'integer' : 'decimal';
    window.localStorage.setItem(STORAGE_KEY_INDICATOR_PRECISION, safeVal);
  } catch {
    // Fail-safe silent catch
  }
}
