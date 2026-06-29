import {
  BROWSER_HEADERS,
  extractPriceFromHtml,
} from "./htmlPriceExtractor";
import { getCurrencyForMarketplace } from "../marketplaces/marketplaceCurrency";
import { parseTurkishDomPrice, normalizeTurkishLiraPrice } from "./turkishPrice";
import {
  extractHepsiburadaSalePrice,
  extractN11SalePrice,
  extractSepetePriceFromText,
  extractTrendyolMainProductPriceFromState,
  extractTrendyolSalePrice,
} from "./turkishSepetePrice";

const PLAYWRIGHT_MARKETPLACES = new Set([
  "hepsiburada",
  "trendyol",
  "n11",
  "amazon-tr",
  "wildberries",
  "ozon",
]);

export function isBlockedOrEmptyHtml(html: string): boolean {
  if (html.length < 3000) return true;
  // На странице товара есть бейдж «güvenli ürün» — не путать с блокировкой
  if (
    html.includes("productState") &&
    /"prices"\s*:\s*\[\s*\{[^}]*"value"\s*:\s*[\d.]+/.test(html)
  ) {
    return false;
  }
  if (
    html.includes("displayPriceFloat") ||
    html.includes("displayPriceNumber") ||
    (html.includes("n11.com") && html.includes('"groupId"')) ||
    (html.includes("trendyol") && html.includes("sellingPrice"))
  ) {
    return false;
  }
  if (/Güvenlik|Security Check|cf-browser-verification|challenge-platform|Access Denied/i.test(html)) {
    return true;
  }
  return false;
}

export async function fetchProductHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function parseProductWithPlaywright(
  url: string,
  marketplace: string
): Promise<ReturnType<typeof extractPriceFromHtml>> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  try {
    const isRuMarketplace =
      marketplace === "wildberries" || marketplace === "ozon";
    const context = await browser.newContext({
      userAgent: BROWSER_HEADERS["User-Agent"],
      locale: isRuMarketplace ? "ru-RU" : "tr-TR",
      timezoneId: isRuMarketplace ? "Europe/Moscow" : "Europe/Istanbul",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        "Accept-Language": isRuMarketplace
          ? "ru-RU,ru;q=0.9,en-US;q=0.8"
          : "tr-TR,tr;q=0.9,en-US;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });
    if (marketplace === "trendyol") {
      await context.addCookies([
        { name: "storefrontId", value: "1", domain: ".trendyol.com", path: "/" },
        { name: "countryCode", value: "TR", domain: ".trendyol.com", path: "/" },
        { name: "language", value: "tr", domain: ".trendyol.com", path: "/" },
        { name: "culture", value: "tr-TR", domain: ".trendyol.com", path: "/" },
      ]);
    }
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });

    if (marketplace === "hepsiburada") {
      try {
        await page.waitForFunction(
          () =>
            document.body?.innerHTML.includes("productState") ||
            document.querySelector('[data-test-id="price-current-price"]') !=
              null,
          { timeout: 12000 }
        );
      } catch {
        // may still be in initial HTML
      }
    } else if (marketplace === "n11") {
      try {
        await page.waitForFunction(
          () =>
            document.body?.innerHTML.includes("displayPriceFloat") ||
            document.querySelector(".newPrice ins, .newPrice, [itemprop='price']") !=
              null,
          { timeout: 12000 }
        );
      } catch {
        // may still be in initial HTML
      }
    } else if (marketplace === "trendyol") {
      try {
        await page.waitForFunction(
          () =>
            document.querySelector(".prc-box-dscntd, .prc-box-sllng") != null ||
            document.body?.innerHTML.includes("sellingPrice"),
          { timeout: 15000 }
        );
      } catch {
        // may still be in initial HTML
      }
    } else if (marketplace === "ozon") {
      try {
        await page.waitForFunction(
          () =>
            document.body?.innerHTML.includes("finalPrice") ||
            document.querySelector('[data-widget="webPrice"]') != null,
          { timeout: 12000 }
        );
      } catch {
        // may still be in initial HTML
      }
    } else if (marketplace === "wildberries") {
      try {
        await page.waitForFunction(
          () =>
            document.body?.innerHTML.includes('"product"') ||
            document.querySelector('[class*="price"]') != null,
          { timeout: 12000 }
        );
      } catch {
        // may still be in initial HTML
      }
    } else {
      try {
        await page.waitForSelector(
          '[data-test-id="price-current-price"], [itemprop="price"], #offering-price, [class*="price"]',
          { timeout: 8000 }
        );
      } catch {
        // price may still be in HTML/JSON
      }
    }

    await page.waitForTimeout(1500);

    if (marketplace === "trendyol") {
      const trendyolMain = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        const state =
          w.__PRODUCT_DETAIL_APP_INITIAL_STATE__ ??
          w.PRODUCT_DETAIL_APP_INITIAL_STATE__;
        if (state) return { kind: "state" as const, state };

        const otherHeader = [...document.querySelectorAll("h2,h3,div,span")].find(
          (el) => /Ürünün\s+Diğer\s+Satıcıları/i.test(el.textContent?.trim() ?? "")
        );
        for (const el of document.querySelectorAll(".prc-box-dscntd")) {
          if (
            otherHeader &&
            (otherHeader.compareDocumentPosition(el) &
              Node.DOCUMENT_POSITION_FOLLOWING) !==
              0
          ) {
            continue;
          }
          const text = el.textContent?.trim();
          if (text) return { kind: "dom" as const, text };
        }
        return null;
      });

      if (trendyolMain?.kind === "state") {
        const statePrice = extractTrendyolMainProductPriceFromState(
          trendyolMain.state
        );
        if (statePrice != null && statePrice > 0) {
          const title =
            (await page.evaluate(() =>
              document.querySelector("h1")?.textContent?.trim()
            )) ?? "Unknown product";
          const imageUrl = await page.evaluate(() => {
            const og = document.querySelector('meta[property="og:image"]');
            return og?.getAttribute("content") ?? undefined;
          });
          return {
            title,
            price: statePrice,
            currency: getCurrencyForMarketplace(marketplace),
            imageUrl,
          };
        }
      }

      if (trendyolMain?.kind === "dom" && trendyolMain.text) {
        const domPrice = parseTurkishDomPrice(trendyolMain.text);
        if (domPrice != null && domPrice > 0) {
          const title =
            (await page.evaluate(() =>
              document.querySelector("h1")?.textContent?.trim()
            )) ?? "Unknown product";
          const imageUrl = await page.evaluate(() => {
            const og = document.querySelector('meta[property="og:image"]');
            return og?.getAttribute("content") ?? undefined;
          });
          return {
            title,
            price: domPrice,
            currency: getCurrencyForMarketplace(marketplace),
            imageUrl,
          };
        }
      }
    }

    const html = await page.content();
    if (isBlockedOrEmptyHtml(html)) {
      console.warn(
        `[price-verification] Playwright blocked for ${marketplace}: ${url}`
      );
      return null;
    }

    const salePrice =
      marketplace === "hepsiburada"
        ? extractHepsiburadaSalePrice(html)
        : marketplace === "trendyol"
          ? extractTrendyolSalePrice(html)
          : marketplace === "n11"
            ? extractN11SalePrice(html)
            : null;

    if (salePrice != null) {
      const pageText = await page.evaluate(() => document.body?.innerText ?? "");
      const title =
        (await page.evaluate(() =>
          document.querySelector("h1")?.textContent?.trim()
        )) ?? "Unknown product";
      const fromText =
        marketplace === "n11" ? extractSepetePriceFromText(pageText) : null;
      const price = fromText ?? salePrice;
      const imageUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        return og?.getAttribute("content") ?? undefined;
      });
      return {
        title,
        price,
        currency: getCurrencyForMarketplace(marketplace),
        imageUrl,
      };
    }

    const fromHtml = extractPriceFromHtml(html, url, marketplace);
    if (fromHtml) return fromHtml;

    const dom = await page.evaluate(() => {
      const title =
        document.querySelector("h1")?.textContent?.trim() ??
        document.querySelector('[data-test-id="product-name"]')?.textContent?.trim() ??
        document.title;

      const scripts = Array.from(document.querySelectorAll("script"));
      for (const script of scripts) {
        const text = script.textContent ?? "";
        if (!text.includes("productState")) continue;
        const entries: Array<{ value: number; discountRate: number }> = [];
        const re =
          /"value"\s*:\s*([\d.]+)\s*,\s*"currency"\s*:\s*\d+\s*,\s*"discountRate"\s*:\s*(\d+)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const value = Number(m[1]);
          const discountRate = Number(m[2]);
          if (value > 0) entries.push({ value, discountRate });
        }
        if (entries.length > 0) {
          const discounted = entries.filter((e) => e.discountRate > 0);
          const price = discounted.length
            ? Math.min(...discounted.map((e) => e.value))
            : Math.min(...entries.map((e) => e.value));
          const nameMatch = text.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"/);
          const brandMatch = text.match(/"brand"\s*:\s*"((?:\\.|[^"\\])*)"/);
          const name = nameMatch?.[1] ?? "";
          const brand = brandMatch?.[1] ?? "";
          const fullTitle =
            brand && name ? `${brand} ${name}` : name || brand || title;
          return { title: fullTitle, price, priceText: "" };
        }
      }

      const priceSelectors =
        marketplace === "trendyol"
          ? []
          : marketplace === "hepsiburada"
            ? [
                '[aria-label*="Sepete ekle, fiyat"]',
                '[data-test-id="price-current-price"]',
              ]
            : [
                ".newPrice ins",
                ".newPrice",
                '[itemprop="price"]',
              ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const raw =
          el.getAttribute("content") ??
          el.getAttribute("data-price") ??
          el.textContent ??
          "";
        return { title, price: 0, priceText: raw };
      }

      return { title, price: 0, priceText: "" };
    });

    const domPrice =
      dom.price > 0
        ? normalizeTurkishLiraPrice(dom.price)
        : parseTurkishDomPrice(dom.priceText);
    if (domPrice != null && domPrice > 0) {
      const imageUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        return og?.getAttribute("content") ?? undefined;
      });

      return {
        title: dom.title || "Unknown product",
        price: domPrice,
        currency: getCurrencyForMarketplace(marketplace),
        imageUrl,
      };
    }

    return null;
  } finally {
    await browser.close();
  }
}

export function shouldUsePlaywrightFallback(
  marketplace: string,
  html: string | null,
  extracted: ReturnType<typeof extractPriceFromHtml>
): boolean {
  if (!PLAYWRIGHT_MARKETPLACES.has(marketplace)) return false;
  // TR: fetch часто отдаёт неполный HTML или цену без скидки — всегда уточняем в браузере
  if (
    marketplace === "n11" ||
    marketplace === "hepsiburada" ||
    marketplace === "trendyol"
  ) {
    return true;
  }
  if (extracted) return false;
  if (html && !isBlockedOrEmptyHtml(html)) return false;
  return true;
}
