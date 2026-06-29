import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  extraHTTPHeaders: {
    "Accept-Language": "tr-TR,tr;q=0.9",
  },
});

const cookies = [
  "storefrontId=1",
  "countryCode=TR",
  "language=tr",
  "culture=tr-TR",
  "COOKIE_TY.IsUserLoggedIn=false",
].map((c) => {
  const [name, ...rest] = c.split("=");
  return { name, value: rest.join("="), domain: ".trendyol.com", path: "/" };
});
await context.addCookies(cookies);

const page = await context.newPage();
await page.goto("https://www.trendyol.com/sr?q=Braun", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(5000);
const body = await page.evaluate(() => document.body?.innerText?.slice(0, 300));
console.log("body", body);

const apiUrls = [
  "https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=Braun&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR&channelId=1",
  "https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=Braun&pi=1",
];
for (const apiUrl of apiUrls) {
  const apiRes = await context.request.get(apiUrl, {
    headers: {
      Accept: "application/json",
      Origin: "https://www.trendyol.com",
      Referer: "https://www.trendyol.com/sr?q=Braun",
    },
  });
  const apiText = await apiRes.text();
  console.log("\nAPI", apiUrl.slice(0, 80), apiRes.status(), apiText.length);
  console.log(apiText.slice(0, 800));
}

await browser.close();
