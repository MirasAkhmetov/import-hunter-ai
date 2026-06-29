import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore } from "../store/mockStore";
import type { PriceHistoryPoint } from "../types/extended";

function generateMockHistory(
  marketplaceResultId: string,
  basePrice: number
): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  const now = Date.now();

  for (let i = 6; i >= 0; i--) {
    const variance = 1 + (Math.random() - 0.5) * 0.15;
    const price = Math.round(basePrice * variance);
    points.push({
      id: `ph-mock-${marketplaceResultId}-${i}`,
      price,
      currency: "KZT",
      priceKzt: price,
      checkedAt: new Date(now - i * 86400000 * 3).toISOString(),
    });
  }

  return points;
}

export async function getPriceHistory(
  marketplaceResultId: string,
  basePrice = 95000
): Promise<PriceHistoryPoint[]> {
  if (!(await isDbAvailable())) {
    const stored = mockStore.priceHistory.get(marketplaceResultId);
    if (stored.length > 0) return stored;
    const mock = generateMockHistory(marketplaceResultId, basePrice);
    mock.forEach((p) =>
      mockStore.priceHistory.add(marketplaceResultId, {
        price: p.price,
        currency: p.currency,
        priceKzt: p.priceKzt,
        checkedAt: p.checkedAt,
      })
    );
    return mockStore.priceHistory.get(marketplaceResultId);
  }

  try {
    const history = await prisma.priceHistory.findMany({
      where: { marketplaceResultId },
      orderBy: { checkedAt: "asc" },
    });

    if (history.length === 0) {
      return generateMockHistory(marketplaceResultId, basePrice);
    }

    return history.map((h) => ({
      id: h.id,
      price: h.price,
      currency: h.currency,
      priceKzt: h.priceKzt,
      checkedAt: h.checkedAt.toISOString(),
    }));
  } catch {
    return generateMockHistory(marketplaceResultId, basePrice);
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
    return mockStore.priceHistory.add(data.marketplaceResultId, {
      price: data.price,
      currency: data.currency,
      priceKzt: data.priceKzt,
      checkedAt: new Date().toISOString(),
    });
  }

  try {
    return await prisma.priceHistory.create({ data });
  } catch {
    return mockStore.priceHistory.add(data.marketplaceResultId, {
      price: data.price,
      currency: data.currency,
      priceKzt: data.priceKzt,
      checkedAt: new Date().toISOString(),
    });
  }
}
