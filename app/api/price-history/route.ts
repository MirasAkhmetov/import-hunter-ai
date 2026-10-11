import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/price-history/priceHistoryService";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("marketplaceResultId");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
  }

  const data = await getPriceHistory(id);
  return NextResponse.json({ success: true, data });
}
