/**
 * Quick verification: node scripts/test-parse-product.mjs
 */
const TEST_URL =
  "https://www.hepsiburada.com/oral-b-sarjli-elektrikli-dis-fircasi-vitality-pro-siyah-koruma-ve-temizlik-pm-HBC00002LN3IF";

function extractHepsiburadaEmbeddedState(html) {
  if (!html.includes("productState")) return null;
  const priceMatch = html.match(
    /"productState"[\s\S]*?"prices"\s*:\s*\[\s*\{[^}]*"value"\s*:\s*([\d.]+)/
  );
  if (!priceMatch) return null;
  const price = Number(priceMatch[1]);
  if (!Number.isFinite(price) || price <= 0) return null;
  const nameMatch = html.match(
    /"productState"[\s\S]*?"product"\s*:\s*\{[\s\S]*?"name"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  const brandMatch = html.match(
    /"productState"[\s\S]*?"product"\s*:\s*\{[\s\S]*?"brand"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  const name = nameMatch?.[1]?.replace(/\\"/g, '"') ?? "";
  const brand = brandMatch?.[1]?.replace(/\\"/g, '"') ?? "";
  const title = brand && name ? `${brand} ${name}` : name || brand || "Unknown product";
  return { title, price, currency: "TRY" };
}

async function main() {
  const r = await fetch(TEST_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
    redirect: "follow",
  });
  const html = await r.text();
  const parsed = extractHepsiburadaEmbeddedState(html);
  console.log("status:", r.status, "htmlLen:", html.length);
  console.log("parsed:", parsed);

  if (!parsed?.price) {
    console.error("FAILED");
    process.exit(1);
  }
  console.log("SUCCESS:", parsed.price, parsed.currency);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
