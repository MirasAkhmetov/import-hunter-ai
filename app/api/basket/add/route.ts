import { NextRequest, NextResponse } from "next/server";
import { addToBasket } from "@/lib/basket/basketService";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  marketplaceResultId: z.string(),
  title: z.string(),
  marketplace: z.string(),
  country: z.string(),
  purchasePrice: z.number(),
  targetSalePrice: z.number(),
  quantity: z.number().optional(),
  deliveryPerUnit: z.number().optional(),
  extraCosts: z.number().optional(),
  purchaseCurrency: z.string().optional(),
  imageUrl: z.string().optional(),
  url: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const item = await addToBasket(body);
    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка добавления" }, { status: 400 });
  }
}
