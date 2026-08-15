/** A tiny TTL cache abstraction with an in-memory default. A Redis adapter can implement the same
 * interface for scaled self-hosts. */

export interface CacheStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  delete(key: string): void;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** In-memory cache with per-entry expiry. Good enough for a single bot instance. */
export class MemoryCache implements CacheStore {
  private readonly map = new Map<string, Entry>();

  get<T>(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}
