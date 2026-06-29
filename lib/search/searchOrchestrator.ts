import {
  analyzeProductImage,
  generateVisualSearchQueries,
} from "../ai/visualProductAnalyzer";
import { buildSearchQuery } from "../aiMatcher";
import { activeProviders } from "../marketplaces";
import type { MarketplaceResultData, ProductSearchQuery } from "../types";
import {
  buildBrandSearchQuery,
  createMarketplaceNotFoundResult,
} from "./marketplaceNotFound";
import type {
  MarketplaceSearchFn,
  MarketplaceMatchFn,
  MarketplaceTarget,
  OrchestratorContext,
  SearchOrchestratorOptions,
  SearchOrchestratorResult,
} from "./types";

const DEFAULT_MIN_MATCH_SCORE = 55;

function resolveTargets(options?: SearchOrchestratorOptions): MarketplaceTarget[] {
  let providers = activeProviders.filter((p) => p.enabled);

  if (options?.countries?.length) {
    const countries = new Set(options.countries);
    providers = providers.filter((p) => countries.has(p.country));
  }

  if (options?.marketplaces?.length) {
    const marketplaces = new Set(options.marketplaces);
    providers = providers.filter((p) => marketplaces.has(p.marketplace));
  }

  return providers.map((p) => ({
    marketplace: p.marketplace,
    country: p.country,
    currency: p.currency,
  }));
}

function pickBestForMarketplace(
  matched: MarketplaceResultData[],
  marketplace: string,
  minScore: number
): MarketplaceResultData | undefined {
  const candidates = matched
    .filter((item) => item.marketplace === marketplace)
    .sort((a, b) => {
      const topDiff = Number(b.isTopMatch) - Number(a.isTopMatch);
      if (topDiff !== 0) return topDiff;
      const exactDiff = Number(b.isExactMatch) - Number(a.isExactMatch);
      if (exactDiff !== 0) return exactDiff;
      const scoreDiff =
        (b.finalMatchScore ?? b.matchScore ?? 0) -
        (a.finalMatchScore ?? a.matchScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const imageDiff =
        (b.imageSimilarityScore ?? 0) - (a.imageSimilarityScore ?? 0);
      if (imageDiff !== 0) return imageDiff;
      return (a.price ?? 0) - (b.price ?? 0);
    });

  const best = candidates[0];
  if (!best) return undefined;

  const score = best.finalMatchScore ?? best.matchScore ?? 0;
  if (score < minScore) return undefined;

  return best;
}

async function buildOrchestratorContext(
  sourceProduct: Parameters<typeof buildSearchQuery>[0]
): Promise<OrchestratorContext> {
  const textQuery = buildSearchQuery(sourceProduct);
  let visualDescription: OrchestratorContext["visualDescription"];
  let visualKeywords: string[] = [];

  if (sourceProduct.imageUrl) {
    visualDescription = await analyzeProductImage(
      sourceProduct.imageUrl,
      sourceProduct
    );
    visualKeywords = generateVisualSearchQueries(visualDescription, sourceProduct);
  }

  return { sourceProduct, textQuery, visualDescription, visualKeywords };
}

function buildVisualQuery(ctx: OrchestratorContext): ProductSearchQuery {
  const marketplaceKeywords = ctx.visualKeywords.length
    ? ctx.visualKeywords
    : (ctx.textQuery.keywords ?? []);

  return {
    ...ctx.textQuery,
    imageUrl: ctx.sourceProduct.imageUrl,
    keywords: [...new Set([...(ctx.textQuery.keywords ?? []), ...marketplaceKeywords])],
    title: marketplaceKeywords[0] ?? ctx.textQuery.title,
  };
}

function buildTextFallbackQuery(ctx: OrchestratorContext): ProductSearchQuery {
  return {
    ...ctx.textQuery,
    keywords: ctx.textQuery.keywords ?? [],
  };
}

export async function runProductSearchOrchestrator(
  sourceProduct: Parameters<typeof buildSearchQuery>[0],
  searchFn: MarketplaceSearchFn,
  matchFn: MarketplaceMatchFn,
  options?: SearchOrchestratorOptions
): Promise<SearchOrchestratorResult> {
  const minScore = options?.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE;
  const targets = resolveTargets(options);
  const ctx = await buildOrchestratorContext(sourceProduct);
  const brandQuery = buildBrandSearchQuery(sourceProduct);
  const visualQuery = buildVisualQuery(ctx);
  const textQuery = buildTextFallbackQuery(ctx);

  const results = await Promise.all(
    targets.map(async (target) => {
      const { marketplace, country, currency } = target;

      if (ctx.sourceProduct.imageUrl && ctx.visualKeywords.length > 0) {
        options?.onMarketplaceProgress?.(marketplace, "image");
        const visualRaw = await searchFn(visualQuery, [marketplace]);
        if (visualRaw.length > 0) {
          const matched = await matchFn(visualRaw, ctx.visualDescription);
          const accepted = pickBestForMarketplace(matched, marketplace, minScore);
          if (accepted) {
            return { ...accepted, searchMethod: "image" as const };
          }
        }
      }

      options?.onMarketplaceProgress?.(marketplace, "text");
      const textRaw = await searchFn(textQuery, [marketplace]);
      if (textRaw.length > 0) {
        const matched = await matchFn(textRaw, ctx.visualDescription);
        const accepted = pickBestForMarketplace(matched, marketplace, minScore);
        if (accepted) {
          return { ...accepted, searchMethod: "text" as const };
        }
      }

      options?.onMarketplaceProgress?.(marketplace, "not_found");
      return createMarketplaceNotFoundResult(
        marketplace,
        country,
        currency,
        brandQuery
      );
    })
  );

  return {
    results,
    visualDescription: ctx.visualDescription,
  };
}
