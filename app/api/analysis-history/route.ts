import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  saveAnalysisRun,
  listAnalysisRuns,
  seedMockAnalysisHistory,
} from "@/lib/analysis-history/analysisHistoryService";
import { getSettings } from "@/lib/settings";
import type { AnalysisHistoryFilters } from "@/lib/types/analysisHistory";
import type { AnalysisResult } from "@/lib/analysis";

const saveSchema = z.object({
  kaspiUrl: z.string().url(),
  result: z.custom<AnalysisResult>(),
  selectedMarketplaceResultId: z.string().optional(),
  updateRunId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  seedMockAnalysisHistory();

  const sp = request.nextUrl.searchParams;
  const filters: AnalysisHistoryFilters = {
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
    brand: sp.get("brand") ?? undefined,
    category: sp.get("category") ?? undefined,
    country: sp.get("country") ?? undefined,
    marketplace: sp.get("marketplace") ?? undefined,
    roiMin: sp.get("roiMin") ? Number(sp.get("roiMin")) : undefined,
    roiMax: sp.get("roiMax") ? Number(sp.get("roiMax")) : undefined,
    profitMin: sp.get("profitMin") ? Number(sp.get("profitMin")) : undefined,
    profitMax: sp.get("profitMax") ? Number(sp.get("profitMax")) : undefined,
    status: (sp.get("status") as AnalysisHistoryFilters["status"]) ?? undefined,
  };

  const data = await listAnalysisRuns(filters);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = saveSchema.parse(await request.json());
    const settings = await getSettings();
    const saved = await saveAnalysisRun({
      kaspiUrl: body.kaspiUrl,
      result: body.result,
      settings,
      selectedMarketplaceResultId: body.selectedMarketplaceResultId,
      updateRunId: body.updateRunId,
    });
    return NextResponse.json({ success: true, data: saved });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
