import type { MarketplaceProvider } from "./provider";
import {
  buildSearchQueries,
  deduplicateMarketplaceResults,
} from "./provider";
import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";
import { getMockMarketplaceResults } from "../mock/data";

const MOCK_MODE = process.env.MOCK_MODE !== "false";

export const INDIA_MARKETPLACES = ["flipkart", "amazon-in", "meesho"];

const INDIA_PROVIDER_CONFIGS = [
  { name: "Flipkart", marketplace: "flipkart", baseUrl: "https://www.flipkart.com" },
  { name: "Amazon India", marketplace: "amazon-in", baseUrl: "https://www.amazon.in" },
  { name: "Meesho", marketplace: "meesho", baseUrl: "https://www.meesho.com" },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queryWithSearchTerm(
  query: ProductSearchQuery,
  searchTerm: string
): ProductSearchQuery {
  return { ...query, title: searchTerm };
}

function createIndiaProvider(config: {
  name: string;
  marketplace: string;
  baseUrl: string;
}): MarketplaceProvider {
  const { name, marketplace, baseUrl } = config;

  return {
    name,
    marketplace,
    country: "IN",
    currency: "INR",
    baseUrl,
    enabled: true,
    async search(query: ProductSearchQuery): Promise<MarketplaceResultData[]> {
      const searchQueries = buildSearchQueries(query);
      const collected: MarketplaceResultData[] = [];

      if (MOCK_MODE) {
        await delay(500);
        for (const sq of searchQueries) {
          const results = getMockMarketplaceResults(
            marketplace,
            "IN",
            queryWithSearchTerm(query, sq)
          );
          collected.push(...results);
        }
        return deduplicateMarketplaceResults(collected);
      }

      throw new Error(`${name} provider not implemented yet`);
    },
    async parseProduct(url: string): Promise<ParsedProduct> {
      if (MOCK_MODE) {
        const results = getMockMarketplaceResults(marketplace, "IN", { title: "" });
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
      throw new Error(`${name} provider not implemented yet`);
    },
  };
}

export const indiaProviders: MarketplaceProvider[] =
  INDIA_PROVIDER_CONFIGS.map(createIndiaProvider);

export function createIndiaProviderSkeleton(
  marketplace: string,
  name: string
): MarketplaceProvider {
  return {
    name,
    marketplace,
    country: "IN",
    currency: "INR",
    baseUrl: "https://www.flipkart.com",
    enabled: false,
    async search() {
      throw new Error(`${name} provider not implemented yet`);
    },
    async parseProduct() {
      throw new Error(`${name} provider not implemented yet`);
    },
  };
}
