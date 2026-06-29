import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore, seedMockStore } from "../store/mockStore";
import { mapWatchlistItem } from "./mapper";
import type { WatchlistItemData } from "../types/extended";
import { getAnalysisRun } from "../analysis-history/analysisHistoryService";
import { getSnapshotData } from "../analysis-history/snapshotUtils";
import {
  getMarketplaceDisplayPrice,
  resolveBestMarketplaceResult,
} from "../analysis-history/resolveBestResult";
import type { AnalysisResult } from "../types/analysisResult";
import type { ProfitAnalysisResult } from "../types";
export interface AddWatchlistInput {
  productId: string;
  marketplaceResultId: string;
  title: string;
  marketplace: string;
  country: string;
  targetPurchasePrice: number;
  minProfit?: number;
  minRoi?: number;
  currentPrice: number;
  currentCurrency?: string;
  buyAlertEnabled?: boolean;
  targetBuyPrice?: number;
  targetQuantity?: number;
  comment?: string;
  imageUrl?: string;
  url?: string;
  productTitle?: string;
  kaspiPrice?: number;
  netProfitKzt?: number;
  marginPercent?: number;
  roiPercent?: number;
  purchasePriceKzt?: number;
  landedCostKzt?: number;
}

export async function getWatchlist() {
  seedMockStore();

  if (!(await isDbAvailable())) {
    return mockStore.watchlist.getAll();
  }

  try {
    const items = await prisma.watchlistItem.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });
    return items.map(mapWatchlistItem);
  } catch {
    return mockStore.watchlist.getAll();
  }
}

export async function addToWatchlist(input: AddWatchlistInput) {
  if (!(await isDbAvailable())) {
    return mockStore.watchlist.add({
      productId: input.productId,
      marketplaceResultId: input.marketplaceResultId,
      title: input.title,
      marketplace: input.marketplace,
      country: input.country,
      targetPurchasePrice: input.targetPurchasePrice,
      minProfit: input.minProfit ?? 0,
      minRoi: input.minRoi ?? 20,
      currentPrice: input.currentPrice,
      currentCurrency: input.currentCurrency ?? "KZT",
      lastCheckedAt: new Date().toISOString(),
      status: "active",
      buyAlertEnabled: input.buyAlertEnabled ?? false,
      targetBuyPrice: input.targetBuyPrice,
      targetQuantity: input.targetQuantity ?? 1,
      alertStatus: "active",
      comment: input.comment,
      imageUrl: input.imageUrl,
      url: input.url,
      productTitle: input.productTitle,
      kaspiPrice: input.kaspiPrice,
      netProfitKzt: input.netProfitKzt,
      marginPercent: input.marginPercent,
      roiPercent: input.roiPercent,
      purchasePriceKzt: input.purchasePriceKzt,
      landedCostKzt: input.landedCostKzt,
    });
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        productId: input.productId,
        marketplaceResultId: input.marketplaceResultId,
        title: input.title,
        marketplace: input.marketplace,
        country: input.country,
        targetPurchasePrice: input.targetPurchasePrice,
        minProfit: input.minProfit ?? 0,
        minRoi: input.minRoi ?? 20,
        currentPrice: input.currentPrice,
        currentCurrency: input.currentCurrency ?? "KZT",
        buyAlertEnabled: input.buyAlertEnabled ?? false,
        targetBuyPrice: input.targetBuyPrice,
        targetQuantity: input.targetQuantity ?? 1,
        comment: input.comment,
        imageUrl: input.imageUrl,
        url: input.url,
      },
      include: { product: true },
    });
    return mapWatchlistItem(item);
  } catch {
    return mockStore.watchlist.add({
      ...input,
      minProfit: input.minProfit ?? 0,
      minRoi: input.minRoi ?? 20,
      currentCurrency: input.currentCurrency ?? "KZT",
      lastCheckedAt: new Date().toISOString(),
      status: "active",
      buyAlertEnabled: input.buyAlertEnabled ?? false,
      targetQuantity: input.targetQuantity ?? 1,
      alertStatus: "active",
      netProfitKzt: input.netProfitKzt,
      marginPercent: input.marginPercent,
      roiPercent: input.roiPercent,
      purchasePriceKzt: input.purchasePriceKzt,
    } as Omit<WatchlistItemData, "id">);
  }
}

export async function updateWatchlistItem(
  id: string,
  data: Partial<AddWatchlistInput & { status: string; alertStatus: string }>
) {
  if (!(await isDbAvailable())) {
    return mockStore.watchlist.update(id, data as Partial<WatchlistItemData>);
  }

  try {
    const item = await prisma.watchlistItem.update({
      where: { id },
      data: {
        targetPurchasePrice: data.targetPurchasePrice,
        minProfit: data.minProfit,
        minRoi: data.minRoi,
        buyAlertEnabled: data.buyAlertEnabled,
        targetBuyPrice: data.targetBuyPrice,
        targetQuantity: data.targetQuantity,
        comment: data.comment,
        status: data.status,
        alertStatus: data.alertStatus,
      },
      include: { product: true },
    });
    return mapWatchlistItem(item);
  } catch {
    return mockStore.watchlist.update(id, data as Partial<WatchlistItemData>);
  }
}

export async function removeFromWatchlist(id: string) {
  if (!(await isDbAvailable())) return mockStore.watchlist.remove(id);

  try {
    await prisma.watchlistItem.delete({ where: { id } });
    return true;
  } catch {
    return mockStore.watchlist.remove(id);
  }
}

export async function getTriggeredBuyAlerts() {
  const items = await getWatchlist();
  return items.filter(
    (i) =>
      i.alertStatus === "triggered" &&
      i.targetBuyPrice != null &&
      i.currentPrice <= i.targetBuyPrice
  );
}

type SnapshotMarketplaceResult = AnalysisResult["marketplaceResults"][number] & {
  profit: ProfitAnalysisResult;
};

export async function addToWatchlistFromRun(runId: string): Promise<{
  item: WatchlistItemData;
  alreadyExists: boolean;
}> {
  const run = await getAnalysisRun(runId);
  if (!run) {
    throw new Error("RUN_NOT_FOUND");
  }

  const marketplaceResults =
    getSnapshotData<SnapshotMarketplaceResult[]>(
      run.snapshots,
      "marketplace_results"
    ) ?? [];

  const analysisResult: AnalysisResult = {
    product: {
      id: run.productId ?? run.id,
      source: run.source,
      title: run.productTitle,
      brand: run.productBrand ?? undefined,
      category: run.productCategory ?? undefined,
      price: run.kaspiPriceKzt,
      currency: "KZT",
      url: run.kaspiUrl,
      imageUrl: run.productImageUrl ?? undefined,
    },
    marketplaceResults,
    providerStatuses: [],
    recommendation: run.aiRecommendation ?? "",
    bestOption: run.bestMarketplace ?? undefined,
  };

  const best = resolveBestMarketplaceResult(analysisResult);
  const productId = run.productId ?? run.id;
  const marketplaceResultId = best?.id ?? `run-${runId}`;

  const existing = (await getWatchlist()).find(
    (item) => item.marketplaceResultId === marketplaceResultId
  );
  if (existing) {
    return { item: existing, alreadyExists: true };
  }

  const currentPrice = best
    ? getMarketplaceDisplayPrice(best)
    : run.bestPurchasePriceKzt ?? run.kaspiPriceKzt;
  const currency = best?.currency ?? "TRY";
  const profit = best?.profit;

  const item = await addToWatchlist({
    productId,
    marketplaceResultId,
    title: best?.title ?? run.productTitle,
    productTitle: run.productTitle,
    marketplace: best?.marketplace ?? run.bestMarketplace ?? "unknown",
    country: best?.country ?? run.bestCountry ?? "TR",
    targetPurchasePrice:
      profit?.purchasePriceKzt ?? run.bestPurchasePriceKzt ?? currentPrice,
    purchasePriceKzt:
      profit?.purchasePriceKzt ?? run.bestPurchasePriceKzt ?? undefined,
    currentPrice,
    currentCurrency: currency,
    targetBuyPrice: currentPrice,
    buyAlertEnabled: Boolean(best?.url),
    minProfit: profit?.netProfitKzt ?? run.bestNetProfitKzt ?? 0,
    minRoi: profit?.roiPercent ?? run.bestRoiPercent ?? 0,
    netProfitKzt: profit?.netProfitKzt ?? run.bestNetProfitKzt ?? undefined,
    marginPercent: profit?.marginPercent,
    roiPercent: profit?.roiPercent ?? run.bestRoiPercent ?? undefined,
    imageUrl: best?.imageUrl ?? run.productImageUrl ?? undefined,
    url: best?.url,
    kaspiPrice: run.kaspiPriceKzt,
  });

  return { item, alreadyExists: false };
}
