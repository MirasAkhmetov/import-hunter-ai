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

const cards = await page.evaluate(() =>
  [...document.querySelectorAll("div.p-card-wrppr, div[class*='product-card']")].slice(0, 5).map((card) => {
    const link = card.querySelector("a[href*='-p-']");
    const title = card.querySelector(".prdct-desc-cntnr-name, span[class*='prdct-desc'], [class*='product-desc'] span")?.textContent?.trim();
    const price =
      card.querySelector(".prc-box-dscntd, .prc-box-sllng, [class*='price-box'] [class*='prc']")?.textContent?.trim() ||
      card.querySelector("span[class*='prc']")?.textContent?.trim();
    const image = card.querySelector("img")?.getAttribute("src");
    return { title, price, href: link?.getAttribute("href"), image };
  })
);
console.log(JSON.stringify(cards, null, 2));

await browser.close();
