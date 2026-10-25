/** Copy an update without invalid numbers, so malformed values never reach AudioParam. */
export function sanitizeParameterPatch<T extends object>(params: T): T {
  return sanitizeObject(params, new WeakSet(), 0) as T;
}

function sanitizeObject(params: object, seen: WeakSet<object>, depth: number): object {
  if (!params || typeof params !== 'object' || seen.has(params) || depth > 16) return {};
  seen.add(params);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (value === undefined || value === null) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    clean[key] = Array.isArray(value)
      ? [...value]
      : typeof value === 'object'
        ? sanitizeObject(value, seen, depth + 1)
        : value;
  }
  seen.delete(params);
  return clean;
}
