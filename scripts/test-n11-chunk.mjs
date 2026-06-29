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
const html = await page.content();
const href = "https://www.n11.com/urun/braun-fs1000-mini-tuy-alma-makinesi-pil-temizleme-fircasi-1970032";
const idx = html.indexOf(href);
console.log(html.slice(idx, idx + 2000));
await browser.close();
