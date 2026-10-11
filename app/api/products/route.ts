import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDbAvailable } from "@/lib/db/availability";

export async function PATCH(request: NextRequest) {
  if (!(await isDbAvailable())) {
    return NextResponse.json(
      { success: false, error: "База данных недоступна — сохранение невозможно" },
      { status: 503 }
    );
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
