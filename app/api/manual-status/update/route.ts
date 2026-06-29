import { NextRequest, NextResponse } from "next/server";
import { updateManualStatus } from "@/lib/notes/notesService";
import type { ManualStatus } from "@/lib/types/extended";

export async function POST(request: NextRequest) {
  try {
    const { marketplaceResultId, status } = await request.json();
    const result = await updateManualStatus(
      marketplaceResultId,
      status as ManualStatus
    );
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: "Ошибка обновления" }, { status: 400 });
  }
}
