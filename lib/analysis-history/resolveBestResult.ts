import type { AnalysisResult } from "../types/analysisResult";

type MarketplaceResult = AnalysisResult["marketplaceResults"][number];

export function resolveBestMarketplaceResult(
  result: AnalysisResult,
  selectedMarketplaceResultId?: string | null
): MarketplaceResult | undefined {
  const results = result.marketplaceResults;
  if (results.length === 0) return undefined;

  if (selectedMarketplaceResultId) {
    const selected = results.find((r) => r.id === selectedMarketplaceResultId);
    if (selected) return selected;
  }

  if (result.bestOption) {
    const byMarketplace = results.find((r) => r.marketplace === result.bestOption);
    if (byMarketplace) return byMarketplace;
  }

  return [...results].sort(
    (a, b) => (b.profit?.roiPercent ?? 0) - (a.profit?.roiPercent ?? 0)
  )[0];
}

export function getMarketplaceDisplayPrice(result: {
  finalPrice?: number;
  correctedPrice?: number | null;
  price: number;
}): number {
  return result.finalPrice ?? result.correctedPrice ?? result.price;
}
