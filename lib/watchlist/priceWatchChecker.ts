import { parseProduct } from "../price-verification/productPageParser";
import {
  detectMarketplaceFromUrl,
  isMarketplaceSearchUrl,
} from "../price-verification/urlUtils";
import { getSettings } from "../settings";
import { convertToKzt } from "../currency";
import { recordPriceHistory } from "../price-history/priceHistoryService";
import type { AlertNotificationData, WatchlistItemData } from "../types/extended";
import { mockStore } from "../store/mockStore";
import { isDbAvailable } from "../db/availability";
import { prisma } from "../db";

export interface PriceCheckResult {
  itemId: string;
  success: boolean;
  error?: string;
  oldPrice?: number;
  newPrice?: number;
  currency?: string;
  checkedAt?: string;
  alert?: AlertNotificationData;
}

async function setWatchlistTriggered(id: string) {
  const now = new Date().toISOString();
  if (!(await isDbAvailable())) {
    mockStore.watchlist.update(id, {
      alertStatus: "triggered",
      alertTriggeredAt: now,
      status: "price_reached",
    });
    return;
  }
  try {
    await prisma.watchlistItem.update({
      where: { id },
      data: {
        alertStatus: "triggered",
        alertTriggeredAt: new Date(),
        status: "price_reached",
      },
    });
  } catch {
    mockStore.watchlist.update(id, {
      alertStatus: "triggered",
      alertTriggeredAt: now,
      status: "price_reached",
    });
  }
}

async function createPriceAlert(
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
        oldPrice: data.oldPrice,
        currentPrice: data.currentPrice,
        targetPrice: data.targetPrice,
        status: data.status,
      },
    });
    return {
      ...data,
      id: alert.id,
      createdAt: alert.createdAt.toISOString(),
      readAt: null,
      currentCurrency: data.currentCurrency,
      productUrl: data.productUrl,
      priceCheckedAt: data.priceCheckedAt,
    } as AlertNotificationData;
  } catch {
    return mockStore.alerts.add({
      ...data,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }
}

async function updateWatchlistPrice(
  id: string,
  price: number,
  currency: string,
  checkedAt: string
) {
  if (!(await isDbAvailable())) {
    mockStore.watchlist.update(id, {
      currentPrice: price,
      currentCurrency: currency,
      lastCheckedAt: checkedAt,
    });
    return;
  }

  try {
    await prisma.watchlistItem.update({
      where: { id },
      data: { currentPrice: price, currentCurrency: currency, lastCheckedAt: new Date(checkedAt) },
    });
  } catch {
    mockStore.watchlist.update(id, {
      currentPrice: price,
      currentCurrency: currency,
      lastCheckedAt: checkedAt,
    });
  }
}

export async function checkWatchlistItemPrice(
  item: WatchlistItemData
): Promise<PriceCheckResult> {
  const checkedAt = new Date().toISOString();

  if (!item.url || isMarketplaceSearchUrl(item.url)) {
    return {
      itemId: item.id,
      success: false,
      error: "Нет ссылки на страницу товара (только поиск)",
    };
  }

  const marketplace =
    detectMarketplaceFromUrl(item.url) ?? item.marketplace ?? "unknown";
  const parsed = await parseProduct(item.url, marketplace);

  if (!parsed || parsed.price <= 0) {
    return {
      itemId: item.id,
      success: false,
      error: "Не удалось получить цену со страницы",
    };
  }

  const oldPrice = item.currentPrice;
  const newPrice = parsed.price;
  const currency = parsed.currency;

  await updateWatchlistPrice(item.id, newPrice, currency, checkedAt);

  const settings = await getSettings();
  const priceKzt = convertToKzt(newPrice, currency, settings);

  await recordPriceHistory({
    productId: item.productId,
    marketplaceResultId: item.marketplaceResultId,
    marketplace: item.marketplace,
    country: item.country,
    price: newPrice,
    currency,
    priceKzt,
  });

  const target = item.targetBuyPrice ?? item.targetPurchasePrice;
  let alert: AlertNotificationData | undefined;

  if (
    item.buyAlertEnabled &&
    item.alertStatus !== "triggered" &&
    item.alertStatus !== "purchased" &&
    item.alertStatus !== "ignored" &&
    item.status !== "paused" &&
    target != null &&
    target > 0 &&
    newPrice <= target
  ) {
    await setWatchlistTriggered(item.id);

    const dateLabel = new Date(checkedAt).toLocaleString("ru-RU");
    const created = await createPriceAlert({
      watchlistItemId: item.id,
      productId: item.productId,
      marketplaceResultId: item.marketplaceResultId,
      type: "target_price_reached",
      title: "🔥 Цена достигнута",
      message: `Цена ${newPrice.toLocaleString("ru-RU")} ${currency} ≤ вашей цели ${target.toLocaleString("ru-RU")} ${currency}. Дата: ${dateLabel}`,
      oldPrice,
      currentPrice: newPrice,
      currentCurrency: currency,
      targetPrice: target,
      status: "unread",
      productTitle: item.productTitle ?? item.title,
      marketplace: item.marketplace,
      country: item.country,
      productUrl: item.url,
      priceCheckedAt: checkedAt,
    });

    if (created && "id" in created) {
      alert = created as AlertNotificationData;
    }
  }

  return {
    itemId: item.id,
    success: true,
    oldPrice,
    newPrice,
    currency,
    checkedAt,
    alert,
  };
}

export async function checkAllWatchlistPrices(
  items: WatchlistItemData[]
): Promise<PriceCheckResult[]> {
  const active = items.filter(
    (i) =>
      i.buyAlertEnabled &&
      i.status !== "paused" &&
      i.alertStatus !== "purchased" &&
      i.alertStatus !== "ignored"
  );

  const results: PriceCheckResult[] = [];

  for (const item of active) {
    results.push(await checkWatchlistItemPrice(item));
    await new Promise((r) => setTimeout(r, 800));
  }

  return results;
}
