import { NextResponse } from "next/server";
import { exportToXlsxBuffer } from "@/lib/export/exportService";

export async function GET() {
  const buffer = await exportToXlsxBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="import-hunter-export.xlsx"',
    },
  });
}
