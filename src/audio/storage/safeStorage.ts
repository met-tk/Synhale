// Keep storage access inside the guard: the localStorage getter itself can throw
// a SecurityError in restricted browser contexts.
export const MAX_STORAGE_CHARS = 2_500_000;
export const MAX_USER_PRESETS = 1000;

export function readStoredJson(key: string): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw || raw.length > MAX_STORAGE_CHARS) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > MAX_STORAGE_CHARS || !globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function requireStoredJson(key: string, value: unknown): void {
  if (!writeStoredJson(key, value)) {
    throw new Error('无法保存：本地存储不可用或空间不足。请释放空间后重试。');
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
