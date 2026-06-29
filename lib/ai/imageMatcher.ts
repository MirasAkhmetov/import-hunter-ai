import type { VisualProductDescription } from "./visualProductAnalyzer";

export interface ImageComparisonResult {
  imageSimilarityScore: number;
  reasoning?: string;
}

const MOCK_MODE = process.env.MOCK_MODE !== "false";
const HAS_VISION_API = Boolean(process.env.OPENAI_API_KEY) && !MOCK_MODE;

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

function isKaspiCdn(url: string): boolean {
  return /kaspi\.(kz|shop)/i.test(url) || url.includes("kaspi");
}

function isUnsplash(url: string): boolean {
  return url.includes("unsplash.com") || url.includes("images.unsplash");
}

export function calculateImageSimilarityScore(
  kaspiImageUrl: string,
  candidateImageUrl: string,
  options?: {
    kaspiDescription?: VisualProductDescription;
    candidateDescription?: VisualProductDescription;
    brandMatch?: boolean;
    modelMatch?: boolean;
  }
): number {
  if (!kaspiImageUrl || !candidateImageUrl) return 0;
  if (kaspiImageUrl === candidateImageUrl) return 100;

  const kaspiKey = extractImageKey(kaspiImageUrl);
  const candidateKey = extractImageKey(candidateImageUrl);
  if (kaspiKey && candidateKey && kaspiKey === candidateKey) return 95;

  if (isKaspiCdn(kaspiImageUrl) && isKaspiCdn(candidateImageUrl)) {
    try {
      const kaspiDir = new URL(kaspiImageUrl).pathname.split("/").slice(0, -1).join("/");
      const candDir = new URL(candidateImageUrl).pathname.split("/").slice(0, -1).join("/");
      if (kaspiDir && kaspiDir === candDir) return 88;
    } catch {
      // ignore invalid URLs
    }
  }

  if (isUnsplash(kaspiImageUrl) || isUnsplash(candidateImageUrl)) {
    if (kaspiImageUrl !== candidateImageUrl) return 28;
  }

  let score = 42;

  const kaspiDesc = options?.kaspiDescription;
  const candDesc = options?.candidateDescription;
  if (kaspiDesc && candDesc) {
    if (kaspiDesc.brand && candDesc.brand && kaspiDesc.brand.toLowerCase() === candDesc.brand.toLowerCase()) {
      score += 12;
    }
    if (kaspiDesc.color && candDesc.color && kaspiDesc.color.toLowerCase() === candDesc.color.toLowerCase()) {
      score += 10;
    }
    if (
      kaspiDesc.productType &&
      candDesc.productType &&
      kaspiDesc.productType.toLowerCase() === candDesc.productType.toLowerCase()
    ) {
      score += 8;
    }
  }

  if (options?.brandMatch) score += 12;
  if (options?.modelMatch) score += 18;

  return Math.min(100, Math.max(0, score));
}

async function compareWithVision(
  kaspiImageUrl: string,
  candidateImageUrl: string
): Promise<ImageComparisonResult> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Сравни два фото товара. Это один и тот же товар?
Верни JSON: { "imageSimilarityScore": 0-100, "reasoning": "краткое объяснение на русском" }
Первое фото — Kaspi (эталон), второе — кандидат с маркетплейса.`,
          },
          { type: "image_url", image_url: { url: kaspiImageUrl } },
          { type: "image_url", image_url: { url: candidateImageUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI_VISION_ERROR");

  const parsed = JSON.parse(content) as ImageComparisonResult;
  return {
    imageSimilarityScore: Math.min(100, Math.max(0, Math.round(parsed.imageSimilarityScore))),
    reasoning: parsed.reasoning,
  };
}

export async function compareProductImages(
  kaspiImageUrl: string,
  candidateImageUrl: string,
  options?: {
    kaspiDescription?: VisualProductDescription;
    candidateDescription?: VisualProductDescription;
    brandMatch?: boolean;
    modelMatch?: boolean;
  }
): Promise<ImageComparisonResult> {
  if (!kaspiImageUrl || !candidateImageUrl) {
    return { imageSimilarityScore: 0, reasoning: "Нет фото для сравнения" };
  }

  if (!HAS_VISION_API) {
    const score = calculateImageSimilarityScore(kaspiImageUrl, candidateImageUrl, options);
    return {
      imageSimilarityScore: score,
      reasoning: score >= 80 ? "Фото совпадают (эвристика)" : "Фото различаются (эвристика)",
    };
  }

  try {
    const visionResult = await compareWithVision(kaspiImageUrl, candidateImageUrl);
    if (options?.brandMatch && options?.modelMatch && visionResult.imageSimilarityScore < 70) {
      visionResult.imageSimilarityScore = Math.max(
        visionResult.imageSimilarityScore,
        calculateImageSimilarityScore(kaspiImageUrl, candidateImageUrl, options)
      );
    }
    return visionResult;
  } catch {
    const score = calculateImageSimilarityScore(kaspiImageUrl, candidateImageUrl, options);
    return {
      imageSimilarityScore: score,
      reasoning: "Vision API недоступен, использована эвристика",
    };
  }
}
