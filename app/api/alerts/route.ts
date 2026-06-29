import { NextRequest, NextResponse } from "next/server";
import {
  getAlerts,
  markAlertAsRead,
  markAsPurchased,
  ignoreAlert,
  pauseAlert,
  resumeAlert,
  checkBuyAlerts,
} from "@/lib/alerts/buyAlertService";

export async function GET() {
  const data = await getAlerts();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const { action, id, watchlistItemId } = await request.json();

  switch (action) {
    case "check_prices": {
      const triggered = await checkBuyAlerts();
      return NextResponse.json({ success: true, data: triggered, checked: true });
    }
    case "mark_read":
      await markAlertAsRead(id);
      break;
    case "mark_purchased":
      await markAsPurchased(watchlistItemId ?? id);
      break;
    case "ignore":
      await ignoreAlert(watchlistItemId ?? id);
      break;
    case "pause":
      await pauseAlert(watchlistItemId ?? id);
      break;
    case "resume":
      await resumeAlert(watchlistItemId ?? id);
      break;
    default:
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
