/**
 * Тарифы комиссии Kaspi.kz по категориям (guide.kaspi.kz, актуальные ставки маркетплейса).
 * При совпадении нескольких правил берётся максимальная ставка — консервативный расчёт.
 */

export interface KaspiCommissionInfo {
  percent: number;
  categoryLabel: string;
  sourceUrl: string;
}

const KASPI_COMMISSION_GUIDE_URL =
  "https://guide.kaspi.kz/partner/ru/shop/conditions/q1344";

const KASPI_COMMISSION_RULES: Array<{
  keywords: string[];
  percent: number;
  label: string;
}> = [
  { keywords: ["продукт", "питани", "food", "grocery"], percent: 7, label: "Продукты питания" },
  { keywords: ["аптек", "pharm", "medic"], percent: 12, label: "Аптека" },
  { keywords: ["животн", "pet", "корм"], percent: 12, label: "Товары для животных" },
  { keywords: ["украшен", "jewel", "ювелир"], percent: 15, label: "Украшения" },
  {
    keywords: ["телефон", "гаджет", "phone", "smartphone", "iphone", "samsung galaxy"],
    percent: 15,
    label: "Телефоны и гаджеты",
  },
  { keywords: ["наушник", "earbud", "airpod", "headphone"], percent: 15, label: "Телефоны и гаджеты" },
  { keywords: ["accessor", "аксесс"], percent: 15, label: "Аксессуары" },
  { keywords: ["тв", "audio", "video", "аудио", "видео", "television"], percent: 15, label: "ТВ, Аудио, Видео" },
  { keywords: ["канц", "stationery"], percent: 15, label: "Канцелярские товары" },
  { keywords: ["авто", "auto", "car"], percent: 12, label: "Автотовары" },
  { keywords: ["бытов", "техник", "appliance", "kitchen", "кухн"], percent: 12, label: "Бытовая техника" },
  { keywords: ["детск", "baby", "kids", "игруш"], percent: 12, label: "Детские товары" },
  { keywords: ["книг", "book", "досуг"], percent: 12, label: "Досуг, книги" },
  { keywords: ["компьютер", "computer", "laptop", "ноутбук", "pc"], percent: 12, label: "Компьютеры" },
  { keywords: ["красот", "beauty", "космет", "health", "здоров"], percent: 12, label: "Красота и здоровье" },
  { keywords: ["мебел", "furniture"], percent: 12, label: "Мебель" },
  { keywords: ["обув", "shoe", "footwear"], percent: 12, label: "Обувь" },
  { keywords: ["одежд", "cloth", "fashion"], percent: 12, label: "Одежда" },
  { keywords: ["подар", "gift", "праздник"], percent: 12, label: "Подарки, товары для праздников" },
  { keywords: ["спорт", "sport", "туризм", "travel"], percent: 12, label: "Спорт, туризм" },
  { keywords: ["строит", "ремонт", "repair", "tool"], percent: 12, label: "Строительство и ремонт" },
  { keywords: ["дом", "дач", "home", "garden", "посуд"], percent: 12, label: "Товары для дома и дачи" },
];

const DEFAULT_COMMISSION: KaspiCommissionInfo = {
  percent: 12,
  categoryLabel: "Стандартная категория",
  sourceUrl: KASPI_COMMISSION_GUIDE_URL,
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

export function resolveKaspiCommission(
  category?: string | null,
  title?: string | null,
  fallbackPercent = 12
): KaspiCommissionInfo {
  const haystack = normalizeText([category, title].filter(Boolean).join(" "));
  if (!haystack.trim()) {
    return {
      percent: fallbackPercent,
      categoryLabel: DEFAULT_COMMISSION.categoryLabel,
      sourceUrl: KASPI_COMMISSION_GUIDE_URL,
    };
  }

  let best: (typeof KASPI_COMMISSION_RULES)[number] | null = null;

  for (const rule of KASPI_COMMISSION_RULES) {
    const matched = rule.keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
    if (matched && (!best || rule.percent >= best.percent)) {
      best = rule;
    }
  }

  if (!best) {
    return {
      percent: fallbackPercent,
      categoryLabel: category?.trim() || DEFAULT_COMMISSION.categoryLabel,
      sourceUrl: KASPI_COMMISSION_GUIDE_URL,
    };
  }

  return {
    percent: best.percent,
    categoryLabel: best.label,
    sourceUrl: KASPI_COMMISSION_GUIDE_URL,
  };
}

export const OFFICIAL_IMPORT_VAT_PERCENT = 16;

export type TaxRegime = "official" | "simplified";

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  official: "Официальный ввоз (НДС 16%)",
  simplified: "Упрощёнка",
};

export function resolveTaxPercent(
  regime: TaxRegime,
  simplifiedPercent: number
): number {
  return regime === "official" ? OFFICIAL_IMPORT_VAT_PERCENT : simplifiedPercent;
}
