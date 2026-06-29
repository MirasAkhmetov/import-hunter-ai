import type { MarketplaceProvider } from "../provider";
import { wildberriesProvider } from "./wildberries";
import { ozonProvider } from "./ozon";

export const russiaProviders: MarketplaceProvider[] = [
  wildberriesProvider,
  ozonProvider,
];

export const RUSSIA_MARKETPLACES = russiaProviders.map((p) => p.marketplace);

export { wildberriesProvider, ozonProvider };
