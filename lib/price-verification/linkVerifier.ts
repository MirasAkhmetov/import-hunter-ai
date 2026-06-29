import type { ParsedProduct } from "../types";
import type { LinkStatus } from "../types/priceVerification";

export interface LinkVerificationInput {
  kaspiProduct: Pick<ParsedProduct, "title" | "brand" | "model">;
  resultTitle: string;
  resultUrl: string;
  matchScore?: number;
}

export interface LinkVerificationResult {
  linkStatus: LinkStatus;
  titleMatchPercent: number;
  brandMatch: boolean;
  modelMatch: boolean;
  warnings: string[];
}

export function verifyProductLink(
  input: LinkVerificationInput
): LinkVerificationResult {
  const warnings: string[] = [];
  const kaspiTitle = normalize(input.kaspiProduct.title);
  const resultTitle = normalize(input.resultTitle);

  const brandMatch = matchBrand(
    input.kaspiProduct.brand,
    input.resultTitle,
    input.kaspiProduct.title
  );
  const modelMatch = matchModel(
    input.kaspiProduct.model,
    input.resultTitle
  );

  const titleMatchPercent = calculateTitleOverlap(kaspiTitle, resultTitle);

  if (!brandMatch) warnings.push("Бренд в ссылке не совпадает");
  if (!modelMatch && input.kaspiProduct.model) {
    warnings.push("Модель в ссылке не совпадает");
  }
  if (titleMatchPercent < 40) warnings.push("Название сильно отличается");

  let linkStatus: LinkStatus = "verified";

  if (!input.resultUrl || input.resultUrl.includes("example.com")) {
    linkStatus = "unavailable";
  } else if (!brandMatch || titleMatchPercent < 30) {
    linkStatus = "mismatch";
  } else if (
    (input.matchScore ?? 0) < 85 ||
    !modelMatch ||
    titleMatchPercent < 60
  ) {
    linkStatus = "needs_review";
  }

  return {
    linkStatus,
    titleMatchPercent,
    brandMatch,
    modelMatch,
    warnings,
  };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function matchBrand(
  brand: string | undefined | null,
  resultTitle: string,
  kaspiTitle: string
): boolean {
  const brandToken = normalize(brand ?? kaspiTitle.split(/\s+/)[0] ?? "");
  if (!brandToken || brandToken.length < 2) return true;
  return normalize(resultTitle).includes(brandToken);
}

function matchModel(
  model: string | undefined | null,
  resultTitle: string
): boolean {
  if (!model?.trim()) return true;
  const modelTokens = normalize(model).split(/\s+/).filter((t) => t.length > 1);
  if (modelTokens.length === 0) return true;
  const title = normalize(resultTitle);
  return modelTokens.some((token) => title.includes(token));
}

function calculateTitleOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter((t) => t.length > 2));
  const tokensB = b.split(/\s+/).filter((t) => t.length > 2);
  if (tokensA.size === 0 || tokensB.length === 0) return 0;
  const matched = tokensB.filter((t) => tokensA.has(t)).length;
  return Math.round((matched / Math.max(tokensA.size, tokensB.length)) * 100);
}
