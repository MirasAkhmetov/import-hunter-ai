import type { MarketplaceResultData, ParsedProduct } from "../types";

export type { MatchDetails } from "../types";

export interface ProductMatchScore {
  matchScore: number;
  finalMatchScore: number;
  imageSimilarityScore: number;
  riskScore: number;
  isExactMatch: boolean;
  isTopMatch: boolean;
  matchWarnings: string[];
  details: import("../types").MatchDetails;
}

const FINAL_SCORE_WEIGHTS = {
  model: 0.35,
  brand: 0.2,
  specifications: 0.15,
  photo: 0.2,
  category: 0.05,
  realisticPrice: 0.05,
} as const;

const IMAGE_TOP_MATCH_THRESHOLD = 60;
const PHOTO_SIMILAR_THRESHOLD = 75;

const SPEC_ALIASES: Record<string, string[]> = {
  brand: ["бренд", "brand", "marka"],
  model: ["модель", "model"],
  volume: ["объём", "объем", "volume", "kapasite", "capacity"],
  color: ["цвет", "color", "renk"],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function extractImageKey(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/\/([a-z0-9]+\.png|\/p\d+\/p\d+\/[^/?]+)/i);
  if (match?.[1]) return match[1].toLowerCase();
  try {
    return new URL(url).pathname.split("/").filter(Boolean).slice(-2).join("/").toLowerCase();
  } catch {
    return null;
  }
}

function imagesMatch(sourceUrl?: string, candidateUrl?: string): boolean {
  if (!sourceUrl || !candidateUrl) return false;
  if (sourceUrl === candidateUrl) return true;

  const sourceKey = extractImageKey(sourceUrl);
  const candidateKey = extractImageKey(candidateUrl);
  return Boolean(sourceKey && candidateKey && sourceKey === candidateKey);
}

function normalizeSpecKey(key: string): string {
  const lower = normalizeText(key);
  for (const [canonical, aliases] of Object.entries(SPEC_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) return canonical;
  }
  return lower;
}

function buildSpecMap(specs?: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  if (!specs) return map;

  for (const [key, value] of Object.entries(specs)) {
    if (!value?.trim()) continue;
    map.set(normalizeSpecKey(key), normalizeText(value));
  }
  return map;
}

function compareSpecifications(
  source?: Record<string, string>,
  candidate?: Record<string, string>
): number {
  const sourceMap = buildSpecMap(source);
  const candidateMap = buildSpecMap(candidate);

  if (sourceMap.size === 0) return 50;

  let matched = 0;
  let total = 0;

  for (const [key, sourceValue] of sourceMap) {
    total++;
    const candidateValue = candidateMap.get(key);
    if (!candidateValue) continue;

    if (
      candidateValue === sourceValue ||
      candidateValue.includes(sourceValue) ||
      sourceValue.includes(candidateValue)
    ) {
      matched++;
    }
  }

  return total > 0 ? Math.round((matched / total) * 100) : 0;
}

function titleMatchPercent(source: ParsedProduct, candidateTitle: string): number {
  const sourceTitle = normalizeText(source.title);
  const target = normalizeText(candidateTitle);
  if (!sourceTitle || !target) return 0;

  const tokens = sourceTitle.split(/\s+/).filter((w) => w.length > 2);
  if (tokens.length === 0) return 0;

  const matched = tokens.filter((token) => target.includes(token)).length;
  return Math.round((matched / tokens.length) * 100);
}

function categoryMatches(
  sourceCategory?: string,
  candidate?: MarketplaceResultData
): boolean {
  if (!sourceCategory || !candidate) return false;
  const normalized = normalizeText(sourceCategory);
  const title = normalizeText(candidate.title);
  const specs = candidate.specifications
    ? Object.values(candidate.specifications).map(normalizeText).join(" ")
    : "";
  return title.includes(normalized) || specs.includes(normalized);
}

function calculatePriceScore(
  sourcePriceKzt: number,
  candidatePrice: number,
  candidateCurrency: string
): number {
  if (sourcePriceKzt <= 0 || candidatePrice <= 0) return 50;

  const rates: Record<string, number> = {
    KZT: 1,
    TRY: 14.5,
    AED: 140,
    USD: 515,
    CNY: 72,
  };
  const rate = rates[candidateCurrency] ?? 1;
  const candidateKzt = candidatePrice * rate;
  const ratio = candidateKzt / sourcePriceKzt;

  if (ratio >= 0.35 && ratio <= 0.85) return 100;
  if (ratio >= 0.25 && ratio <= 0.95) return 75;
  if (ratio >= 0.15 && ratio <= 1.1) return 50;
  return 25;
}

export function calculateFinalMatchScore(params: {
  brandMatch: boolean;
  modelMatch: boolean;
  specsMatchPercent: number;
  imageSimilarityScore: number;
  categoryMatch: boolean;
  priceScore: number;
}): number {
  const modelScore = params.modelMatch ? 100 : 0;
  const brandScore = params.brandMatch ? 100 : 0;

  const weighted =
    modelScore * FINAL_SCORE_WEIGHTS.model +
    brandScore * FINAL_SCORE_WEIGHTS.brand +
    params.specsMatchPercent * FINAL_SCORE_WEIGHTS.specifications +
    params.imageSimilarityScore * FINAL_SCORE_WEIGHTS.photo +
    (params.categoryMatch ? 100 : 0) * FINAL_SCORE_WEIGHTS.category +
    params.priceScore * FINAL_SCORE_WEIGHTS.realisticPrice;

  return Math.min(100, Math.max(0, Math.round(weighted)));
}

export function generateMatchWarnings(params: {
  brandMatch: boolean;
  modelMatch: boolean;
  imageSimilarityScore: number;
}): string[] {
  const warnings: string[] = [];

  if (params.modelMatch && params.imageSimilarityScore < IMAGE_TOP_MATCH_THRESHOLD) {
    warnings.push("Модель совпадает, но фото отличается. Проверь вручную.");
  }

  if (
    params.imageSimilarityScore >= PHOTO_SIMILAR_THRESHOLD &&
    !params.modelMatch &&
    !params.brandMatch
  ) {
    warnings.push("Фото похоже, но модель не подтверждена.");
  }

  return warnings;
}

export function scoreProductMatch(
  source: ParsedProduct,
  candidate: MarketplaceResultData,
  imageSimilarityScore = 0
): ProductMatchScore {
  const sourceBrand = normalizeText(source.brand ?? "");
  const sourceModel = normalizeText(source.model ?? "");
  const candidateTitle = normalizeText(candidate.title);

  const brandMatch = Boolean(sourceBrand && candidateTitle.includes(sourceBrand));
  const modelMatch = Boolean(sourceModel && candidateTitle.includes(sourceModel));
  const specsMatchPercent = compareSpecifications(
    source.specifications,
    candidate.specifications
  );
  const imageMatch = imagesMatch(source.imageUrl, candidate.imageUrl) || imageSimilarityScore >= 80;
  const titlePct = titleMatchPercent(source, candidate.title);
  const categoryMatch = categoryMatches(source.category, candidate);
  const priceScore = calculatePriceScore(source.price, candidate.price, candidate.currency);

  const finalMatchScore = calculateFinalMatchScore({
    brandMatch,
    modelMatch,
    specsMatchPercent,
    imageSimilarityScore,
    categoryMatch,
    priceScore,
  });

  const matchWarnings = generateMatchWarnings({
    brandMatch,
    modelMatch,
    imageSimilarityScore,
  });

  let riskScore = 35;
  if (!brandMatch) riskScore += 25;
  if (!modelMatch) riskScore += 20;
  if (specsMatchPercent < 50) riskScore += 15;
  if (imageSimilarityScore < IMAGE_TOP_MATCH_THRESHOLD) riskScore += 10;
  if (candidate.sellerRating && candidate.sellerRating < 3.5) riskScore += 20;

  const isExactMatch =
    brandMatch &&
    modelMatch &&
    specsMatchPercent >= 75 &&
    imageSimilarityScore >= IMAGE_TOP_MATCH_THRESHOLD &&
    finalMatchScore >= 85;

  const isTopMatch = imageSimilarityScore >= IMAGE_TOP_MATCH_THRESHOLD;

  return {
    matchScore: finalMatchScore,
    finalMatchScore,
    imageSimilarityScore,
    riskScore: Math.min(100, Math.max(0, riskScore)),
    isExactMatch,
    isTopMatch,
    matchWarnings,
    details: {
      brandMatch,
      modelMatch,
      specsMatchPercent,
      imageMatch,
      titleMatchPercent: titlePct,
      imageSimilarityScore,
      categoryMatch,
      priceScore,
    },
  };
}

export function applyProductMatching(
  source: ParsedProduct,
  candidates: MarketplaceResultData[],
  imageScores?: Map<string, number>
): MarketplaceResultData[] {
  return candidates.map((candidate) => {
    const key = `${candidate.marketplace}:${candidate.url}`;
    const imageSimilarityScore =
      imageScores?.get(key) ??
      candidate.imageSimilarityScore ??
      (imagesMatch(source.imageUrl, candidate.imageUrl) ? 100 : 0);

    const scored = scoreProductMatch(source, candidate, imageSimilarityScore);
    return {
      ...candidate,
      matchScore: scored.matchScore,
      finalMatchScore: scored.finalMatchScore,
      imageSimilarityScore: scored.imageSimilarityScore,
      riskScore: scored.riskScore,
      isExactMatch: scored.isExactMatch,
      isTopMatch: scored.isTopMatch,
      matchWarnings: scored.matchWarnings,
      matchDetails: scored.details,
    };
  });
}

export function filterAndRankMatches(
  results: MarketplaceResultData[],
  minMatchScore = 70
): MarketplaceResultData[] {
  const ranked = [...results].sort((a, b) => {
    const topDiff = Number(b.isTopMatch) - Number(a.isTopMatch);
    if (topDiff !== 0) return topDiff;

    const exactDiff = Number(b.isExactMatch) - Number(a.isExactMatch);
    if (exactDiff !== 0) return exactDiff;

    const finalDiff = (b.finalMatchScore ?? b.matchScore ?? 0) - (a.finalMatchScore ?? a.matchScore ?? 0);
    if (finalDiff !== 0) return finalDiff;

    const imageDiff = (b.imageSimilarityScore ?? 0) - (a.imageSimilarityScore ?? 0);
    if (imageDiff !== 0) return imageDiff;

    return (a.riskScore ?? 100) - (b.riskScore ?? 100);
  });

  const aboveMin = ranked.filter(
    (item) => (item.finalMatchScore ?? item.matchScore ?? 0) >= minMatchScore
  );
  const pool = aboveMin.length > 0 ? aboveMin : ranked;

  const topEligible = pool.filter((item) => item.isTopMatch);
  if (topEligible.length > 0) {
    const rest = pool.filter((item) => !item.isTopMatch);
    return [...topEligible, ...rest];
  }

  return pool.length > 0 ? pool : ranked.slice(0, 1);
}

export function mergeMarketplaceResults(
  ...resultSets: MarketplaceResultData[][]
): MarketplaceResultData[] {
  const seen = new Set<string>();
  const merged: MarketplaceResultData[] = [];

  for (const set of resultSets) {
    for (const item of set) {
      const key = `${item.marketplace}:${item.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}
