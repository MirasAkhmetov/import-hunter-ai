import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
});
const page = await context.newPage();

// Set Turkey store cookies if possible
await context.addCookies([
  { name: "storefrontId", value: "1", domain: ".trendyol.com", path: "/" },
  { name: "countryCode", value: "TR", domain: ".trendyol.com", path: "/" },
]);

await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });

// Try clicking Turkey if country selector appears
const turkeyBtn = page.getByText("Türkiye", { exact: true });
if (await turkeyBtn.count()) {
  console.log("clicking Türkiye");
  await turkeyBtn.first().click();
  await page.waitForTimeout(3000);
}

// Accept cookies if present
const accept = page.getByRole("button", { name: /kabul|accept|tamam/i });
if (await accept.count()) {
  try {
    await accept.first().click({ timeout: 3000 });
    await page.waitForTimeout(2000);
  } catch {}
}

await page.waitForTimeout(5000);
const html = await page.content();
console.log("len", html.length, "has -p-", html.includes("-p-"));
const links = [...html.matchAll(/href="([^"]+-p-\d+)"/g)];
console.log("links", links.length, links.slice(0,3).map((m) => m[1]));

// Try API from browser context
const api = await page.evaluate(async () => {
  const q = encodeURIComponent("Braun");
  const url = `https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${q}&pi=1`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const text = await r.text();
  return { status: r.status, len: text.length, sample: text.slice(0, 1000) };
});
console.log("in-page API", api);

await browser.close();
