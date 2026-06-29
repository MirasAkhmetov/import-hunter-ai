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
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});
const page = await context.newPage();
await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);
const html = await page.content();
console.log("len", html.length);
console.log(html.slice(0, 800));
console.log("---tail---");
console.log(html.slice(-500));

const title = await page.title();
console.log("title", title);

const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500));
console.log("body", bodyText);

await browser.close();
