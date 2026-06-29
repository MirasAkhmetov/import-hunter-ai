import { getCountryBreakdown } from "../country-breakdown/countryBreakdownService";
import { getBasket } from "../basket/basketService";
import { getWatchlist, getTriggeredBuyAlerts } from "../watchlist/watchlistService";
import { getUnreadAlertCount } from "../alerts/buyAlertService";
import { getBrandContactsStats } from "../brand-finder/brandContactService";
import {
  listAnalysisRuns,
  seedMockAnalysisHistory,
} from "../analysis-history/analysisHistoryService";
import { getMockCountryBreakdownData } from "../mock/countryBreakdown";
import { seedMockStore, mockStore } from "../store/mockStore";
import { MARKETPLACE_LABELS } from "../types";
import { isIsoInDay, formatLocalDateYmd } from "../dateRange";

export interface DashboardDateOptions {
  /** YYYY-MM-DD — only analyses from this calendar day */
  date?: string;
}

function emptyDashboard() {
  return {
    totalAnalyzed: 0,
    profitableCount: 0,
    averageMargin: 0,
    topProducts: [] as Array<{
      id: string;
      title: string;
      roi: number;
      margin: number;
      profit: number;
      marketplace: string;
    }>,
    recentAnalyses: [] as Array<{
      id: string;
      title: string;
      status: string;
      date: string;
    }>,
    opportunities: {
      highRoi: 0,
      lowRisk: 0,
      bigPriceDiff: 0,
      manualCheck: 0,
    },
    bestCountry: null as { country: string; avgRoi: number; itemCount: number } | null,
    bestByRoi: [] as Array<{
      id: string;
      title: string;
      roi: number;
      profit: number;
      marketplace: string;
    }>,
    bestByProfit: [] as Array<{
      id: string;
      title: string;
      profit: number;
      roi: number;
      marketplace: string;
    }>,
    watchlistCount: 0,
    basketCount: 0,
    basketProfit: 0,
    manualReviewCount: 0,
    triggeredBuyAlerts: [] as Awaited<ReturnType<typeof getTriggeredBuyAlerts>>,
    unreadAlerts: 0,
    profitByCountry: [] as Array<{ country: string; profit: number; roi: number }>,
    brandContactsStats: {
      brandOwners: 0,
      distributorsKz: 0,
      distributorsRu: 0,
      highConfidence: 0,
      pendingEmails: 0,
      sentManually: 0,
      totalContacts: 0,
    },
    analysisHistoryRecent: [] as Array<{
      id: string;
      title: string;
      date: string;
      profit: number;
      roi: number;
      marketplace: string;
      status: string;
    }>,
  };
}

export async function getEnhancedDashboardData(options: DashboardDateOptions = {}) {
  const filterDay = options.date ?? formatLocalDateYmd();
  seedMockStore();
  seedMockAnalysisHistory();

  try {
    const allAnalyses = mockStore.analyses.getAll();
    const analyses = allAnalyses.filter((a) => isIsoInDay(a.analyzedAt, filterDay));
    const brandContactsStats = await getBrandContactsStats();
    const analysisRuns = (await listAnalysisRuns()).filter((run) =>
      isIsoInDay(run.createdAt, filterDay)
    );
    const analysisHistoryRecent = analysisRuns.slice(0, 5).map((run) => ({
      id: run.id,
      title: run.productTitle,
      date: run.createdAt,
      profit: run.bestNetProfitKzt ?? 0,
      roi: run.bestRoiPercent ?? 0,
      marketplace: run.bestMarketplace ?? "—",
      status: run.status,
    }));
    const { breakdown, bestCountry } = await getCountryBreakdown();
    const basket = await getBasket();
    const watchlist = await getWatchlist();
    const triggeredAlerts = await getTriggeredBuyAlerts();
    const unreadAlerts = await getUnreadAlertCount();

    const profitByCountry = breakdown
      .filter((b) => b.itemCount > 0)
      .map((b) => ({
        country: b.countryLabel,
        profit: Math.round(b.avgNetProfit),
        roi: Math.round(b.avgRoi),
      }));

    const baseExtras = {
      bestCountry: bestCountry
        ? {
            country: bestCountry.countryLabel,
            avgRoi: bestCountry.avgRoi,
            itemCount: bestCountry.itemCount,
          }
        : null,
      watchlistCount: watchlist.length,
      basketCount: basket.summary.totalItems,
      basketProfit: basket.summary.netProfit,
      triggeredBuyAlerts: triggeredAlerts,
      unreadAlerts,
      profitByCountry,
      brandContactsStats,
      analysisHistoryRecent,
    };

    if (analyses.length === 0) {
      const mockItems = getMockCountryBreakdownData();
      return {
        ...emptyDashboard(),
        ...baseExtras,
        filterDate: filterDay,
        manualReviewCount: mockItems.filter((i) => i.manualStatus === "review").length,
        brandContactsStats,
        analysisHistoryRecent,
      };
    }

    const allResults = analyses.flatMap((a) =>
      a.marketplaceResults.map((r) => ({
        ...r,
        analysisId: a.id,
        productTitle: a.productTitle,
        kaspiPrice: a.kaspiPrice,
      }))
    );

    const bestPerAnalysis = analyses
      .map((a) => {
        const sorted = [...a.marketplaceResults].sort(
          (x, y) => y.profit.roiPercent - x.profit.roiPercent
        );
        const best = sorted[0];
        if (!best) return null;
        return {
          ...best,
          analysisId: a.id,
          productTitle: a.productTitle,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    const profitableCount = bestPerAnalysis.filter(
      (r) => r.profit.netProfitKzt > 0
    ).length;

    const averageMargin =
      bestPerAnalysis.length > 0
        ? bestPerAnalysis.reduce((sum, r) => sum + r.profit.marginPercent, 0) /
          bestPerAnalysis.length
        : 0;

    const topProducts = bestPerAnalysis
      .sort((a, b) => b.profit.roiPercent - a.profit.roiPercent)
      .slice(0, 5)
      .map((r, i) => ({
        id: `${r.analysisId}-${r.marketplace}-${r.id ?? i}`,
        title: r.productTitle ?? r.title,
        roi: r.profit.roiPercent,
        margin: r.profit.marginPercent,
        profit: r.profit.netProfitKzt,
        marketplace: MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace,
      }));

    const recentAnalyses = analyses.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.productTitle,
      status: a.status,
      date: a.analyzedAt,
    }));

    const highRoi = allResults.filter((r) => r.profit.roiPercent >= 40).length;
    const lowRisk = allResults.filter((r) => (r.riskScore ?? 50) < 30).length;
    const bigPriceDiff = allResults.filter(
      (r) => r.profit.netProfitKzt > 5000
    ).length;
    const mockItems = getMockCountryBreakdownData();
    const manualReview = mockItems.filter((i) => i.manualStatus === "review");

    const bestByRoi = [...allResults]
      .sort((a, b) => b.profit.roiPercent - a.profit.roiPercent)
      .slice(0, 5)
      .map((r, i) => ({
        id: `${r.analysisId}-${r.marketplace}-${r.id ?? i}`,
        title: r.productTitle ?? r.title,
        roi: r.profit.roiPercent,
        profit: r.profit.netProfitKzt,
        marketplace: MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace,
      }));

    const bestByProfit = [...allResults]
      .sort((a, b) => b.profit.netProfitKzt - a.profit.netProfitKzt)
      .slice(0, 5)
      .map((r, i) => ({
        id: `${r.analysisId}-${r.marketplace}-${r.id ?? i}`,
        title: r.productTitle ?? r.title,
        profit: r.profit.netProfitKzt,
        roi: r.profit.roiPercent,
        marketplace: MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace,
      }));

    return {
      totalAnalyzed: analyses.length,
      profitableCount,
      averageMargin,
      topProducts,
      recentAnalyses,
      filterDate: filterDay,
      opportunities: {
        highRoi,
        lowRisk,
        bigPriceDiff,
        manualCheck: manualReview.length,
      },
      ...baseExtras,
      manualReviewCount: manualReview.length,
      bestByRoi,
      bestByProfit,
      brandContactsStats,
      analysisHistoryRecent,
    };
  } catch {
    return {
      ...emptyDashboard(),
      filterDate: filterDay,
      bestCountry: null,
      watchlistCount: 0,
      unreadAlerts: 0,
      manualReviewCount: 0,
    };
  }
}
