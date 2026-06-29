import { NextRequest, NextResponse } from "next/server";
import { updateWatchlistItem } from "@/lib/watchlist/watchlistService";

export async function POST(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    const item = await updateWatchlistItem(id, data);
    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка обновления" }, { status: 400 });
  }
}
