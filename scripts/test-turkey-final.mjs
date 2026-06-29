import { chromium } from "playwright";

function parseTrPrice(text) {
  if (!text) return null;
  const m = text.match(/([\d.,]+)\s*TL/i);
  if (!m) return null;
  const normalized = m[1].replace(/\./g, "").replace(",", ".");
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
  await page.waitForSelector("a[href*='-p-']", { timeout: 30000 });
  const cards = await page.evaluate(() => {
    const seen = new Set();
    const out = [];
    for (const a of document.querySelectorAll("a[href*='-p-']")) {
      const href = a.getAttribute("href");
      if (!href || !/-p-\d+/.test(href) || seen.has(href)) continue;
      seen.add(href);
      let el = a;
      let card = null;
      for (let i = 0; i < 8; i++) {
        el = el.parentElement;
        if (!el) break;
        if (el.querySelector(".prdct-desc-cntnr-name, .prc-box-dscntd, .prc-box-sllng")) {
          card = el;
          break;
        }
      }
      const title =
        card?.querySelector(".prdct-desc-cntnr-name")?.textContent?.trim() ||
        a.getAttribute("title") ||
        "";
      const priceText = card?.querySelector(".prc-box-dscntd, .prc-box-sllng")?.textContent?.trim() || "";
      const image = card?.querySelector("img[src*='dsmcdn']")?.getAttribute("src");
      out.push({ href, title, priceText, image });
      if (out.length >= 5) break;
    }
    return out;
  });
  console.log("Trendyol:");
  for (const c of cards) console.log({ ...c, price: parseTrPrice(c.priceText) });
  await browser.close();
}

// n11
{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("a[href*='/urun/']", { timeout: 30000 });
  const cards = await page.evaluate(() => {
    const seen = new Set();
    const out = [];
    for (const a of document.querySelectorAll("a[href*='/urun/']")) {
      const href = a.getAttribute("href");
      if (!href || seen.has(href)) continue;
      seen.add(href);
      let el = a;
      let card = null;
      for (let i = 0; i < 10; i++) {
        el = el.parentElement;
        if (!el) break;
        if (el.querySelector(".productName, .newPrice, h3")) {
          card = el;
          break;
        }
      }
      const title = card?.querySelector(".productName, h3")?.textContent?.trim() || a.querySelector("img")?.getAttribute("alt") || "";
      const priceText = card?.querySelector(".newPrice ins, .newPrice")?.textContent?.trim() || "";
      const image = card?.querySelector("img")?.getAttribute("src") || a.querySelector("img")?.getAttribute("src");
      out.push({ href, title, priceText, image });
      if (out.length >= 5) break;
    }
    return out;
  });
  console.log("\nn11:");
  for (const c of cards) console.log({ ...c, price: parseTrPrice(c.priceText) });
  await browser.close();
}
