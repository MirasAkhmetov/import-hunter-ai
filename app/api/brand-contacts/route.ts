import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createBrandContact,
  getBrandContacts,
} from "@/lib/brand-finder/brandContactService";
import type { BrandContactRole, BrandContactRegion } from "@/lib/types/brandFinder";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
  const data = await getBrandContacts(productId);
  return NextResponse.json({ success: true, data });
}

const createSchema = z.object({
  productId: z.string(),
  brand: z.string(),
  companyName: z.string(),
  role: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactFormUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  language: z.enum(["ru", "en"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const data = await createBrandContact({
      ...body,
      role: body.role as BrandContactRole | undefined,
      region: body.region as BrandContactRegion | undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
