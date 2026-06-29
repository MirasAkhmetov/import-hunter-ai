import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  runAnalysis,
  createAnalysisJob,
  updateAnalysisJob,
  getErrorMessage,
} from "@/lib/analysis";

const schema = z.object({
  url: z.string().url().refine(
    (url) => url.includes("kaspi.kz") && url.includes("/shop/p/"),
    "INVALID_KASPI_URL"
  ),
  marketplaces: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, marketplaces, countries } = schema.parse(body);

    const job = await createAnalysisJob(url);

    try {
      const result = await runAnalysis(url, undefined, {
        marketplaces,
        countries,
      });

      await updateAnalysisJob(job.id, {
        status: "completed",
        productId: result.product.id,
        result: result as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "UNKNOWN_ERROR";

      await updateAnalysisJob(job.id, {
        status: "failed",
        error: getErrorMessage(message),
      });

      return NextResponse.json(
        { success: false, error: getErrorMessage(message), code: message },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: getErrorMessage("INVALID_KASPI_URL"),
          code: "INVALID_KASPI_URL",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
