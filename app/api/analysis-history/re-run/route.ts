import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAnalysis, getErrorMessage } from "@/lib/analysis";
import { saveAnalysisRun } from "@/lib/analysis-history/analysisHistoryService";
import { getSettings } from "@/lib/settings";

const schema = z.object({
  kaspiUrl: z.string().url(),
  runId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { kaspiUrl, runId } = schema.parse(await request.json());
    const settings = await getSettings();
    const result = await runAnalysis(kaspiUrl);

    const saved = await saveAnalysisRun({
      kaspiUrl,
      result,
      brandContacts: result.brandContacts,
      settings,
      updateRunId: runId,
    });

    return NextResponse.json({
      success: true,
      data: { id: saved.id },
      redirectUrl: `/analysis-history/${saved.id}`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const message = getErrorMessage(code);

    return NextResponse.json(
      { success: false, error: message, code },
      { status: 400 }
    );
  }
}
