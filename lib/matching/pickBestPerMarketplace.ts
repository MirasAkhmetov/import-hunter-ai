/** Оставляет лучший результат на каждый маркетплейс. */
export function pickBestPerMarketplace<
  T extends {
    marketplace: string;
    finalMatchScore?: number;
    matchScore?: number;
    isTopMatch?: boolean;
    isExactMatch?: boolean;
    isMockPrice?: boolean;
    finalPrice?: number;
    price?: number;
    profit?: { roiPercent?: number };
  },
>(results: T[]): T[] {
  const best = new Map<string, T>();

  const rank = (item: T) => {
    let score = item.finalMatchScore ?? item.matchScore ?? 0;
    if (item.isExactMatch) score += 1000;
    if (item.isTopMatch) score += 500;
    const verified =
      !item.isMockPrice && (item.finalPrice ?? item.price ?? 0) > 0;
    if (verified) score += 2000;
    score += (item.profit?.roiPercent ?? 0) / 100;
    return score;
  };

  for (const item of results) {
    const existing = best.get(item.marketplace);
    if (!existing || rank(item) > rank(existing)) {
      best.set(item.marketplace, item);
    }
  }

  return Array.from(best.values());
}
