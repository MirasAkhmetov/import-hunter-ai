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
]);
const page = await context.newPage();
await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);
const html = await page.content();

const idx = html.indexOf("-p-");
console.log("first -p- at", idx);
console.log(html.slice(idx - 150, idx + 250));

const patterns = [
  /"url"\s*:\s*"([^"]+-p-\d+)"/g,
  /"id"\s*:\s*(\d+)[\s\S]{0,200}?"name"\s*:\s*"([^"]+)"/g,
  /"contentId"\s*:\s*(\d+)/g,
  /"sellingPrice"\s*:\s*([\d.]+)/g,
  /"discountedPrice"\s*:\s*\{[\s\S]*?"value"\s*:\s*([\d.]+)/g,
];
for (const p of patterns) {
  const m = [...html.matchAll(p)];
  console.log(p.source.slice(0, 40), m.length, m.slice(0, 2));
}

const cards = await page.evaluate(() => {
  return [...document.querySelectorAll("a")].map((a) => ({
    href: a.getAttribute("href"),
    text: a.textContent?.trim().slice(0, 40),
  })).filter((x) => x.href?.includes("-p-")).slice(0, 5);
});
console.log("DOM links", cards);

await browser.close();
