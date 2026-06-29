import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateOutreachEmailStatus } from "@/lib/brand-finder/brandContactService";

const schema = z.object({
  status: z.enum(["draft", "copied", "sent_manually", "replied", "rejected"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = schema.parse(await request.json());
    const data = await updateOutreachEmailStatus(id, status);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
