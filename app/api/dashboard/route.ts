import { NextRequest, NextResponse } from "next/server";
import { getEnhancedDashboardData } from "@/lib/dashboard/enhancedDashboardService";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const data = await getEnhancedDashboardData({ date });
  return NextResponse.json({ success: true, data });
}
