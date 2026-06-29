import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore } from "../store/mockStore";
import type { ManualStatus } from "../types/extended";

export async function updateManualStatus(
  marketplaceResultId: string,
  status: ManualStatus
) {
  if (!(await isDbAvailable())) {
    mockStore.manualStatus.set(marketplaceResultId, status);
    return { id: marketplaceResultId, manualStatus: status };
  }

  try {
    return await prisma.marketplaceResult.update({
      where: { id: marketplaceResultId },
      data: { manualStatus: status },
    });
  } catch {
    mockStore.manualStatus.set(marketplaceResultId, status);
    return { id: marketplaceResultId, manualStatus: status };
  }
}

export async function toggleFavorite(
  entityId: string,
  entityType: "product" | "marketplace_result"
) {
  if (!(await isDbAvailable())) {
    const isFavorite = mockStore.favorites.toggle(entityId);
    return { id: entityId, favorite: isFavorite };
  }

  try {
    if (entityType === "product") {
      const product = await prisma.product.findUnique({ where: { id: entityId } });
      if (!product) throw new Error("Not found");
      return await prisma.product.update({
        where: { id: entityId },
        data: { favorite: !product.favorite, isSaved: !product.favorite },
      });
    }

    const result = await prisma.marketplaceResult.findUnique({
      where: { id: entityId },
    });
    if (!result) throw new Error("Not found");
    return await prisma.marketplaceResult.update({
      where: { id: entityId },
      data: { favorite: !result.favorite },
    });
  } catch {
    const isFavorite = mockStore.favorites.toggle(entityId);
    return { id: entityId, favorite: isFavorite };
  }
}

export async function updateNotes(
  entityId: string,
  entityType: "product" | "marketplace_result",
  data: { userNotes?: string; aiNotes?: string }
) {
  if (!(await isDbAvailable())) {
    return mockStore.notes.set(entityId, data);
  }

  try {
    if (entityType === "product") {
      await prisma.product.update({
        where: { id: entityId },
        data: { userNotes: data.userNotes, aiNotes: data.aiNotes },
      });
      await prisma.userNote.upsert({
        where: { productId: entityId },
        create: { productId: entityId, ...data },
        update: data,
      });
    } else {
      await prisma.marketplaceResult.update({
        where: { id: entityId },
        data: { userNotes: data.userNotes, aiNotes: data.aiNotes },
      });
      await prisma.userNote.upsert({
        where: { marketplaceResultId: entityId },
        create: { marketplaceResultId: entityId, ...data },
        update: data,
      });
    }
    return data;
  } catch {
    return mockStore.notes.set(entityId, data);
  }
}

export async function getNotes(entityId: string) {
  if (!(await isDbAvailable())) return mockStore.notes.get(entityId);

  try {
    const note =
      (await prisma.userNote.findFirst({
        where: {
          OR: [{ productId: entityId }, { marketplaceResultId: entityId }],
        },
      })) ?? null;
    return {
      userNotes: note?.userNotes ?? undefined,
      aiNotes: note?.aiNotes ?? undefined,
    };
  } catch {
    return mockStore.notes.get(entityId);
  }
}
