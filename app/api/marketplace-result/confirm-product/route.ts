import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmProductLink } from "@/lib/price-verification/priceCorrectionService";

const schema = z.object({
  marketplaceResultId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { marketplaceResultId } = schema.parse(await request.json());
    const data = await confirmProductLink(marketplaceResultId);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
