import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { localStore, type StoredAnalysis } from "./localStore";

/** Плоская строка «товар Kaspi × найденный аналог» с последним расчётом прибыли. */
export interface AnalysisItem {
  id: string;
  title: string;
  marketplace: string;
  country: string;
  url?: string;
  kaspiPriceKzt: number;
  purchasePriceKzt: number;
  deliveryCostKzt: number;
  totalCostKzt: number;
  netProfitKzt: number;
  marginPercent: number;
  roiPercent: number;
  riskScore: number;
  matchScore: number;
  brand?: string | null;
  category?: string | null;
  manualStatus: string;
  productTitle: string;
}

function localItems(): AnalysisItem[] {
  return localStore.analyses.getAll().flatMap((analysis) =>
    analysis.marketplaceResults.map((r) => ({
      id: r.id,
      title: r.title,
      marketplace: r.marketplace,
      country: r.country,
      kaspiPriceKzt: r.profit.kaspiPriceKzt ?? analysis.kaspiPrice,
      purchasePriceKzt: r.profit.purchasePriceKzt,
      deliveryCostKzt: r.profit.deliveryCostKzt,
      totalCostKzt: r.profit.totalCostKzt,
      netProfitKzt: r.profit.netProfitKzt,
      marginPercent: r.profit.marginPercent,
      roiPercent: r.profit.roiPercent,
      riskScore: r.riskScore ?? 0,
      matchScore: r.matchScore ?? 0,
      manualStatus: localStore.manualStatus.get(r.id),
      productTitle: analysis.productTitle,
    }))
  );
}

/** Все сохранённые результаты анализов: из PostgreSQL или из локального хранилища. */
export async function getAnalysisItems(): Promise<AnalysisItem[]> {
  if (!(await isDbAvailable())) return localItems();

  try {
    const results = await prisma.marketplaceResult.findMany({
      include: {
        product: true,
        profitAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return results
      .filter((r) => r.profitAnalyses.length > 0)
      .map((r) => {
        const profit = r.profitAnalyses[0];
        return {
          id: r.id,
          title: r.title,
          marketplace: r.marketplace,
          country: r.country,
          url: r.url,
          kaspiPriceKzt: profit.kaspiPriceKzt,
          purchasePriceKzt: profit.purchasePriceKzt,
          deliveryCostKzt: profit.deliveryCostKzt,
          totalCostKzt: profit.totalCostKzt,
          netProfitKzt: profit.netProfitKzt,
          marginPercent: profit.marginPercent,
          roiPercent: profit.roiPercent,
          riskScore: r.riskScore,
          matchScore: r.matchScore,
          brand: r.product.brand,
          category: r.product.category,
          manualStatus: r.manualStatus,
          productTitle: r.product.title,
        };
      });
  } catch {
    return localItems();
  }
}

/** Список анализов (товар Kaspi + аналоги) из PostgreSQL или локального хранилища. */
export async function getStoredAnalyses(): Promise<StoredAnalysis[]> {
  if (!(await isDbAvailable())) return localStore.analyses.getAll();

  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        marketplaceResults: {
          include: {
            profitAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      productTitle: product.title,
      kaspiPrice: product.price,
      analyzedAt: product.updatedAt.toISOString(),
      status: "completed" as const,
      marketplaceResults: product.marketplaceResults
        .filter((r) => r.profitAnalyses.length > 0)
        .map((r) => {
          const p = r.profitAnalyses[0];
          return {
            id: r.id,
            marketplace: r.marketplace,
            country: r.country,
            title: r.title,
            riskScore: r.riskScore,
            matchScore: r.matchScore,
            profit: {
              kaspiPriceKzt: p.kaspiPriceKzt,
              purchasePriceKzt: p.purchasePriceKzt,
              deliveryCostKzt: p.deliveryCostKzt,
              customsCostKzt: p.customsCostKzt,
              kaspiCommissionKzt: p.kaspiCommissionKzt,
              taxKzt: p.taxKzt,
              adsCostKzt: p.adsCostKzt,
              totalCostKzt: p.totalCostKzt,
              netProfitKzt: p.netProfitKzt,
              marginPercent: p.marginPercent,
              roiPercent: p.roiPercent,
            },
          };
        }),
    }));
  } catch {
    return localStore.analyses.getAll();
  }
}
