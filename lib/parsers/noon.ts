import type { MarketplaceProvider } from "../marketplaces/provider";
import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";
import { getMockMarketplaceResults } from "../mock/data";

const MOCK_MODE = process.env.MOCK_MODE !== "false";

async function searchNoon(query: ProductSearchQuery): Promise<MarketplaceResultData[]> {
  if (MOCK_MODE) {
    await delay(550);
    return getMockMarketplaceResults("noon", "AE", query);
  }
  throw new Error("MARKETPLACE_UNAVAILABLE");
}

async function parseNoonProduct(url: string): Promise<ParsedProduct> {
  if (MOCK_MODE) {
    const results = getMockMarketplaceResults("noon", "AE", { title: "" });
    const item = results[0];
    return {
      source: "noon",
      title: item.title,
      price: item.price,
      currency: item.currency,
      url,
      imageUrl: item.imageUrl,
    };
  }
  throw new Error("MARKETPLACE_UNAVAILABLE");
}

export const noonProvider: MarketplaceProvider = {
  name: "Noon",
  marketplace: "noon",
  country: "AE",
  currency: "AED",
  baseUrl: "https://www.noon.com",
  enabled: process.env.MOCK_MODE !== "false",
  search: searchNoon,
  parseProduct: parseNoonProduct,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
