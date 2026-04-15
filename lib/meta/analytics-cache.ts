const CACHE_TTL_MS = 30 * 60 * 1000;

// Shared in-memory cache — replace with Redis in production
export const cache: Record<string, { data: unknown; cachedAt: number }> = {};

export function getCached(key: string): unknown | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown): void {
  cache[key] = { data, cachedAt: Date.now() };
}
