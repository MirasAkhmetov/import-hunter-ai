import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  viewport: { width: 1366, height: 768 },
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});
const page = await context.newPage();
await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(12000);
const html = await page.content();
console.log("len", html.length, "urun", (html.match(/\/urun\//g) || []).length);

const cards = await page.evaluate(() =>
  [...document.querySelectorAll(".searchResultItem, .listItem, li.column, .productItem")].slice(0, 5).map((card) => ({
    cls: card.className,
    text: card.innerText?.slice(0, 150),
    href: card.querySelector("a[href*='/urun/']")?.getAttribute("href"),
  }))
);
console.log("card selectors", cards);

const cards2 = await page.evaluate(() => {
  const seen = new Set();
  const out = [];
  for (const card of document.querySelectorAll(".search-result-content, .columnContent, li")) {
    const link = card.querySelector?.("a[href*='/urun/']");
    const href = link?.getAttribute("href");
    if (!href || seen.has(href)) continue;
    const text = card.innerText || "";
    if (!/\d+[.,]\d+\s*TL/i.test(text)) continue;
    seen.add(href);
    out.push({ href, text: text.slice(0, 200) });
    if (out.length >= 5) break;
  }
  return out;
});
console.log("cards2", cards2);
await browser.close();
