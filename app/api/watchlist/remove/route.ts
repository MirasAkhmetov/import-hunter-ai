import { NextRequest, NextResponse } from "next/server";
import { removeFromWatchlist } from "@/lib/watchlist/watchlistService";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    await removeFromWatchlist(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка удаления" }, { status: 400 });
  }
}
