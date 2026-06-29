import { NextRequest, NextResponse } from "next/server";
import {
  getAnalysisRun,
  compareWithLatest,
  deleteAnalysisRun,
  seedMockAnalysisHistory,
} from "@/lib/analysis-history/analysisHistoryService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  seedMockAnalysisHistory();
  const { id } = await params;
  const run = await getAnalysisRun(id);
  if (!run) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  const comparison = await compareWithLatest(id);
  return NextResponse.json({ success: true, data: run, comparison });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteAnalysisRun(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
