import type { MarketplaceProvider } from "./provider";

// Skeleton for future China marketplace providers
export const chinaProviders: MarketplaceProvider[] = [];

export const CHINA_MARKETPLACES = ["alibaba", "1688", "pinduoduo", "taobao"];

export function createChinaProviderSkeleton(
  marketplace: string,
  name: string
): MarketplaceProvider {
  return {
    name,
    marketplace,
    country: "CN",
    currency: "CNY",
    baseUrl: "https://www.alibaba.com",
    enabled: false,
    async search() {
      throw new Error(`${name} provider not implemented yet`);
    },
    async parseProduct() {
      throw new Error(`${name} provider not implemented yet`);
    },
  };
}
