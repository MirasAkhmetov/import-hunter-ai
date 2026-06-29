import { NextRequest, NextResponse } from "next/server";
import { updateBasketItem } from "@/lib/basket/basketService";

export async function POST(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    const item = await updateBasketItem(id, data);
    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка обновления" }, { status: 400 });
  }
}
