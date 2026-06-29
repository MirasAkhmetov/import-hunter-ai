import { activeProviders } from "./index";
import { deduplicateMarketplaceResults } from "./provider";
import type { MarketplaceProvider } from "./provider";
import type { MarketplaceResultData, ProductSearchQuery } from "../types";
import { isMockMode } from "../config/mockMode";

export type ProviderStatus = "active" | "failed" | "mock" | "disabled";

export interface ProviderStatusInfo {
  marketplace: string;
  name: string;
  status: ProviderStatus;
  resultCount: number;
  error?: string;
}

export interface MarketplaceSearchOptions {
  countries?: string[];
  marketplaces?: string[];
  onProgress?: (provider: MarketplaceProvider) => void;
}

export interface MarketplaceSearchResult {
  results: MarketplaceResultData[];
  providerStatuses: ProviderStatusInfo[];
}

function resolveProviders(options?: MarketplaceSearchOptions): MarketplaceProvider[] {
  let providers = activeProviders;

  if (options?.countries?.length) {
    const countries = new Set(options.countries);
    providers = providers.filter((p) => countries.has(p.country));
  }

  if (options?.marketplaces?.length) {
    const marketplaces = new Set(options.marketplaces);
    providers = providers.filter((p) => marketplaces.has(p.marketplace));
  }

  return providers;
}

function resolveProviderStatus(
  provider: MarketplaceProvider,
  resultCount: number,
  failed: boolean
): ProviderStatus {
  if (!provider.enabled) return "disabled";
  if (failed) return "failed";
  if (isMockMode()) return "mock";
  return resultCount > 0 ? "active" : "failed";
}

export async function searchMarketplaces(
  query: ProductSearchQuery,
  options?: MarketplaceSearchOptions
): Promise<MarketplaceSearchResult> {
  const providers = resolveProviders(options);
  const allResults: MarketplaceResultData[] = [];
  const providerStatuses: ProviderStatusInfo[] = [];

  for (const provider of providers) {
    options?.onProgress?.(provider);

    if (!provider.enabled) {
      providerStatuses.push({
        marketplace: provider.marketplace,
        name: provider.name,
        status: "disabled",
        resultCount: 0,
      });
      continue;
    }

    try {
      const results = await provider.search(query);
      allResults.push(...results);
      providerStatuses.push({
        marketplace: provider.marketplace,
        name: provider.name,
        status: resolveProviderStatus(provider, results.length, false),
        resultCount: results.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown provider error";
      console.warn(`Provider ${provider.name} failed:`, error);
      providerStatuses.push({
        marketplace: provider.marketplace,
        name: provider.name,
        status: "failed",
        resultCount: 0,
        error: message,
      });
    }
  }

  return {
    results: deduplicateMarketplaceResults(allResults),
    providerStatuses,
  };
}

export function getTurkeyProviders(
  marketplaceFilter?: string
): MarketplaceProvider[] {
  const turkey = activeProviders.filter((p) => p.country === "TR");
  if (!marketplaceFilter || marketplaceFilter === "all") {
    return turkey;
  }
  return turkey.filter((p) => p.marketplace === marketplaceFilter);
}
