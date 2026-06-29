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
const card = await page.evaluate(() => {
  const el = document.querySelector('a[data-testid="product-card"]');
  return {
    html: el?.innerHTML.slice(0, 1500),
    text: el?.innerText,
    alt: el?.querySelector("img")?.getAttribute("alt"),
  };
});
console.log(JSON.stringify(card, null, 2));
await browser.close();
