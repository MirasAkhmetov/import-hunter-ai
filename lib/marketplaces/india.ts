import type { MarketplaceProvider } from "./provider";

export const INDIA_MARKETPLACES = ["flipkart", "amazon-in", "meesho"];

const INDIA_PROVIDER_CONFIGS = [
  { name: "Flipkart", marketplace: "flipkart", baseUrl: "https://www.flipkart.com" },
  { name: "Amazon India", marketplace: "amazon-in", baseUrl: "https://www.amazon.in" },
  { name: "Meesho", marketplace: "meesho", baseUrl: "https://www.meesho.com" },
];

// Skeleton: реальные парсеры для Индии ещё не реализованы
export function createIndiaProviderSkeleton(
  marketplace: string,
  name: string,
  baseUrl = "https://www.flipkart.com"
): MarketplaceProvider {
  return {
    name,
    marketplace,
    country: "IN",
    currency: "INR",
    baseUrl,
    enabled: false,
    async search() {
      throw new Error(`${name} provider not implemented yet`);
    },
    async parseProduct() {
      throw new Error(`${name} provider not implemented yet`);
    },
  };
}

export const indiaProviders: MarketplaceProvider[] = INDIA_PROVIDER_CONFIGS.map(
  ({ name, marketplace, baseUrl }) =>
    createIndiaProviderSkeleton(marketplace, name, baseUrl)
);
