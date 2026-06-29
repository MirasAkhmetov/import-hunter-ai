import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  viewport: { width: 1366, height: 768 },
});
await context.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
const page = await context.newPage();
await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(12000);

const cards = await page.evaluate(() =>
  [...document.querySelectorAll("a.product-item, a[href*='/urun/'].product-item")].slice(0, 5).map((a) => ({
    href: a.getAttribute("href"),
    text: a.innerText?.slice(0, 200),
    html: a.innerHTML.slice(0, 300),
  }))
);
console.log("product-item links", cards);

const cards2 = await page.evaluate(() => {
  const out = [];
  for (const a of document.querySelectorAll("a[href*='/urun/']")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    const item = a.classList.contains("product-item") ? a : a.closest(".product-item, [class*='product-item']");
    const text = item?.innerText || a.innerText || "";
    if (!text) continue;
    out.push({ href, text: text.slice(0, 200) });
    if (out.length >= 5) break;
  }
  return out;
});
console.log("\ncards2", cards2);

await browser.close();
