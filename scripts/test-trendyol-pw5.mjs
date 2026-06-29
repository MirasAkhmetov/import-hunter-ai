import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
});
const page = await context.newPage();

await page.goto("https://www.trendyol.com", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);

const body1 = await page.evaluate(() => document.body?.innerText?.slice(0, 300));
console.log("landing body:", body1);

for (const label of ["Türkiye", "Turkey"]) {
  const btn = page.getByText(label, { exact: true });
  if (await btn.count()) {
    await btn.first().click();
    console.log("clicked", label);
    break;
  }
}
await page.waitForTimeout(3000);

for (const label of [/Tümünü Kabul/, /Kabul Et/, /Accept All/]) {
  const btn = page.getByRole("button", { name: label });
  if (await btn.count()) {
    try {
      await btn.first().click({ timeout: 3000 });
      console.log("accepted cookies");
      break;
    } catch {}
  }
}
await page.waitForTimeout(2000);

await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);

const body2 = await page.evaluate(() => document.body?.innerText?.slice(0, 400));
console.log("search body:", body2);

const cards = await page.evaluate(() =>
  [...document.querySelectorAll("a")].filter((a) => /-p-\d+/.test(a.getAttribute("href") || "")).slice(0, 5).map((a) => ({
    href: a.getAttribute("href"),
    text: a.textContent?.trim().slice(0, 60),
  }))
);
console.log("cards", cards);

const apiUrl =
  "https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=Braun&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR";
const apiRes = await context.request.get(apiUrl, {
  headers: {
    Accept: "application/json",
    "Accept-Language": "tr-TR,tr;q=0.9",
    Origin: "https://www.trendyol.com",
    Referer: "https://www.trendyol.com/sr?q=Braun",
  },
});
const apiText = await apiRes.text();
console.log("API via context.request", apiRes.status(), apiText.length);
console.log(apiText.slice(0, 1200));

await browser.close();
