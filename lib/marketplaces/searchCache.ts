import type { MarketplaceResultData } from "../types";

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: Promise<MarketplaceResultData[]> }>();

/**
 * Кэш поисковых запросов к маркетплейсу на 5 минут: один анализ ищет одну и ту же
 * фразу несколько раз (поиск по фото и по тексту), а каждый заход — это браузер и секунды ожидания.
 */
export function cachedSearch(
  marketplace: string,
  term: string,
  run: () => Promise<MarketplaceResultData[]>
): Promise<MarketplaceResultData[]> {
  const key = `${marketplace}:${term.toLowerCase()}`;
  const now = Date.now();
  for (const [k, entry] of cache) {
    if (now - entry.at > TTL_MS) cache.delete(k);
  }
  const hit = cache.get(key);
  if (hit) return hit.value;

  const value = run().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: now, value });
  return value;
}
