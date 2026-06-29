import type { AnalysisResult } from "./analysisResult";
import type { BrandContact, OutreachEmail } from "./brandFinder";
import type { AppSettings } from "../types";

export type AnalysisRunStatus = "completed" | "failed" | "partial";

export type AnalysisSnapshotType =
  | "kaspi_product"
  | "marketplace_results"
  | "profit_analysis"
  | "brand_contacts"
  | "outreach_emails"
  | "ai_recommendation"
  | "settings_used";

export interface AnalysisRun {
  id: string;
  kaspiUrl: string;
  productId?: string | null;
  status: AnalysisRunStatus;
  source: string;
  productTitle: string;
  productBrand?: string | null;
  productCategory?: string | null;
  productImageUrl?: string | null;
  kaspiPriceKzt: number;
  totalMarketplaceResults: number;
  bestCountry?: string | null;
  bestMarketplace?: string | null;
  bestPurchasePriceKzt?: number | null;
  bestNetProfitKzt?: number | null;
  bestRoiPercent?: number | null;
  aiRecommendation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisSnapshot {
  id: string;
  analysisRunId: string;
  snapshotType: AnalysisSnapshotType;
  data: unknown;
  createdAt: string;
}

export interface AnalysisRunDetail extends AnalysisRun {
  snapshots: AnalysisSnapshot[];
}

export interface AnalysisHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  brand?: string;
  category?: string;
  country?: string;
  marketplace?: string;
  roiMin?: number;
  roiMax?: number;
  profitMin?: number;
  profitMax?: number;
  status?: AnalysisRunStatus;
}

export interface AnalysisCompareResult {
  kaspiPriceChanged: boolean;
  kaspiPriceDiff: number;
  purchasePriceChanged: boolean;
  purchasePriceDiff: number;
  profitChanged: boolean;
  profitDiff: number;
  roiChanged: boolean;
  roiDiff: number;
  bestMarketplaceChanged: boolean;
  previousBestMarketplace?: string | null;
  currentBestMarketplace?: string | null;
  newBrandContacts: number;
  previousRun?: AnalysisRun;
}

export interface SaveAnalysisRunInput {
  kaspiUrl: string;
  result: AnalysisResult;
  brandContacts?: BrandContact[];
  outreachEmails?: OutreachEmail[];
  settings?: AppSettings;
  status?: AnalysisRunStatus;
  selectedMarketplaceResultId?: string | null;
  updateRunId?: string | null;
}

export const SNAPSHOT_TYPE_LABELS: Record<AnalysisSnapshotType, string> = {
  kaspi_product: "Товар Kaspi",
  marketplace_results: "Аналоги маркетплейсов",
  profit_analysis: "Расчёт прибыли",
  brand_contacts: "Контакты брендов",
  outreach_emails: "Письма",
  ai_recommendation: "AI-рекомендация",
  settings_used: "Настройки расчёта",
};
