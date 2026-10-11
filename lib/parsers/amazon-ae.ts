import type { MarketplaceProvider } from "../marketplaces/provider";

// Skeleton: реальный парсер Amazon.ae ещё не реализован
export const amazonAeProvider: MarketplaceProvider = {
  name: "Amazon.ae",
  marketplace: "amazon-ae",
  country: "AE",
  currency: "AED",
  baseUrl: "https://www.amazon.ae",
  enabled: false,
  async search() {
    throw new Error("MARKETPLACE_UNAVAILABLE");
  },
  async parseProduct() {
    throw new Error("MARKETPLACE_UNAVAILABLE");
  },
};
