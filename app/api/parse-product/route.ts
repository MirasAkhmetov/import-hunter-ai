import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseProduct } from "@/lib/price-verification/productPageParser";
import {
  detectMarketplaceFromUrl,
  isMarketplaceSearchUrl,
} from "@/lib/price-verification/urlUtils";
import { getCurrencyForMarketplace, isKaspiProductUrl } from "@/lib/marketplaces/marketplaceCurrency";

const schema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const { url } = schema.parse(await request.json());

    if (isKaspiProductUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Это ссылка Kaspi. Используйте маркетплейс закупки (Hepsiburada, Wildberries, Ozon и т.д.)." },
        { status: 400 }
      );
    }

    if (isMarketplaceSearchUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Вставьте ссылку на страницу товара, а не на поиск." },
        { status: 400 }
      );
    }

    const marketplace = detectMarketplaceFromUrl(url);
    if (!marketplace) {
      return NextResponse.json(
        { success: false, error: "Маркетплейс не распознан." },
        { status: 400 }
      );
    }

    const parsed = await parseProduct(url, marketplace);
    if (!parsed || parsed.price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Не удалось получить цену. Укажите закупочную цену вручную.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        marketplace,
        title: parsed.title,
        price: parsed.price,
        currency: getCurrencyForMarketplace(marketplace),
        imageUrl: parsed.imageUrl,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
