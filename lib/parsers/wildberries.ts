import type { MarketplaceResultData, ParsedProduct } from "../types";
import { BROWSER_HEADERS } from "../price-verification/htmlPriceExtractor";

const WB_DEST = process.env.WB_DEST ?? "-1257786";

interface WbSizePrice {
  price?: { basic?: number; product?: number };
}

interface WbProduct {
  id: number;
  name: string;
  brand?: string;
  salePriceU?: number;
  priceU?: number;
  rating?: number;
  reviewRating?: number;
  feedbacks?: number;
  nmFeedbacks?: number;
  sizes?: WbSizePrice[];
}

interface WbCardMeta {
  imt_name?: string;
  nm_id?: number;
  selling?: { brand_name?: string };
}

function wbPriceFromUnits(units: number): number {
  return Math.round(units / 100);
}

export function getWbBasketHost(vol: number): string {
  if (vol <= 143) return "basket-01.wbbasket.ru";
  if (vol <= 287) return "basket-02.wbbasket.ru";
  if (vol <= 431) return "basket-03.wbbasket.ru";
  if (vol <= 719) return "basket-04.wbbasket.ru";
  if (vol <= 1007) return "basket-05.wbbasket.ru";
  if (vol <= 1061) return "basket-06.wbbasket.ru";
  if (vol <= 1115) return "basket-07.wbbasket.ru";
  if (vol <= 1169) return "basket-08.wbbasket.ru";
  if (vol <= 1313) return "basket-09.wbbasket.ru";
  if (vol <= 1601) return "basket-10.wbbasket.ru";
  if (vol <= 1655) return "basket-11.wbbasket.ru";
  if (vol <= 1919) return "basket-12.wbbasket.ru";
  if (vol <= 2045) return "basket-13.wbbasket.ru";
  if (vol <= 2189) return "basket-14.wbbasket.ru";
  if (vol <= 2405) return "basket-15.wbbasket.ru";
  if (vol <= 2621) return "basket-16.wbbasket.ru";
  if (vol <= 2837) return "basket-17.wbbasket.ru";
  return "basket-18.wbbasket.ru";
}

function wbPriceRub(product: WbProduct): number {
  const sizePrice = product.sizes?.[0]?.price;
  if (sizePrice?.product && sizePrice.product > 0) {
    return Math.round(sizePrice.product / 100);
  }
  if (sizePrice?.basic && sizePrice.basic > 0) {
    return Math.round(sizePrice.basic / 100);
  }
  const units = product.salePriceU ?? product.priceU ?? 0;
  return wbPriceFromUnits(units);
}

function parseWbSearchProducts(json: unknown): WbProduct[] {
  const data = json as {
    products?: WbProduct[];
    data?: { products?: WbProduct[] };
  };
  return data.products ?? data.data?.products ?? [];
}

export function extractNmIdFromUrl(url: string): number | null {
  const match = url.match(/\/catalog\/(\d+)\//i);
  return match ? parseInt(match[1], 10) : null;
}

export function buildWbImageUrl(nmId: number): string {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const host = getWbBasketHost(vol);
  return `https://${host}/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
}

async function wbFetch(url: string, nmId?: number): Promise<Response> {
  const referer = nmId
    ? `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`
    : "https://www.wildberries.ru/";

  return fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
      Origin: "https://www.wildberries.ru",
      Referer: referer,
    },
    signal: AbortSignal.timeout(15000),
  });
}

async function fetchWbCardMeta(nmId: number): Promise<WbCardMeta | null> {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const host = getWbBasketHost(vol);
  const url = `https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`;

  try {
    const response = await wbFetch(url, nmId);
    if (!response.ok) return null;
    return (await response.json()) as WbCardMeta;
  } catch {
    return null;
  }
}

async function fetchWbSearchRaw(query: string): Promise<WbProduct[]> {
  const q = encodeURIComponent(query);
  const url = `https://search.wb.ru/exactmatch/ru/common/v18/search?query=${q}&page=1&dest=${WB_DEST}&curr=rub&lang=ru&resultset=catalog&sort=popular&appType=1&spp=30`;

  const response = await wbFetch(url);
  if (!response.ok) {
    throw new Error(`WB_SEARCH_FAILED: ${response.status}`);
  }

  return parseWbSearchProducts(await response.json());
}

function mapWbProduct(product: WbProduct): MarketplaceResultData {
  const title = product.brand
    ? `${product.brand} ${product.name}`
    : product.name;

  return {
    marketplace: "wildberries",
    country: "RU",
    title,
    price: wbPriceRub(product),
    currency: "RUB",
    url: `https://www.wildberries.ru/catalog/${product.id}/detail.aspx`,
    imageUrl: buildWbImageUrl(product.id),
    sellerRating: product.rating ?? product.reviewRating,
    priceSource: "search_result",
    isMockPrice: false,
    needsProfitReview: true,
  };
}

async function fetchWbProductByNmId(nmId: number): Promise<WbProduct | null> {
  const cardUrls = [
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=${WB_DEST}&spp=30&nm=${nmId}`,
    `https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=${WB_DEST}&spp=30&nm=${nmId}`,
    `https://card.wb.ru/cards/v1/detail?nm=${nmId}&dest=${WB_DEST}`,
  ];

  for (const detailUrl of cardUrls) {
    try {
      const response = await wbFetch(detailUrl, nmId);
      if (!response.ok) continue;

      const products = parseWbSearchProducts(await response.json());
      const exact = products.find((p) => p.id === nmId) ?? products[0];
      if (exact && wbPriceRub(exact) > 0) {
        return { ...exact, id: exact.id ?? nmId };
      }
    } catch {
      // try next endpoint
    }
  }

  const meta = await fetchWbCardMeta(nmId);
  const brand = meta?.selling?.brand_name ?? "";
  const name = meta?.imt_name ?? "";
  const queries = [
    brand && name ? `${brand} ${name}` : "",
    name,
    brand,
  ].filter((q, i, arr) => q.length > 0 && arr.indexOf(q) === i);

  for (const query of queries) {
    try {
      const products = await fetchWbSearchRaw(query);
      const exact = products.find((p) => p.id === nmId);
      if (exact && wbPriceRub(exact) > 0) {
        return exact;
      }
    } catch {
      // try next query
    }
  }

  return null;
}

export async function searchWildberries(
  query: string
): Promise<MarketplaceResultData[]> {
  const products = await fetchWbSearchRaw(query);
  return products.slice(0, 10).map(mapWbProduct).filter((r) => r.price > 0);
}

export async function parseWildberriesProduct(url: string): Promise<ParsedProduct> {
  const nmId = extractNmIdFromUrl(url);
  if (!nmId) {
    throw new Error("INVALID_WB_URL");
  }

  const product = await fetchWbProductByNmId(nmId);
  if (!product) {
    throw new Error("WB_PRODUCT_NOT_FOUND");
  }

  const price = wbPriceRub(product);
  if (price <= 0) {
    throw new Error("WB_PRICE_NOT_FOUND");
  }

  const meta = await fetchWbCardMeta(nmId);
  const brand = product.brand ?? meta?.selling?.brand_name;
  const name = product.name ?? meta?.imt_name ?? "Unknown product";
  const title = brand ? `${brand} ${name}` : name;

  return {
    source: "wildberries",
    title,
    brand,
    price,
    currency: "RUB",
    url,
    imageUrl: buildWbImageUrl(nmId),
    rating: product.rating ?? product.reviewRating,
    reviewCount: product.feedbacks ?? product.nmFeedbacks,
  };
}

export { wildberriesProvider } from "../marketplaces/russia/wildberries";
