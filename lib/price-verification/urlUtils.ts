const SEARCH_URL_PATTERNS = [
  /\/sr\?/i,
  /\/ara\?/i,
  /\/search/i,
  /\/arama/i,
  /[?&]q=/i,
  /[?&]k=/i,
  /[?&]query=/i,
  /\/s\?/i,
  /search\.aspx/i,
];

export function isMarketplaceSearchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const full = parsed.href;

    // Страница товара Hepsiburada: ...-p-HBC12345 или ...-pm-HBC12345
    if (/[\-/](p|pm)\-hbc\d+$/i.test(path)) return false;
    // Trendyol product: ...-p-12345678
    if (/-p-\d+$/i.test(path)) return false;
    // Wildberries product: /catalog/{nmId}/detail.aspx
    if (/\/catalog\/\d+\/detail\.aspx/i.test(path)) return false;
    // Ozon product: /product/slug-id/
    if (/\/product\/[^/]+-\d+/i.test(path)) return false;
    // n11 / PttAVM product: /urun/slug-id
    if (/\/urun\//i.test(path)) return false;
    // Amazon product: /dp/ or /gp/product/
    if (/\/dp\//i.test(path) || /\/gp\/product\//i.test(path)) return false;
    // Flipkart product: /p/itm...
    if (/\/p\/itm/i.test(path)) return false;
    if (path.includes("/product/") || path.includes("/p/")) return false;

    return SEARCH_URL_PATTERNS.some((pattern) => pattern.test(full));
  } catch {
    return true;
  }
}

/** Убирает mock-параметры из URL (для открытия в браузере). */
export function normalizeMarketplaceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("mock");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function detectMarketplaceFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("trendyol")) return "trendyol";
    if (host.includes("hepsiburada")) return "hepsiburada";
    if (host.includes("amazon.com.tr")) return "amazon-tr";
    if (host.includes("amazon.ae")) return "amazon-ae";
    if (host.includes("amazon.in")) return "amazon-in";
    if (host.includes("n11.com")) return "n11";
    if (host.includes("pttavm")) return "pttavm";
    if (host.includes("ciceksepeti")) return "ciceksepeti";
    if (host.includes("noon.com")) return "noon";
    if (host.includes("flipkart")) return "flipkart";
    if (host.includes("meesho")) return "meesho";
    if (host.includes("wildberries") || host.includes("wb.ru")) return "wildberries";
    if (host.includes("ozon")) return "ozon";
    if (host.includes("1688")) return "1688";
    if (host.includes("alibaba")) return "alibaba";
    if (host.includes("taobao")) return "taobao";
    return null;
  } catch {
    return null;
  }
}
