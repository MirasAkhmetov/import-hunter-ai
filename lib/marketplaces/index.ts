import { turkeyProviders } from "./turkey";
import { uaeProviders } from "./uae";
import { chinaProviders } from "./china";
import { indiaProviders } from "./india";
import { russiaProviders } from "./russia";
import type { MarketplaceProvider } from "./provider";

export const activeProviders: MarketplaceProvider[] = [
  ...turkeyProviders,
  ...uaeProviders,
  ...chinaProviders,
  ...indiaProviders,
  ...russiaProviders,
];

export function getProvider(marketplace: string): MarketplaceProvider | undefined {
  return activeProviders.find((p) => p.marketplace === marketplace);
}

export function getEnabledProviders(): MarketplaceProvider[] {
  return activeProviders.filter((p) => p.enabled);
}

export * from "./provider";
export * from "./manager";
export { turkeyProviders, TURKEY_MARKETPLACES } from "./turkey";
export { indiaProviders, INDIA_MARKETPLACES } from "./india";
export { russiaProviders, RUSSIA_MARKETPLACES } from "./russia";
