type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var catalogCache: Map<string, CacheEntry<unknown>> | undefined;
}

const cache = globalThis.catalogCache ?? new Map<string, CacheEntry<unknown>>();
globalThis.catalogCache = cache;

export function getCatalogCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCatalogCache<T>(key: string, value: T, ttlMs = 60_000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCatalogCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

