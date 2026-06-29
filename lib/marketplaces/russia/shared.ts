import type { MarketplaceProvider } from "../provider";
import {
  buildSearchQueries,
  deduplicateMarketplaceResults,
} from "../provider";
import type {
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "../../types";
import { getMockMarketplaceResults } from "../../mock/data";

const MOCK_MODE = process.env.MOCK_MODE !== "false";

export interface RussiaProviderConfig {
  name: string;
  marketplace: "wildberries" | "ozon";
  baseUrl: string;
  mockDelay?: number;
  enabled?: boolean;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queryWithSearchTerm(
  query: ProductSearchQuery,
  searchTerm: string
): ProductSearchQuery {
  return { ...query, title: searchTerm };
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
    mockDelay = 600,
    enabled = true,
  } = config;

  async function search(
    query: ProductSearchQuery
  ): Promise<MarketplaceResultData[]> {
    const searchQueries = buildSearchQueries(query);
    const collected: MarketplaceResultData[] = [];

    if (MOCK_MODE) {
      await delay(mockDelay);
      for (const searchTerm of searchQueries) {
        const results = getMockMarketplaceResults(
          marketplace,
          "RU",
          queryWithSearchTerm(query, searchTerm)
        );
        collected.push(...results);
      }
      return deduplicateMarketplaceResults(collected);
    }

    for (const searchTerm of searchQueries) {
      try {
        const results = await realSearch(marketplace, searchTerm);
        collected.push(...results);
      } catch (error) {
        console.warn(`[${marketplace}] search failed for "${searchTerm}":`, error);
      }
    }

    const deduped = deduplicateMarketplaceResults(collected);
    if (deduped.length === 0) {
      throw new Error("MARKETPLACE_UNAVAILABLE");
    }

    return deduped;
  }

  async function parseProduct(url: string): Promise<ParsedProduct> {
    if (MOCK_MODE) {
      const results = getMockMarketplaceResults(marketplace, "RU", { title: "" });
      const item = results[0];
      return {
        source: marketplace,
        title: item.title,
        price: item.price,
        currency: item.currency,
        url,
        imageUrl: item.imageUrl,
      };
    }

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
