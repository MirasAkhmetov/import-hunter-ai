import type { MarketplaceProvider } from "../provider";
import {
  buildSearchQueries,
  deduplicateMarketplaceResults,
  filterResultsByBrand,
} from "../provider";
import { cachedSearch } from "../searchCache";
import type {
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "../../types";

export interface TurkeyProviderConfig {
  name: string;
  marketplace: string;
  baseUrl: string;
  enabled?: boolean;
}

type TurkeySearchMarketplace = "hepsiburada" | "trendyol" | "n11";

async function realSearch(
  marketplace: TurkeySearchMarketplace,
  searchTerm: string
): Promise<MarketplaceResultData[]> {
  if (marketplace === "hepsiburada") {
    const { searchHepsiburada } = await import("../../parsers/turkeySearch");
    return searchHepsiburada(searchTerm);
  }

  if (marketplace === "trendyol") {
    const { searchTrendyol } = await import("../../parsers/turkeySearch");
    return searchTrendyol(searchTerm);
  }

  const { searchN11 } = await import("../../parsers/turkeySearch");
  return searchN11(searchTerm);
}

async function realParseProduct(
  marketplace: string,
  url: string
): Promise<ParsedProduct> {
  const { parseProduct } = await import("../../price-verification/productPageParser");
  const parsed = await parseProduct(url, marketplace);
  if (!parsed || parsed.price <= 0) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return {
    source: marketplace,
    title: parsed.title,
    price: parsed.price,
    currency: parsed.currency,
    url: parsed.url,
    imageUrl: parsed.imageUrl,
  };
}

function isTurkeySearchMarketplace(
  marketplace: string
): marketplace is TurkeySearchMarketplace {
  return (
    marketplace === "hepsiburada" ||
    marketplace === "trendyol" ||
    marketplace === "n11"
  );
}

export function createTurkeyProvider(
  config: TurkeyProviderConfig
): MarketplaceProvider {
  const {
    name,
    marketplace,
    baseUrl,
    enabled = true,
  } = config;

  const providerEnabled = enabled && isTurkeySearchMarketplace(marketplace);

  async function search(
    query: ProductSearchQuery
  ): Promise<MarketplaceResultData[]> {
    const searchQueries = buildSearchQueries(query, marketplace);
    const collected: MarketplaceResultData[] = [];

    if (!isTurkeySearchMarketplace(marketplace)) {
      throw new Error("MARKETPLACE_UNAVAILABLE");
    }

    for (const searchTerm of searchQueries) {
      try {
        const results = await cachedSearch(marketplace, searchTerm, () =>
          realSearch(marketplace, searchTerm)
        );
        collected.push(...results);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[${marketplace}] поиск "${searchTerm}" не удался: ${reason}`);
      }
    }

    const deduped = deduplicateMarketplaceResults(collected);
    if (deduped.length === 0) {
      throw new Error("MARKETPLACE_UNAVAILABLE");
    }

    // Площадка ответила, но товаров этого бренда нет — честно «не найдено», а не чужие бренды
    return filterResultsByBrand(deduped, query.brand);
  }

  async function parseProduct(url: string): Promise<ParsedProduct> {
    return realParseProduct(marketplace, url);
  }

  return {
    name,
    marketplace,
    country: "TR",
    currency: "TRY",
    baseUrl,
    enabled: providerEnabled,
    search,
    parseProduct,
  };
}
