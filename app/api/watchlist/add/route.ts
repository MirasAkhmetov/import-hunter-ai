import { NextRequest, NextResponse } from "next/server";
import { addToWatchlist } from "@/lib/watchlist/watchlistService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await addToWatchlist(body);
    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка добавления" }, { status: 400 });
  }
}
