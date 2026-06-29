import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOutreachEmail } from "@/lib/brand-finder/brandContactService";

const schema = z.object({
  brandContactId: z.string(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    brand: z.string().optional().nullable(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { brandContactId, product } = schema.parse(await request.json());
    const data = await generateOutreachEmail(brandContactId, {
      id: product.id,
      source: "kaspi",
      title: product.title,
      brand: product.brand ?? undefined,
      price: 0,
      currency: "KZT",
      url: "",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
