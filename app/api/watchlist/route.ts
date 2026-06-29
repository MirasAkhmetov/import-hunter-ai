import { NextResponse } from "next/server";
import { getWatchlist } from "@/lib/watchlist/watchlistService";

export async function GET() {
  const data = await getWatchlist();
  return NextResponse.json({ success: true, data });
}
