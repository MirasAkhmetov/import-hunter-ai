import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateProfit } from "@/lib/profitCalculator";
import { getSettings } from "@/lib/settings";

const schema = z.object({
  kaspiPriceKzt: z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseCurrency: z.string(),
  country: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = schema.parse(body);
    const settings = await getSettings();

    const profit = calculateProfit({
      kaspiPriceKzt: input.kaspiPriceKzt,
      purchasePrice: input.purchasePrice,
      purchaseCurrency: input.purchaseCurrency,
      country: input.country,
      settings,
    });

    return NextResponse.json({ success: true, data: profit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Некорректные данные" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Ошибка расчёта" },
      { status: 500 }
    );
  }
}
