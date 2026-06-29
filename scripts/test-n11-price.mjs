import { chromium } from "playwright";

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
const href = "https://www.n11.com/urun/braun-fs1000-mini-tuy-alma-makinesi-pil-temizleme-fircasi-1970032";
const idx = html.indexOf(href);
const chunk = html.slice(idx, idx + 4000);
console.log(chunk.match(/price|Price|TL|displayPrice/gi));
const pricePatterns = [
  /class="newPrice"[^>]*>[\s\S]*?<ins[^>]*>([^<]+)</,
  /"price"\s*:\s*"([^"]+)"/,
  /"displayPriceFloat"\s*:\s*([\d.]+)/,
  /itemprop="price"[^>]*content="([^"]+)"/,
  /class="priceContainer"[^>]*>[\s\S]*?([\d.,]+)\s*TL/,
];
for (const p of pricePatterns) {
  const m = chunk.match(p);
  console.log(p.source.slice(0, 40), m?.[1] || m?.[0]?.slice(0,80));
}
await browser.close();
