import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);

const cards = await page.evaluate(() => {
  const results = [];
  for (const link of document.querySelectorAll("a[href*='/urun/']")) {
    const href = link.getAttribute("href");
    if (!href || results.some((r) => r.href === href)) continue;
    const card = link.closest("li, .productItem, .columnContent, .listView, .pro") || link.parentElement?.parentElement;
    const title =
      card?.querySelector(".productName, .proName, h3")?.textContent?.trim() ||
      link.getAttribute("title") ||
      link.querySelector("img")?.getAttribute("alt");
    const price =
      card?.querySelector(".newPrice ins")?.textContent?.trim() ||
      card?.querySelector(".newPrice")?.textContent?.trim() ||
      card?.querySelector("[itemprop='price']")?.getAttribute("content");
    const image = card?.querySelector("img")?.getAttribute("src") || link.querySelector("img")?.getAttribute("src");
    if (title && href) results.push({ title, price, href, image });
    if (results.length >= 5) break;
  }
  return results;
});
console.log(JSON.stringify(cards, null, 2));

const html = await page.content();
const idx = html.indexOf("/urun/braun-fs1000");
console.log(html.slice(idx - 200, idx + 800));

await browser.close();
