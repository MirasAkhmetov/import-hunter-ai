import { prisma } from "./db";
import { isMockMode } from "./config/mockMode";
import type { Prisma } from "@prisma/client";
import { parseKaspiProduct } from "./parsers/kaspi";
import {
  searchMarketplaces,
} from "./marketplaces/manager";
import {
  matchProducts,
  generateRecommendation,
} from "./aiMatcher";
import { runProductSearchOrchestrator } from "./search/searchOrchestrator";
import type { MarketplaceSearchFn } from "./search/types";
import { calculateProfit } from "./profitCalculator";
import { getSettings } from "./settings";
import { mockStore, nextMockId } from "./store/mockStore";
import { findAndSaveBrandContacts } from "./brand-finder/brandContactService";
import { verifyProductLink } from "./price-verification/linkVerifier";
import {
  canAutoCalculateProfit,
  getEffectivePurchasePrice,
} from "./price-verification/priceResolver";
import { enrichResultWithProductPage } from "./price-verification/productPageParser";
import type {
  AnalysisStatus,
  MarketplaceResultData,
  ParsedProduct,
  ProfitAnalysisResult,
} from "./types";
import { ANALYSIS_STATUS_LABELS } from "./types";
import { getMarketplaceDisplayPrice } from "./analysis-history/resolveBestResult";
import type { BrandContact, BrandFinderMeta } from "./types/brandFinder";
import type {
  AnalysisResult,
  AnalysisStep,
  AnalysisOptions,
  ProviderStatusInfo,
} from "./types/analysisResult";

export type {
  AnalysisResult,
  AnalysisStep,
  AnalysisOptions,
  ProviderStatusInfo,
} from "./types/analysisResult";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_KASPI_URL: "Неправильная ссылка Kaspi. Используйте формат: https://kaspi.kz/shop/p/...",
  PRODUCT_NOT_FOUND: "Товар не найден на Kaspi.kz",
  MARKETPLACE_UNAVAILABLE: "Маркетплейс временно недоступен",
  PARSING_BLOCKED: "Парсинг заблокирован. Попробуйте позже или включите mock-режим.",
  NO_MATCHES: "Похожие товары не найдены",
  AI_API_ERROR: "Ошибка AI API. Проверьте ключ OpenAI.",
  ANALYSIS_TIMEOUT:
    "Анализ занял слишком много времени. Попробуйте снова или сузьте фильтр по стране/маркетплейсу.",
  ENRICHMENT_TIMEOUT:
    "Не удалось быстро проверить цену на маркетплейсе. Попробуйте ещё раз.",
  UNKNOWN_ERROR:
    "Произошла неизвестная ошибка. Попробуйте другую ссылку или повторите позже.",
};

function normalizeErrorCode(code: string): string {
  if (code in ERROR_MESSAGES) return code;

  const lower = code.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("headers timeout")
  ) {
    return "ANALYSIS_TIMEOUT";
  }
  if (
    lower.includes("playwright") ||
    lower.includes("browser") ||
    lower.includes("net::err")
  ) {
    return "PARSING_BLOCKED";
  }
  if (lower.includes("not implemented")) {
    return "MARKETPLACE_UNAVAILABLE";
  }
  if (lower.includes("enrichment_timeout")) {
    return "ENRICHMENT_TIMEOUT";
  }

  return code;
}

export function getErrorMessage(code: string): string {
  const normalized = normalizeErrorCode(code);
  return ERROR_MESSAGES[normalized] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

const ENRICHMENT_TIMEOUT_MS = 22_000;

async function enrichResultWithTimeout(
  result: MarketplaceResultData
): Promise<MarketplaceResultData> {
  try {
    return await Promise.race([
      enrichResultWithProductPage(result),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ENRICHMENT_TIMEOUT")), ENRICHMENT_TIMEOUT_MS);
      }),
    ]);
  } catch {
    const searchPrice = result.price ?? 0;
    if (searchPrice > 0) {
      return {
        ...result,
        originalPrice: searchPrice,
        finalPrice: searchPrice,
        price: searchPrice,
        isMockPrice: false,
        needsProfitReview: true,
        priceSource: "search_result",
      };
    }
    return {
      ...result,
      isMockPrice: true,
      needsProfitReview: true,
      priceSource: "search_result",
    };
  }
}

function buildVerifiedMarketplaceResult(
  enriched: MarketplaceResultData,
  kaspiProduct: ParsedProduct,
  settings: Awaited<ReturnType<typeof getSettings>>
): MarketplaceResultData & {
  profit?: ProfitAnalysisResult;
  needsProfitReview?: boolean;
} {
  const matchScore = enriched.finalMatchScore ?? enriched.matchScore ?? 0;
  const linkVerification = verifyProductLink({
    kaspiProduct,
    resultTitle: enriched.title,
    resultUrl: enriched.url,
    matchScore,
  });

  const priceInfo = getEffectivePurchasePrice({
    originalPrice: enriched.price,
    correctedPrice: enriched.correctedPrice,
    priceSource: enriched.priceSource ?? "search_result",
    isMockPrice: enriched.isMockPrice,
  });

  const originalPrice = enriched.originalPrice ?? enriched.price;
  const finalPrice = priceInfo.finalPrice;
  const autoProfit = canAutoCalculateProfit(
    matchScore,
    linkVerification.linkStatus,
    priceInfo.isMockPrice
  );

  const baseFields = {
    ...enriched,
    originalPrice,
    finalPrice,
    price: finalPrice,
    priceSource: priceInfo.priceSource,
    linkStatus: linkVerification.linkStatus,
    priceVerifiedAt: new Date().toISOString(),
    isMockPrice: priceInfo.isMockPrice,
    matchWarnings: [
      ...(enriched.matchWarnings ?? []),
      ...linkVerification.warnings,
    ],
    needsProfitReview: !autoProfit,
  };

  const profit = calculateProfit({
    kaspiPriceKzt: kaspiProduct.price,
    purchasePrice: finalPrice,
    purchaseCurrency: enriched.currency,
    country: enriched.country,
    settings,
    kaspiCategory: kaspiProduct.category,
    kaspiProductTitle: kaspiProduct.title,
  });

  return {
    ...baseFields,
    profit,
    needsProfitReview: autoProfit ? baseFields.needsProfitReview : true,
  };
}

function pickCheapestVerifiedResult(
  results: MarketplaceResultData[]
): MarketplaceResultData | undefined {
  const verified = results.filter(
    (item) =>
      item.searchMethod !== "not_found" &&
      !item.isMockPrice &&
      getMarketplaceDisplayPrice(item) > 0
  );
  if (verified.length === 0) return undefined;

  return [...verified].sort((a, b) => {
    const priceDiff =
      getMarketplaceDisplayPrice(a) - getMarketplaceDisplayPrice(b);
    if (priceDiff !== 0) return priceDiff;
    return (
      (b.finalMatchScore ?? b.matchScore ?? 0) -
      (a.finalMatchScore ?? a.matchScore ?? 0)
    );
  })[0];
}

export async function runAnalysis(
  kaspiUrl: string,
  onProgress?: (step: AnalysisStep) => void,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  const settings = await getSettings();

  const report = (status: AnalysisStatus, marketplace?: string) => {
    onProgress?.({
      status,
      label: marketplace
        ? `Ищем на ${marketplace}…`
        : ANALYSIS_STATUS_LABELS[status],
      marketplace,
    });
  };

  report("parsing_kaspi");
  const kaspiProduct = await parseKaspiProduct(kaspiUrl);

  report("searching_marketplaces");
  const providerStatuses: ProviderStatusInfo[] = [];

  const mergeProviderStatuses = (incoming: ProviderStatusInfo[]) => {
    for (const status of incoming) {
      const existing = providerStatuses.find(
        (item) => item.marketplace === status.marketplace
      );
      if (existing) {
        existing.resultCount += status.resultCount;
        if (status.status === "failed" && existing.status !== "mock") {
          existing.status = status.status;
          existing.error = status.error;
        }
      } else {
        providerStatuses.push({ ...status });
      }
    }
  };

  const searchForMarketplaces: MarketplaceSearchFn = async (query, marketplaces) => {
    const { results, providerStatuses: statuses } = await searchMarketplaces(query, {
      countries: options?.countries,
      marketplaces,
      onProgress: (provider) => {
        report("searching_marketplaces", provider.name);
      },
    });
    mergeProviderStatuses(statuses);
    return results;
  };

  const orchestrated = await runProductSearchOrchestrator(
    kaspiProduct,
    searchForMarketplaces,
    async (candidates, visualDescription) => {
      if (candidates.length === 0) return [];
      return matchProducts(kaspiProduct, candidates, visualDescription);
    },
    {
      countries: options?.countries,
      marketplaces: options?.marketplaces,
      onMarketplaceProgress: (_marketplace, phase) => {
        if (phase === "image" || phase === "text") {
          report("searching_marketplaces");
        }
      },
    }
  );

  const { results: matchedResults } = orchestrated;

  if (matchedResults.length === 0) {
    throw new Error("NO_MATCHES");
  }

  report("matching_products");

  report("calculating_profit");

  const verifiedResults: Array<
    MarketplaceResultData & { profit?: ProfitAnalysisResult; needsProfitReview?: boolean }
  > = [];

  const notFoundResults = matchedResults.filter((r) => r.searchMethod === "not_found");
  const enrichableResults = matchedResults.filter((r) => r.searchMethod !== "not_found");

  for (const result of notFoundResults) {
    verifiedResults.push({
      ...result,
      isMockPrice: true,
      needsProfitReview: true,
      priceSource: "search_result",
      linkStatus: "needs_review",
      profit: calculateProfit({
        kaspiPriceKzt: kaspiProduct.price,
        purchasePrice: 0,
        purchaseCurrency: result.currency,
        country: result.country,
        settings,
        kaspiCategory: kaspiProduct.category,
        kaspiProductTitle: kaspiProduct.title,
      }),
    });
  }

  const enrichedBatch = await Promise.all(
    enrichableResults.map((result) => enrichResultWithTimeout(result))
  );

  for (const enriched of enrichedBatch) {
    verifiedResults.push(
      buildVerifiedMarketplaceResult(enriched, kaspiProduct, settings)
    );
  }

  const resultsWithProfit = verifiedResults.sort((a, b) => {
    const topDiff = Number(b.isTopMatch) - Number(a.isTopMatch);
    if (topDiff !== 0) return topDiff;

    const exactDiff = Number(b.isExactMatch) - Number(a.isExactMatch);
    if (exactDiff !== 0) return exactDiff;

    const matchDiff =
      (b.finalMatchScore ?? b.matchScore ?? 0) - (a.finalMatchScore ?? a.matchScore ?? 0);
    if (matchDiff !== 0) return matchDiff;

    const imageDiff = (b.imageSimilarityScore ?? 0) - (a.imageSimilarityScore ?? 0);
    if (imageDiff !== 0) return imageDiff;

    return (b.profit?.roiPercent ?? 0) - (a.profit?.roiPercent ?? 0);
  });

  const recommendation = await generateRecommendation(
    kaspiProduct,
    resultsWithProfit
  );

  report("completed");

  let savedProduct: {
    id: string;
    marketplaceResults?: Array<{ id: string }>;
  } | null = null;
  if (!isMockMode()) {
    try {
      const productData = {
        source: kaspiProduct.source,
        title: kaspiProduct.title,
        brand: kaspiProduct.brand,
        model: kaspiProduct.model,
        category: kaspiProduct.category,
        price: kaspiProduct.price,
        currency: kaspiProduct.currency,
        url: kaspiProduct.url,
        imageUrl: kaspiProduct.imageUrl,
        rating: kaspiProduct.rating,
        reviewCount: kaspiProduct.reviewCount,
        specifications: kaspiProduct.specifications ?? undefined,
      };

      const existingProduct = await prisma.product.findFirst({
        where: { url: kaspiProduct.url },
        select: { id: true },
      });

      const productId = existingProduct
        ? (
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: productData,
            })
          ).id
        : (
            await prisma.product.create({
              data: productData,
            })
          ).id;

      if (existingProduct) {
        await prisma.marketplaceResult.deleteMany({
          where: { productId: existingProduct.id },
        });
      }

      for (const r of resultsWithProfit) {
        await prisma.marketplaceResult.create({
          data: {
            productId,
            marketplace: r.marketplace,
            country: r.country,
            title: r.title,
            price: r.price,
            currency: r.currency,
            url: r.url,
            imageUrl: r.imageUrl,
            sellerName: r.sellerName,
            sellerRating: r.sellerRating,
            specifications: r.specifications ?? undefined,
            matchScore: r.matchScore ?? 0,
            riskScore: r.riskScore ?? 0,
            originalPrice: r.originalPrice ?? r.price,
            finalPrice: r.finalPrice ?? r.price,
            priceSource: r.priceSource ?? "search_result",
            linkStatus: r.linkStatus ?? "needs_review",
            priceVerifiedAt: r.priceVerifiedAt ? new Date(r.priceVerifiedAt) : new Date(),
            isMockPrice: r.isMockPrice ?? false,
            profitAnalyses: r.profit
              ? {
                  create: {
                    productId,
                    kaspiPriceKzt: r.profit.kaspiPriceKzt,
                    purchasePriceKzt: r.profit.purchasePriceKzt,
                    deliveryCostKzt: r.profit.deliveryCostKzt,
                    customsCostKzt: r.profit.customsCostKzt,
                    kaspiCommissionKzt: r.profit.kaspiCommissionKzt,
                    taxKzt: r.profit.taxKzt,
                    adsCostKzt: r.profit.adsCostKzt,
                    totalCostKzt: r.profit.totalCostKzt,
                    netProfitKzt: r.profit.netProfitKzt,
                    marginPercent: r.profit.marginPercent,
                    roiPercent: r.profit.roiPercent,
                    recommendation,
                  },
                }
              : undefined,
          },
        });
      }

      savedProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          marketplaceResults: {
            include: { profitAnalyses: true },
          },
        },
      });
    } catch {
      savedProduct = null;
    }
  }

  const foundResults = resultsWithProfit.filter(
    (item) => item.searchMethod !== "not_found"
  );
  const best = pickCheapestVerifiedResult(foundResults) ?? resultsWithProfit[0];

  const productId = savedProduct?.id ?? "mock-" + Date.now();

  let brandContactsList: BrandContact[] = [];
  let brandFinderMeta: BrandFinderMeta | undefined;
  try {
    const brandResult = await findAndSaveBrandContacts({
      id: productId,
      source: kaspiProduct.source,
      title: kaspiProduct.title,
      brand: kaspiProduct.brand,
      model: kaspiProduct.model,
      category: kaspiProduct.category,
      price: kaspiProduct.price,
      currency: kaspiProduct.currency,
      url: kaspiProduct.url,
      imageUrl: kaspiProduct.imageUrl,
    });
    brandContactsList = brandResult.contacts;
    brandFinderMeta = brandResult.meta;
  } catch {
    brandContactsList = [];
  }

  const marketplaceResultIds = resultsWithProfit.map(
    (_, i) => savedProduct?.marketplaceResults?.[i]?.id ?? nextMockId("mr")
  );

  const analysisResult: AnalysisResult = {
    product: {
      id: productId,
      source: kaspiProduct.source,
      title: kaspiProduct.title,
      brand: kaspiProduct.brand,
      model: kaspiProduct.model,
      category: kaspiProduct.category,
      price: kaspiProduct.price,
      currency: kaspiProduct.currency,
      url: kaspiProduct.url,
      imageUrl: kaspiProduct.imageUrl,
      rating: kaspiProduct.rating,
      reviewCount: kaspiProduct.reviewCount,
      specifications: kaspiProduct.specifications,
    },
    marketplaceResults: resultsWithProfit.map((r, i) => {
      const id = marketplaceResultIds[i]!;
      if (isMockMode()) {
        mockStore.marketplaceResults.set(id, {
          price: r.finalPrice ?? r.price,
          originalPrice: r.originalPrice ?? r.price,
          finalPrice: r.finalPrice ?? r.price,
          priceSource: r.priceSource,
          linkStatus: r.linkStatus,
          priceVerifiedAt: r.priceVerifiedAt ?? undefined,
          isMockPrice: r.isMockPrice,
        });
      }
      return {
        ...r,
        id,
        profit: r.profit!,
      };
    }),
    providerStatuses,
    recommendation,
    bestOption: best?.marketplace,
    brandContacts: brandContactsList,
    brandFinderMeta,
  };

  if (isMockMode()) {
    mockStore.analyses.add({
      productTitle: kaspiProduct.title,
      kaspiPrice: kaspiProduct.price,
      analyzedAt: new Date().toISOString(),
      status: "completed",
      marketplaceResults: resultsWithProfit.map((r, i) => ({
        id: marketplaceResultIds[i]!,
        marketplace: r.marketplace,
        country: r.country,
        title: r.title,
        profit: r.profit!,
        riskScore: r.riskScore,
        matchScore: r.matchScore ?? r.finalMatchScore,
      })),
    });
  }

  return analysisResult;
}

export async function createAnalysisJob(kaspiUrl: string) {
  if (isMockMode()) {
    return { id: "mock-job-" + Date.now(), kaspiUrl, status: "pending" };
  }

  try {
    return await prisma.analysisJob.create({
      data: { kaspiUrl, status: "pending" },
    });
  } catch {
    return { id: "mock-job-" + Date.now(), kaspiUrl, status: "pending" };
  }
}

export async function updateAnalysisJob(
  id: string,
  data: { status?: string; error?: string; result?: unknown; productId?: string }
) {
  if (isMockMode()) return null;

  try {
    const updateData: Prisma.AnalysisJobUpdateInput = {
      status: data.status,
      error: data.error,
      result: data.result as Prisma.InputJsonValue | undefined,
      product: data.productId
        ? { connect: { id: data.productId } }
        : undefined,
    };

    return await prisma.analysisJob.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}
