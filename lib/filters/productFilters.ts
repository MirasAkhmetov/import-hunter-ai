import type { ProductFilters } from "../types/extended";

export interface FilterableItem {
  country?: string;
  marketplace?: string;
  brand?: string | null;
  category?: string | null;
  price?: number;
  profit?: number;
  roi?: number;
  matchScore?: number;
  riskScore?: number;
  manualStatus?: string;
  favorite?: boolean;
  title?: string;
  productTitle?: string;
}

export function applyProductFilters<T extends FilterableItem>(
  items: T[],
  filters: ProductFilters
): T[] {
  return items.filter((item) => {
    if (filters.country && item.country !== filters.country) return false;
    if (filters.marketplace && item.marketplace !== filters.marketplace)
      return false;
    if (filters.brand && item.brand?.toLowerCase() !== filters.brand.toLowerCase())
      return false;
    if (
      filters.category &&
      item.category?.toLowerCase() !== filters.category.toLowerCase()
    )
      return false;
    if (filters.priceMin != null && (item.price ?? 0) < filters.priceMin)
      return false;
    if (filters.priceMax != null && (item.price ?? 0) > filters.priceMax)
      return false;
    if (filters.profitMin != null && (item.profit ?? 0) < filters.profitMin)
      return false;
    if (filters.profitMax != null && (item.profit ?? 0) > filters.profitMax)
      return false;
    if (filters.roiMin != null && (item.roi ?? 0) < filters.roiMin) return false;
    if (filters.roiMax != null && (item.roi ?? 0) > filters.roiMax) return false;
    if (
      filters.matchScoreMin != null &&
      (item.matchScore ?? 0) < filters.matchScoreMin
    )
      return false;
    if (
      filters.matchScoreMax != null &&
      (item.matchScore ?? 0) > filters.matchScoreMax
    )
      return false;
    if (
      filters.riskScoreMin != null &&
      (item.riskScore ?? 0) < filters.riskScoreMin
    )
      return false;
    if (
      filters.riskScoreMax != null &&
      (item.riskScore ?? 0) > filters.riskScoreMax
    )
      return false;
    if (filters.manualStatus && item.manualStatus !== filters.manualStatus)
      return false;
    if (filters.favorite != null && item.favorite !== filters.favorite)
      return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${item.title ?? ""} ${item.productTitle ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function parseFiltersFromSearchParams(
  params: URLSearchParams
): ProductFilters {
  const num = (key: string) => {
    const v = params.get(key);
    return v ? parseFloat(v) : undefined;
  };

  return {
    country: params.get("country") ?? undefined,
    marketplace: params.get("marketplace") ?? undefined,
    brand: params.get("brand") ?? undefined,
    category: params.get("category") ?? undefined,
    priceMin: num("priceMin"),
    priceMax: num("priceMax"),
    profitMin: num("profitMin"),
    profitMax: num("profitMax"),
    roiMin: num("roiMin"),
    roiMax: num("roiMax"),
    matchScoreMin: num("matchScoreMin"),
    matchScoreMax: num("matchScoreMax"),
    riskScoreMin: num("riskScoreMin"),
    riskScoreMax: num("riskScoreMax"),
    manualStatus: (params.get("manualStatus") as ProductFilters["manualStatus"]) ?? undefined,
    favorite: params.get("favorite") === "true" ? true : undefined,
    search: params.get("search") ?? undefined,
  };
}
