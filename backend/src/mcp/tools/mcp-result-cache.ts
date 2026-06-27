const DEFAULT_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: Promise<unknown>;
};

type CacheLogContext = {
  label: string;
  key: string;
};

export class McpResultCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    logContext?: CacheLogContext,
  ): Promise<T> {
    this.deleteExpiredEntries();

    const cachedEntry = this.cache.get(key);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      this.log("hit", logContext ?? { label: key, key });
      return cachedEntry.value as Promise<T>;
    }

    if (cachedEntry) {
      this.cache.delete(key);
    }

    this.log("miss", logContext ?? { label: key, key });
    const pendingResult = fetcher().catch((error) => {
      this.cache.delete(key);
      this.log("drop", logContext ?? { label: key, key });
      throw error;
    });

    this.cache.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value: pendingResult,
    });

    return pendingResult;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    const now = Date.now();
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt > now) count++;
    }
    return count;
  }

  private deleteExpiredEntries(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private log(status: "hit" | "miss" | "drop", context: CacheLogContext): void {
    console.info(
      `[MCP cache ${status}] ${context.label} key=${this.hashKey(context.key)} size=${this.size}`,
    );
  }

  private hashKey(key: string): string {
    let hash = 0;

    for (let index = 0; index < key.length; index += 1) {
      hash = Math.imul(31, hash) + key.charCodeAt(index);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}

export function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}
