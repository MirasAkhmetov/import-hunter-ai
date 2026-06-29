/** ISO currency for each marketplace (source of truth for profit calc). */
export const MARKETPLACE_CURRENCY: Record<string, string> = {
  hepsiburada: "TRY",
  trendyol: "TRY",
  "amazon-tr": "TRY",
  n11: "TRY",
  pttavm: "TRY",
  ciceksepeti: "TRY",
  "amazon-ae": "AED",
  noon: "AED",
  flipkart: "INR",
  "amazon-in": "INR",
  meesho: "INR",
  wildberries: "RUB",
  ozon: "RUB",
  "1688": "CNY",
  alibaba: "CNY",
  taobao: "CNY",
  pinduoduo: "CNY",
};

export function getCurrencyForMarketplace(marketplace: string): string {
  return MARKETPLACE_CURRENCY[marketplace] ?? "TRY";
}

export function isKaspiProductUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("kaspi.kz");
  } catch {
    return /kaspi\.kz/i.test(url);
  }
}

export function marketplacesMatch(
  urlMarketplace: string | null,
  expectedMarketplace: string
): boolean {
  if (!urlMarketplace) return false;
  if (urlMarketplace === expectedMarketplace) return true;
  // amazon-tr vs amazon.com.tr host normalization
  if (
    urlMarketplace.replace(/-/g, "") === expectedMarketplace.replace(/-/g, "")
  ) {
    return true;
  }
  return false;
}
