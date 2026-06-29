import type { ProductSearchQuery } from "../types";
import { buildMarketplaceSearchTerms } from "./marketplaceSearchQuery";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50) || "product";
}

function mockProductId(marketplace: string, index: number): string | number {
  const base = 100_000_000 + index * 137_451;
  switch (marketplace) {
    case "hepsiburada":
      return String(10_000_000 + index * 123_456);
    case "amazon-tr":
    case "amazon-ae":
    case "amazon-in":
      return String(index).padStart(6, "0").slice(0, 6);
    default:
      return base + index;
  }
}

/** Realistic product page URL for mock data and tests (not a search URL). */
export function buildMarketplaceProductUrl(
  marketplace: string,
  query: ProductSearchQuery,
  index = 0
): string {
  const slug = slugify(query.title?.split("—")[0] ?? query.brand ?? "product");
  const brandSlug = slugify(query.brand ?? "store");
  const id = mockProductId(marketplace, index);

  switch (marketplace) {
    case "trendyol":
      return `https://www.trendyol.com/${brandSlug}/${slug}-p-${id}`;
    case "hepsiburada":
      return `https://www.hepsiburada.com/${slug}-p-HBC${id}`;
    case "amazon-tr":
      return `https://www.amazon.com.tr/${slug}/dp/B0${String(id).padStart(6, "0")}`;
    case "amazon-ae":
      return `https://www.amazon.ae/${slug}/dp/B0${String(id).padStart(6, "0")}`;
    case "amazon-in":
      return `https://www.amazon.in/${slug}/dp/B0${String(id).padStart(6, "0")}`;
    case "n11":
      return `https://www.n11.com/urun/${slug}-${id}`;
    case "pttavm":
      return `https://www.pttavm.com/urun/${slug}-${id}`;
    case "ciceksepeti":
      return `https://www.ciceksepeti.com/${slug}-${id}`;
    case "noon":
      return `https://www.noon.com/uae-en/${slug}/${id}/p/`;
    case "flipkart":
      return `https://www.flipkart.com/${slug}/p/itm${id}`;
    case "meesho":
      return `https://www.meesho.com/${slug}/p/${id}`;
    case "wildberries":
      return `https://www.wildberries.ru/catalog/${id}/detail.aspx`;
    case "ozon":
      return `https://www.ozon.ru/product/${slug}-${id}/`;
    default:
      return `https://example.com/product/${slug}-${id}`;
  }
}

export function buildMarketplaceSearchUrl(
  marketplace: string,
  query: ProductSearchQuery
): string {
  const searchText = buildMarketplaceSearchTerms(query, marketplace);
  const q = encodeURIComponent(searchText);

  switch (marketplace) {
    case "trendyol":
      return `https://www.trendyol.com/sr?q=${q}`;
    case "hepsiburada":
      return `https://www.hepsiburada.com/ara?q=${q}`;
    case "amazon-tr":
      return `https://www.amazon.com.tr/s?k=${q}`;
    case "n11":
      return `https://www.n11.com/arama?q=${q}`;
    case "pttavm":
      return `https://www.pttavm.com/arama?q=${q}`;
    case "ciceksepeti":
      return `https://www.ciceksepeti.com/arama?query=${q}`;
    case "amazon-ae":
      return `https://www.amazon.ae/s?k=${q}`;
    case "noon":
      return `https://www.noon.com/uae-en/search?q=${q}`;
    case "flipkart":
      return `https://www.flipkart.com/search?q=${q}`;
    case "amazon-in":
      return `https://www.amazon.in/s?k=${q}`;
    case "meesho":
      return `https://www.meesho.com/search?q=${q}`;
    case "wildberries":
      return `https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`;
    case "ozon":
      return `https://www.ozon.ru/search/?text=${q}&from_global=true`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}
