import type { MarketplaceProvider } from "../provider";
import {
  buildSearchQueries,
  deduplicateMarketplaceResults,
  filterResultsByBrand,
} from "../provider";
import { cachedSearch } from "../searchCache";
import type {
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "../../types";

export interface RussiaProviderConfig {
  name: string;
  marketplace: "wildberries" | "ozon";
  baseUrl: string;
  enabled?: boolean;
}

async function realSearch(
  marketplace: RussiaProviderConfig["marketplace"],
  searchTerm: string
): Promise<MarketplaceResultData[]> {
  if (marketplace === "wildberries") {
    const { searchWildberries } = await import("../../parsers/wildberries");
    return searchWildberries(searchTerm);
  }

  const { searchOzon } = await import("../../parsers/ozon");
  return searchOzon(searchTerm);
}

async function realParseProduct(
  marketplace: RussiaProviderConfig["marketplace"],
  url: string
): Promise<ParsedProduct> {
  if (marketplace === "wildberries") {
    const { parseWildberriesProduct } = await import("../../parsers/wildberries");
    return parseWildberriesProduct(url);
  }

  const { parseOzonProduct } = await import("../../parsers/ozon");
  return parseOzonProduct(url);
}

export function createRussiaProvider(
  config: RussiaProviderConfig
): MarketplaceProvider {
  const {
    name,
    marketplace,
    baseUrl,
    enabled = true,
  } = config;

  async function search(
    query: ProductSearchQuery
  ): Promise<MarketplaceResultData[]> {
    const searchQueries = buildSearchQueries(query, marketplace);
    const collected: MarketplaceResultData[] = [];

    for (const searchTerm of searchQueries) {
      try {
        const results = await cachedSearch(marketplace, searchTerm, () =>
          realSearch(marketplace, searchTerm)
        );
        collected.push(...results);
      } catch (error) {
        console.warn(`[${marketplace}] search failed for "${searchTerm}":`, error);
      }
    }

    const deduped = deduplicateMarketplaceResults(collected);
    if (deduped.length === 0) {
      throw new Error("MARKETPLACE_UNAVAILABLE");
    }

    // Площадка ответила, но товаров этого бренда нет — честно «не найдено», а не чужие бренды
    return filterResultsByBrand(deduped, query.brand);
  }

  async function parseProduct(url: string): Promise<ParsedProduct> {
    return realParseProduct(marketplace, url);
  }

  return {
    name,
    marketplace,
    country: "RU",
    currency: "RUB",
    baseUrl,
    enabled,
    search,
    parseProduct,
  };
}
