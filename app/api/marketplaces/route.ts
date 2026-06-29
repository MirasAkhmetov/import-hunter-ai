import { NextResponse } from "next/server";
import { getEnabledProviders } from "@/lib/marketplaces";
import { TURKEY_MARKETPLACES } from "@/lib/marketplaces/turkey";
import { UAE_MARKETPLACES } from "@/lib/marketplaces/uae";
import { CHINA_MARKETPLACES } from "@/lib/marketplaces/china";
import { MARKETPLACE_LABELS } from "@/lib/types";

export async function GET() {
  const active = getEnabledProviders();
  const all = [
    ...TURKEY_MARKETPLACES,
    ...UAE_MARKETPLACES,
    ...CHINA_MARKETPLACES,
  ].map((id) => ({
    id,
    name: MARKETPLACE_LABELS[id] ?? id,
    enabled: active.some((p) => p.marketplace === id),
    country:
      TURKEY_MARKETPLACES.includes(id)
        ? "TR"
        : UAE_MARKETPLACES.includes(id)
          ? "AE"
          : "CN",
  }));

  return NextResponse.json({ success: true, data: all });
}
