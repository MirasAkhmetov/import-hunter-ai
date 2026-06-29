import { getCurrencyForMarketplace } from "../marketplaces/marketplaceCurrency";
import { detectMarketplaceFromUrl, isMarketplaceSearchUrl } from "./urlUtils";
import {
  fetchProductHtml,
  parseProductWithPlaywright,
  shouldUsePlaywrightFallback,
} from "./browserProductFetcher";
import { extractPriceFromHtml } from "./htmlPriceExtractor";
export interface ParsedProductPage {
  title: string;
  price: number;
  currency: string;
  url: string;
  isMockPrice: boolean;
  available: boolean;
  imageUrl?: string;
}

async function parseWithMarketplaceApi(
  url: string,
  marketplace: string
): Promise<ParsedProductPage | null> {
  if (marketplace === "wildberries") {
    try {
      const { parseWildberriesProduct } = await import("../parsers/wildberries");
      const parsed = await parseWildberriesProduct(url);
      if (parsed.price > 0) {
        return {
          title: parsed.title,
          price: parsed.price,
          currency: "RUB",
          url,
          isMockPrice: false,
          available: true,
          imageUrl: parsed.imageUrl,
        };
      }
    } catch (error) {
      console.warn("[price-verification] Wildberries API parser failed:", error);
    }
  }

  if (marketplace === "ozon") {
    try {
      const { parseOzonProduct } = await import("../parsers/ozon");
      const parsed = await parseOzonProduct(url);
      if (parsed.price > 0) {
        return {
          title: parsed.title,
          price: parsed.price,
          currency: "RUB",
          url,
          isMockPrice: false,
          available: true,
          imageUrl: parsed.imageUrl,
        };
      }
    } catch (error) {
      console.warn("[price-verification] Ozon API parser failed:", error);
    }
  }

  return null;
}

export async function parseProduct(
  url: string,
  marketplace: string
): Promise<ParsedProductPage | null> {
  if (isMarketplaceSearchUrl(url)) {
    return null;
  }

  const fromApi = await parseWithMarketplaceApi(url, marketplace);
  if (fromApi) {
    return fromApi;
  }

  try {
    const html = await fetchProductHtml(url);
    let extracted = html ? extractPriceFromHtml(html, url, marketplace) : null;

    if (shouldUsePlaywrightFallback(marketplace, html, extracted)) {
      const fromBrowser = await parseProductWithPlaywright(url, marketplace);
      if (fromBrowser) {
        extracted = fromBrowser;
      }
    }

    if (!extracted) {
      console.warn(
        `[price-verification] Failed to parse product page: marketplace=${marketplace} url=${url} htmlLen=${html?.length ?? 0}`
      );
      return null;
    }

    const resolvedMarketplace =
      marketplace !== "unknown"
        ? marketplace
        : detectMarketplaceFromUrl(url) ?? marketplace;
    const currency =
      resolvedMarketplace !== "unknown"
        ? getCurrencyForMarketplace(resolvedMarketplace)
        : extracted.currency;

    return {
      title: extracted.title,
      price: extracted.price,
      currency,
      url,
      isMockPrice: false,
      available: true,
      imageUrl: extracted.imageUrl,
    };
  } catch (error) {
    console.warn(
      `[price-verification] parseProduct error: marketplace=${marketplace} url=${url}`,
      error
    );
    return null;
  }
}

export async function enrichResultWithProductPage(
  result: import("../types").MarketplaceResultData
): Promise<import("../types").MarketplaceResultData> {
  if (isMarketplaceSearchUrl(result.url)) {
    return {
      ...result,
      isMockPrice: true,
      needsProfitReview: true,
      priceSource: "search_result",
    };
  }

  const parsed = await parseProduct(result.url, result.marketplace);
  if (!parsed) {
    const searchPrice = result.price ?? 0;
    if (searchPrice > 0) {
      return {
        ...result,
        originalPrice: searchPrice,
        finalPrice: searchPrice,
        price: searchPrice,
        isMockPrice: false,
        needsProfitReview: true,
        priceSource: "search_result",
      };
    }
    return {
      ...result,
      isMockPrice: true,
      needsProfitReview: true,
      priceSource: "search_result",
    };
  }

  return {
    ...result,
    title: parsed.title || result.title,
    originalPrice: result.price,
    finalPrice: parsed.price,
    price: parsed.price,
    currency: parsed.currency,
    imageUrl: parsed.imageUrl ?? result.imageUrl,
    priceSource: "product_page",
    isMockPrice: false,
    needsProfitReview: false,
    url: parsed.url,
  };
}
