import type {
  AppSettings,
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "../types";
import {
  parseKaspiUrl,
  parsedUrlToProduct,
  parsedUrlToSearchQuery,
} from "./kaspiUrlParser";
import { generateMockMarketplaceResults } from "./marketplaceGenerator";

// Кэш последнего анализа для согласованных mock-данных
let lastParsedProduct: ParsedProduct | null = null;

export function getMockKaspiProduct(url: string): ParsedProduct {
  const parsed = parseKaspiUrl(url);
  const product = parsedUrlToProduct(url, parsed);
  lastParsedProduct = product;
  return product;
}

export function getLastMockProduct(): ParsedProduct | null {
  return lastParsedProduct;
}

export function getMockMarketplaceResults(
  marketplace: string,
  country: string,
  query: ProductSearchQuery
): MarketplaceResultData[] {
  const kaspiPrice = query.sourcePriceKzt ?? lastParsedProduct?.price ?? 89990;
  return generateMockMarketplaceResults(marketplace, country, query, kaspiPrice);
}

export function buildMockSearchQueryFromUrl(url: string): ProductSearchQuery {
  const parsed = parseKaspiUrl(url);
  const product = parsedUrlToProduct(url, parsed);
  return parsedUrlToSearchQuery(product);
}

export function getMockDashboardStats() {
  return {
    totalAnalyzed: 0,
    profitableCount: 0,
    averageMargin: 0,
    topProducts: [],
    recentAnalyses: [],
    opportunities: {
      highRoi: 0,
      lowRisk: 0,
      bigPriceDiff: 0,
      manualCheck: 0,
    },
  };
}

export const MOCK_SETTINGS: AppSettings = {
  tryToKzt: 14.5,
  aedToKzt: 140.0,
  cnyToKzt: 72.0,
  usdToKzt: 515.0,
  inrToKzt: 6.2,
  rubToKzt: 5.5,
  deliveryTurkeyKzt: 3500,
  deliveryUaeKzt: 5000,
  deliveryChinaKzt: 4000,
  deliveryIndiaKzt: 4500,
  deliveryRussiaKzt: 4000,
  kaspiCommissionPercent: 12,
  taxPercent: 3,
  taxRegime: "simplified",
  adsPercent: 0,
  customsPercent: 5,
  minMarginPercent: 15,
  minRoiPercent: 20,
};
