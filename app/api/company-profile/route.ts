import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCompanyProfile,
  saveCompanyProfile,
} from "@/lib/brand-finder/brandContactService";

export async function GET() {
  const data = await getCompanyProfile();
  return NextResponse.json({ success: true, data });
}

const schema = z.object({
  companyName: z.string(),
  personName: z.string(),
  position: z.string(),
  country: z.string(),
  city: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string().optional().nullable(),
  marketplaceChannels: z.string(),
  businessDescription: z.string(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const data = await saveCompanyProfile(body);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
