export type ManualStatus = "approved" | "review" | "rejected";

export type WatchlistStatus = "active" | "price_reached" | "roi_reached" | "paused";

export type AlertStatus =
  | "active"
  | "triggered"
  | "purchased"
  | "ignored"
  | "paused";

export type AlertNotificationStatus = "unread" | "read" | "archived";

export type AlertType =
  | "price_drop"
  | "target_price_reached"
  | "roi_reached";

export const MANUAL_STATUS_LABELS: Record<ManualStatus, string> = {
  approved: "Подходит",
  review: "Проверить",
  rejected: "Не подходит",
};

export const WATCHLIST_STATUS_LABELS: Record<WatchlistStatus, string> = {
  active: "Активно",
  price_reached: "Цена достигнута",
  roi_reached: "ROI достигнут",
  paused: "Приостановлено",
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  active: "Активен",
  triggered: "🔥 Срочно купить",
  purchased: "Куплено",
  ignored: "Игнорирован",
  paused: "Приостановлен",
};

export const COUNTRY_MARKETPLACES: Record<string, string[]> = {
  TR: ["trendyol", "hepsiburada", "amazon-tr", "n11", "pttavm", "ciceksepeti"],
  CN: ["alibaba", "1688", "pinduoduo", "taobao"],
  AE: ["amazon-ae", "noon", "carrefour", "sharaf-dg"],
  IN: ["flipkart", "amazon-in", "meesho"],
  RU: ["wildberries", "ozon"],
};

export interface ProductFilters {
  country?: string;
  marketplace?: string;
  brand?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  profitMin?: number;
  profitMax?: number;
  roiMin?: number;
  roiMax?: number;
  matchScoreMin?: number;
  matchScoreMax?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  manualStatus?: ManualStatus;
  favorite?: boolean;
  search?: string;
}

export interface BasketItemInput {
  productId: string;
  marketplaceResultId: string;
  title: string;
  marketplace: string;
  country: string;
  quantity?: number;
  purchasePrice: number;
  purchaseCurrency?: string;
  deliveryPerUnit?: number;
  extraCosts?: number;
  targetSalePrice: number;
  imageUrl?: string;
  url?: string;
}

export interface BasketItemTotals {
  quantity: number;
  totalPurchase: number;
  totalDelivery: number;
  totalExtraCosts: number;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  marginPercent: number;
  roiPercent: number;
}

export interface BasketCountrySummary {
  country: string;
  itemCount: number;
  totalPurchase: number;
  totalDelivery: number;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number;
}

export interface CountryBreakdownStats {
  country: string;
  countryLabel: string;
  marketplaces: string[];
  itemCount: number;
  avgPurchasePrice: number;
  avgDelivery: number;
  avgNetProfit: number;
  avgRoi: number;
  highRoiCount: number;
  lowRiskCount: number;
  bestByProfit: CountryBestItem | null;
  bestByRoi: CountryBestItem | null;
  marketplaceStats: MarketplaceCountryStat[];
}

export interface CountryBestItem {
  id: string;
  title: string;
  marketplace: string;
  netProfit: number;
  roiPercent: number;
  productTitle?: string;
}

export interface MarketplaceCountryStat {
  marketplace: string;
  itemCount: number;
  avgPurchasePrice: number;
  avgProfit: number;
  avgRoi: number;
}

export interface ExportRow {
  kaspiTitle: string;
  country: string;
  marketplace: string;
  foundTitle: string;
  purchasePrice: number;
  priceKzt: number;
  delivery: number;
  totalCost: number;
  kaspiSalePrice: number;
  netProfit: number;
  marginPercent: number;
  roiPercent: number;
  matchScore: number;
  riskScore: number;
  manualStatus: string;
  url: string;
}

export interface WatchlistItemData {
  id: string;
  productId: string;
  marketplaceResultId: string;
  title: string;
  marketplace: string;
  country: string;
  targetPurchasePrice: number;
  minProfit: number;
  minRoi: number;
  currentPrice: number;
  currentCurrency: string;
  lastCheckedAt: string;
  status: WatchlistStatus;
  buyAlertEnabled: boolean;
  targetBuyPrice?: number | null;
  targetQuantity: number;
  alertTriggeredAt?: string | null;
  alertStatus: AlertStatus;
  comment?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  productTitle?: string;
  kaspiPrice?: number;
  /** Закупка в ₸ (без логистики) */
  purchasePriceKzt?: number;
  /** Себестоимость в Алматы: закупка + логистика (из калькулятора) */
  landedCostKzt?: number;
  /** Снимок прибыли на момент добавления */
  netProfitKzt?: number;
  marginPercent?: number;
  roiPercent?: number;
}

export interface AlertNotificationData {
  id: string;
  watchlistItemId?: string | null;
  productId: string;
  marketplaceResultId: string;
  type: AlertType;
  title: string;
  message: string;
  oldPrice?: number | null;
  currentPrice?: number | null;
  currentCurrency?: string | null;
  targetPrice?: number | null;
  potentialProfit?: number | null;
  roiPercent?: number | null;
  status: AlertNotificationStatus;
  createdAt: string;
  readAt?: string | null;
  productTitle?: string;
  marketplace?: string;
  country?: string;
  productUrl?: string | null;
  priceCheckedAt?: string | null;
}

export interface PriceHistoryPoint {
  id: string;
  price: number;
  currency: string;
  priceKzt: number;
  checkedAt: string;
}
