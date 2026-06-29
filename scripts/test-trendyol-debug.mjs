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

const count = await page.locator("a[href*='-p-']").count();
console.log("link count", count);

const sample = await page.evaluate(() => {
  const a = document.querySelector("a[href*='-p-']");
  if (!a) return null;
  const levels = [];
  let node = a;
  for (let i = 0; i < 12; i++) {
    node = node.parentElement;
    if (!node) break;
    levels.push({ tag: node.tagName, cls: node.className?.slice?.(0, 80), text: (node.innerText || "").slice(0, 120) });
  }
  return { href: a.getAttribute("href"), linkText: a.innerText?.slice(0, 120), levels };
});
console.log(JSON.stringify(sample, null, 2));
await browser.close();
