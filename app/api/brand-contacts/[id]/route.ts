import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateBrandContactStatus } from "@/lib/brand-finder/brandContactService";

const schema = z.object({
  status: z.enum([
    "found",
    "needs_manual_check",
    "verified_by_user",
    "rejected",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = schema.parse(await request.json());
    const data = await updateBrandContactStatus(id, status);
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
