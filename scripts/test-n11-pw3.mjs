import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.n11.com/arama?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(10000);
const html = await page.content();
console.log("len", html.length, "urun links", (html.match(/\/urun\//g) || []).length);

const cards = await page.evaluate(() => {
  const seen = new Set();
  const out = [];
  for (const a of document.querySelectorAll("a[href*='/urun/']")) {
    const href = a.getAttribute("href");
    if (!href || seen.has(href)) continue;
    seen.add(href);
    let node = a;
    for (let i = 0; i < 12; i++) {
      node = node.parentElement;
      if (!node) break;
      const text = (node.innerText || "").trim();
      if (text.length > 15 && text.length < 400 && /\d+[.,]\d+\s*TL/i.test(text)) {
        out.push({ href, text });
        break;
      }
    }
    if (out.length >= 5) break;
  }
  return out;
});
console.log(JSON.stringify(cards, null, 2));
await browser.close();
