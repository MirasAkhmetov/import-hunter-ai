import {
  BROWSER_HEADERS,
  extractPriceFromHtml,
} from "./htmlPriceExtractor";
import { getCurrencyForMarketplace } from "../marketplaces/marketplaceCurrency";

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
    (html.includes("n11.com") && html.includes('"groupId"'))
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
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

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

    const html = await page.content();
    if (isBlockedOrEmptyHtml(html)) {
      console.warn(
        `[price-verification] Playwright blocked for ${marketplace}: ${url}`
      );
      return null;
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
        if (text.includes("displayPriceFloat") || text.includes("displayPriceNumber")) {
          const floatMatch = text.match(/"displayPriceFloat"\s*:\s*(\d+)/);
          const numberMatch = text.match(/"displayPriceNumber"\s*:\s*(\d+)/);
          const price = Number(floatMatch?.[1] ?? numberMatch?.[1]);
          if (Number.isFinite(price) && price > 0) {
            return { title, price };
          }
        }
        if (!text.includes("productState")) continue;
        const entries = [];
        const re =
          /"value"\s*:\s*([\d.]+)\s*,\s*"currency"\s*:\s*\d+\s*,\s*"discountRate"\s*:\s*(\d+)/g;
        let m;
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
          return { title: fullTitle, price };
        }
      }

      const priceSelectors = [
        '[data-test-id="price-current-price"]',
        '.newPrice ins',
        '.newPrice',
        '[itemprop="price"]',
        "#offering-price",
        '[class*="PriceBox"] [class*="price"]',
      ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const raw =
          el.getAttribute("content") ??
          el.getAttribute("data-price") ??
          el.textContent ??
          "";
        const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const price = parseFloat(normalized.replace(/[^\d.]/g, ""));
        if (Number.isFinite(price) && price > 0) {
          return { title, price };
        }
      }

      return { title, price: 0 };
    });

    if (dom.price > 0) {
      const imageUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        return og?.getAttribute("content") ?? undefined;
      });

      return {
        title: dom.title || "Unknown product",
        price: dom.price,
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
  if (extracted) return false;
  if (!PLAYWRIGHT_MARKETPLACES.has(marketplace)) return false;
  // n11 часто отдаёт 403 на fetch — нужен Playwright
  if (marketplace === "n11") return true;
  // Playwright is often blocked (403) while server fetch already has productState JSON.
  if (html && !isBlockedOrEmptyHtml(html)) return false;
  return true;
}
