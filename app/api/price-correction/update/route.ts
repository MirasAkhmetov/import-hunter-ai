import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseLocalizedPrice } from "@/lib/parseLocalizedPrice";
import { updatePriceCorrection } from "@/lib/price-verification/priceCorrectionService";

const correctedPriceSchema = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseLocalizedPrice(value);
    if (parsed != null) return parsed;
  }
  return value;
}, z.number().positive("Укажите корректную цену"));

const schema = z.object({
  marketplaceResultId: z.string().min(1),
  correctedPrice: correctedPriceSchema,
  currency: z.string().min(1),
  reason: z.string().optional(),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const result = await updatePriceCorrection({
      ...body,
      reason: body.reason ?? "Ручная коррекция пользователем",
    });
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Marketplace result not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message ?? "Invalid request";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
