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

export function buildSearchQueries(
  query: ProductSearchQuery,
  marketplace?: string
): string[] {
  return buildMarketplaceSearchQueries(query, marketplace);
}

/**
 * Оставляет только результаты нужного бренда: маркетплейсы часто игнорируют бренд
 * в запросе и подставляют популярные товары других производителей.
 */
export function filterResultsByBrand(
  results: MarketplaceResultData[],
  brand?: string
): MarketplaceResultData[] {
  const normalize = (s: string) =>
    s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
  const needle = brand ? normalize(brand) : "";
  if (needle.length < 2) return results;
  return results.filter((r) => normalize(r.title).includes(needle));
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
