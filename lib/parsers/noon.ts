import type { MarketplaceProvider } from "../marketplaces/provider";

// Skeleton: реальный парсер Noon ещё не реализован
export const noonProvider: MarketplaceProvider = {
  name: "Noon",
  marketplace: "noon",
  country: "AE",
  currency: "AED",
  baseUrl: "https://www.noon.com",
  enabled: false,
  async search() {
    throw new Error("MARKETPLACE_UNAVAILABLE");
  },
  async parseProduct() {
    throw new Error("MARKETPLACE_UNAVAILABLE");
  },
};
