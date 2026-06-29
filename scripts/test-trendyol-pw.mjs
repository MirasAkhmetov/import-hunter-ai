import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "networkidle", timeout: 60000 });
const html = await page.content();
console.log("len", html.length);
console.log("has product", html.includes("product"));
console.log("has prdct", html.includes("prdct"));
console.log("has -p-", html.includes("-p-"));

const idx = html.indexOf("prdct");
console.log("prdct idx", idx, idx > 0 ? html.slice(idx - 100, idx + 400) : "n/a");

const idx2 = html.indexOf("contentId");
console.log("contentId", idx2, idx2 > 0 ? html.slice(idx2 - 50, idx2 + 300) : "n/a");

const idx3 = html.indexOf("sellingPrice");
console.log("sellingPrice", idx3, idx3 > 0 ? html.slice(idx3 - 50, idx3 + 300) : "n/a");

const allLinks = await page.evaluate(() =>
  [...document.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && (h.includes("p-") || h.includes("product")))
    .slice(0, 10)
);
console.log("links", allLinks);

const cards = await page.evaluate(() => {
  const selectors = [
    ".p-card-wrppr",
    "[class*='product-card']",
    "[data-testid*='product']",
    "div[class*='search-result']",
  ];
  const out = {};
  for (const s of selectors) out[s] = document.querySelectorAll(s).length;
  return out;
});
console.log("card counts", cards);

await browser.close();
