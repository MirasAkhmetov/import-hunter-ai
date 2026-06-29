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
          "TR",
          queryWithSearchTerm(query, searchTerm)
        );
        collected.push(...results);
      }
      return deduplicateMarketplaceResults(collected);
    }

    throw new Error("MARKETPLACE_UNAVAILABLE");
  }

  async function parseProduct(url: string): Promise<ParsedProduct> {
    if (MOCK_MODE) {
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
    throw new Error("MARKETPLACE_UNAVAILABLE");
  }

  return {
    name,
    marketplace,
    country: "TR",
    currency: "TRY",
    baseUrl,
    enabled,
    search,
    parseProduct,
  };
}
