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
  const seen = new Set();
  const out = [];
  for (const a of document.querySelectorAll("a[href*='-p-']")) {
    const href = a.getAttribute("href");
    if (!href || !/-p-\d+/.test(href) || seen.has(href)) continue;
    seen.add(href);
    let node = a;
    let best = null;
    for (let i = 0; i < 15; i++) {
      node = node.parentElement;
      if (!node) break;
      const text = node.innerText || "";
      if (text.includes("TL") && text.length < 500 && text.length > 20) {
        best = { href, text };
        break;
      }
    }
    if (best) out.push(best);
    if (out.length >= 5) break;
  }
  return out;
});

for (const c of cards) {
  const priceMatch = c.text.match(/([\d.,]+)\s*TL/);
  const title = c.text
    .replace(/Hızlı Bakış/g, "")
    .replace(/En Çok (Satan|Ziyaret Edilen) \d+\. Ürün/g, "")
    .replace(/Fenomen Seçimi/g, "")
    .replace(/Kargo Bedava/g, "")
  const price = priceMatch ? priceMatch[1] : null;
  console.log({ href: c.href, price, title: title.slice(0, 80) });
}

await browser.close();
