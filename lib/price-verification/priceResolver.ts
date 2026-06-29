import { isMockMode } from "../config/searchSettings";
import type { PriceSource } from "../types/priceVerification";

export interface PriceResolutionInput {
  originalPrice: number;
  correctedPrice?: number | null;
  priceSource?: PriceSource;
  isMockPrice?: boolean;
}

export function resolveFinalPrice(input: PriceResolutionInput): number {
  if (input.correctedPrice != null && input.correctedPrice > 0) {
    return input.correctedPrice;
  }
  return input.originalPrice;
}

export function resolvePriceSource(
  input: PriceResolutionInput
): PriceSource {
  if (input.correctedPrice != null && input.correctedPrice > 0) {
    return "manual_override";
  }
  return input.priceSource ?? "search_result";
}

export function shouldUseMockPrice(isMockPrice?: boolean): boolean {
  return isMockMode() && Boolean(isMockPrice);
}

export function getEffectivePurchasePrice(input: PriceResolutionInput): {
  finalPrice: number;
  priceSource: PriceSource;
  isMockPrice: boolean;
} {
  const isMockPrice = Boolean(input.isMockPrice);

  if (isMockPrice) {
    return {
      finalPrice: 0,
      priceSource: input.priceSource ?? "search_result",
      isMockPrice: true,
    };
  }

  const finalPrice = resolveFinalPrice(input);

  return {
    finalPrice,
    priceSource: resolvePriceSource(input),
    isMockPrice: false,
  };
}

export function canAutoCalculateProfit(
  matchScore: number,
  linkStatus: string,
  isMockPrice?: boolean
): boolean {
  if (isMockPrice && !isMockMode()) return false;
  if (matchScore < 85) return false;
  if (linkStatus === "mismatch" || linkStatus === "unavailable") return false;
  return true;
}
