import type { WatchlistItemData } from "../types/extended";

export function mapWatchlistItem(
  item: {
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
    lastCheckedAt: Date;
    status: string;
    buyAlertEnabled: boolean;
    targetBuyPrice: number | null;
    targetQuantity: number;
    alertTriggeredAt: Date | null;
    alertStatus: string;
    comment: string | null;
    imageUrl: string | null;
    url: string | null;
    product?: { title: string; price: number };
  }
): WatchlistItemData {
  return {
    id: item.id,
    productId: item.productId,
    marketplaceResultId: item.marketplaceResultId,
    title: item.title,
    marketplace: item.marketplace,
    country: item.country,
    targetPurchasePrice: item.targetPurchasePrice,
    minProfit: item.minProfit,
    minRoi: item.minRoi,
    currentPrice: item.currentPrice,
    currentCurrency: item.currentCurrency,
    lastCheckedAt: item.lastCheckedAt.toISOString(),
    status: item.status as WatchlistItemData["status"],
    buyAlertEnabled: item.buyAlertEnabled,
    targetBuyPrice: item.targetBuyPrice,
    targetQuantity: item.targetQuantity,
    alertTriggeredAt: item.alertTriggeredAt?.toISOString() ?? null,
    alertStatus: item.alertStatus as WatchlistItemData["alertStatus"],
    comment: item.comment,
    imageUrl: item.imageUrl,
    url: item.url,
    productTitle: item.product?.title,
    kaspiPrice: item.product?.price,
  };
}
