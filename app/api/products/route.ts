import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isMockMode } from "@/lib/config/mockMode";

export async function PATCH(request: NextRequest) {
  if (isMockMode()) {
    const { id, isSaved } = await request.json();
    return NextResponse.json({ success: true, data: { id, isSaved } });
  }

  try {
    const { id, isSaved } = await request.json();
    const product = await prisma.product.update({
      where: { id },
      data: { isSaved },
    });
    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json(
      { success: false, error: "Товар не найден" },
      { status: 404 }
    );
  }
}
