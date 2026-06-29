import type {
  AnalysisStatus,
  MarketplaceResultData,
  ProfitAnalysisResult,
} from "../types";
import type { BrandContact, BrandFinderMeta } from "./brandFinder";

export type ProviderStatus = "active" | "failed" | "mock" | "disabled";

export interface ProviderStatusInfo {
  marketplace: string;
  name: string;
  status: ProviderStatus;
  resultCount: number;
  error?: string;
}

export interface AnalysisStep {
  status: AnalysisStatus;
  label: string;
  marketplace?: string;
}

export interface AnalysisOptions {
  countries?: string[];
  marketplaces?: string[];
}

export interface AnalysisResult {
  product: {
    id: string;
    source: string;
    title: string;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    price: number;
    currency: string;
    url: string;
    imageUrl?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    specifications?: Record<string, string> | null;
  };
  marketplaceResults: Array<
    MarketplaceResultData & {
      id: string;
      profit: ProfitAnalysisResult;
    }
  >;
  providerStatuses: ProviderStatusInfo[];
  recommendation: string;
  bestOption?: string;
  historyRunId?: string;
  brandContacts?: BrandContact[];
  brandFinderMeta?: BrandFinderMeta;
}
