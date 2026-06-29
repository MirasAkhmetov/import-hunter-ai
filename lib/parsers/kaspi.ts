import type { ParsedProduct } from "../types";
import { isValidKaspiUrl } from "../utils";
import { getMockKaspiProduct } from "../mock/data";
import {
  ensureAbsoluteKaspiImageUrl,
  fetchKaspiProductFromHtml,
  isInvalidKaspiProductPage,
} from "./kaspiHtmlParser";
import { parseKaspiUrl } from "../mock/kaspiUrlParser";
import { isMockMode } from "../config/mockMode";

function enrichFromUrl(url: string, product: ParsedProduct): ParsedProduct {
  const parsed = parseKaspiUrl(url);
  const specs = { ...(product.specifications ?? {}) };
  if (parsed.capacity) specs["Объём"] = parsed.capacity;
  if (parsed.color) specs["Цвет"] = parsed.color;
  if (parsed.brandLabel) specs["Бренд"] = parsed.brandLabel;
  if (parsed.model) specs["Модель"] = parsed.model;

  return {
    ...product,
    brand: product.brand ?? parsed.brandLabel,
    model: product.model ?? parsed.model,
    category: product.category ?? parsed.category,
    specifications: Object.keys(specs).length ? specs : product.specifications,
  };
}

export async function parseKaspiProduct(url: string): Promise<ParsedProduct> {
  if (!isValidKaspiUrl(url)) {
    throw new Error("INVALID_KASPI_URL");
  }

  // Сначала пробуем получить реальные данные с Kaspi (цена, фото, отзывы)
  try {
    const product = await fetchKaspiProductFromHtml(url);
    return enrichFromUrl(url, {
      ...product,
      imageUrl: ensureAbsoluteKaspiImageUrl(product.imageUrl),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_KASPI_URL") {
      throw error;
    }
    console.warn("Kaspi HTML fetch failed, using fallback:", error);
  }

  if (isMockMode()) {
    await delay(400);
    return getMockKaspiProduct(url);
  }

  // Playwright fallback for production without mock
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const product = await page.evaluate(() => {
      const title =
        document.querySelector("h1")?.textContent?.trim() ??
        document.querySelector('[class*="item__heading"]')?.textContent?.trim() ??
        "";

      const priceText =
        document.querySelector('[class*="item__price"]')?.textContent?.trim() ??
        document.querySelector('[class*="price"]')?.textContent?.trim() ??
        "0";

      const price = parseFloat(priceText.replace(/[^\d]/g, "")) || 0;

      const imageUrl =
        document.querySelector('[class*="gallery"] img')?.getAttribute("src") ??
        document.querySelector("img[itemprop='image']")?.getAttribute("src") ??
        undefined;

      const ratingText =
        document.querySelector('[class*="rating"]')?.textContent?.trim() ?? "";
      const rating = parseFloat(ratingText) || undefined;

      const reviewText =
        document.querySelector('[class*="review"]')?.textContent?.trim() ?? "";
      const reviewCount = parseInt(reviewText.replace(/[^\d]/g, "")) || undefined;

      return { title, price, imageUrl, rating, reviewCount };
    });

    await browser.close();

    if (isInvalidKaspiProductPage(product.title, product.price)) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return enrichFromUrl(url, {
      source: "kaspi",
      title: product.title,
      price: product.price,
      currency: "KZT",
      url,
      imageUrl: ensureAbsoluteKaspiImageUrl(product.imageUrl),
      rating: product.rating,
      reviewCount: product.reviewCount,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND" || error.message === "INVALID_KASPI_URL") {
        throw error;
      }
      throw new Error("PARSING_BLOCKED");
    }
    throw new Error("PARSING_BLOCKED");
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
