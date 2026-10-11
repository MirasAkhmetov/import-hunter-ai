import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDbAvailable } from "@/lib/db/availability";

export async function GET() {
  if (!(await isDbAvailable())) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        marketplaceResults: {
          include: { profitAnalyses: true },
          orderBy: { matchScore: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
