import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addToWatchlistFromRun } from "@/lib/watchlist/watchlistService";

const schema = z.object({
  runId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { runId } = schema.parse(await request.json());
    const { item, alreadyExists } = await addToWatchlistFromRun(runId);
    return NextResponse.json({ success: true, data: item, alreadyExists });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "RUN_NOT_FOUND"
        ? "Анализ не найден"
        : "Не удалось добавить в watchlist";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
