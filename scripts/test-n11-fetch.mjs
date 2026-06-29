const q = encodeURIComponent("Braun");
const r = await fetch(`https://www.n11.com/arama?q=${q}`, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "text/html",
    "Accept-Language": "tr-TR,tr;q=0.9",
    Referer: "https://www.n11.com/",
  },
});
const html = await r.text();
console.log("status", r.status, "len", html.length, "cf", /cf-browser/i.test(html));
const links = [...html.matchAll(/href="(https:\/\/www\.n11\.com\/urun\/[^"]+)"/g)];
console.log("links", links.length);

const chunk = html.slice(html.indexOf("/urun/braun"), html.indexOf("/urun/braun") + 1200);
console.log(chunk);
