import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore } from "../store/mockStore";
import type { PriceCorrectionHistory } from "../types/priceVerification";
import type { LinkStatus } from "../types/priceVerification";
import { resolveFinalPrice } from "./priceResolver";

export interface UpdatePriceCorrectionInput {
  marketplaceResultId: string;
  correctedPrice: number;
  currency: string;
  reason: string;
  comment?: string;
  correctedBy?: string;
}

export interface UpdatePriceCorrectionResult {
  history: PriceCorrectionHistory;
  finalPrice: number;
  correctedPrice: number;
  originalPrice: number;
  currency: string;
  priceSource: "manual_override";
  isMockPrice: false;
}

export async function updatePriceCorrection(
  input: UpdatePriceCorrectionInput
): Promise<UpdatePriceCorrectionResult | null> {
  const existing = await getMarketplaceResultPrice(input.marketplaceResultId);
  if (!existing) return null;

  const originalPrice = existing.originalPrice ?? existing.price;
  const now = new Date().toISOString();

  const historyEntry: PriceCorrectionHistory = {
    id: `pch-${Date.now()}`,
    marketplaceResultId: input.marketplaceResultId,
    originalPrice,
    correctedPrice: input.correctedPrice,
    currency: input.currency,
    reason: input.reason,
    comment: input.comment ?? null,
    correctedBy: input.correctedBy ?? null,
    createdAt: now,
  };

  const finalPrice = resolveFinalPrice({
    originalPrice,
    correctedPrice: input.correctedPrice,
    priceSource: "manual_override",
  });

  if (!(await isDbAvailable())) {
    mockStore.priceCorrections.add(historyEntry);
    mockStore.marketplaceResults.update(input.marketplaceResultId, {
      correctedPrice: input.correctedPrice,
      finalPrice,
      currency: input.currency,
      priceSource: "manual_override",
      manuallyCorrectedAt: now,
      correctionReason: input.reason,
      correctionComment: input.comment ?? null,
      price: finalPrice,
      originalPrice,
      isMockPrice: false,
      needsProfitReview: false,
    });
    return {
      history: historyEntry,
      finalPrice,
      correctedPrice: input.correctedPrice,
      originalPrice,
      currency: input.currency,
      priceSource: "manual_override",
      isMockPrice: false,
    };
  }

  try {
    await prisma.priceCorrectionHistory.create({
      data: {
        marketplaceResultId: input.marketplaceResultId,
        originalPrice,
        correctedPrice: input.correctedPrice,
        currency: input.currency,
        reason: input.reason,
        comment: input.comment,
        correctedBy: input.correctedBy,
      },
    });

    await prisma.marketplaceResult.update({
      where: { id: input.marketplaceResultId },
      data: {
        correctedPrice: input.correctedPrice,
        finalPrice,
        currency: input.currency,
        priceSource: "manual_override",
        manuallyCorrectedAt: new Date(),
        correctionReason: input.reason,
        correctionComment: input.comment,
        price: finalPrice,
        originalPrice,
        isMockPrice: false,
      },
    });

    return {
      history: historyEntry,
      finalPrice,
      correctedPrice: input.correctedPrice,
      originalPrice,
      currency: input.currency,
      priceSource: "manual_override",
      isMockPrice: false,
    };
  } catch {
    mockStore.priceCorrections.add(historyEntry);
    mockStore.marketplaceResults.update(input.marketplaceResultId, {
      correctedPrice: input.correctedPrice,
      finalPrice,
      currency: input.currency,
      priceSource: "manual_override",
      manuallyCorrectedAt: now,
      correctionReason: input.reason,
      correctionComment: input.comment ?? null,
      price: finalPrice,
      originalPrice,
      isMockPrice: false,
      needsProfitReview: false,
    });
    return {
      history: historyEntry,
      finalPrice,
      correctedPrice: input.correctedPrice,
      originalPrice,
      currency: input.currency,
      priceSource: "manual_override",
      isMockPrice: false,
    };
  }
}

export async function getPriceCorrectionHistory(
  marketplaceResultId: string
): Promise<PriceCorrectionHistory[]> {
  if (!(await isDbAvailable())) {
    return mockStore.priceCorrections.getByMarketplaceResultId(marketplaceResultId);
  }

  try {
    const rows = await prisma.priceCorrectionHistory.findMany({
      where: { marketplaceResultId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapHistory);
  } catch {
    return mockStore.priceCorrections.getByMarketplaceResultId(marketplaceResultId);
  }
}

async function getMarketplaceResultPrice(id: string) {
  if (!(await isDbAvailable())) {
    const existing = mockStore.marketplaceResults.get(id);
    if (existing) return existing;
    mockStore.marketplaceResults.set(id, { price: 0, originalPrice: 0 });
    return mockStore.marketplaceResults.get(id);
  }

  try {
    return await prisma.marketplaceResult.findUnique({ where: { id } });
  } catch {
    return mockStore.marketplaceResults.get(id);
  }
}

function mapHistory(row: {
  id: string;
  marketplaceResultId: string;
  originalPrice: number;
  correctedPrice: number;
  currency: string;
  reason: string;
  comment: string | null;
  correctedBy: string | null;
  createdAt: Date;
}): PriceCorrectionHistory {
  return {
    id: row.id,
    marketplaceResultId: row.marketplaceResultId,
    originalPrice: row.originalPrice,
    correctedPrice: row.correctedPrice,
    currency: row.currency,
    reason: row.reason,
    comment: row.comment,
    correctedBy: row.correctedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function updateLinkStatus(
  marketplaceResultId: string,
  linkStatus: LinkStatus,
  priceVerifiedAt?: string
) {
  const data = {
    linkStatus,
    priceVerifiedAt: priceVerifiedAt ?? new Date().toISOString(),
  };

  if (!(await isDbAvailable())) {
    return mockStore.marketplaceResults.update(marketplaceResultId, data);
  }

  try {
    return await prisma.marketplaceResult.update({
      where: { id: marketplaceResultId },
      data: {
        linkStatus,
        priceVerifiedAt: new Date(),
      },
    });
  } catch {
    return mockStore.marketplaceResults.update(marketplaceResultId, data);
  }
}

export async function confirmProductLink(marketplaceResultId: string) {
  return updateLinkStatus(marketplaceResultId, "verified");
}

export async function rejectProductLink(marketplaceResultId: string) {
  return updateLinkStatus(marketplaceResultId, "mismatch");
}
