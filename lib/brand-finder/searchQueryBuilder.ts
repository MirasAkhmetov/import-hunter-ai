import type { ParsedProduct } from "../types";

export interface BrandSearchQuery {
  query: string;
  language: "ru" | "en";
}

export function buildBrandContactQueries(
  product: Pick<ParsedProduct, "brand" | "title" | "model">
): BrandSearchQuery[] {
  const brand = product.brand?.trim() || extractBrandFromTitle(product.title);
  if (!brand) return [];

  const ruQueries = [
    `${brand} правообладатель site:.kz`,
    `${brand} юридическая информация site:.kz`,
    `${brand} legal terms site:.kz`,
    `${brand} официальный дистрибьютор Казахстан`,
    `${brand} официальный дистрибьютор Россия`,
    `${brand} правообладатель`,
    `${brand} официальный представитель Казахстан`,
    `${brand} официальный представитель ЕАЭС`,
    `${brand} контакты для сотрудничества`,
    `${brand} оптовые продажи Казахстан`,
    `${brand} дилер Казахстан`,
  ];

  const enQueries = [
    `${brand} official distributor Kazakhstan`,
    `${brand} official distributor Russia`,
    `${brand} official distributor CIS`,
    `${brand} brand owner`,
    `${brand} official representative EAEU`,
    `${brand} wholesale contact`,
    `${brand} distributor contact`,
    `${brand} partner inquiry`,
    `${brand} where to buy Kazakhstan`,
  ];

  return [
    ...ruQueries.map((query) => ({ query, language: "ru" as const })),
    ...enQueries.map((query) => ({ query, language: "en" as const })),
  ];
}

function extractBrandFromTitle(title: string): string {
  const firstWord = title.split(/\s+/)[0];
  return firstWord ?? title.slice(0, 30);
}
