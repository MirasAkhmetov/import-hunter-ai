import type {
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "../types";
import { buildMarketplaceSearchQueries } from "./marketplaceSearchQuery";

export interface MarketplaceProvider {
  name: string;
  marketplace: string;
  country: string;
  currency: string;
  baseUrl: string;
  enabled: boolean;
  search(query: ProductSearchQuery): Promise<MarketplaceResultData[]>;
  parseProduct(url: string): Promise<ParsedProduct>;
}

export function buildSearchQueries(query: ProductSearchQuery): string[] {
  return buildMarketplaceSearchQueries(query);
}

export function deduplicateMarketplaceResults(
  results: MarketplaceResultData[]
): MarketplaceResultData[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.marketplace}:${result.url || result.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
