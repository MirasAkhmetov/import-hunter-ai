import { chromium } from "playwright";

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

const cards = await page.evaluate(() => {
  const results = [];
  for (const link of document.querySelectorAll("a[href*='-p-']")) {
    const href = link.getAttribute("href");
    if (!href || !/-p-\d+/.test(href) || results.some((r) => r.href === href)) continue;
    const card = link.closest("div[class*='card'], .p-card-wrppr, .product-card") || link.parentElement?.parentElement?.parentElement;
    const titleEl = card?.querySelector(".prdct-desc-cntnr-name, [class*='prdct-desc-cntnr'] span, [class*='product-desc']");
    const title = titleEl?.textContent?.trim() || link.getAttribute("title");
    const priceEl = card?.querySelector(".prc-box-dscntd, .prc-box-sllng");
    const price = priceEl?.textContent?.trim();
    const image = card?.querySelector("img[src*='dsmcdn']")?.getAttribute("src");
    if (href && title) results.push({ title: title.replace(/^Hızlı Bakış.*?Ürün/, "").trim(), price, href, image });
    if (results.length >= 5) break;
  }
  return results;
});
console.log(JSON.stringify(cards, null, 2));
await browser.close();
