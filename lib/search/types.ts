import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";
import type { VisualProductDescription } from "../ai/visualProductAnalyzer";

export type SearchMethod = "image" | "text" | "not_found";

export interface SearchOrchestratorOptions {
  countries?: string[];
  marketplaces?: string[];
  /** Minimum finalMatchScore to accept a candidate (default 55). */
  minMatchScore?: number;
  onMarketplaceProgress?: (marketplace: string, phase: "image" | "text" | "not_found") => void;
}

export interface SearchOrchestratorResult {
  results: MarketplaceResultData[];
  visualDescription?: VisualProductDescription;
}

export type MarketplaceSearchFn = (
  query: ProductSearchQuery,
  marketplaces: string[]
) => Promise<MarketplaceResultData[]>;

export type MarketplaceMatchFn = (
  candidates: MarketplaceResultData[],
  visualDescription?: import("../ai/visualProductAnalyzer").VisualProductDescription
) => Promise<MarketplaceResultData[]>;

export interface MarketplaceTarget {
  marketplace: string;
  country: string;
  currency: string;
}

export interface OrchestratorContext {
  sourceProduct: ParsedProduct;
  textQuery: ProductSearchQuery;
  visualDescription?: VisualProductDescription;
  visualKeywords: string[];
}
