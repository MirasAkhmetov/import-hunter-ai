import type { MarketplaceProvider } from "./provider";
import { amazonAeProvider } from "../parsers/amazon-ae";
import { noonProvider } from "../parsers/noon";

export const uaeProviders: MarketplaceProvider[] = [
  amazonAeProvider,
  noonProvider,
];

// Future providers (skeleton):
// carrefourProvider, sharafDgProvider

export const UAE_MARKETPLACES = ["amazon-ae", "noon", "carrefour", "sharaf-dg"];
