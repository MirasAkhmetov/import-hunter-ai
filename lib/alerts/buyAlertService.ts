import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore, seedMockStore } from "../store/mockStore";
import { mapWatchlistItem } from "../watchlist/mapper";
import type {
  AlertNotificationData,
  AlertStatus,
  AlertType,
  WatchlistItemData,
} from "../types/extended";

export async function getAlerts(status?: string) {
  seedMockStore();

  if (!(await isDbAvailable())) {
    const all = mockStore.alerts.getAll();
    return status ? all.filter((a) => a.status === status) : all;
  }

  try {
    const alerts = await prisma.alertNotification.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        marketplaceResult: { include: { product: true } },
      },
    });

    return alerts.map((a) => ({
      id: a.id,
      watchlistItemId: a.watchlistItemId,
      productId: a.productId,
      marketplaceResultId: a.marketplaceResultId,
      type: a.type as AlertType,
      title: a.title,
      message: a.message,
      oldPrice: a.oldPrice,
      currentPrice: a.currentPrice,
      targetPrice: a.targetPrice,
      potentialProfit: a.potentialProfit,
      roiPercent: a.roiPercent,
      status: a.status as AlertNotificationData["status"],
      createdAt: a.createdAt.toISOString(),
      readAt: a.readAt?.toISOString() ?? null,
      productTitle: a.marketplaceResult.product.title,
      marketplace: a.marketplaceResult.marketplace,
      country: a.marketplaceResult.country,
    }));
  } catch {
    return mockStore.alerts.getAll();
  }
}

export async function getUnreadAlertCount() {
  seedMockStore();
  if (!(await isDbAvailable())) return mockStore.alerts.getUnreadCount();

  try {
    return await prisma.alertNotification.count({ where: { status: "unread" } });
  } catch {
    return mockStore.alerts.getUnreadCount();
  }
}

export async function createAlertNotification(
  data: Omit<AlertNotificationData, "id" | "createdAt" | "readAt">
) {
  if (!(await isDbAvailable())) {
    return mockStore.alerts.add({
      ...data,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }

  try {
    const alert = await prisma.alertNotification.create({
      data: {
        watchlistItemId: data.watchlistItemId ?? undefined,
        productId: data.productId,
        marketplaceResultId: data.marketplaceResultId,
        type: data.type,
        title: data.title,
        message: data.message,
        oldPrice: data.oldPrice ?? undefined,
        currentPrice: data.currentPrice ?? undefined,
        targetPrice: data.targetPrice ?? undefined,
        potentialProfit: data.potentialProfit ?? undefined,
        roiPercent: data.roiPercent ?? undefined,
        status: data.status ?? "unread",
      },
    });
    return alert;
  } catch {
    return mockStore.alerts.add({
      ...data,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }
}

export async function markAlertAsRead(id: string) {
  if (!(await isDbAvailable())) {
    return mockStore.alerts.update(id, {
      status: "read",
      readAt: new Date().toISOString(),
    });
  }

  try {
    return await prisma.alertNotification.update({
      where: { id },
      data: { status: "read", readAt: new Date() },
    });
  } catch {
    return mockStore.alerts.update(id, {
      status: "read",
      readAt: new Date().toISOString(),
    });
  }
}

export async function markAsPurchased(watchlistItemId: string) {
  await updateWatchlistAlertStatus(watchlistItemId, "purchased");
}

export async function ignoreAlert(watchlistItemId: string) {
  await updateWatchlistAlertStatus(watchlistItemId, "ignored");
}

export async function pauseAlert(watchlistItemId: string) {
  await updateWatchlistAlertStatus(watchlistItemId, "paused");
}

export async function resumeAlert(watchlistItemId: string) {
  await updateWatchlistAlertStatus(watchlistItemId, "active");
}

async function updateWatchlistAlertStatus(
  watchlistItemId: string,
  alertStatus: AlertStatus
) {
  if (!(await isDbAvailable())) {
    return mockStore.watchlist.update(watchlistItemId, { alertStatus });
  }

  try {
    return await prisma.watchlistItem.update({
      where: { id: watchlistItemId },
      data: { alertStatus },
    });
  } catch {
    return mockStore.watchlist.update(watchlistItemId, { alertStatus });
  }
}

export async function checkBuyAlerts(): Promise<AlertNotificationData[]> {
  seedMockStore();
  const { checkAllWatchlistPrices } = await import("../watchlist/priceWatchChecker");
  const items = await getWatchlistItemsForCheck();
  const results = await checkAllWatchlistPrices(items);
  return results
    .filter((r) => r.alert)
    .map((r) => r.alert as AlertNotificationData);
}

async function getWatchlistItemsForCheck(): Promise<WatchlistItemData[]> {
  if (!(await isDbAvailable())) return mockStore.watchlist.getAll();

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { buyAlertEnabled: true },
      include: { product: true },
    });
    return items.map(mapWatchlistItem);
  } catch {
    return mockStore.watchlist.getAll();
  }
}
