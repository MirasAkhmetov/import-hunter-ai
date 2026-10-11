import type { MarketplaceResultData } from "../types";
import { BROWSER_HEADERS } from "../price-verification/htmlPriceExtractor";
import {
  extractTrendyolPriceFromApiItem,
  normalizeTurkishLiraPrice,
  parseTurkishDomPrice,
} from "../price-verification/turkishPrice";
import { extractSepetePriceFromText, isCouponPriceContext } from "../price-verification/turkishSepetePrice";
const HB_BASE = "https://www.hepsiburada.com";
const TY_BASE = "https://www.trendyol.com";

const TRENDYOL_SCROLL_STEPS = 3;

const TRENDYOL_COOKIES = [
  { name: "storefrontId", value: "1", domain: ".trendyol.com", path: "/" },
  { name: "countryCode", value: "TR", domain: ".trendyol.com", path: "/" },
  { name: "language", value: "tr", domain: ".trendyol.com", path: "/" },
  { name: "culture", value: "tr-TR", domain: ".trendyol.com", path: "/" },
];

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : entity;
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function buildSearchResult(
  marketplace: string,
  title: string,
  price: number,
  url: string,
  imageUrl?: string
): MarketplaceResultData {
  return {
    marketplace,
    country: "TR",
    title: decodeHtmlEntities(title).trim(),
    price,
    currency: "TRY",
    url,
    imageUrl,
    priceSource: "search_result",
    isMockPrice: false,
    needsProfitReview: true,
  };
}

function normalizeSearchPrice(price: number): number {
  return normalizeTurkishLiraPrice(price);
}

function parseTryPrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/([\d.,]+)\s*TL/i);
  if (!match) return parseTurkishDomPrice(text);
  return parseTurkishDomPrice(match[1]);
}
function absoluteUrl(base: string, path: string): string {
  const normalized = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return normalized.split("?")[0];
}

function dedupeResults(results: MarketplaceResultData[]): MarketplaceResultData[] {
  const seen = new Set<string>();
  const out: MarketplaceResultData[] = [];
  for (const item of results) {
    const key = item.url.split("?")[0];
    if (seen.has(key) || item.price <= 0) continue;
    seen.add(key);
    out.push({ ...item, url: key });
    if (out.length >= 10) break;
  }
  return out;
}

async function hbFetchJson(path: string): Promise<unknown | null> {
  try {
    const response = await fetch(`${HB_BASE}${path}`, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json, text/plain, */*",
        Origin: HB_BASE,
        Referer: `${HB_BASE}/`,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (
      json &&
      typeof json === "object" &&
      "success" in json &&
      (json as { success?: boolean }).success === false
    ) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

function mapHbApiProducts(data: unknown): MarketplaceResultData[] {
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const products =
    (record.products as unknown[]) ??
    (record.result as { products?: unknown[] } | undefined)?.products ??
    (record.data as { products?: unknown[] } | undefined)?.products ??
    [];

  const results: MarketplaceResultData[] = [];
  for (const raw of products) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const product = (item.product as Record<string, unknown> | undefined) ?? item;
    const title =
      (product.name as string) ??
      (product.displayName as string) ??
      (item.name as string) ??
      "";
    const priceRaw =
      (product.price as { value?: number } | undefined)?.value ??
      (item.price as { value?: number } | undefined)?.value ??
      (product.salePrice as number | undefined) ??
      (item.salePrice as number | undefined);
    const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
    const sku =
      (product.sku as string) ??
      (item.sku as string) ??
      (product.productId as string) ??
      "";
    const slug = (product.url as string) ?? (item.url as string) ?? "";
    const url = slug
      ? slug.startsWith("http")
        ? slug
        : `${HB_BASE}${slug.startsWith("/") ? slug : `/${slug}`}`
      : sku
        ? `${HB_BASE}/p-HBC${sku}`
        : "";
    const imageUrl =
      (product.imageUrl as string) ??
      (product.image as string) ??
      (item.imageUrl as string);

    if (!title || !url || !Number.isFinite(price) || price <= 0) continue;
    results.push(
      buildSearchResult("hepsiburada", title, normalizeSearchPrice(price), url, imageUrl)
    );
  }

  return results;
}

function parseHepsiburadaSearchHtml(html: string): MarketplaceResultData[] {
  const results: MarketplaceResultData[] = [];
  const seen = new Set<string>();

  const cardPattern =
    /aria-label="Sepete ekle, fiyat: ([^"]+)"[^>]*data-test-id="title-\d+"[\s\S]{0,500}?title="((?:\\.|[^"\\])*)"[^>]*href="(\/[^"]+-p[m]?-HBC[A-Z0-9]+)"/g;

  for (const match of html.matchAll(cardPattern)) {
    const price = parseTryPrice(`${match[1]} TL`);
    const title = match[2].replace(/\\"/g, '"');
    const path = match[3];
    const url = absoluteUrl(HB_BASE, path);
    if (!price || !title || seen.has(url)) continue;
    seen.add(url);

    const chunk = html.slice(match.index ?? 0, (match.index ?? 0) + 2500);
    const imageMatch =
      chunk.match(/src="(https:\/\/productimages\.hepsiburada\.net\/[^"]+)"/) ??
      chunk.match(/srcSet="(https:\/\/productimages\.hepsiburada\.net\/[^"]+)"/);

    results.push(
      buildSearchResult("hepsiburada", title, price, url, imageMatch?.[1])
    );
    if (results.length >= 10) break;
  }

  if (results.length > 0) return results;

  const linkPattern =
    /title="((?:\\.|[^"\\])*)"[^>]*href="(\/[^"]+-p[m]?-HBC[A-Z0-9]+)"/g;
  for (const match of html.matchAll(linkPattern)) {
    const title = match[1].replace(/\\"/g, '"');
    const url = absoluteUrl(HB_BASE, match[2]);
    if (!title || seen.has(url)) continue;
    const chunk = html.slice(match.index ?? 0, (match.index ?? 0) + 2000);
    const price = parseTryPrice(chunk);
    if (!price) continue;
    seen.add(url);
    const imageMatch = chunk.match(
      /src="(https:\/\/productimages\.hepsiburada\.net\/[^"]+)"/
    );
    results.push(
      buildSearchResult("hepsiburada", title, price, url, imageMatch?.[1])
    );
    if (results.length >= 10) break;
  }

  return results;
}

export async function searchHepsiburada(
  query: string
): Promise<MarketplaceResultData[]> {
  const q = encodeURIComponent(query);

  const apiPaths = [
    `/api/v1/moriaapi/search?q=${q}&page=1&size=10`,
    `/api/v1/categorySearch?q=${q}&page=1&size=10`,
  ];

  for (const path of apiPaths) {
    const json = await hbFetchJson(path);
    const mapped = mapHbApiProducts(json);
    if (mapped.length > 0) return dedupeResults(mapped);
  }

  const response = await fetch(`${HB_BASE}/ara?q=${q}`, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "text/html,application/xhtml+xml",
      Referer: `${HB_BASE}/`,
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`HEPSIBURADA_SEARCH_FAILED: ${response.status}`);
  }

  const html = await response.text();
  const parsed = parseHepsiburadaSearchHtml(html);
  if (parsed.length === 0) {
    throw new Error("HEPSIBURADA_SEARCH_EMPTY");
  }

  return dedupeResults(parsed);
}

type Browser = import("playwright").Browser;

// Один Chromium на все поиски: запуск браузера стоит секунды, а анализ делает десятки запросов.
const BROWSER_IDLE_CLOSE_MS = 60_000;
let sharedBrowser: Promise<Browser> | null = null;
let browserUsers = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function acquireBrowser(): Promise<Browser> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  browserUsers++;

  const current = sharedBrowser ? await sharedBrowser.catch(() => null) : null;
  if (current?.isConnected()) return current;

  const { chromium } = await import("playwright");
  sharedBrowser = chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    return await sharedBrowser;
  } catch (error) {
    sharedBrowser = null;
    browserUsers--;
    throw error;
  }
}

function releaseBrowser() {
  browserUsers = Math.max(0, browserUsers - 1);
  if (browserUsers > 0 || !sharedBrowser) return;
  idleTimer = setTimeout(() => {
    const closing = sharedBrowser;
    sharedBrowser = null;
    idleTimer = null;
    void closing?.then((b) => b.close()).catch(() => undefined);
  }, BROWSER_IDLE_CLOSE_MS);
}

async function withTurkeyBrowser<T>(
  fn: (page: import("playwright").Page) => Promise<T>
): Promise<T> {
  const browser = await acquireBrowser();
  let context: import("playwright").BrowserContext | undefined;

  try {
    context = await browser.newContext({
      userAgent: BROWSER_HEADERS["User-Agent"],
      locale: "tr-TR",
      timezoneId: "Europe/Istanbul",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
      },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    const page = await context.newPage();
    return await fn(page);
  } finally {
    await context?.close().catch(() => undefined);
    releaseBrowser();
  }
}

function extractTrendyolTitle(card: {
  alt?: string | null;
  text?: string | null;
}): string {
  if (card.alt && card.alt.length > 5 && !card.alt.startsWith("Damga")) {
    return card.alt.replace(/\.\.\.$/, "").trim();
  }
  const lines = (card.text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/^en çok|^fenomen|^flaş|^videolu|^başarılı/i.test(line)) continue;
    if (/^\d+([.,]\d+)?$/.test(line)) continue;
    if (/^\(?\d+\)?$/.test(line)) continue;
    if (/kargo|teslimat|plus|sepete|günün|indirim|kupon|:/i.test(line)) continue;
    if (line.length > 8) return line;
  }
  return lines.find((line) => line.length > 8) ?? "";
}

function extractN11Title(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const lower = line.toLocaleLowerCase("tr-TR");
    if (lower.includes("ücretsiz kargo") || lower.includes("sponsorlu")) continue;
    if (lower === "sepette") continue;
    if (/^\(\d+\)$/.test(line)) continue;
    if (/^\d+([.,]\d+)?\s*tl$/i.test(line)) continue;
    if (lower.includes("günün en düşük fiyatı")) continue;
    if (line.length > 10) return line;
  }
  return "";
}

function extractN11Price(text: string): number | null {
  const sepette = extractSepetePriceFromText(text);
  if (sepette != null) return sepette;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (isCouponPriceContext(line)) continue;
    if (!/\d+[.,]\d+\s*TL/i.test(line)) continue;
    const price = parseTryPrice(line);
    if (price) return price;
  }

  const prices = lines
    .filter((line) => /\d+[.,]\d+\s*TL/i.test(line))
    .map((line) => parseTryPrice(line))
    .filter((price): price is number => price != null && price > 0);

  if (prices.length === 0) return null;
  return prices[0];
}

/** Строка — это только цена: «1.379 TL» / «1.365,21 TL» (не «En Çok Satan 1. Ürün», не «25 TL Kupon»). */
const STANDALONE_TRY_PRICE = /^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*TL$/i;

function extractTrendyolPriceFromCardText(text: string): number | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const [index, line] of lines.entries()) {
    if (!STANDALONE_TRY_PRICE.test(line)) continue;
    // Цена по подписке Trendyol Plus идёт строкой после «Trendyol Plus ile» — это не цена для всех
    if (/plus/i.test(lines[index - 1] ?? "")) continue;
    const price = parseTryPrice(line);
    if (price) return price;
  }
  return null;
}

export async function searchTrendyol(
  query: string
): Promise<MarketplaceResultData[]> {
  return withTurkeyBrowser(async (page) => {
    const context = page.context();
    await context.addCookies(TRENDYOL_COOKIES);

    const searchUrl = `${TY_BASE}/sr?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page
      .waitForSelector('a[data-testid="product-card"]', { timeout: 15000 })
      .catch(() => undefined);

    const apiUrl = `https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${encodeURIComponent(query)}&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR&channelId=1`;
    try {
      const apiResponse = await context.request.get(apiUrl, {
        headers: {
          Accept: "application/json",
          Origin: TY_BASE,
          Referer: searchUrl,
        },
      });
      if (apiResponse.ok()) {
        const json = await apiResponse.json();
        const products =
          (json as { result?: { products?: unknown[] } }).result?.products ??
          (json as { products?: unknown[] }).products ??
          [];
        const mapped: MarketplaceResultData[] = [];
        for (const raw of products) {
          if (!raw || typeof raw !== "object") continue;
          const item = raw as Record<string, unknown>;
          const title = String(item.name ?? item.title ?? "");
          const price = extractTrendyolPriceFromApiItem(item);
          const urlPath = String(item.url ?? "");
          const url = urlPath
            ? absoluteUrl(TY_BASE, urlPath)
            : item.id
              ? `${TY_BASE}/p-${item.id}`
              : "";
          const imageUrl =
            (item.images as string[] | undefined)?.[0] ??
            (item.image as string | undefined);
          if (!title || !url || price <= 0) continue;
          mapped.push(buildSearchResult("trendyol", title, price, url, imageUrl));
        }
        if (mapped.length > 0) return dedupeResults(mapped);
      }
    } catch {
      // fall back to DOM parsing
    }

    // Карточки подгружаются при прокрутке — без неё видно только ~10 товаров
    for (let i = 0; i < TRENDYOL_SCROLL_STEPS; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1200);
    }

    const cards = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a[data-testid="product-card"]')].map((card) => ({
        href: card.getAttribute("href"),
        alt: card.querySelector("img[data-testid='image-img'], img")?.getAttribute("alt"),
        text: card.innerText,
        // Актуальная цена: со скидкой (первое число в блоке) или единственная цена
        priceText:
          (
            card.querySelector(
              '[data-testid="discounted-price"], .discounted-price, [data-testid="single-price"], .single-price, .prc-box-dscntd'
            )?.textContent ?? ""
          )
            .match(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*TL/i)?.[0] ?? "",
        image:
          card.querySelector("img[data-testid='image-img'], img[src*='dsmcdn']")?.getAttribute("src") ??
          undefined,
      }))
    );

    const mapped = cards
      .map((card) => {
        const url = card.href ? absoluteUrl(TY_BASE, card.href) : "";
        const title = extractTrendyolTitle(card);
        const price =
          parseTryPrice(card.priceText) ??
          extractTrendyolPriceFromCardText(card.text ?? "");
        if (!url || !title || !price) return null;
        return buildSearchResult("trendyol", title, price, url, card.image);
      })
      .filter((item): item is MarketplaceResultData => item != null);

    if (mapped.length === 0) {
      throw new Error("TRENDYOL_SEARCH_EMPTY");
    }

    return dedupeResults(mapped);
  });
}

export async function searchN11(query: string): Promise<MarketplaceResultData[]> {
  return withTurkeyBrowser(async (page) => {
    await page.goto(`https://www.n11.com/arama?q=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page
      .waitForSelector("a.product-item[href*='/urun/']", { timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);

    const cards = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a.product-item[href*='/urun/']")].map((card) => ({
        href: card.getAttribute("href"),
        text: card.innerText,
        priceText:
          card.querySelector(".newPrice ins")?.textContent?.trim() ??
          card.querySelector(".newPrice")?.textContent?.trim() ??
          "",
        title:
          card.querySelector("img.listing-items-image, img")?.getAttribute("alt") ??
          card.querySelector("[title]")?.getAttribute("title") ??
          "",
        image:
          card.querySelector("img.listing-items-image, img")?.getAttribute("src") ??
          undefined,
      }))
    );

    const mapped = cards
      .map((card) => {
        const url = card.href ?? "";
        const title = card.title || extractN11Title(card.text ?? "");
        const price =
          parseTryPrice(card.priceText) ?? extractN11Price(card.text ?? "");
        if (!url || !title || !price) return null;
        return buildSearchResult("n11", title, price, url, card.image);
      })
      .filter((item): item is MarketplaceResultData => item != null);

    if (mapped.length === 0) {
      throw new Error("N11_SEARCH_EMPTY");
    }

    return dedupeResults(mapped);
  });
}
