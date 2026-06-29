import type {
  MarketplaceResultData,
  ParsedProduct,
  ProductSearchQuery,
} from "./types";
import type { VisualProductDescription } from "./ai/visualProductAnalyzer";
import { compareProductImages } from "./ai/imageMatcher";
import {
  analyzeProductImage,
  generateVisualSearchQueries,
} from "./ai/visualProductAnalyzer";
import {
  applyProductMatching,
  filterAndRankMatches,
  mergeMarketplaceResults,
} from "./matching/productMatcher";
import { marketplaceSearchKeywords } from "./marketplaces/marketplaceSearchQuery";

export interface MatchResult {
  matchScore: number;
  riskScore: number;
  reasoning: string;
}

const MOCK_MODE = process.env.MOCK_MODE !== "false";

export async function matchProducts(
  sourceProduct: ParsedProduct,
  candidates: MarketplaceResultData[],
  kaspiVisualDescription?: VisualProductDescription
): Promise<MarketplaceResultData[]> {
  const visualDescription =
    kaspiVisualDescription ??
    (sourceProduct.imageUrl
      ? await analyzeProductImage(sourceProduct.imageUrl, sourceProduct)
      : undefined);

  const imageScores = await buildImageSimilarityScores(
    sourceProduct,
    candidates,
    visualDescription
  );

  if (MOCK_MODE || !process.env.OPENAI_API_KEY) {
    return matchProductsMock(sourceProduct, candidates, imageScores);
  }

  try {
    return await matchProductsWithAI(sourceProduct, candidates, imageScores);
  } catch {
    console.warn("AI matching failed, falling back to heuristic matching");
    return matchProductsMock(sourceProduct, candidates, imageScores);
  }
}

async function buildImageSimilarityScores(
  sourceProduct: ParsedProduct,
  candidates: MarketplaceResultData[],
  kaspiDescription?: VisualProductDescription
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  if (!sourceProduct.imageUrl) return scores;

  await Promise.all(
    candidates.map(async (candidate) => {
      const key = `${candidate.marketplace}:${candidate.url}`;
      if (!candidate.imageUrl) {
        scores.set(key, 0);
        return;
      }

      const sourceBrand = (sourceProduct.brand ?? "").toLowerCase();
      const sourceModel = (sourceProduct.model ?? "").toLowerCase();
      const title = candidate.title.toLowerCase();
      const brandMatch = Boolean(sourceBrand && title.includes(sourceBrand));
      const modelMatch = Boolean(sourceModel && title.includes(sourceModel));

      const comparison = await compareProductImages(
        sourceProduct.imageUrl!,
        candidate.imageUrl,
        {
          kaspiDescription,
          brandMatch,
          modelMatch,
        }
      );

      scores.set(key, comparison.imageSimilarityScore);
    })
  );

  return scores;
}

function matchProductsMock(
  sourceProduct: ParsedProduct,
  candidates: MarketplaceResultData[],
  imageScores: Map<string, number>
): MarketplaceResultData[] {
  return applyProductMatching(sourceProduct, candidates, imageScores);
}

async function matchProductsWithAI(
  sourceProduct: ParsedProduct,
  candidates: MarketplaceResultData[],
  imageScores: Map<string, number>
): Promise<MarketplaceResultData[]> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Ты эксперт по сопоставлению товаров для импорта.
Сравни исходный товар с кандидатами и оцени каждый по matchScore (0-100) и riskScore (0-100).

Исходный товар:
${JSON.stringify(sourceProduct, null, 2)}

Кандидаты:
${JSON.stringify(candidates, null, 2)}

Верни JSON массив объектов: [{ "index": 0, "matchScore": 85, "riskScore": 20, "reasoning": "..." }]
Оценивай: бренд, модель, характеристики, фото, цену, продавца.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI_API_ERROR");

  const parsed = JSON.parse(content) as {
    results: Array<{ index: number; matchScore: number; riskScore: number }>;
  };

  const results = parsed.results ?? (parsed as unknown as Array<{ index: number; matchScore: number; riskScore: number }>);

  return candidates.map((candidate, index) => {
    const match = Array.isArray(results)
      ? results.find((r) => r.index === index)
      : undefined;
    const withAi = {
      ...candidate,
      matchScore: match?.matchScore ?? candidate.matchScore ?? 50,
      riskScore: match?.riskScore ?? candidate.riskScore ?? 30,
    };
    return applyProductMatching(sourceProduct, [withAi], imageScores)[0]!;
  });
}

export async function runHybridSearch(
  sourceProduct: ParsedProduct,
  searchFn: (query: ProductSearchQuery) => Promise<MarketplaceResultData[]>
): Promise<{
  results: MarketplaceResultData[];
  visualDescription?: VisualProductDescription;
}> {
  const textQuery = buildSearchQuery(sourceProduct);
  const textResults = await searchFn(textQuery);

  let visualDescription: VisualProductDescription | undefined;
  let visualResults: MarketplaceResultData[] = [];

  if (sourceProduct.imageUrl) {
    visualDescription = await analyzeProductImage(
      sourceProduct.imageUrl,
      sourceProduct
    );
    const visualQueries = generateVisualSearchQueries(visualDescription, sourceProduct);

    if (visualQueries.length > 0) {
      const visualQuery: ProductSearchQuery = {
        ...textQuery,
        keywords: [...new Set([...(textQuery.keywords ?? []), ...visualQueries])],
      };
      visualResults = await searchFn(visualQuery);
    }
  }

  return {
    results: mergeMarketplaceResults(textResults, visualResults),
    visualDescription,
  };
}

export async function generateRecommendation(
  sourceProduct: ParsedProduct,
  results: Array<
    MarketplaceResultData & {
      profit?: {
        purchasePriceKzt: number;
        netProfitKzt: number;
        roiPercent: number;
        marginPercent: number;
      };
    }
  >
): Promise<string> {
  if (MOCK_MODE || !process.env.OPENAI_API_KEY) {
    return generateRecommendationMock(sourceProduct, results);
  }

  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Напиши короткий вывод на русском языке (2-3 предложения) для импортёра.
Исходный товар: ${sourceProduct.title}, цена ${sourceProduct.price} KZT.
Результаты: ${JSON.stringify(results.slice(0, 5))}
Укажи лучший вариант, % совпадения, визуальное совпадение фото, прибыль, ROI и риски.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return (
      response.choices[0]?.message?.content ??
      generateRecommendationMock(sourceProduct, results)
    );
  } catch {
    return generateRecommendationMock(sourceProduct, results);
  }
}

function generateRecommendationMock(
  sourceProduct: ParsedProduct,
  results: Array<
    MarketplaceResultData & {
      profit?: {
        purchasePriceKzt: number;
        netProfitKzt: number;
        roiPercent: number;
        marginPercent: number;
      };
    }
  >
): string {
  const sorted = [...results].sort((a, b) => {
    const topDiff = Number(b.isTopMatch) - Number(a.isTopMatch);
    if (topDiff !== 0) return topDiff;
    const exactDiff = Number(b.isExactMatch) - Number(a.isExactMatch);
    if (exactDiff !== 0) return exactDiff;
    return (b.finalMatchScore ?? b.matchScore ?? 0) - (a.finalMatchScore ?? a.matchScore ?? 0);
  });
  const best = sorted[0];

  if (!best) {
    return "Похожие товары не найдены. Попробуйте другую ссылку или проверьте настройки поиска.";
  }

  const marketplaceNames: Record<string, string> = {
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    "amazon-tr": "Amazon Turkey",
    n11: "n11",
    pttavm: "PttAVM",
    ciceksepeti: "ÇiçekSepeti",
    "amazon-ae": "Amazon.ae",
    noon: "Noon",
    wildberries: "Wildberries",
    ozon: "Ozon",
  };

  const name = marketplaceNames[best.marketplace] ?? best.marketplace;
  const match = best.finalMatchScore ?? best.matchScore ?? 0;
  const imageMatch = best.imageSimilarityScore ?? 0;
  const exactLabel = best.isExactMatch
    ? "Точное совпадение по бренду, модели, характеристикам и фото. "
    : "";
  const visualLabel =
    imageMatch >= 60
      ? `Визуальное совпадение фото ${imageMatch}%. `
      : "Фото отличается — проверьте вручную. ";
  const warningLabel =
    best.matchWarnings && best.matchWarnings.length > 0
      ? `${best.matchWarnings[0]} `
      : "";
  const profit = best.profit?.netProfitKzt ?? 0;
  const roi = best.profit?.roiPercent ?? 0;
  const risk =
    (best.riskScore ?? 0) < 30
      ? "низкий"
      : (best.riskScore ?? 0) < 60
        ? "средний"
        : "высокий";

  const priceDiff = sourceProduct.price > 0 && best.profit
    ? Math.round(
        ((sourceProduct.price - (best.profit.purchasePriceKzt ?? 0)) /
          sourceProduct.price) *
          100
      )
    : 0;

  return `${exactLabel}${visualLabel}${warningLabel}Лучший вариант — ${name}. Итоговое совпадение ${match}%, цена ниже Kaspi примерно на ${priceDiff}%. После доставки и комиссии Kaspi потенциальная прибыль составляет ${profit.toLocaleString("ru-RU")} ₸, ROI ${roi.toFixed(0)}%. Риск ${risk}, нужно проверить оригинальность товара и условия возврата.`;
}

export function buildSearchQuery(product: ParsedProduct): ProductSearchQuery {
  return {
    title: product.title,
    brand: product.brand,
    model: product.model,
    category: product.category,
    specifications: product.specifications,
    imageUrl: product.imageUrl,
    keywords: extractKeywords(product),
    sourcePriceKzt: product.price,
  };
}

function extractKeywords(product: ParsedProduct): string[] {
  return marketplaceSearchKeywords({
    title: product.title,
    brand: product.brand,
    model: product.model,
    category: product.category,
    specifications: product.specifications,
  });
}

export { filterAndRankMatches, mergeMarketplaceResults };
