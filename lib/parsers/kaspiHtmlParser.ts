import type { ParsedProduct } from "../types";
import { parseKaspiUrl } from "../mock/kaspiUrlParser";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_CITY_ID = "750000000";

interface KaspiBackendItem {
  card?: {
    id?: string;
    title?: string;
    price?: number;
    promoConditions?: { brand?: string };
  };
  galleryImages?: Array<{ large?: string; medium?: string; small?: string }>;
  specifications?: Array<{ name?: string; value?: string }>;
}

interface KaspiDigitalProduct {
  id?: string;
  name?: string;
  brand?: string;
  category?: string[];
  reviewCount?: number;
  rating?: number;
  primaryImage?: { large?: string; medium?: string };
}

interface KaspiListingItem {
  id?: string;
  title?: string;
  brand?: string;
  rating?: number;
  reviewsQuantity?: number;
  reviewsCount?: number;
  category?: string[];
  previewImages?: Array<{ large?: string; medium?: string }>;
  shopLink?: string;
}

interface KaspiReviewsInfo {
  reviewCount?: number;
  rating?: number;
}

function extractJsonObject(html: string, marker: string): unknown | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  let start = idx + marker.length;
  while (start < html.length && /\s/.test(html[start]!)) start++;
  if (html[start] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const char = html[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function parseLdJsonPrice(html: string): number | undefined {
  const match = html.match(
    /"offers"\s*:\s*\{[\s\S]*?"price"\s*:\s*"?(\d+)"?/
  );
  return match ? parseInt(match[1]!, 10) : undefined;
}

function parseOgImage(html: string): string | undefined {
  const match = html.match(/property="og:image"\s+content="([^"]+)"/);
  return match?.[1];
}

function specsFromBackend(item: KaspiBackendItem): Record<string, string> | undefined {
  const specs = item.specifications;
  if (!specs?.length) return undefined;

  const result: Record<string, string> = {};
  for (const spec of specs) {
    if (spec.name && spec.value) result[spec.name] = spec.value;
  }
  return Object.keys(result).length ? result : undefined;
}

export function extractProductIdFromUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.match(/\/shop\/p\/([^/]+)/)?.[1];
    const id = slug?.match(/-(\d{6,})$/)?.[1];
    return id;
  } catch {
    return undefined;
  }
}

export function extractCityIdFromUrl(url: string): string {
  try {
    const city = new URL(url).searchParams.get("c");
    return city && /^\d+$/.test(city) ? city : DEFAULT_CITY_ID;
  } catch {
    return DEFAULT_CITY_ID;
  }
}

function buildListingSearchQuery(
  title: string,
  brand?: string,
  model?: string
): string {
  if (brand && model) return `${brand} ${model}`.trim();

  const cleaned = title
    .replace(/\s*—\s*.+$/, "")
    .replace(/\s+в\s+.+$/i, "")
    .trim();

  return cleaned || title;
}

function parseReviewsFromHtml(html: string, productId?: string): KaspiReviewsInfo {
  const patterns = [
    /reviewsQuantity["']?\s*:\s*(\d+)/gi,
    /reviewsCount["']?\s*:\s*(\d+)/gi,
    /reviewCount["']?\s*:\s*(\d+)/gi,
  ];

  let reviewCount: number | undefined;
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      const value = parseInt(match[1]!, 10);
      if (value > 0) {
        reviewCount = value;
        break;
      }
    }
    if (reviewCount) break;
  }

  let rating: number | undefined;
  const ratingPatterns = [
    /"rating"\s*:\s*([\d.]+)/g,
    /ratingValue["']?\s*:\s*([\d.]+)/gi,
  ];

  for (const pattern of ratingPatterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      const value = parseFloat(match[1]!);
      if (value > 0 && value <= 5) {
        rating = value;
        break;
      }
    }
    if (rating) break;
  }

  if (productId) {
    const chunkIdx = html.indexOf(`"id":"${productId}"`);
    if (chunkIdx >= 0) {
      const chunk = html.slice(chunkIdx, chunkIdx + 2500);
      const qty =
        chunk.match(/reviewsQuantity["']?\s*:\s*(\d+)/i)?.[1] ??
        chunk.match(/reviewsCount["']?\s*:\s*(\d+)/i)?.[1];
      const chunkRating = chunk.match(/"rating"\s*:\s*([\d.]+)/)?.[1];

      if (qty) reviewCount = parseInt(qty, 10);
      if (chunkRating) rating = parseFloat(chunkRating);
    }
  }

  return { reviewCount, rating };
}

async function fetchKaspiListingReviews(
  productId: string | undefined,
  searchQuery: string,
  cityId: string,
  refererUrl: string
): Promise<KaspiReviewsInfo> {
  const params = new URLSearchParams({
    q: searchQuery,
    page: "0",
    pageSize: "12",
    cityId,
  });

  try {
    const response = await fetch(
      `https://kaspi.kz/yml/product-view/pl/results?${params}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/plain, */*",
          Referer: refererUrl,
          "X-Ks-City": cityId,
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return {};

    const payload = (await response.json()) as { data?: KaspiListingItem[] };
    const items = payload.data ?? [];

    const matched =
      (productId ? items.find((item) => item.id === productId) : undefined) ??
      items.find((item) =>
        productId ? item.shopLink?.includes(productId) : false
      ) ??
      items[0];

    if (!matched) return {};

    const reviewCount =
      matched.reviewsQuantity ?? matched.reviewsCount ?? undefined;
    const rating = matched.rating;

    return {
      reviewCount: reviewCount && reviewCount > 0 ? reviewCount : undefined,
      rating: rating && rating > 0 ? rating : undefined,
    };
  } catch {
    return {};
  }
}

export async function fetchKaspiReviews(
  productId: string,
  url: string,
  searchQuery?: string
): Promise<KaspiReviewsInfo> {
  const cityId = extractCityIdFromUrl(url);
  const query = searchQuery ?? productId;

  return fetchKaspiListingReviews(productId, query, cityId, url);
}

export async function fetchKaspiProductFromHtml(url: string): Promise<ParsedProduct> {
  const cityId = extractCityIdFromUrl(url);
  const productIdFromUrl = extractProductIdFromUrl(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      "X-Ks-City": cityId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const html = await response.text();
  if (!html.includes("kaspi.kz") && !html.includes("BACKEND")) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const backendItem = extractJsonObject(
    html,
    "BACKEND.components.item = "
  ) as KaspiBackendItem | null;

  const digitalProduct = extractJsonObject(
    html,
    "window.digitalData.product = "
  ) as KaspiDigitalProduct | null;

  const productId =
    productIdFromUrl ?? backendItem?.card?.id ?? digitalProduct?.id;

  const title =
    backendItem?.card?.title ??
    digitalProduct?.name ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split(" – ")[0]?.trim();

  if (!title) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const price =
    backendItem?.card?.price ??
    parseLdJsonPrice(html) ??
    0;

  if (!price) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const imageUrl =
    backendItem?.galleryImages?.[0]?.large ??
    backendItem?.galleryImages?.[0]?.medium ??
    digitalProduct?.primaryImage?.large ??
    digitalProduct?.primaryImage?.medium ??
    parseOgImage(html);

  const brand =
    digitalProduct?.brand ?? backendItem?.card?.promoConditions?.brand;

  const category =
    digitalProduct?.category?.at(-1) ??
    digitalProduct?.category?.[0];

  const htmlReviews = parseReviewsFromHtml(html, productId);
  const parsedUrl = parseKaspiUrl(url);
  const listingSearch = buildListingSearchQuery(
    title,
    brand ?? parsedUrl.brandLabel,
    parsedUrl.model
  );
  const apiReviews = await fetchKaspiListingReviews(
    productId,
    listingSearch,
    cityId,
    url
  );

  const reviewCount =
    apiReviews.reviewCount ??
    htmlReviews.reviewCount ??
    (digitalProduct?.reviewCount && digitalProduct.reviewCount > 0
      ? digitalProduct.reviewCount
      : undefined);

  const rating =
    apiReviews.rating ??
    htmlReviews.rating ??
    digitalProduct?.rating;

  return {
    source: "kaspi",
    title,
    brand: brand ?? parsedUrl.brandLabel,
    model: parsedUrl.model,
    category: category ?? parsedUrl.category,
    price,
    currency: "KZT",
    url,
    imageUrl,
    rating: rating ?? undefined,
    reviewCount: reviewCount ?? 0,
    specifications: backendItem ? specsFromBackend(backendItem) : undefined,
  };
}
