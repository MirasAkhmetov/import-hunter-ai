import type { MarketplaceResultData, ParsedProduct } from "../types";
import { BROWSER_HEADERS } from "../price-verification/htmlPriceExtractor";
import { extractPriceFromHtml } from "../price-verification/htmlPriceExtractor";

const OZON_BASE = "https://www.ozon.ru";

interface OzonSearchItem {
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
}

export function extractOzonProductId(url: string): string | null {
  const match = url.match(/\/product\/[^/]+-(\d+)/i);
  return match?.[1] ?? null;
}

function parseOzonPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("ozon")) return null;
    return parsed.pathname + parsed.search;
  } catch {
    return null;
  }
}

async function ozonFetch(path: string): Promise<unknown> {
  const region = process.env.OZON_REGION;
  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
    Accept: "application/json",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
  };
  if (region) {
    headers.Cookie = `__Secure-access-token=; region_id=${region}`;
  }

  const apiUrl = `${OZON_BASE}/api/composer-api.bx/page/json/v2?url=${encodeURIComponent(path)}`;
  const response = await fetch(apiUrl, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`OZON_API_FAILED: ${response.status}`);
  }

  return response.json();
}

function extractPriceFromOzonState(obj: unknown): number | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const price = extractPriceFromOzonState(item);
      if (price != null) return price;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;

  for (const key of ["finalPrice", "price", "originalPrice", "cardPrice"]) {
    const val = record[key];
    if (typeof val === "number" && val > 0) return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val.replace(/[^\d.]/g, ""));
      if (parsed > 0) return parsed;
    }
  }

  for (const value of Object.values(record)) {
    const price = extractPriceFromOzonState(value);
    if (price != null) return price;
  }

  return null;
}

function extractTitleFromOzonState(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const title = extractTitleFromOzonState(item);
      if (title) return title;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;
  for (const key of ["title", "name", "text"]) {
    const val = record[key];
    if (typeof val === "string" && val.length > 3) return val;
  }

  for (const value of Object.values(record)) {
    const title = extractTitleFromOzonState(value);
    if (title) return title;
  }

  return null;
}

function parseOzonSearchItems(data: unknown): OzonSearchItem[] {
  const items: OzonSearchItem[] = [];
  if (!data || typeof data !== "object") return items;

  const widgetStates = (data as { widgetStates?: Record<string, string> })
    .widgetStates;
  if (!widgetStates) return items;

  for (const [key, raw] of Object.entries(widgetStates)) {
    if (!key.includes("search") && !key.includes("tile") && !key.includes("sku")) {
      continue;
    }

    try {
      const state = JSON.parse(raw) as Record<string, unknown>;
      const tiles =
        (state.items as unknown[]) ??
        (state.products as unknown[]) ??
        (state.skuList as unknown[]) ??
        [];

      for (const tile of tiles) {
        if (!tile || typeof tile !== "object") continue;
        const tileRecord = tile as Record<string, unknown>;
        const action = tileRecord.action as Record<string, unknown> | undefined;
        const link =
          (action?.link as string) ??
          (tileRecord.link as string) ??
          (tileRecord.url as string);

        const title =
          extractTitleFromOzonState(tileRecord.mainState) ??
          extractTitleFromOzonState(tileRecord) ??
          "";

        const price =
          extractPriceFromOzonState(tileRecord.mainState) ??
          extractPriceFromOzonState(tileRecord);

        if (!title || price == null || price <= 0) continue;

        const path = link?.startsWith("/") ? link : null;
        if (!path) continue;

        items.push({
          title,
          price,
          url: `${OZON_BASE}${path}`,
          imageUrl:
            (tileRecord.image as string) ??
            ((tileRecord.tileImage as Record<string, string>)?.link as string),
        });
      }
    } catch {
      // skip invalid widget state
    }
  }

  return items;
}

export async function searchOzon(query: string): Promise<MarketplaceResultData[]> {
  const path = `/search/?text=${encodeURIComponent(query)}&from_global=true`;
  const data = await ozonFetch(path);
  const items = parseOzonSearchItems(data);

  const seen = new Set<string>();
  const results: MarketplaceResultData[] = [];

  for (const item of items) {
    const key = item.url;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      marketplace: "ozon",
      country: "RU",
      title: item.title,
      price: Math.round(item.price),
      currency: "RUB",
      url: item.url,
      imageUrl: item.imageUrl,
      priceSource: "search_result",
      isMockPrice: false,
      needsProfitReview: true,
    });

    if (results.length >= 10) break;
  }

  return results;
}

export async function parseOzonProduct(url: string): Promise<ParsedProduct> {
  const path = parseOzonPathFromUrl(url);
  if (!path) {
    throw new Error("INVALID_OZON_URL");
  }

  try {
    const data = await ozonFetch(path);
    const widgetStates = (data as { widgetStates?: Record<string, string> })
      .widgetStates;

    if (widgetStates) {
      for (const raw of Object.values(widgetStates)) {
        try {
          const state = JSON.parse(raw);
          const price = extractPriceFromOzonState(state);
          const title = extractTitleFromOzonState(state);
          if (price != null && price > 0 && title) {
            return {
              source: "ozon",
              title,
              price: Math.round(price),
              currency: "RUB",
              url,
            };
          }
        } catch {
          // continue
        }
      }
    }
  } catch {
    // fall through to HTML
  }

  const htmlResponse = await fetch(url.startsWith("http") ? url : `${OZON_BASE}${url}`, {
    headers: {
      ...BROWSER_HEADERS,
      "Accept-Language": "ru-RU,ru;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!htmlResponse.ok) {
    throw new Error(`OZON_HTML_FAILED: ${htmlResponse.status}`);
  }

  const html = await htmlResponse.text();
  const extracted = extractPriceFromHtml(html, url, "ozon");
  if (!extracted || extracted.price <= 0) {
    throw new Error("OZON_PRICE_NOT_FOUND");
  }

  return {
    source: "ozon",
    title: extracted.title,
    price: extracted.price,
    currency: "RUB",
    url,
    imageUrl: extracted.imageUrl,
  };
}

export { ozonProvider } from "../marketplaces/russia/ozon";
