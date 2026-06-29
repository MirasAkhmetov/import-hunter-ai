import { NextRequest, NextResponse } from "next/server";
import { getPriceCorrectionHistory } from "@/lib/price-verification/priceCorrectionService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marketplaceResultId: string }> }
) {
  const { marketplaceResultId } = await params;
  const data = await getPriceCorrectionHistory(marketplaceResultId);
  return NextResponse.json({ success: true, data });
}
