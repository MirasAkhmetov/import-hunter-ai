import { getProvider } from "../marketplaces";
import { buildMarketplaceSearchUrl } from "../marketplaces/urls";
import { MARKETPLACE_LABELS } from "../types";
import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";

export function buildBrandSearchQuery(product: ParsedProduct): ProductSearchQuery {
  const brand = product.brand?.trim();
  const keywords = brand ? [brand] : [];

  return {
    title: product.title,
    brand: product.brand,
    model: product.model,
    category: product.category,
    specifications: product.specifications,
    keywords,
    sourcePriceKzt: product.price,
  };
}

export function createMarketplaceNotFoundResult(
  marketplace: string,
  country: string,
  currency: string,
  query: ProductSearchQuery
): MarketplaceResultData {
  const label = MARKETPLACE_LABELS[marketplace] ?? marketplace;
  const brandLabel = query.brand?.trim() || query.title.split(/\s+/)[0] || "товар";

  return {
    marketplace,
    country,
    title: `Не найдено на ${label}`,
    price: 0,
    currency,
    url: buildMarketplaceSearchUrl(marketplace, query),
    searchMethod: "not_found",
    isMockPrice: true,
    matchScore: 0,
    finalMatchScore: 0,
    riskScore: 100,
    matchWarnings: [
      `Товар не найден автоматически. Поищите «${brandLabel}» на ${label} вручную.`,
    ],
  };
}

export function resolveMarketplaceMeta(marketplace: string): {
  country: string;
  currency: string;
} {
  const provider = getProvider(marketplace);
  return {
    country: provider?.country ?? "TR",
    currency: provider?.currency ?? "TRY",
  };
}
