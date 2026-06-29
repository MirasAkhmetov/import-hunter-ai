import { parseLocalizedPrice } from "../parseLocalizedPrice";

/** Trendyol API: цены часто в kuruş (×100). 1_425_000 → 14_250 TL */
export function normalizeTurkishLiraPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return price;

  let value = price;
  if (value >= 100_000) {
    const asLira = value / 100;
    if (asLira >= 50 && asLira <= 500_000) {
      value = asLira;
    }
  }

  return Math.round(value * 100) / 100;
}

function readPriceValue(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "string") {
    const p = parseLocalizedPrice(raw.replace(/[^\d.,]/g, "") || raw);
    return p != null && p > 0 ? p : 0;
  }
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "object" && raw !== null && "value" in raw
        ? Number((raw as { value?: number }).value)
        : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readTrendyolTextPrice(priceObj: Record<string, unknown>): number {
  for (const key of [
    "discountedPriceText",
    "sellingPriceText",
    "salePriceText",
    "currentPriceText",
    "text",
  ]) {
    const raw = priceObj[key];
    if (typeof raw !== "string") continue;
    const p = parseLocalizedPrice(raw.replace(/[^\d.,]/g, "") || raw);
    if (p != null && p >= 50) return normalizeTurkishLiraPrice(p);
  }
  return 0;
}

export function extractTrendyolPriceFromApiItem(
  item: Record<string, unknown>
): number {
  const priceObj = item.price;

  if (priceObj && typeof priceObj === "object") {
    const p = priceObj as Record<string, unknown>;
    const fromText = readTrendyolTextPrice(p);
    if (fromText > 0) return fromText;

    const discounted = readPriceValue(p.discountedPrice);
    if (discounted > 0) return normalizeTurkishLiraPrice(discounted);

    const selling = readPriceValue(p.sellingPrice);
    if (selling > 0) return normalizeTurkishLiraPrice(selling);
  }

  const discounted = readPriceValue(item.discountedPrice);
  if (discounted > 0) return normalizeTurkishLiraPrice(discounted);

  const selling = readPriceValue(item.sellingPrice);
  if (selling > 0) return normalizeTurkishLiraPrice(selling);

  return 0;
}

function parseJsonObjectFromHtml(html: string, marker: string): unknown | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const start = html.indexOf("{", idx);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/** JSON основного товара со страницы (не блок «Diğer Satıcıları»). */
export function extractTrendyolInitialStateFromHtml(html: string): unknown | null {
  for (const marker of [
    "__PRODUCT_DETAIL_APP_INITIAL_STATE__",
    "PRODUCT_DETAIL_APP_INITIAL_STATE__",
  ]) {
    const state = parseJsonObjectFromHtml(html, marker);
    if (state) return state;
  }
  return null;
}

/** Цена победившего оффера / product.price из INITIAL_STATE. */
export function extractTrendyolMainProductPriceFromState(
  state: unknown
): number | null {
  if (!state || typeof state !== "object") return null;

  const product = (state as Record<string, unknown>).product;
  if (!product || typeof product !== "object") return null;

  const productRecord = product as Record<string, unknown>;
  const fromProductPrice = extractTrendyolPriceFromApiItem({
    price: productRecord.price,
  });
  if (fromProductPrice > 0) return fromProductPrice;

  const merchantListing = productRecord.merchantListing;
  if (merchantListing && typeof merchantListing === "object") {
    const listing = merchantListing as Record<string, unknown>;
    const winnerVariant = listing.winnerVariant;
    if (winnerVariant && typeof winnerVariant === "object") {
      const fromWinner = extractTrendyolPriceFromApiItem({
        price: (winnerVariant as Record<string, unknown>).price,
      });
      if (fromWinner > 0) return fromWinner;
    }
  }

  return null;
}

export function extractTrendyolMainProductPriceFromHtml(
  html: string
): number | null {
  const state = extractTrendyolInitialStateFromHtml(html);
  return extractTrendyolMainProductPriceFromState(state);
}

export function parseTurkishDomPrice(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const localized = parseLocalizedPrice(
    trimmed.replace(/[^\d.,]/g, "") || trimmed
  );
  if (localized != null && localized > 0) {
    return normalizeTurkishLiraPrice(localized);
  }

  const digitsOnly = trimmed.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(digitsOnly.replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n > 0) {
    return normalizeTurkishLiraPrice(n);
  }
  return null;
}
