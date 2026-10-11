import { getAnalysisItems, type AnalysisItem } from "../store/analysisItems";
import type {
  CountryBreakdownStats,
  CountryBestItem,
  ProductFilters,
  MarketplaceCountryStat,
} from "../types/extended";
import { COUNTRY_LABELS } from "../types";
import { COUNTRY_MARKETPLACES } from "../types/extended";
import { applyProductFilters } from "../filters/productFilters";

type RawItem = AnalysisItem;

function buildCountryStats(country: string, items: RawItem[]): CountryBreakdownStats {
  const countryItems = items.filter((i) => i.country === country);
  const marketplaces = COUNTRY_MARKETPLACES[country] ?? [];

  if (countryItems.length === 0) {
    return {
      country,
      countryLabel: COUNTRY_LABELS[country] ?? country,
      marketplaces,
      itemCount: 0,
      avgPurchasePrice: 0,
      avgDelivery: 0,
      avgNetProfit: 0,
      avgRoi: 0,
      highRoiCount: 0,
      lowRiskCount: 0,
      bestByProfit: null,
      bestByRoi: null,
      marketplaceStats: marketplaces.map((m) => ({
        marketplace: m,
        itemCount: 0,
        avgPurchasePrice: 0,
        avgProfit: 0,
        avgRoi: 0,
      })),
    };
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const bestByProfit = [...countryItems].sort(
    (a, b) => b.netProfitKzt - a.netProfitKzt
  )[0];
  const bestByRoi = [...countryItems].sort(
    (a, b) => b.roiPercent - a.roiPercent
  )[0];

  const toBest = (item: RawItem): CountryBestItem => ({
    id: item.id,
    title: item.title,
    marketplace: item.marketplace,
    netProfit: item.netProfitKzt,
    roiPercent: item.roiPercent,
    productTitle: item.productTitle,
  });

  const marketplaceStats: MarketplaceCountryStat[] = marketplaces.map((mp) => {
    const mpItems = countryItems.filter((i) => i.marketplace === mp);
    return {
      marketplace: mp,
      itemCount: mpItems.length,
      avgPurchasePrice: avg(mpItems.map((i) => i.purchasePriceKzt)),
      avgProfit: avg(mpItems.map((i) => i.netProfitKzt)),
      avgRoi: avg(mpItems.map((i) => i.roiPercent)),
    };
  });

  return {
    country,
    countryLabel: COUNTRY_LABELS[country] ?? country,
    marketplaces,
    itemCount: countryItems.length,
    avgPurchasePrice: avg(countryItems.map((i) => i.purchasePriceKzt)),
    avgDelivery: avg(countryItems.map((i) => i.deliveryCostKzt)),
    avgNetProfit: avg(countryItems.map((i) => i.netProfitKzt)),
    avgRoi: avg(countryItems.map((i) => i.roiPercent)),
    highRoiCount: countryItems.filter((i) => i.roiPercent >= 40).length,
    lowRiskCount: countryItems.filter((i) => i.riskScore < 30).length,
    bestByProfit: bestByProfit ? toBest(bestByProfit) : null,
    bestByRoi: bestByRoi ? toBest(bestByRoi) : null,
    marketplaceStats,
  };
}

export async function getCountryBreakdown(filters?: ProductFilters) {
  let items = await getAnalysisItems();

  if (filters) {
    items = applyProductFilters(
      items.map((i) => ({
        ...i,
        price: i.purchasePriceKzt,
        profit: i.netProfitKzt,
        roi: i.roiPercent,
      })),
      filters
    ) as typeof items;
  }

  const countries = ["TR", "CN", "AE", "IN"];
  const breakdown = countries.map((c) => buildCountryStats(c, items));

  const bestCountry = [...breakdown]
    .filter((b) => b.itemCount > 0)
    .sort((a, b) => b.avgRoi - a.avgRoi)[0];

  return { breakdown, bestCountry: bestCountry ?? null, items };
}
