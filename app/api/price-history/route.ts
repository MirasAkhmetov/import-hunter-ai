import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/price-history/priceHistoryService";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("marketplaceResultId");
  const basePrice = parseFloat(request.nextUrl.searchParams.get("basePrice") ?? "95000");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
  }

  const data = await getPriceHistory(id, basePrice);
  return NextResponse.json({ success: true, data });
}
