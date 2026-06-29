import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { mergeSearchSettings } from "@/lib/config/searchSettings";
import { z } from "zod";

const settingsSchema = z.object({
  tryToKzt: z.number().positive().optional(),
  aedToKzt: z.number().positive().optional(),
  cnyToKzt: z.number().positive().optional(),
  usdToKzt: z.number().positive().optional(),
  inrToKzt: z.number().positive().optional(),
  rubToKzt: z.number().positive().optional(),
  deliveryTurkeyKzt: z.number().min(0).optional(),
  deliveryUaeKzt: z.number().min(0).optional(),
  deliveryChinaKzt: z.number().min(0).optional(),
  deliveryIndiaKzt: z.number().min(0).optional(),
  deliveryRussiaKzt: z.number().min(0).optional(),
  kaspiCommissionPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  taxRegime: z.enum(["official", "simplified"]).optional(),
  adsPercent: z.number().min(0).max(100).optional(),
  customsPercent: z.number().min(0).max(100).optional(),
  minMarginPercent: z.number().min(0).max(100).optional(),
  minRoiPercent: z.number().min(0).max(1000).optional(),
  searchApiProvider: z.string().optional(),
  searchApiKey: z.string().optional(),
  mockBrandContactsEnabled: z.boolean().optional(),
});

export async function GET() {
  const settings = await getSettings();
  const search = mergeSearchSettings({
    mockBrandContactsEnabled: settings.mockBrandContactsEnabled,
  });
  return NextResponse.json({
    success: true,
    data: {
      ...settings,
      ...search,
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.searchApiKey === "••••••••" || body.searchApiKey === "********") {
      delete body.searchApiKey;
    }
    const data = settingsSchema.parse(body);
    const settings = await updateSettings(data);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Некорректные данные" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Ошибка сохранения" },
      { status: 500 }
    );
  }
}
