import { chromium } from "playwright";

function parseTrPrice(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/([\d.,]+)\s*TL/gi)];
  if (!matches.length) return null;
  const raw = matches[0][1];
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

// Trendyol
{
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addCookies([
    { name: "storefrontId", value: "1", domain: ".trendyol.com", path: "/" },
    { name: "countryCode", value: "TR", domain: ".trendyol.com", path: "/" },
    { name: "language", value: "tr", domain: ".trendyol.com", path: "/" },
    { name: "culture", value: "tr-TR", domain: ".trendyol.com", path: "/" },
  ]);
  const page = await context.newPage();
  await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('a[data-testid="product-card"]')].slice(0, 5).map((card) => ({
      href: card.getAttribute("href"),
      title: card.querySelector(".prdct-desc-cntnr-name, [class*='prdct-desc'] span")?.textContent?.trim(),
      priceText: card.querySelector(".prc-box-dscntd, .prc-box-sllng")?.textContent?.trim(),
      image: card.querySelector("img[data-testid='image-img']")?.getAttribute("src"),
      text: card.innerText?.slice(0, 120),
    }))
  );
  console.log("Trendyol:");
  for (const c of cards) console.log({ href: c.href, title: c.title, price: parseTrPrice(c.priceText || c.text), image: c.image?.slice(0, 60) });
  await browser.close();
}

// n11 from HTML in playwright
{
  const browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "tr-TR",
    viewport: { width: 1366, height: 768 },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
  const page = await context.newPage();
  await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);
  const html = await page.content();

  const items = [];
  const seen = new Set();
  const linkRe = /href="(https:\/\/www\.n11\.com\/urun\/[^"]+)"/g;
  for (const m of html.matchAll(linkRe)) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);
    const idx = m.index ?? 0;
    const chunk = html.slice(idx, idx + 2500);
    const title =
      chunk.match(/title="([^"]+)"/)?.[1] ||
      chunk.match(/alt="([^"]+)"/)?.[1] ||
      chunk.match(/class="productName"[^>]*>([^<]+)</)?.[1];
    const priceMatch = chunk.match(/class="newPrice"[^>]*>[\s\S]*?<ins[^>]*>([^<]+)</) ||
      chunk.match(/itemprop="price"[^>]*content="([^"]+)"/);
    items.push({ href, title, price: priceMatch?.[1] });
    if (items.length >= 5) break;
  }
  console.log("\nn11:");
  console.log(JSON.stringify(items, null, 2));
  await browser.close();
}
