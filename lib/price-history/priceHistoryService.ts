import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { localStore } from "../store/localStore";
import type { PriceHistoryPoint } from "../types/extended";

export async function getPriceHistory(
  marketplaceResultId: string
): Promise<PriceHistoryPoint[]> {
  if (!(await isDbAvailable())) {
    return localStore.priceHistory.get(marketplaceResultId);
  }

  try {
    const history = await prisma.priceHistory.findMany({
      where: { marketplaceResultId },
      orderBy: { checkedAt: "asc" },
    });

    return history.map((h) => ({
      id: h.id,
      price: h.price,
      currency: h.currency,
      priceKzt: h.priceKzt,
      checkedAt: h.checkedAt.toISOString(),
    }));
  } catch {
    return localStore.priceHistory.get(marketplaceResultId);
  }
}

export async function recordPriceHistory(data: {
  productId: string;
  marketplaceResultId: string;
  marketplace: string;
  country: string;
  price: number;
  currency: string;
  priceKzt: number;
}) {
  if (!(await isDbAvailable())) {
    return localStore.priceHistory.add(data.marketplaceResultId, {
      price: data.price,
      currency: data.currency,
      priceKzt: data.priceKzt,
      checkedAt: new Date().toISOString(),
    });
  }

  try {
    return await prisma.priceHistory.create({ data });
  } catch {
    return localStore.priceHistory.add(data.marketplaceResultId, {
      price: data.price,
      currency: data.currency,
      priceKzt: data.priceKzt,
      checkedAt: new Date().toISOString(),
    });
  }
}
