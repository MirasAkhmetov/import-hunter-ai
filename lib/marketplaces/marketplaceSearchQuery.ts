import type { ProductSearchQuery } from "../types";

/** Артикул / SKU вроде BGS41HYG1, HF5075IBK, IS7286BK */
export function isArticleOrSkuToken(token: string): boolean {
  const t = token.trim().replace(/[,;.:]/g, "");
  if (t.length < 4) return false;
  if (/^\d{6,}$/.test(t)) return true;
  if (/^[A-Za-z]*\d+[A-Za-z0-9]*$/i.test(t) && /[A-Za-z]/i.test(t) && /\d/.test(t)) {
    return true;
  }
  if (/^[A-Z0-9]{5,}$/i.test(t) && /\d/.test(t)) return true;
  return false;
}

export function stripArticleTokens(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0 && !isArticleOrSkuToken(word))
    .join(" ")
    .trim();
}

const CATEGORY_SEARCH_EN: Record<string, string> = {
  "Аэрогрили": "air fryer",
  "Наушники и гарнитуры": "earbuds",
  "Смартфоны": "smartphone",
  "Пылесосы": "vacuum cleaner",
  "Чайники": "kettle",
  "Парогенераторы": "steam generator",
  "Бытовая техника": "appliance",
  "Электрические зубные щетки": "electric toothbrush",
  "Зубные щетки": "toothbrush",
};

const CATEGORY_SEARCH_TR: Record<string, string> = {
  "Аэрогрили": "airfryer fritöz",
  "Наушники и гарнитуры": "kulaklık",
  "Смартфоны": "akıllı telefon",
  "Пылесосы": "elektrikli süpürge",
  "Чайники": "su ısıtıcısı",
  "Парогенераторы": "buharlı ütü",
  "Бытовая техника": "ev aleti",
  "Электрические зубные щетки": "elektrikli diş fırçası",
  "Зубные щетки": "diş fırçası",
};

const TR_MARKETPLACES = new Set([
  "trendyol",
  "hepsiburada",
  "amazon-tr",
  "n11",
  "pttavm",
  "ciceksepeti",
]);

const RU_MARKETPLACES = new Set(["wildberries", "ozon"]);

const CATEGORY_SEARCH_RU: Record<string, string> = {
  "Аэрогрили": "аэрогриль",
  "Наушники и гарнитуры": "наушники",
  "Смартфоны": "смартфон",
  "Пылесосы": "пылесос",
  "Чайники": "чайник",
  "Парогенераторы": "парогенератор",
  "Бытовая техника": "бытовая техника",
  "Электрические зубные щетки": "электрическая зубная щетка",
  "Зубные щетки": "зубная щетка",
};

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

function isSearchSafeToken(word: string): boolean {
  return word.length > 1 && !isArticleOrSkuToken(word) && !hasCyrillic(word);
}

function specValuesForSearch(
  specifications?: Record<string, string>
): string[] {
  if (!specifications) return [];
  return Object.entries(specifications)
    .filter(([key]) => !/модель|model|артикул|sku/i.test(key))
    .map(([, value]) => value)
    .filter(Boolean)
    .filter((v) => !isArticleOrSkuToken(v))
    .slice(0, 2);
}

function titleWordsForSearch(title: string, brand?: string): string[] {
  const base = stripArticleTokens(title.split(/[—–\-|]/)[0] ?? title);
  return base
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        isSearchSafeToken(w) &&
        (!brand || w.toLowerCase() !== brand.toLowerCase())
    )
    .slice(0, 4);
}

/**
 * Поисковые запросы для маркетплейсов — без артикула / SKU / model-кода.
 */
export function buildMarketplaceSearchQueries(
  query: ProductSearchQuery
): string[] {
  const queries: string[] = [];
  const brand = query.brand?.trim();
  const specs = specValuesForSearch(query.specifications);
  const titleWords = query.title ? titleWordsForSearch(query.title, brand) : [];

  if (brand && query.category) {
    const en = CATEGORY_SEARCH_EN[query.category];
    const tr = CATEGORY_SEARCH_TR[query.category];
    const ru = CATEGORY_SEARCH_RU[query.category];
    if (en) queries.push(`${brand} ${en}`);
    if (tr) queries.push(`${brand} ${tr}`);
    if (ru) queries.push(`${brand} ${ru}`);
    if (!en && !tr && !hasCyrillic(query.category)) {
      queries.push(`${brand} ${query.category}`);
    }
  }

  if (brand && specs.length > 0) {
    queries.push([brand, ...specs].join(" "));
  }

  if (brand && titleWords.length > 0) {
    queries.push([brand, ...titleWords].join(" "));
  }

  if (brand) {
    queries.push(brand);
  }

  if (query.title) {
    const cleanTitle = stripArticleTokens(
      query.title.split(/[—–|]/)[0]?.trim() ?? query.title
    );
    if (cleanTitle.length > 3 && !hasCyrillic(cleanTitle)) {
      queries.push(cleanTitle);
    }
  }

  return [...new Set(queries.map((q) => q.trim()).filter((q) => q.length > 2))];
}

/** Одна строка для URL поиска на маркетплейсе (без артикула и кириллицы для TR). */
export function buildMarketplaceSearchTerms(
  query: ProductSearchQuery,
  marketplace?: string
): string {
  const queries = buildMarketplaceSearchQueries(query);
  const brand = query.brand?.trim();
  const tr = query.category ? CATEGORY_SEARCH_TR[query.category] : undefined;
  const en = query.category ? CATEGORY_SEARCH_EN[query.category] : undefined;
  const ru = query.category ? CATEGORY_SEARCH_RU[query.category] : undefined;

  if (marketplace && RU_MARKETPLACES.has(marketplace)) {
    if (brand && ru) return `${brand} ${ru}`;
    const latin = queries.find((q) => !hasCyrillic(q));
    if (latin) return latin;
    if (brand && en) return `${brand} ${en}`;
    if (brand) return brand;
  }

  if (marketplace && TR_MARKETPLACES.has(marketplace)) {
    if (brand && tr) return `${brand} ${tr}`;
    const latin = queries.find((q) => !hasCyrillic(q));
    if (latin) return latin;
    if (brand && en) return `${brand} ${en}`;
    if (brand) return brand;
  }

  if (queries.length > 0) return queries[0];

  const fallback = stripArticleTokens(query.title ?? "");
  if (fallback && !hasCyrillic(fallback)) return fallback;
  if (brand && tr) return `${brand} ${tr}`;
  if (brand && en) return `${brand} ${en}`;
  return brand ?? query.title ?? "";
}

export function marketplaceSearchKeywords(
  query: ProductSearchQuery
): string[] {
  const keywords: string[] = [];
  if (query.brand) keywords.push(query.brand);
  if (query.category) keywords.push(query.category);

  const en = query.category ? CATEGORY_SEARCH_EN[query.category] : undefined;
  if (en) keywords.push(en);

  keywords.push(...titleWordsForSearch(query.title ?? "", query.brand));

  if (query.specifications) {
    for (const [key, value] of Object.entries(query.specifications)) {
      if (/модель|model|артикул|sku/i.test(key)) continue;
      if (value && !isArticleOrSkuToken(value)) keywords.push(value);
    }
  }

  return [...new Set(keywords.filter(Boolean))];
}
