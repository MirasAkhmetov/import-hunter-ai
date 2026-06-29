import { calculateProfit } from "../profitCalculator";
import { convertToKzt, getExchangeRate } from "../currency";
import type { WatchlistItemData } from "../types/extended";
import type { AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

export interface WatchlistTargetMetrics {
  targetPriceForeign: number;
  purchasePriceKzt: number;
  netProfitKzt: number;
  roiPercent: number;
  marginPercent: number;
  usesTarget: boolean;
}

export function isCalculatorWatchlistItem(item: WatchlistItemData): boolean {
  return (
    item.landedCostKzt != null ||
    item.productId.startsWith("manual-") ||
    Boolean(item.comment?.toLowerCase().includes("калькулятор"))
  );
}

export function computeWatchlistMetricsAtTarget(
  item: WatchlistItemData,
  settings: AppSettings = DEFAULT_SETTINGS,
  targetOverride?: number
): WatchlistTargetMetrics {
  const targetPriceForeign =
    targetOverride ?? item.targetBuyPrice ?? item.currentPrice;
  const kaspiPriceKzt = item.kaspiPrice ?? 0;
  const usesTarget =
    targetPriceForeign !== item.currentPrice ||
    item.targetBuyPrice != null;

  if (targetPriceForeign <= 0) {
    return {
      targetPriceForeign: 0,
      purchasePriceKzt: item.purchasePriceKzt ?? 0,
      netProfitKzt: item.netProfitKzt ?? item.minProfit ?? 0,
      roiPercent: item.roiPercent ?? item.minRoi ?? 0,
      marginPercent: item.marginPercent ?? 0,
      usesTarget: false,
    };
  }

  // Товар из калькулятора: kaspiPrice = продажа, landedCostKzt = себестоимость в Алматы
  if (isCalculatorWatchlistItem(item) && item.landedCostKzt != null && kaspiPriceKzt > 0) {
    const deliveryKzt =
      item.landedCostKzt - (item.purchasePriceKzt ?? 0);
    const purchaseKztAtTarget = convertToKzt(
      targetPriceForeign,
      item.currentCurrency,
      settings
    );
    const landedKzt = purchaseKztAtTarget + Math.max(0, deliveryKzt);
    const netProfitKzt = kaspiPriceKzt - landedKzt;
    const roiPercent =
      landedKzt > 0 ? (netProfitKzt / landedKzt) * 100 : 0;
    const marginPercent =
      kaspiPriceKzt > 0 ? (netProfitKzt / kaspiPriceKzt) * 100 : 0;
    return {
      targetPriceForeign,
      purchasePriceKzt: landedKzt,
      netProfitKzt,
      roiPercent,
      marginPercent,
      usesTarget,
    };
  }

  // Полный расчёт: цена Kaspi / продажи vs закупка по цели
  if (kaspiPriceKzt > 0 && item.currentCurrency !== "KZT") {
    const profit = calculateProfit({
      kaspiPriceKzt,
      purchasePrice: targetPriceForeign,
      purchaseCurrency: item.currentCurrency,
      settings,
      country: item.country,
      kaspiProductTitle: item.productTitle ?? item.title,
    });
    return {
      targetPriceForeign,
      purchasePriceKzt: profit.purchasePriceKzt,
      netProfitKzt: profit.netProfitKzt,
      roiPercent: profit.roiPercent,
      marginPercent: profit.marginPercent,
      usesTarget,
    };
  }

  // Закупка уже в тенге (калькулятор без Kaspi)
  if (item.currentCurrency === "KZT") {
    const purchasePriceKzt = targetPriceForeign;
    const netProfitKzt =
      kaspiPriceKzt > purchasePriceKzt ? kaspiPriceKzt - purchasePriceKzt : 0;
    const roiPercent =
      purchasePriceKzt > 0 ? (netProfitKzt / purchasePriceKzt) * 100 : 0;
    const marginPercent =
      kaspiPriceKzt > 0 ? (netProfitKzt / kaspiPriceKzt) * 100 : 0;
    return {
      targetPriceForeign,
      purchasePriceKzt,
      netProfitKzt,
      roiPercent,
      marginPercent,
      usesTarget,
    };
  }

  // Fallback: масштаб от текущей цены
  if (
    item.purchasePriceKzt != null &&
    item.currentPrice > 0 &&
    item.netProfitKzt != null
  ) {
    const ratio = targetPriceForeign / item.currentPrice;
    const purchasePriceKzt = item.purchasePriceKzt * ratio;
    const purchaseDelta =
      purchasePriceKzt - item.purchasePriceKzt;
    const netProfitKzt = item.netProfitKzt - purchaseDelta;
    const investmentOld =
      item.purchasePriceKzt > 0
        ? item.purchasePriceKzt
        : convertToKzt(item.currentPrice, item.currentCurrency, settings);
    const roiPercent =
      investmentOld > 0 ? (netProfitKzt / (investmentOld * ratio)) * 100 : 0;
    const marginPercent =
      kaspiPriceKzt > 0 ? (netProfitKzt / kaspiPriceKzt) * 100 : item.marginPercent ?? 0;
    return {
      targetPriceForeign,
      purchasePriceKzt,
      netProfitKzt,
      roiPercent,
      marginPercent,
      usesTarget,
    };
  }

  const purchasePriceKzt = convertToKzt(
    targetPriceForeign,
    item.currentCurrency,
    settings
  );
  return {
    targetPriceForeign,
    purchasePriceKzt,
    netProfitKzt: item.netProfitKzt ?? 0,
    roiPercent: item.roiPercent ?? 0,
    marginPercent: item.marginPercent ?? 0,
    usesTarget,
  };
}
