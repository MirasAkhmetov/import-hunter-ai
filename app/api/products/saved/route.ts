import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isMockMode } from "@/lib/config/mockMode";

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const products = await prisma.product.findMany({
      where: { isSaved: true },
      orderBy: { createdAt: "desc" },
      include: {
        marketplaceResults: {
          include: { profitAnalyses: true },
          orderBy: { matchScore: "desc" },
          take: 1,
        },
      },
    });

    const data = products.map((p) => {
      const best = p.marketplaceResults[0];
      const profit = best?.profitAnalyses[0];
      return {
        id: p.id,
        title: p.title,
        imageUrl: p.imageUrl,
        kaspiPrice: p.price,
        marketplace: best?.marketplace ?? "unknown",
        purchasePriceKzt: profit?.purchasePriceKzt ?? 0,
        netProfitKzt: profit?.netProfitKzt ?? 0,
        roiPercent: profit?.roiPercent ?? 0,
        url: best?.url ?? p.url,
        savedAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
