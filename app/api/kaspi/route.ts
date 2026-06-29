import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseKaspiProduct } from "@/lib/parsers/kaspi";
import { getErrorMessage } from "@/lib/analysis";

const schema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = schema.parse(body);
    const product = await parseKaspiProduct(url);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { success: false, error: getErrorMessage(message), code: message },
      { status: 400 }
    );
  }
}
