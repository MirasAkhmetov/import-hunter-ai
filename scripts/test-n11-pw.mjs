import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
});
const page = await context.newPage();
await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);

const body = await page.evaluate(() => document.body?.innerText?.slice(0, 300));
console.log("body", body);

const cards = await page.evaluate(() =>
  [...document.querySelectorAll(".columnContent, .productItem, li.column")].slice(0, 5).map((card) => ({
    title: card.querySelector("h3, .productName, .proName")?.textContent?.trim(),
    price: card.querySelector(".newPrice ins, .newPrice, [itemprop='price']")?.textContent?.trim(),
    href: card.querySelector("a[href*='/urun/']")?.getAttribute("href"),
  }))
);
console.log("cards1", cards);

const cards2 = await page.evaluate(() =>
  [...document.querySelectorAll("a[href*='/urun/']")].slice(0, 5).map((a) => {
    const card = a.closest("li, .productItem, .columnContent") || a.parentElement;
    return {
      title: card?.querySelector("h3, .productName")?.textContent?.trim() || a.getAttribute("title"),
      price: card?.querySelector(".newPrice ins, .newPrice")?.textContent?.trim(),
      href: a.getAttribute("href"),
    };
  })
);
console.log("cards2", cards2);

const html = await page.content();
console.log("has urun", html.includes("/urun/"), "cloudflare", /cf-browser-verification/i.test(html));
const links = [...html.matchAll(/href="([^"]*\/urun\/[^"]+)"/g)];
console.log("html links", links.length, links[0]?.[1]);

await browser.close();
