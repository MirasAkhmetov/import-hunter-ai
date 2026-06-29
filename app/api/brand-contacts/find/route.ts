import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAndSaveBrandContacts } from "@/lib/brand-finder/brandContactService";

const schema = z.object({
  product: z.object({
    id: z.string(),
    source: z.string().optional(),
    title: z.string(),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    price: z.number(),
    currency: z.string().optional(),
    url: z.string(),
    imageUrl: z.string().optional().nullable(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { product } = schema.parse(await request.json());
    const data = await findAndSaveBrandContacts({
      id: product.id,
      source: product.source ?? "kaspi",
      title: product.title,
      brand: product.brand ?? undefined,
      model: product.model ?? undefined,
      category: product.category ?? undefined,
      price: product.price,
      currency: product.currency ?? "KZT",
      url: product.url,
      imageUrl: product.imageUrl ?? undefined,
    });
    return NextResponse.json({
      success: true,
      data: data.contacts,
      meta: data.meta,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
