/**
 * Pure StoreKit catalog resilience logic (Build 18 regression fix).
 * This module has NO react-native / expo imports so it can be unit-tested
 * under node. `purchase-service.ts` wires it to the real StoreKit fetch.
 */

export type CatalogItem = { id: string };

/**
 * Merges a fresh StoreKit response over the last valid catalog. Products in
 * the new response win; products missing from it are retained from the
 * previous valid catalog, so one transient partial/empty response can never
 * erase a product the store already returned.
 */
export function mergeCatalogs<T extends CatalogItem>(previous: T[], next: T[]): T[] {
  if (next.length === 0) {
    return previous;
  }
  const seen = new Set(next.map((product) => product.id));
  return [...next, ...previous.filter((product) => !seen.has(product.id))];
}

export type CatalogLoader<T extends CatalogItem> = {
  /** Deduped load: concurrent callers share one in-flight request chain. */
  load: () => Promise<T[]>;
  getCached: () => T[];
};

/**
 * Bounded-retry catalog loader:
 * - concurrent load() calls share a single in-flight run, so overlapping
 *   StoreKit product requests are impossible;
 * - an empty or failed refresh NEVER clears the last valid catalog — the
 *   cache is returned immediately instead;
 * - with no cache, up to maxAttempts fetches run with linear backoff before
 *   the loader reports an empty catalog (only then may the UI show
 *   "Currently Unavailable").
 */
export function createCatalogLoader<T extends CatalogItem>(options: {
  fetchOnce: () => Promise<T[]>;
  maxAttempts?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): CatalogLoader<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const backoffMs = options.backoffMs ?? 600;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let cached: T[] = [];
  let inflight: Promise<T[]> | null = null;

  const run = async (): Promise<T[]> => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await options.fetchOnce();
        if (result.length > 0) {
          cached = mergeCatalogs(cached, result);
          return cached;
        }
      } catch (error) {
        lastError = error;
      }
      if (cached.length > 0) {
        // Transient empty/failed refresh: retain the last valid catalog.
        return cached;
      }
      if (attempt < maxAttempts) {
        await sleep(backoffMs * attempt);
      }
    }
    if (lastError) {
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
    return cached;
  };

  return {
    load: () => {
      if (!inflight) {
        inflight = run().finally(() => {
          inflight = null;
        });
      }
      return inflight;
    },
    getCached: () => cached
  };
}
