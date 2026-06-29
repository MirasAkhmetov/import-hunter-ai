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
const apiHits = [];
page.on("response", async (res) => {
  const u = res.url();
  if (!u.includes("infinite-scroll") && !u.includes("searchgw")) return;
  try {
    const body = await res.text();
    apiHits.push({ status: res.status(), url: u, len: body.length, body: body.slice(0, 3000) });
  } catch {}
});

await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(10000);

console.log("api hits", apiHits.length);
for (const hit of apiHits) {
  console.log(hit.status, hit.url.slice(0, 120), hit.len);
  if (hit.body.startsWith("{")) {
    try {
      const j = JSON.parse(hit.body.length < 3000 ? hit.body : hit.body + "}");
      const products = j.result?.products || j.products || [];
      console.log("products in json", products.length);
      if (products[0]) console.log(JSON.stringify(products[0], null, 2).slice(0, 800));
    } catch {
      console.log(hit.body.slice(0, 500));
    }
  }
}

const cards = await page.evaluate(() =>
  [...document.querySelectorAll("a[href*='-p-']")].slice(0, 5).map((a) => {
    const card = a.closest("div");
    return {
      href: a.getAttribute("href"),
      text: a.textContent?.trim().slice(0, 60),
      price: card?.querySelector("[class*='price']")?.textContent?.trim(),
    };
  })
);
console.log("DOM cards", cards);

await browser.close();
