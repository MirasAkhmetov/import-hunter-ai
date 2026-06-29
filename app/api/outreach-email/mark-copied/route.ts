import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { markOutreachEmailCopied } from "@/lib/brand-finder/brandContactService";

const schema = z.object({
  id: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { id } = schema.parse(await request.json());
    const data = await markOutreachEmailCopied(id);
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
