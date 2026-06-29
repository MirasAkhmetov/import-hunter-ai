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
import { isMockMode } from "../../config/mockMode";

export interface TurkeyProviderConfig {
  name: string;
  marketplace: string;
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

type TurkeySearchMarketplace = "hepsiburada" | "trendyol" | "n11";

async function realSearch(
  marketplace: TurkeySearchMarketplace,
  searchTerm: string
): Promise<MarketplaceResultData[]> {
  if (marketplace === "hepsiburada") {
    const { searchHepsiburada } = await import("../../parsers/turkeySearch");
    return searchHepsiburada(searchTerm);
  }

  if (marketplace === "trendyol") {
    const { searchTrendyol } = await import("../../parsers/turkeySearch");
    return searchTrendyol(searchTerm);
  }

  const { searchN11 } = await import("../../parsers/turkeySearch");
  return searchN11(searchTerm);
}

async function realParseProduct(
  marketplace: string,
  url: string
): Promise<ParsedProduct> {
  const { parseProduct } = await import("../../price-verification/productPageParser");
  const parsed = await parseProduct(url, marketplace);
  if (!parsed || parsed.price <= 0) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return {
    source: marketplace,
    title: parsed.title,
    price: parsed.price,
    currency: parsed.currency,
    url: parsed.url,
    imageUrl: parsed.imageUrl,
  };
}

function isTurkeySearchMarketplace(
  marketplace: string
): marketplace is TurkeySearchMarketplace {
  return (
    marketplace === "hepsiburada" ||
    marketplace === "trendyol" ||
    marketplace === "n11"
  );
}

export function createTurkeyProvider(
  config: TurkeyProviderConfig
): MarketplaceProvider {
  const {
    name,
    marketplace,
    baseUrl,
    mockDelay = 600,
    enabled = true,
  } = config;

  const providerEnabled =
    enabled && (isMockMode() || isTurkeySearchMarketplace(marketplace));

  async function search(
    query: ProductSearchQuery
  ): Promise<MarketplaceResultData[]> {
    const searchQueries = buildSearchQueries(query);
    const collected: MarketplaceResultData[] = [];

    if (isMockMode()) {
      await delay(mockDelay);
      for (const searchTerm of searchQueries) {
        const results = getMockMarketplaceResults(
          marketplace,
          "TR",
          queryWithSearchTerm(query, searchTerm)
        );
        collected.push(...results);
      }
      return deduplicateMarketplaceResults(collected);
    }

    if (!isTurkeySearchMarketplace(marketplace)) {
      throw new Error("MARKETPLACE_UNAVAILABLE");
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
    if (isMockMode()) {
      const results = getMockMarketplaceResults(marketplace, "TR", { title: "" });
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
    country: "TR",
    currency: "TRY",
    baseUrl,
    enabled: providerEnabled,
    search,
    parseProduct,
  };
}
