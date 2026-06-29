import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseProduct } from "@/lib/price-verification/productPageParser";
import {
  detectMarketplaceFromUrl,
  isMarketplaceSearchUrl,
} from "@/lib/price-verification/urlUtils";
import {
  getCurrencyForMarketplace,
  isKaspiProductUrl,
  marketplacesMatch,
} from "@/lib/marketplaces/marketplaceCurrency";
import { mockStore } from "@/lib/store/mockStore";
import { isDbAvailable } from "@/lib/db/availability";
import { prisma } from "@/lib/db";

const schema = z.object({
  marketplaceResultId: z.string(),
  url: z.string().url(),
  marketplace: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { marketplaceResultId, url, marketplace: expectedMarketplace } =
      schema.parse(await request.json());

    if (isKaspiProductUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Это ссылка Kaspi.kz. Вставьте ссылку на товар с маркетплейса закупки (Hepsiburada, Wildberries, Ozon и т.д.).",
        },
        { status: 400 }
      );
    }

    if (isMarketplaceSearchUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Это ссылка на поиск, а не на товар. Откройте маркетплейс, найдите нужный товар и вставьте ссылку на страницу товара.",
        },
        { status: 400 }
      );
    }

    const detectedMarketplace = detectMarketplaceFromUrl(url);
    if (
      !detectedMarketplace ||
      !marketplacesMatch(detectedMarketplace, expectedMarketplace)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Ссылка не от ${expectedMarketplace}. Вставьте URL товара с правильного маркетплейса.`,
        },
        { status: 400 }
      );
    }

    const parsedProduct = await parseProduct(url, detectedMarketplace);

    if (!parsedProduct || parsedProduct.price <= 0) {
      const isSearch = isMarketplaceSearchUrl(url);
      return NextResponse.json(
        {
          success: false,
          error: isSearch
            ? "Это ссылка на поиск. Вставьте ссылку на страницу товара (…-p-HBC…)."
            : "Не удалось получить цену автоматически. Нажмите «Исправить цену», выберите валюту (₽ или ₸) и введите закупочную цену вручную.",
        },
        { status: 422 }
      );
    }

    const currency = getCurrencyForMarketplace(expectedMarketplace);

    const updateData = {
      url,
      title: parsedProduct.title,
      currency,
      imageUrl: parsedProduct.imageUrl,
      price: parsedProduct.price,
      originalPrice: parsedProduct.price,
      finalPrice: parsedProduct.price,
      priceSource: "product_page" as const,
      linkStatus: "verified" as const,
      isMockPrice: false,
      needsProfitReview: false,
      priceVerifiedAt: new Date().toISOString(),
    };

    if (!(await isDbAvailable())) {
      mockStore.marketplaceResults.update(marketplaceResultId, updateData);
    } else {
      try {
        await prisma.marketplaceResult.update({
          where: { id: marketplaceResultId },
          data: {
            ...updateData,
            url,
            title: parsedProduct.title,
            currency,
            imageUrl: parsedProduct.imageUrl,
            priceVerifiedAt: new Date(),
          },
        });
      } catch {
        mockStore.marketplaceResults.update(marketplaceResultId, updateData);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        marketplaceResultId,
        ...updateData,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
