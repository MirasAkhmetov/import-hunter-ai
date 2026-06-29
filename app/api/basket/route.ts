import { NextResponse } from "next/server";
import { getBasket } from "@/lib/basket/basketService";

export async function GET() {
  const data = await getBasket();
  return NextResponse.json({ success: true, data });
}
