import { NextRequest, NextResponse } from "next/server";
import { getCountryBreakdown } from "@/lib/country-breakdown/countryBreakdownService";
import { parseFiltersFromSearchParams } from "@/lib/filters/productFilters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const data = await getCountryBreakdown(filters);
  return NextResponse.json({ success: true, data });
}
