import type { MarketplaceProvider } from "../provider";
import { trendyolProvider } from "./trendyol";
import { hepsiburadaProvider } from "./hepsiburada";
import { amazonTrProvider } from "./amazon-tr";
import { n11Provider } from "./n11";
import { pttAvmProvider } from "./pttavm";
import { ciceksepetiProvider } from "./ciceksepeti";

export const turkeyProviders: MarketplaceProvider[] = [
  trendyolProvider,
  hepsiburadaProvider,
  amazonTrProvider,
  n11Provider,
  pttAvmProvider,
  ciceksepetiProvider,
];

export const TURKEY_MARKETPLACES = turkeyProviders.map((p) => p.marketplace);

export {
  trendyolProvider,
  hepsiburadaProvider,
  amazonTrProvider,
  n11Provider,
  pttAvmProvider,
  ciceksepetiProvider,
};
