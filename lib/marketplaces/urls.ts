import type { ProductSearchQuery } from "../types";
import { buildMarketplaceSearchTerms } from "./marketplaceSearchQuery";

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
