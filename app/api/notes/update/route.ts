import { NextRequest, NextResponse } from "next/server";
import { updateNotes } from "@/lib/notes/notesService";

export async function POST(request: NextRequest) {
  try {
    const { entityId, entityType, userNotes, aiNotes } = await request.json();
    const result = await updateNotes(entityId, entityType, { userNotes, aiNotes });
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка сохранения" }, { status: 400 });
  }
}
