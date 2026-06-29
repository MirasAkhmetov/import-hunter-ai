import { NextRequest, NextResponse } from "next/server";
import { removeFromBasket } from "@/lib/basket/basketService";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    await removeFromBasket(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка удаления" }, { status: 400 });
  }
}
