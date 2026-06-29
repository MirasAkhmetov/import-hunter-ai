import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateProfit } from "@/lib/profitCalculator";
import { getSettings } from "@/lib/settings";
import { resolveFinalPrice } from "@/lib/price-verification/priceResolver";

const schema = z.object({
  kaspiPriceKzt: z.number(),
  purchasePrice: z.number(),
  purchaseCurrency: z.string(),
  country: z.string(),
  kaspiCategory: z.string().optional().nullable(),
  kaspiProductTitle: z.string().optional(),
  correctedPrice: z.number().optional().nullable(),
  originalPrice: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const settings = await getSettings();
    const finalPrice = resolveFinalPrice({
      originalPrice: body.originalPrice ?? body.purchasePrice,
      correctedPrice: body.correctedPrice,
    });

    const profit = calculateProfit({
      kaspiPriceKzt: body.kaspiPriceKzt,
      purchasePrice: finalPrice,
      purchaseCurrency: body.purchaseCurrency,
      country: body.country,
      settings,
      kaspiCategory: body.kaspiCategory ?? undefined,
      kaspiProductTitle: body.kaspiProductTitle,
    });

    return NextResponse.json({
      success: true,
      data: { profit, finalPrice },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
