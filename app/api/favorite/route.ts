import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite } from "@/lib/notes/notesService";

export async function POST(request: NextRequest) {
  try {
    const { entityId, entityType } = await request.json();
    const result = await toggleFavorite(entityId, entityType);
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 400 });
  }
}
