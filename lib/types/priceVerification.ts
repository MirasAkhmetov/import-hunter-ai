export type PriceSource = "product_page" | "search_result" | "manual_override";

export type LinkStatus = "verified" | "needs_review" | "mismatch" | "unavailable";

export interface PriceCorrectionHistory {
  id: string;
  marketplaceResultId: string;
  originalPrice: number;
  correctedPrice: number;
  currency: string;
  reason: string;
  comment?: string | null;
  correctedBy?: string | null;
  createdAt: string;
}

export interface PriceVerificationFields {
  originalPrice?: number;
  correctedPrice?: number | null;
  finalPrice?: number;
  priceSource?: PriceSource;
  linkStatus?: LinkStatus;
  priceVerifiedAt?: string | null;
  manuallyCorrectedAt?: string | null;
  correctionReason?: string | null;
  correctionComment?: string | null;
  isMockPrice?: boolean;
  needsProfitReview?: boolean;
}

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  product_page: "Страница товара",
  search_result: "Результат поиска",
  manual_override: "Ручная коррекция",
};

export const LINK_STATUS_LABELS: Record<LinkStatus, string> = {
  verified: "Подтверждено",
  needs_review: "Требует проверки",
  mismatch: "Несовпадение",
  unavailable: "Недоступно",
};

export const MOCK_PRICE_BANNER = "MOCK PRICE — не использовать для закупки";
