import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyProductLink } from "@/lib/price-verification/linkVerifier";
import { updateLinkStatus } from "@/lib/price-verification/priceCorrectionService";

const schema = z.object({
  marketplaceResultId: z.string(),
  kaspiTitle: z.string(),
  kaspiBrand: z.string().optional().nullable(),
  kaspiModel: z.string().optional().nullable(),
  resultTitle: z.string(),
  resultUrl: z.string(),
  matchScore: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const verification = verifyProductLink({
      kaspiProduct: {
        title: body.kaspiTitle,
        brand: body.kaspiBrand ?? undefined,
        model: body.kaspiModel ?? undefined,
      },
      resultTitle: body.resultTitle,
      resultUrl: body.resultUrl,
      matchScore: body.matchScore,
    });
    await updateLinkStatus(body.marketplaceResultId, verification.linkStatus);
    return NextResponse.json({ success: true, data: verification });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
