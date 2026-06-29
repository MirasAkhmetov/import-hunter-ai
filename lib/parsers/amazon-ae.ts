import type { MarketplaceProvider } from "../marketplaces/provider";
import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";
import { getMockMarketplaceResults } from "../mock/data";

const MOCK_MODE = process.env.MOCK_MODE !== "false";

async function searchAmazonAe(query: ProductSearchQuery): Promise<MarketplaceResultData[]> {
  if (MOCK_MODE) {
    await delay(650);
    return getMockMarketplaceResults("amazon-ae", "AE", query);
  }
  throw new Error("MARKETPLACE_UNAVAILABLE");
}

async function parseAmazonAeProduct(url: string): Promise<ParsedProduct> {
  if (MOCK_MODE) {
    const results = getMockMarketplaceResults("amazon-ae", "AE", { title: "" });
    const item = results[0];
    return {
      source: "amazon-ae",
      title: item.title,
      price: item.price,
      currency: item.currency,
      url,
      imageUrl: item.imageUrl,
    };
  }
  throw new Error("MARKETPLACE_UNAVAILABLE");
}

export const amazonAeProvider: MarketplaceProvider = {
  name: "Amazon.ae",
  marketplace: "amazon-ae",
  country: "AE",
  currency: "AED",
  baseUrl: "https://www.amazon.ae",
  enabled: process.env.MOCK_MODE !== "false",
  search: searchAmazonAe,
  parseProduct: parseAmazonAeProduct,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
