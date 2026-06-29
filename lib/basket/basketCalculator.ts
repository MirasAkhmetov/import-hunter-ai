import type { BasketItemInput, BasketItemTotals, BasketCountrySummary } from "../types/extended";

export function calculateBasketItemTotals(item: {
  quantity: number;
  purchasePrice: number;
  deliveryPerUnit: number;
  extraCosts: number;
  targetSalePrice: number;
}): BasketItemTotals {
  const { quantity, purchasePrice, deliveryPerUnit, extraCosts, targetSalePrice } = item;
  const totalPurchase = purchasePrice * quantity;
  const totalDelivery = deliveryPerUnit * quantity;
  const totalExtraCosts = extraCosts * quantity;
  const totalCost = totalPurchase + totalDelivery + totalExtraCosts;
  const totalRevenue = targetSalePrice * quantity;
  const netProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const investment = totalPurchase + totalDelivery + totalExtraCosts;
  const roiPercent = investment > 0 ? (netProfit / investment) * 100 : 0;

  return {
    quantity,
    totalPurchase,
    totalDelivery,
    totalExtraCosts,
    totalCost,
    totalRevenue,
    netProfit,
    marginPercent,
    roiPercent,
  };
}

export interface BasketSummary {
  totalItems: number;
  totalQuantity: number;
  totalPurchase: number;
  totalDelivery: number;
  totalExtraCosts: number;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  avgMargin: number;
  avgRoi: number;
  byCountry: BasketCountrySummary[];
}

export function calculateBasketSummary(
  items: Array<BasketItemInput & { id: string }>
): BasketSummary {
  const countryMap = new Map<string, BasketCountrySummary>();

  let totalQuantity = 0;
  let totalPurchase = 0;
  let totalDelivery = 0;
  let totalExtraCosts = 0;
  let totalCost = 0;
  let totalRevenue = 0;
  let marginSum = 0;
  let roiSum = 0;

  for (const item of items) {
    const totals = calculateBasketItemTotals({
      quantity: item.quantity ?? 1,
      purchasePrice: item.purchasePrice,
      deliveryPerUnit: item.deliveryPerUnit ?? 0,
      extraCosts: item.extraCosts ?? 0,
      targetSalePrice: item.targetSalePrice,
    });

    totalQuantity += totals.quantity;
    totalPurchase += totals.totalPurchase;
    totalDelivery += totals.totalDelivery;
    totalExtraCosts += totals.totalExtraCosts;
    totalCost += totals.totalCost;
    totalRevenue += totals.totalRevenue;
    marginSum += totals.marginPercent;
    roiSum += totals.roiPercent;

    const country = item.country;
    const existing = countryMap.get(country) ?? {
      country,
      itemCount: 0,
      totalPurchase: 0,
      totalDelivery: 0,
      totalCost: 0,
      totalRevenue: 0,
      netProfit: 0,
      roiPercent: 0,
    };

    existing.itemCount += 1;
    existing.totalPurchase += totals.totalPurchase;
    existing.totalDelivery += totals.totalDelivery;
    existing.totalCost += totals.totalCost;
    existing.totalRevenue += totals.totalRevenue;
    existing.netProfit += totals.netProfit;
    countryMap.set(country, existing);
  }

  const byCountry = Array.from(countryMap.values()).map((c) => ({
    ...c,
    roiPercent: c.totalCost > 0 ? (c.netProfit / c.totalCost) * 100 : 0,
  }));

  const netProfit = totalRevenue - totalCost;

  return {
    totalItems: items.length,
    totalQuantity,
    totalPurchase,
    totalDelivery,
    totalExtraCosts,
    totalCost,
    totalRevenue,
    netProfit,
    avgMargin: items.length > 0 ? marginSum / items.length : 0,
    avgRoi: items.length > 0 ? roiSum / items.length : 0,
    byCountry,
  };
}
