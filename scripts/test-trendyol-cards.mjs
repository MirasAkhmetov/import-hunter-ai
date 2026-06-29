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
  [...document.querySelectorAll(".search-result-content")].slice(0, 5).map((card) => ({
    html: card.innerHTML.slice(0, 500),
    text: card.innerText,
    href: card.querySelector("a[href*='-p-']")?.getAttribute("href"),
    price: card.querySelector(".prc-box-dscntd, .prc-box-sllng, [class*='price-box']")?.textContent?.trim(),
    title: card.querySelector(".prdct-desc-cntnr-name")?.textContent?.trim(),
  }))
);
console.log(JSON.stringify(cards, null, 2));
await browser.close();
