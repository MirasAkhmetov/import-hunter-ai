import { parseLocalizedPrice } from "../parseLocalizedPrice";
import {
  normalizeTurkishLiraPrice,
  extractTrendyolMainProductPriceFromHtml,
  extractTrendyolMainProductPriceFromState,
} from "./turkishPrice";

/** Цена в TL: 14.250 / 3.899,22 */
const TL_AMOUNT = "([\\d.,]+)\\s*TL";

function parseTryAmount(raw: string): number | null {
  const p = parseLocalizedPrice(raw.replace(/[^\d.,]/g, "") || raw);
  if (p == null || p <= 0) return null;
  return normalizeTurkishLiraPrice(p);
}

/** Купон / kuponla — не реальная цена покупки без кода. */
export function isCouponPriceContext(context: string): boolean {
  const lower = context.toLowerCase();
  // «Sepette» — цена в корзине, не купон по коду
  if (/sepette/i.test(lower) && !/kuponla|kupon\s*ile/i.test(lower)) {
    return false;
  }
  return (
    /kuponla|kuponu|indirim\s*kuponu|kupon\s*fırsat|kupon\s*ile|tl\s*kupon|kupona|kupon\s*indirim|coupon\s*price|ty\s*plus.*kupon|kuponla\s*al/i.test(
      lower
    ) && !/kupon\s*indirimi\s*yok/i.test(lower)
  );
}

function isTrendyolCouponJsonKey(key: string): boolean {
  return /coupon|kupon|typlus.*price|pluscoupon|basketcampaign/i.test(key);
}

function extractJsonPriceNearKey(
  html: string,
  keyPattern: RegExp
): number | null {
  for (const match of html.matchAll(keyPattern)) {
    const start = match.index ?? 0;
    const context = html.slice(Math.max(0, start - 80), start + 120);
    if (isCouponPriceContext(context)) continue;
    const p = parseTryAmount(match[1]);
    if (p != null) return p;
  }
  return null;
}

function priceFromMatch(
  html: string,
  match: RegExpMatchArray,
  rawIndex = 1
): number | null {
  const start = match.index ?? 0;
  const context = html.slice(Math.max(0, start - 140), start + 220);
  if (isCouponPriceContext(context)) return null;
  return parseTryAmount(match[rawIndex]);
}

/** Hepsiburada: Sepete ekle → Sepette → текущая цена → productState. */
export function extractHepsiburadaSalePrice(html: string): number | null {
  const aria = html.match(/aria-label="Sepete ekle, fiyat:\s*([^"]+)"/i);
  if (aria) {
    const p = parseTryAmount(aria[1]);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    /Sepette[\s\S]{0,160}?([\d.,]+)\s*TL/gi
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    /sepete\s*özel[\s\S]{0,160}?([\d.,]+)\s*TL/gi
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    /data-test-id="price-current-price"[^>]*>([^<]+)</gi
  )) {
    const p = parseTryAmount(match[1]);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    /"typhoonPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    /"cartPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  if (html.includes("productState")) {
    const pricesBlock = html.match(
      /"productState"[\s\S]*?"prices"\s*:\s*(\[[\s\S]*?\])/
    );
    const scope = pricesBlock?.[1] ?? html;
    const entries: Array<{ value: number; discountRate: number }> = [];
    const entryPattern =
      /"value"\s*:\s*([\d.]+)\s*,\s*"currency"\s*:\s*\d+\s*,\s*"discountRate"\s*:\s*(\d+)/g;

    for (const m of scope.matchAll(entryPattern)) {
      const value = Number(m[1]);
      const discountRate = Number(m[2]);
      if (value > 0) entries.push({ value, discountRate });
    }

    if (entries.length > 0) {
      const discounted = entries.filter((e) => e.discountRate > 0);
      if (discounted.length > 0) {
        return Math.min(...discounted.map((e) => e.value));
      }
      return Math.min(...entries.map((e) => e.value));
    }
  }

  return null;
}

/** Обрезает HTML до блока «Ürünün Diğer Satıcıları». */
export function stripTrendyolOtherSellersHtml(html: string): string {
  const markers = [
    "Ürünün Diğer Satıcıları",
    "other-merchants-dr",
    '"otherMerchants"',
    "id=\"other-merchants",
    'data-testid="other-merchant',
  ];
  let end = html.length;
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx >= 0 && idx < end) end = idx;
  }
  return html.slice(0, end);
}

/** Trendyol: цена основного оффера (INITIAL_STATE), не «Diğer Satıcıları». */
export function extractTrendyolSalePrice(html: string): number | null {
  const fromMainState = extractTrendyolMainProductPriceFromHtml(html);
  if (fromMainState != null && fromMainState > 0) return fromMainState;

  const scoped = stripTrendyolOtherSellersHtml(html);

  for (const match of scoped.matchAll(
    /class="prc-box-dscntd"[^>]*>([^<]+)</gi
  )) {
    const p = priceFromMatch(scoped, match);
    if (p != null) return p;
  }

  for (const match of scoped.matchAll(
    /data-testid="price-current-price"[^>]*>([^<]+)</gi
  )) {
    const p = priceFromMatch(scoped, match);
    if (p != null) return p;
  }

  const discountedPlain = extractJsonPriceNearKey(
    scoped,
    /"discountedPrice"\s*:\s*"([\d.,]+)\s*TL"/gi
  );
  if (discountedPlain != null) return discountedPlain;

  const discountedFromJson = extractJsonPriceNearKey(
    scoped,
    /"discountedPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi
  );
  if (discountedFromJson != null) return discountedFromJson;

  const discountedNumeric = extractJsonPriceNearKey(
    scoped,
    /"discountedPrice"\s*:\s*([\d.]+)/gi
  );
  if (discountedNumeric != null) return discountedNumeric;

  // sellingPrice — только если нет discountedPrice
  for (const match of scoped.matchAll(
    /"sellingPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/gi
  )) {
    const start = match.index ?? 0;
    const keyContext = scoped.slice(Math.max(0, start - 40), start + 20);
    if (isTrendyolCouponJsonKey(keyContext)) continue;
    const p = priceFromMatch(scoped, match);
    if (p != null) return p;
  }

  for (const match of scoped.matchAll(
    /"sellingPrice"\s*:\s*([\d.]+)/gi
  )) {
    const start = match.index ?? 0;
    const keyContext = scoped.slice(Math.max(0, start - 40), start + 20);
    if (isTrendyolCouponJsonKey(keyContext)) continue;
    const p = priceFromMatch(scoped, match);
    if (p != null) return p;
  }

  return null;
}

export { extractTrendyolMainProductPriceFromState };

/** N11: Sepette → instantDiscount/finalPrice → .newPrice ins / любой ins */
export function extractN11SalePrice(html: string): number | null {
  for (const match of html.matchAll(
    new RegExp(`Sepette[\\s\\S]{0,400}?<ins[^>]*>\\s*${TL_AMOUNT}`, "gi")
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  for (const pattern of [
    /"instantDiscountPrice"\s*:\s*([\d.]+)/gi,
    /"finalPrice"\s*:\s*([\d.]+)/gi,
    new RegExp(`"displayPrice"\\s*:\\s*"${TL_AMOUNT}"`, "gi"),
  ]) {
    for (const match of html.matchAll(pattern)) {
      const p = priceFromMatch(html, match);
      if (p != null) return p;
    }
  }

  for (const match of html.matchAll(
    new RegExp(`class="newPrice"[\\s\\S]{0,300}?<ins[^>]*>\\s*${TL_AMOUNT}`, "gi")
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  for (const match of html.matchAll(
    new RegExp(`<ins[^>]*>\\s*${TL_AMOUNT}`, "gi")
  )) {
    const p = priceFromMatch(html, match);
    if (p != null) return p;
  }

  const displayFloat = html.match(/"displayPriceFloat"\s*:\s*([\d.]+)/i);
  if (displayFloat) {
    const p = priceFromMatch(html, displayFloat);
    if (p != null) return p;
  }

  return null;
}

export function extractSepetePriceFromText(text: string): number | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sepetteIdx = lines.findIndex((line) => /sepette/i.test(line));
  if (sepetteIdx >= 0) {
    const context = lines.slice(sepetteIdx, sepetteIdx + 4).join(" ");
    if (isCouponPriceContext(context)) return null;
    for (let i = sepetteIdx + 1; i < Math.min(lines.length, sepetteIdx + 4); i++) {
      const match = lines[i].match(/([\d.,]+)\s*TL/i);
      if (match) {
        const p = parseTryAmount(match[1]);
        if (p != null) return p;
      }
    }
  }

  return null;
}

/** @deprecated use marketplace-specific extractors */
export function extractSepetePriceFromHtml(
  html: string,
  marketplace?: string
): number | null {
  if (marketplace === "hepsiburada") return extractHepsiburadaSalePrice(html);
  if (marketplace === "trendyol") return extractTrendyolSalePrice(html);
  if (marketplace === "n11") return extractN11SalePrice(html);
  return extractHepsiburadaSalePrice(html);
}
