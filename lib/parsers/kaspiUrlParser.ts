/**
 * Эвристический разбор slug ссылки Kaspi (бренд, модель, категория, цвет, объём).
 * Используется только для обогащения реально спарсенных данных — не как источник цены.
 */
const KNOWN_BRANDS = [
  "braun", "apple", "samsung", "xiaomi", "dyson", "philips", "bosch",
  "tefal", "redmond", "kitfort", "polaris", "lg", "sony", "jbl",
];

const CATEGORY_KEYWORDS: Array<{ keys: string[]; category: string; titleRu: string }> = [
  { keys: ["aerogrill", "air-fryer", "airfryer", "hf50", "hf5", "fritoz", "fritöz"], category: "Аэрогрили", titleRu: "аэрогриль" },
  { keys: ["airpods", "naushnik", "earbuds", "buds", "kulaklik"], category: "Наушники и гарнитуры", titleRu: "наушники" },
  { keys: ["iphone", "smartfon", "phone", "redmi", "galaxy"], category: "Смартфоны", titleRu: "смартфон" },
  { keys: ["pylesos", "vacuum", "dyson-v"], category: "Пылесосы", titleRu: "пылесос" },
  { keys: ["chaynik", "kettle", "teapot"], category: "Чайники", titleRu: "чайник" },
  { keys: ["parogenerator", "is7286", "steam-generator", "steam"], category: "Парогенераторы", titleRu: "парогенератор" },
];

const BRAND_LABELS: Record<string, string> = {
  braun: "Braun",
  apple: "Apple",
  samsung: "Samsung",
  xiaomi: "Xiaomi",
  dyson: "Dyson",
  philips: "Philips",
  bosch: "Bosch",
  tefal: "Tefal",
  redmond: "Redmond",
  kitfort: "Kitfort",
  polaris: "Polaris",
  lg: "LG",
  sony: "Sony",
  jbl: "JBL",
};

export interface ParsedKaspiUrl {
  slug: string;
  brand?: string;
  brandLabel?: string;
  model?: string;
  category?: string;
  productTypeRu?: string;
  color?: string;
  capacity?: string;
  title: string;
}

function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/shop\/p\/([^/]+)/);
    return match?.[1]?.replace(/\?.*$/, "") ?? "";
  } catch {
    return "";
  }
}

function detectBrand(slug: string): string | undefined {
  const lower = slug.toLowerCase();
  return KNOWN_BRANDS.find((b) => lower.startsWith(b + "-") || lower.includes("-" + b + "-"));
}

function detectCategory(slug: string, brand?: string, model?: string): (typeof CATEGORY_KEYWORDS)[0] | undefined {
  const lower = slug.toLowerCase();
  const fromSlug = CATEGORY_KEYWORDS.find((c) => c.keys.some((k) => lower.includes(k)));
  if (fromSlug) return fromSlug;

  if (brand === "bosch" && model && /^bgs/i.test(model)) {
    return { keys: ["bgs"], category: "Пылесосы", titleRu: "пылесос" };
  }

  return undefined;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-\d{6,}$/, "")
    .split("-")
    .filter((p) => !/^\d+l?$/i.test(p) && p.length > 1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractModel(slug: string, brand?: string): string | undefined {
  const parts = slug.replace(/-\d{6,}$/, "").split("-");
  if (!brand) return parts.slice(0, 2).join(" ").toUpperCase();

  const brandIdx = parts.findIndex((p) => p.toLowerCase() === brand);
  if (brandIdx >= 0 && parts[brandIdx + 1]) {
    return parts[brandIdx + 1].toUpperCase();
  }
  return undefined;
}

function extractCapacity(slug: string): string | undefined {
  const m = slug.match(/(\d+)-l(?:-|$)/i);
  return m ? `${m[1]} л` : undefined;
}

function extractColor(slug: string): string | undefined {
  const colors: Record<string, string> = {
    chernyi: "Чёрный",
    black: "Чёрный",
    belyi: "Белый",
    white: "Белый",
    seryi: "Серый",
    krasnyi: "Красный",
  };
  for (const [key, label] of Object.entries(colors)) {
    if (slug.includes(key)) return label;
  }
  return undefined;
}

export function parseKaspiUrl(url: string): ParsedKaspiUrl {
  const slug = extractSlug(url);
  const brand = detectBrand(slug);
  const brandLabel = brand ? BRAND_LABELS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1) : undefined;
  const model = extractModel(slug, brand);
  const catInfo = detectCategory(slug, brand, model);
  const capacity = extractCapacity(slug);
  const color = extractColor(slug);
  const category = catInfo?.category;
  const productTypeRu = catInfo?.titleRu ?? "товар";

  let title = humanizeSlug(slug);
  if (brandLabel && model) {
    title = `${brandLabel} ${model}${capacity ? ` ${capacity}` : ""}${color ? `, ${color.toLowerCase()}` : ""} — ${productTypeRu}`;
  } else if (brandLabel) {
    title = `${brandLabel} ${title} — ${productTypeRu}`;
  }

  return {
    slug,
    brand,
    brandLabel,
    model,
    category,
    productTypeRu,
    color,
    capacity,
    title,
  };
}
