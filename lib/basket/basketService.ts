import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { localStore } from "../store/localStore";
import {
  calculateBasketSummary,
  calculateBasketItemTotals,
} from "./basketCalculator";
import type { BasketItemInput } from "../types/extended";

export { calculateBasketItemTotals, calculateBasketSummary } from "./basketCalculator";

export async function getBasket() {
  if (!(await isDbAvailable())) {
    const items = localStore.basket.getAll().map((i) => ({
      id: i.id,
      productId: i.productId,
      marketplaceResultId: i.marketplaceResultId,
      title: i.title,
      marketplace: i.marketplace,
      country: i.country,
      quantity: i.quantity ?? 1,
      purchasePrice: i.purchasePrice,
      deliveryPerUnit: i.deliveryPerUnit ?? 0,
      extraCosts: i.extraCosts ?? 0,
      targetSalePrice: i.targetSalePrice,
    }));
    return { items, summary: calculateBasketSummary(items as Array<BasketItemInput & { id: string }>) };
  }

  try {
    const items = await prisma.purchaseBasketItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        marketplaceResult: true,
      },
    });

    const mapped = items.map((i) => ({
      id: i.id,
      productId: i.productId,
      marketplaceResultId: i.marketplaceResultId,
      title: i.title,
      marketplace: i.marketplace,
      country: i.country,
      quantity: i.quantity,
      purchasePrice: i.purchasePrice,
      purchaseCurrency: i.purchaseCurrency,
      deliveryPerUnit: i.deliveryPerUnit,
      extraCosts: i.extraCosts,
      targetSalePrice: i.targetSalePrice,
      imageUrl: i.imageUrl ?? undefined,
      url: i.url ?? undefined,
      kaspiTitle: i.product.title,
      totals: calculateBasketItemTotals({
        quantity: i.quantity,
        purchasePrice: i.purchasePrice,
        deliveryPerUnit: i.deliveryPerUnit,
        extraCosts: i.extraCosts,
        targetSalePrice: i.targetSalePrice,
      }),
    }));

    return {
      items: mapped,
      summary: calculateBasketSummary(
        items.map((i) => ({
          id: i.id,
          productId: i.productId,
          marketplaceResultId: i.marketplaceResultId,
          title: i.title,
          marketplace: i.marketplace,
          country: i.country,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice,
          deliveryPerUnit: i.deliveryPerUnit,
          extraCosts: i.extraCosts,
          targetSalePrice: i.targetSalePrice,
        }))
      ),
    };
  } catch {
    const items = localStore.basket.getAll();
    return { items, summary: calculateBasketSummary(items) };
  }
}

export async function addToBasket(input: BasketItemInput) {
  if (!(await isDbAvailable())) {
    return localStore.basket.add(input);
  }

  try {
    await prisma.purchaseBasket.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });

    return await prisma.purchaseBasketItem.create({
      data: {
        basketId: "default",
        productId: input.productId,
        marketplaceResultId: input.marketplaceResultId,
        title: input.title,
        marketplace: input.marketplace,
        country: input.country,
        quantity: input.quantity ?? 1,
        purchasePrice: input.purchasePrice,
        purchaseCurrency: input.purchaseCurrency ?? "KZT",
        deliveryPerUnit: input.deliveryPerUnit ?? 0,
        extraCosts: input.extraCosts ?? 0,
        targetSalePrice: input.targetSalePrice,
        imageUrl: input.imageUrl,
        url: input.url,
      },
    });
  } catch {
    return localStore.basket.add(input);
  }
}

export async function updateBasketItem(
  id: string,
  data: Partial<BasketItemInput & { quantity: number }>
) {
  if (!(await isDbAvailable())) {
    return localStore.basket.update(id, data);
  }

  try {
    return await prisma.purchaseBasketItem.update({
      where: { id },
      data: {
        quantity: data.quantity,
        purchasePrice: data.purchasePrice,
        deliveryPerUnit: data.deliveryPerUnit,
        extraCosts: data.extraCosts,
        targetSalePrice: data.targetSalePrice,
      },
    });
  } catch {
    return localStore.basket.update(id, data);
  }
}

export async function removeFromBasket(id: string) {
  if (!(await isDbAvailable())) {
    return localStore.basket.remove(id);
  }

  try {
    await prisma.purchaseBasketItem.delete({ where: { id } });
    return true;
  } catch {
    return localStore.basket.remove(id);
  }
}
