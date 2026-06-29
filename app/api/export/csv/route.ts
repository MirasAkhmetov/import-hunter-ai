import { NextResponse } from "next/server";
import { exportToCsv } from "@/lib/export/exportService";

export async function GET() {
  const csv = await exportToCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="import-hunter-export.csv"',
    },
  });
}
