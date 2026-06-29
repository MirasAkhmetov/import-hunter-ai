import type { TaxRegime } from "./kaspi/commission";
import type { PriceVerificationFields } from "./types/priceVerification";

export type AnalysisStatus =
  | "pending"
  | "parsing_kaspi"
  | "searching_marketplaces"
  | "matching_products"
  | "calculating_profit"
  | "completed"
  | "failed";

export interface ProductSearchQuery {
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  specifications?: Record<string, string>;
  imageUrl?: string;
  sku?: string;
  keywords?: string[];
  sourcePriceKzt?: number;
}

export interface ParsedProduct {
  source: string;
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  price: number;
  currency: string;
  url: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
}

export interface VisualProductDescription {
  productType: string;
  brand?: string;
  color?: string;
  shape?: string;
  material?: string;
  accessories?: string;
  notableElements?: string[];
}

export interface MatchDetails {
  brandMatch: boolean;
  modelMatch: boolean;
  specsMatchPercent: number;
  imageMatch: boolean;
  titleMatchPercent: number;
  imageSimilarityScore?: number;
  categoryMatch?: boolean;
  priceScore?: number;
}

export type MarketplaceSearchMethod = "image" | "text" | "not_found";

export interface MarketplaceResultData extends PriceVerificationFields {
  marketplace: string;
  country: string;
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl?: string;
  searchMethod?: MarketplaceSearchMethod;
  sellerName?: string;
  sellerRating?: number;
  specifications?: Record<string, string>;
  matchScore?: number;
  finalMatchScore?: number;
  imageSimilarityScore?: number;
  riskScore?: number;
  isExactMatch?: boolean;
  isTopMatch?: boolean;
  matchWarnings?: string[];
  matchDetails?: MatchDetails;
}

export interface ProfitAnalysisResult {
  kaspiPriceKzt: number;
  purchasePriceKzt: number;
  deliveryCostKzt: number;
  customsCostKzt: number;
  kaspiCommissionKzt: number;
  taxKzt: number;
  adsCostKzt: number;
  totalCostKzt: number;
  netProfitKzt: number;
  marginPercent: number;
  roiPercent: number;
  recommendation?: string;
  purchasePriceOriginal?: number;
  purchaseCurrency?: string;
  exchangeRate?: number;
  kaspiCommissionPercent?: number;
  kaspiCommissionCategory?: string;
  taxRegime?: TaxRegime;
  taxPercent?: number;
  adsPercent?: number;
}

export interface AppSettings {
  tryToKzt: number;
  aedToKzt: number;
  cnyToKzt: number;
  usdToKzt: number;
  inrToKzt: number;
  rubToKzt: number;
  deliveryTurkeyKzt: number;
  deliveryUaeKzt: number;
  deliveryChinaKzt: number;
  deliveryIndiaKzt: number;
  deliveryRussiaKzt: number;
  kaspiCommissionPercent: number;
  taxPercent: number;
  taxRegime: TaxRegime;
  adsPercent: number;
  customsPercent: number;
  minMarginPercent: number;
  minRoiPercent: number;
  searchApiProvider?: string;
  searchApiKey?: string;
  mockBrandContactsEnabled?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  tryToKzt: 14.5,
  aedToKzt: 140.0,
  cnyToKzt: 72.0,
  usdToKzt: 515.0,
  inrToKzt: 6.2,
  rubToKzt: 5.5,
  deliveryTurkeyKzt: 3500,
  deliveryUaeKzt: 5000,
  deliveryChinaKzt: 4000,
  deliveryIndiaKzt: 4500,
  deliveryRussiaKzt: 4000,
  kaspiCommissionPercent: 12,
  taxPercent: 3,
  taxRegime: "simplified",
  adsPercent: 0,
  customsPercent: 5,
  minMarginPercent: 15,
  minRoiPercent: 20,
};

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "Ожидание...",
  parsing_kaspi: "Получаем данные Kaspi…",
  searching_marketplaces: "Ищем на маркетплейсах…",
  matching_products: "Сравниваем характеристики…",
  calculating_profit: "Считаем прибыль…",
  completed: "Анализ завершён",
  failed: "Ошибка анализа",
};

export const MARKETPLACE_LABELS: Record<string, string> = {
  kaspi: "Kaspi.kz",
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  "amazon-ae": "Amazon.ae",
  noon: "Noon",
  "amazon-tr": "Amazon Turkey",
  n11: "n11",
  pttavm: "PttAVM",
  ciceksepeti: "ÇiçekSepeti",
  alibaba: "Alibaba",
  "1688": "1688",
  pinduoduo: "Pinduoduo",
  taobao: "Taobao",
  carrefour: "Carrefour UAE",
  "sharaf-dg": "Sharaf DG",
  flipkart: "Flipkart",
  "amazon-in": "Amazon India",
  meesho: "Meesho",
  wildberries: "Wildberries",
  ozon: "Ozon",
};

export const COUNTRY_LABELS: Record<string, string> = {
  KZ: "Казахстан",
  TR: "Турция",
  CN: "Китай",
  AE: "ОАЭ",
  IN: "Индия",
  RU: "Россия",
};
