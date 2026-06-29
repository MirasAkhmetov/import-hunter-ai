const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

export { BROWSER_HEADERS };

import { parseLocalizedPrice } from "../parseLocalizedPrice";
import { MARKETPLACE_CURRENCY } from "../marketplaces/marketplaceCurrency";
export { parseLocalizedPrice };

interface PriceCandidate {
  price: number;
  source: string;
  priority: number;
}

function addCandidate(
  list: PriceCandidate[],
  raw: string | number | undefined | null,
  source: string,
  priority: number
) {
  if (raw == null) return;
  const price =
    typeof raw === "number"
      ? raw
      : parseLocalizedPrice(String(raw).replace(/[^\d.,]/g, "") || String(raw));
  if (price != null && price > 0) {
    list.push({ price, source, priority });
  }
}

function collectJsonLdPrices(html: string, list: PriceCandidate[]) {
  const blocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const type = String(node["@type"] ?? "");
        if (!type.includes("Product")) continue;

        const offers = node.offers;
        if (Array.isArray(offers)) {
          for (const offer of offers) {
            addCandidate(list, offer.price ?? offer.lowPrice, "json-ld-offers", 100);
          }
        } else if (offers && typeof offers === "object") {
          addCandidate(list, offers.price ?? offers.lowPrice, "json-ld-offer", 100);
        }
        addCandidate(list, node.price, "json-ld-product", 95);
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
}

function collectMetaPrices(html: string, list: PriceCandidate[]) {
  const ogPrice = html.match(
    /property="product:price:amount"\s+content="([\d.,]+)"/i
  );
  if (ogPrice) addCandidate(list, ogPrice[1], "og-product-price", 90);

  const itemprop = html.match(/itemprop="price"\s+content="([\d.,]+)"/i);
  if (itemprop) addCandidate(list, itemprop[1], "itemprop-price", 85);
}

/** Pick sale/discounted price from Hepsiburada productState.prices[] */
export function parseHepsiburadaSalePrice(html: string): number | null {
  if (!html.includes("productState")) return null;

  const pricesBlock = html.match(
    /"productState"[\s\S]*?"prices"\s*:\s*(\[[\s\S]*?\])/
  );
  const scope = pricesBlock?.[1] ?? html;

  const entries: Array<{ value: number; discountRate: number }> = [];
  const entryPattern =
    /"value"\s*:\s*([\d.]+)\s*,\s*"currency"\s*:\s*\d+\s*,\s*"discountRate"\s*:\s*(\d+)/g;

  for (const match of scope.matchAll(entryPattern)) {
    const value = Number(match[1]);
    const discountRate = Number(match[2]);
    if (Number.isFinite(value) && value > 0) {
      entries.push({ value, discountRate });
    }
  }

  if (entries.length === 0) return null;

  const discounted = entries.filter((e) => e.discountRate > 0);
  if (discounted.length > 0) {
    return Math.min(...discounted.map((e) => e.value));
  }

  return Math.min(...entries.map((e) => e.value));
}

/** Hepsiburada 2025/2026 SPA embeds price in productState.product.prices[].value */
export function extractHepsiburadaEmbeddedState(html: string): {
  title: string;
  price: number;
  imageUrl?: string;
} | null {
  if (!html.includes("productState")) return null;

  const price = parseHepsiburadaSalePrice(html);
  if (price == null || price <= 0) return null;

  const nameMatch = html.match(
    /"productState"[\s\S]*?"product"\s*:\s*\{[\s\S]*?"name"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  const brandMatch = html.match(
    /"productState"[\s\S]*?"product"\s*:\s*\{[\s\S]*?"brand"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  const name = nameMatch?.[1]?.replace(/\\"/g, '"') ?? "";
  const brand = brandMatch?.[1]?.replace(/\\"/g, '"') ?? "";
  const title =
    brand && name ? `${brand} ${name}` : name || brand || "Unknown product";

  const imageMatch =
    html.match(
      /"productState"[\s\S]*?"product"\s*:\s*\{[\s\S]*?"imageUrl"\s*:\s*"(https:\/\/[^"]*productimages\.hepsiburada\.net[^"]+)"/
    ) ??
    html.match(
      /property="og:image"\s+content="(https:\/\/[^"]*productimages\.hepsiburada\.net[^"]+)"/i
    );

  return {
    title,
    price,
    imageUrl: imageMatch?.[1],
  };
}

/** n11: цена в JSON (displayPriceFloat) и в DOM (.newPrice ins) */
export function extractN11EmbeddedState(html: string): {
  title: string;
  price: number;
  imageUrl?: string;
} | null {
  if (!html.includes("displayPrice") && !html.includes("n11.com")) {
    return null;
  }

  const candidates: number[] = [];

  const newPriceIns = html.match(
    /class="newPrice"[\s\S]{0,300}?<ins[^>]*>\s*([\d.]+)\s*TL/i
  );
  if (newPriceIns) {
    const p = parseLocalizedPrice(newPriceIns[1]);
    if (p != null && p > 0) candidates.push(p);
  }

  for (const match of html.matchAll(/"displayPrice"\s*:\s*"([\d.]+)\s*TL"/gi)) {
    const p = parseLocalizedPrice(match[1]);
    if (p != null && p > 0) candidates.push(p);
  }

  for (const match of html.matchAll(/"displayPriceFloat"\s*:\s*(\d+)/g)) {
    const n = Number(match[1]);
    if (n > 0) candidates.push(n);
  }
  for (const match of html.matchAll(/"displayPriceNumber"\s*:\s*(\d+)/g)) {
    const n = Number(match[1]);
    if (n > 0) candidates.push(n);
  }

  const itemprop = html.match(/itemprop="price"\s+content="([\d.]+)"/i);
  if (itemprop) {
    const p = parseLocalizedPrice(itemprop[1]);
    if (p != null && p > 0) candidates.push(p);
  }

  const meaningful = candidates.filter((n) => n >= 10);
  if (meaningful.length === 0) return null;

  const price = Math.min(...meaningful);

  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]+)"/i) ??
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title =
    titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "Unknown product";

  const imageMatch =
    html.match(/property="og:image"\s+content="([^"]+)"/i) ??
    html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i);

  return {
    title,
    price,
    imageUrl: imageMatch?.[1],
  };
}

function collectMarketplacePrices(
  html: string,
  marketplace: string,
  list: PriceCandidate[]
) {
  const host = marketplace.toLowerCase();

  if (host.includes("hepsiburada") || html.includes("hepsiburada.com")) {
    const hbPatterns: Array<[RegExp, number]> = [
      [/"value"\s*:\s*([\d.]+)\s*,\s*"currency"\s*:\s*\d+\s*,\s*"discountRate"\s*:\s*([1-9]\d*)/gi, 98],
      [/"productState"[\s\S]*?"prices"\s*:\s*\[\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi, 95],
      [/"prices"\s*:\s*\[\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi, 94],
      [/"currentPrice"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)/gi, 92],
      [/"price"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)/gi, 91],
      [/"specialPrice"\s*:\s*([\d.]+)/gi, 88],
      [/"discountedPrice"\s*:\s*([\d.]+)/gi, 87],
      [/"listingPrice"\s*:\s*([\d.]+)/gi, 86],
      [/"salePrice"\s*:\s*([\d.]+)/gi, 85],
      [/data-test-id="price-current-price"[^>]*>([^<]+)</gi, 84],
      [/"formattedPrice"\s*:\s*"([\d.,]+)"/gi, 83],
    ];
    for (const [pattern, priority] of hbPatterns) {
      for (const match of html.matchAll(pattern)) {
        addCandidate(list, match[1], `hepsiburada`, priority);
      }
    }
  }

  if (host.includes("trendyol") || html.includes("trendyol.com")) {
    const tyPatterns: Array<[RegExp, number]> = [
      [/"discountedPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi, 88],
      [/"sellingPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi, 87],
      [/"price"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi, 86],
      [/"salePrice"\s*:\s*([\d.]+)/gi, 85],
    ];
    for (const [pattern, priority] of tyPatterns) {
      for (const match of html.matchAll(pattern)) {
        addCandidate(list, match[1], `trendyol`, priority);
      }
    }
  }

  if (host.includes("wildberries") || html.includes("wildberries.ru")) {
    const wbPatterns: Array<[RegExp, number]> = [
      [/"price"\s*:\s*\{\s*"basic"\s*:\s*\d+\s*,\s*"product"\s*:\s*(\d+)/gi, 98],
      [/"salePriceU"\s*:\s*(\d+)/gi, 96],
      [/"priceU"\s*:\s*(\d+)/gi, 94],
      [/"price"\s*:\s*\{\s*"basic"\s*:\s*(\d+)/gi, 92],
    ];
    for (const [pattern, priority] of wbPatterns) {
      for (const match of html.matchAll(pattern)) {
        const raw = Number(match[1]);
        if (raw > 0) {
          addCandidate(list, raw / 100, "wildberries", priority);
        }
      }
    }
  }

  if (host.includes("ozon") || html.includes("ozon.ru")) {
    const ozonPatterns: Array<[RegExp, number]> = [
      [/"finalPrice"\s*:\s*"?([\d.]+)"?/gi, 95],
      [/"cardPrice"\s*:\s*"?([\d.]+)"?/gi, 93],
      [/"price"\s*:\s*"?([\d.]+)"?/gi, 88],
      [/data-widget="webPrice"[^>]*>[\s\S]*?([\d\s]+)\s*₽/gi, 85],
    ];
    for (const [pattern, priority] of ozonPatterns) {
      for (const match of html.matchAll(pattern)) {
        addCandidate(list, match[1], "ozon", priority);
      }
    }
  }

  if (host.includes("n11") || html.includes("n11.com")) {
    const n11Patterns: Array<[RegExp, number]> = [
      [/class="newPrice"[\s\S]{0,200}?<ins[^>]*>\s*([\d.]+)\s*TL/gi, 98],
      [/"displayPrice"\s*:\s*"([\d.]+)\s*TL"/gi, 96],
      [/"displayPriceFloat"\s*:\s*(\d+)/gi, 94],
      [/"displayPriceNumber"\s*:\s*(\d+)/gi, 93],
      [/itemprop="price"\s+content="([\d.]+)"/gi, 90],
    ];
    for (const [pattern, priority] of n11Patterns) {
      for (const match of html.matchAll(pattern)) {
        addCandidate(list, match[1], "n11", priority);
      }
    }
  }
}

function collectGenericPrices(html: string, list: PriceCandidate[]) {
  const patterns: Array<[RegExp, number]> = [
    [/"salePrice"\s*:\s*"?([\d.,]+)"?/gi, 50],
    [/"lowPrice"\s*:\s*"?([\d.,]+)"?/gi, 48],
    [/"price"\s*:\s*"?([\d.,]+)"?/gi, 40],
    [/data-price="([\d.,]+)"/gi, 45],
    [/(\d[\d\s.,]{2,})\s*(?:₺|TL)\b/gi, 30],
  ];

  for (const [pattern, priority] of patterns) {
    for (const match of html.matchAll(pattern)) {
      addCandidate(list, match[1], "generic", priority);
    }
  }
}

function pickBestPrice(candidates: PriceCandidate[]): number | null {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.price - a.price;
  });

  const highPriority = sorted.filter((c) => c.priority >= 80);
  const pool = highPriority.length > 0 ? highPriority : sorted;

  const meaningful = pool.filter((c) => c.price >= 100);
  if (meaningful.length > 0) {
    const topPriority = meaningful.reduce((max, c) => Math.max(max, c.priority), 0);
    const topTier = meaningful.filter((c) => c.priority === topPriority);
    // Закупка — минимальная цена в лучшем tier (цена со скидкой, не зачёркнутая)
    return Math.min(...topTier.map((c) => c.price));
  }

  return pool[0]?.price ?? null;
}

export function extractPriceFromHtml(
  html: string,
  url: string,
  marketplace: string
): {
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
} | null {
  const host = marketplace.toLowerCase();
  if (host.includes("wildberries") || html.includes("wildberries.ru")) {
    const sizePriceMatch = html.match(
      /"price"\s*:\s*\{\s*"basic"\s*:\s*\d+\s*,\s*"product"\s*:\s*(\d+)/
    );
    const saleMatch = html.match(/"salePriceU"\s*:\s*(\d+)/);
    const priceMatch = html.match(/"priceU"\s*:\s*(\d+)/);
    const units = Number(
      sizePriceMatch?.[1] ?? saleMatch?.[1] ?? priceMatch?.[1]
    );
    if (units > 0) {
      const nameMatch = html.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"/);
      const brandMatch = html.match(/"brand"\s*:\s*"((?:\\.|[^"\\])*)"/);
      const name = nameMatch?.[1]?.replace(/\\"/g, '"') ?? "";
      const brand = brandMatch?.[1]?.replace(/\\"/g, '"') ?? "";
      const title =
        brand && name ? `${brand} ${name}` : name || brand || "Unknown product";
      return {
        title,
        price: Math.round(units / 100),
        currency: "RUB",
      };
    }
  }

  if (host.includes("hepsiburada") || html.includes("hepsiburada.com")) {
    const embedded = extractHepsiburadaEmbeddedState(html);
    if (embedded) {
      return {
        title: embedded.title,
        price: embedded.price,
        currency: "TRY",
        imageUrl: embedded.imageUrl,
      };
    }
  }

  if (host.includes("n11") || html.includes("n11.com")) {
    const embedded = extractN11EmbeddedState(html);
    if (embedded) {
      return {
        title: embedded.title,
        price: embedded.price,
        currency: "TRY",
        imageUrl: embedded.imageUrl,
      };
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title =
    titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "Unknown product";

  const candidates: PriceCandidate[] = [];
  collectJsonLdPrices(html, candidates);
  collectMetaPrices(html, candidates);
  collectMarketplacePrices(html, marketplace, candidates);
  collectGenericPrices(html, candidates);

  const price = pickBestPrice(candidates);
  if (price == null || price <= 0) return null;

  const currency = detectCurrency(html, marketplace, url);
  const imageMatch =
    html.match(/property="og:image"\s+content="([^"]+)"/i) ??
    html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i);

  return {
    title,
    price,
    currency,
    imageUrl: imageMatch?.[1],
  };
}

function detectCurrency(html: string, marketplace: string, url: string): string {
  const host = url.toLowerCase();
  if (host.includes("kaspi.kz")) return "KZT";
  if (marketplace && MARKETPLACE_CURRENCY[marketplace]) {
    return MARKETPLACE_CURRENCY[marketplace];
  }
  if (
    host.includes("hepsiburada") ||
    host.includes("trendyol") ||
    host.includes("amazon.com.tr") ||
    host.includes("n11.com")
  ) {
    return "TRY";
  }
  if (
    /AED|د\.إ/.test(html) ||
    marketplace.includes("ae") ||
    marketplace === "noon" ||
    host.includes("amazon.ae") ||
    host.includes("noon.com")
  ) {
    return "AED";
  }
  if (
    /CNY|¥|RMB/.test(html) ||
    ["1688", "alibaba", "taobao", "pinduoduo"].includes(marketplace)
  ) {
    return "CNY";
  }
  if (
    /INR|₹/.test(html) ||
    marketplace.includes("in") ||
    marketplace === "flipkart" ||
    marketplace === "meesho" ||
    host.includes("flipkart") ||
    host.includes("amazon.in")
  ) {
    return "INR";
  }
  if (
    /RUB|₽|руб/i.test(html) ||
    marketplace === "wildberries" ||
    marketplace === "ozon" ||
    host.includes("wildberries") ||
    host.includes("ozon")
  ) {
    return "RUB";
  }
  if (/₺|\bTL\b|TRY/.test(html)) return "TRY";
  if (/USD|\$/.test(html) && !/AED/.test(html)) return "USD";
  return "TRY";
}
