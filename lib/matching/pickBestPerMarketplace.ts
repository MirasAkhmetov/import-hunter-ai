/** Оставляет лучший результат на каждый маркетплейс. */
export function pickBestPerMarketplace<
  T extends {
    marketplace: string;
    searchMethod?: "image" | "text" | "not_found";
    finalMatchScore?: number;
    matchScore?: number;
    isTopMatch?: boolean;
    isExactMatch?: boolean;
    isMockPrice?: boolean;
    finalPrice?: number;
    price?: number;
    profit?: { roiPercent?: number; purchasePriceKzt?: number };
  },
>(results: T[]): T[] {
  const best = new Map<string, T>();

  const rank = (item: T) => {
    if (item.searchMethod === "not_found") return -1_000_000;

    let score = item.finalMatchScore ?? item.matchScore ?? 0;
    if (item.isExactMatch) score += 1000;
    if (item.isTopMatch) score += 500;
    const verified =
      !item.isMockPrice && (item.finalPrice ?? item.price ?? 0) > 0;
    if (verified) {
      score += 2000;
      const priceKzt = item.profit?.purchasePriceKzt ?? item.finalPrice ?? item.price ?? 0;
      if (priceKzt > 0) {
        score -= priceKzt / 1_000_000;
      }
    }
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
