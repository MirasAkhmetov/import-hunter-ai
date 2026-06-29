import type { ParsedProduct } from "../types";
import {
  isArticleOrSkuToken,
  stripArticleTokens,
} from "../marketplaces/marketplaceSearchQuery";

export interface VisualProductDescription {
  productType: string;
  brand?: string;
  color?: string;
  shape?: string;
  material?: string;
  accessories?: string;
  notableElements?: string[];
}

const MOCK_MODE = process.env.MOCK_MODE !== "false";
const HAS_VISION_API = Boolean(process.env.OPENAI_API_KEY) && !MOCK_MODE;

function inferTypeFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("airpods") || lower.includes("наушник") || lower.includes("buds"))
    return "наушники";
  if (lower.includes("iphone") || lower.includes("смартфон") || lower.includes("phone"))
    return "смартфон";
  if (lower.includes("пылесос") || lower.includes("vacuum") || lower.includes("dyson"))
    return "пылесос";
  if (lower.includes("airfryer") || lower.includes("аэрогриль") || lower.includes("фритюр"))
    return "аэрогриль";
  return "товар";
}

function buildMockDescription(
  imageUrl: string,
  product?: Pick<ParsedProduct, "title" | "brand" | "model" | "category">
): VisualProductDescription {
  const title = product?.title ?? "";
  const colorMatch = title.match(
    /(чёрн|черн|бел|сер|син|красн|зелён|зелен|gold|silver|black|white|blue|red)/i
  );

  return {
    productType: product?.category ?? inferTypeFromTitle(title),
    brand: product?.brand,
    color: colorMatch?.[0],
    shape: undefined,
    material: undefined,
    accessories: product?.model?.includes("Pro") ? "зарядный кейс" : undefined,
    notableElements: [
      product?.brand,
      product?.model,
      imageUrl.includes("kaspi") ? "kaspi-фото" : undefined,
    ].filter(Boolean) as string[],
  };
}

async function analyzeWithVision(
  imageUrl: string
): Promise<VisualProductDescription> {
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
            text: `Опиши товар на фото для поиска аналогов. Верни JSON:
{
  "productType": "тип товара",
  "brand": "бренд если виден",
  "color": "основной цвет",
  "shape": "форма",
  "material": "материал если виден",
  "accessories": "комплектация/аксессуары",
  "notableElements": ["заметные визуальные элементы"]
}`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI_VISION_ERROR");

  return JSON.parse(content) as VisualProductDescription;
}

export async function analyzeProductImage(
  imageUrl: string,
  product?: Pick<ParsedProduct, "title" | "brand" | "model" | "category">
): Promise<VisualProductDescription> {
  if (!imageUrl) {
    return buildMockDescription("", product);
  }

  if (!HAS_VISION_API) {
    return buildMockDescription(imageUrl, product);
  }

  try {
    return await analyzeWithVision(imageUrl);
  } catch {
    console.warn("Vision analysis failed, using mock description");
    return buildMockDescription(imageUrl, product);
  }
}

export function generateVisualSearchQueries(
  description: VisualProductDescription,
  product: ParsedProduct
): string[] {
  const queries = new Set<string>();

  if (description.brand) queries.add(description.brand);
  if (description.productType) queries.add(description.productType);
  if (description.color) queries.add(description.color);
  if (description.material) queries.add(description.material);
  if (product.brand) queries.add(product.brand);

  description.notableElements?.forEach((el) => {
    if (el.length > 2 && !isArticleOrSkuToken(el)) queries.add(el);
  });

  const combined = stripArticleTokens(
    [description.brand, description.productType, description.color]
      .filter(Boolean)
      .join(" ")
  );

  if (combined) queries.add(combined);

  return [...queries].slice(0, 8);
}
