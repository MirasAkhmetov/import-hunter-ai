import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { mockStore, seedMockStore } from "../store/mockStore";
import { MARKETPLACE_LABELS } from "../types";
import type {
  AnalysisCompareResult,
  AnalysisHistoryFilters,
  AnalysisRun,
  AnalysisRunDetail,
  AnalysisSnapshot,
  AnalysisSnapshotType,
  SaveAnalysisRunInput,
} from "../types/analysisHistory";
import { getSnapshotData } from "./snapshotUtils";
import {
  resolveBestMarketplaceResult,
} from "./resolveBestResult";
import { pickBestPerMarketplace } from "../matching/pickBestPerMarketplace";
import { isIsoInDay } from "../dateRange";

export { getSnapshotData };

let idCounter = 1000;
function genSnapshotId() {
  return `snap-mock-${idCounter++}`;
}

function buildSnapshots(
  runId: string,
  input: SaveAnalysisRunInput,
  now: string
): AnalysisSnapshot[] {
  const { result, brandContacts = [], outreachEmails = [], settings } = input;

  const snapshots: AnalysisSnapshot[] = [
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "kaspi_product",
      data: result.product,
      createdAt: now,
    },
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "marketplace_results",
      data: result.marketplaceResults,
      createdAt: now,
    },
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "profit_analysis",
      data: result.marketplaceResults.map((r) => ({
        id: r.id,
        marketplace: r.marketplace,
        profit: r.profit,
      })),
      createdAt: now,
    },
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "ai_recommendation",
      data: { recommendation: result.recommendation, bestOption: result.bestOption },
      createdAt: now,
    },
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "brand_contacts",
      data: brandContacts,
      createdAt: now,
    },
    {
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "outreach_emails",
      data: outreachEmails,
      createdAt: now,
    },
  ];

  if (settings) {
    snapshots.push({
      id: genSnapshotId(),
      analysisRunId: runId,
      snapshotType: "settings_used",
      data: settings,
      createdAt: now,
    });
  }

  return snapshots;
}

function buildRunSummary(
  input: SaveAnalysisRunInput,
  runId: string,
  now: string
): AnalysisRun {
  const { kaspiUrl, result, status = "completed", selectedMarketplaceResultId } =
    input;
  const best = resolveBestMarketplaceResult(result, selectedMarketplaceResultId);

  return {
    id: runId,
    kaspiUrl,
    productId: result.product.id,
    status,
    source: result.product.source,
    productTitle: result.product.title,
    productBrand: result.product.brand ?? null,
    productCategory: result.product.category ?? null,
    productImageUrl: result.product.imageUrl ?? null,
    kaspiPriceKzt: result.product.price,
    totalMarketplaceResults: result.marketplaceResults.length,
    bestCountry: best?.country ?? null,
    bestMarketplace: best?.marketplace ?? null,
    bestPurchasePriceKzt: best?.profit.purchasePriceKzt ?? null,
    bestNetProfitKzt: best?.profit.netProfitKzt ?? null,
    bestRoiPercent: best?.profit.roiPercent ?? null,
    aiRecommendation: result.recommendation ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveAnalysisRun(
  input: SaveAnalysisRunInput
): Promise<AnalysisRunDetail> {
  const normalizedInput: SaveAnalysisRunInput = {
    ...input,
    result: {
      ...input.result,
      marketplaceResults: pickBestPerMarketplace(
        input.result.marketplaceResults
      ),
    },
  };

  let targetRunId = normalizedInput.updateRunId ?? null;

  if (!targetRunId) {
    const existing = await findLatestRunByKaspiUrl(normalizedInput.kaspiUrl);
    if (existing) targetRunId = existing.id;
  }

  if (targetRunId) {
    const updated = await updateAnalysisRun(targetRunId, normalizedInput);
    if (updated) return updated;
  }

  const now = new Date().toISOString();
  const run = buildRunSummary(normalizedInput, `run-${Date.now()}`, now);
  const snapshots = buildSnapshots(run.id, normalizedInput, now);

  if (!(await isDbAvailable())) {
    mockStore.analysisRuns.add(run, snapshots);
    return { ...run, snapshots };
  }

  try {
    const created = await prisma.analysisRun.create({
      data: {
        kaspiUrl: run.kaspiUrl,
        productId: run.productId,
        status: run.status,
        source: run.source,
        productTitle: run.productTitle,
        productBrand: run.productBrand,
        productCategory: run.productCategory,
        productImageUrl: run.productImageUrl,
        kaspiPriceKzt: run.kaspiPriceKzt,
        totalMarketplaceResults: run.totalMarketplaceResults,
        bestCountry: run.bestCountry,
        bestMarketplace: run.bestMarketplace,
        bestPurchasePriceKzt: run.bestPurchasePriceKzt,
        bestNetProfitKzt: run.bestNetProfitKzt,
        bestRoiPercent: run.bestRoiPercent,
        aiRecommendation: run.aiRecommendation,
        snapshots: {
          create: snapshots.map((s) => ({
            snapshotType: s.snapshotType,
            data: s.data as object,
          })),
        },
      },
      include: { snapshots: true },
    });

    return mapPrismaRunDetail(created);
  } catch {
    mockStore.analysisRuns.add(run, snapshots);
    return { ...run, snapshots };
  }
}

export async function updateAnalysisRun(
  id: string,
  input: SaveAnalysisRunInput
): Promise<AnalysisRunDetail | null> {
  const existing = await getAnalysisRun(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const run = {
    ...buildRunSummary(input, id, now),
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  const snapshots = buildSnapshots(id, input, now);

  if (!(await isDbAvailable())) {
    mockStore.analysisRuns.update(id, run, snapshots);
    return { ...run, snapshots };
  }

  try {
    await prisma.analysisSnapshot.deleteMany({ where: { analysisRunId: id } });
    const updated = await prisma.analysisRun.update({
      where: { id },
      data: {
        kaspiUrl: run.kaspiUrl,
        productId: run.productId,
        status: run.status,
        source: run.source,
        productTitle: run.productTitle,
        productBrand: run.productBrand,
        productCategory: run.productCategory,
        productImageUrl: run.productImageUrl,
        kaspiPriceKzt: run.kaspiPriceKzt,
        totalMarketplaceResults: run.totalMarketplaceResults,
        bestCountry: run.bestCountry,
        bestMarketplace: run.bestMarketplace,
        bestPurchasePriceKzt: run.bestPurchasePriceKzt,
        bestNetProfitKzt: run.bestNetProfitKzt,
        bestRoiPercent: run.bestRoiPercent,
        aiRecommendation: run.aiRecommendation,
        snapshots: {
          create: snapshots.map((s) => ({
            snapshotType: s.snapshotType,
            data: s.data as object,
          })),
        },
      },
      include: { snapshots: true },
    });

    return mapPrismaRunDetail(updated);
  } catch {
    mockStore.analysisRuns.update(id, run, snapshots);
    return { ...run, snapshots };
  }
}

export async function listAnalysisRuns(
  filters: AnalysisHistoryFilters = {}
): Promise<AnalysisRun[]> {
  seedMockStore();

  let runs: AnalysisRun[];

  if (!(await isDbAvailable())) {
    runs = mockStore.analysisRuns.getAll();
  } else {
    try {
      const rows = await prisma.analysisRun.findMany({
        orderBy: { createdAt: "desc" },
      });
      runs = rows.map(mapPrismaRun);
    } catch {
      runs = mockStore.analysisRuns.getAll();
    }
  }

  return dedupeRunsByKaspiUrl(applyFilters(runs, filters));
}

export async function getAnalysisRun(id: string): Promise<AnalysisRunDetail | null> {
  seedMockStore();

  if (!(await isDbAvailable())) {
    return mockStore.analysisRuns.get(id);
  }

  try {
    const row = await prisma.analysisRun.findUnique({
      where: { id },
      include: { snapshots: true },
    });
    if (!row) return mockStore.analysisRuns.get(id);
    return mapPrismaRunDetail(row);
  } catch {
    return mockStore.analysisRuns.get(id);
  }
}

export async function deleteAnalysisRun(id: string): Promise<boolean> {
  if (!(await isDbAvailable())) {
    return mockStore.analysisRuns.remove(id);
  }

  try {
    await prisma.analysisRun.delete({ where: { id } });
    return true;
  } catch {
    return mockStore.analysisRuns.remove(id);
  }
}

export async function compareWithLatest(id: string): Promise<AnalysisCompareResult | null> {
  const current = await getAnalysisRun(id);
  if (!current) return null;

  const all = await listAnalysisRuns();
  const sameProduct = all.filter(
    (r) =>
      r.id !== id &&
      (r.productId === current.productId || r.kaspiUrl === current.kaspiUrl)
  );

  if (sameProduct.length === 0) {
    return {
      kaspiPriceChanged: false,
      kaspiPriceDiff: 0,
      purchasePriceChanged: false,
      purchasePriceDiff: 0,
      profitChanged: false,
      profitDiff: 0,
      roiChanged: false,
      roiDiff: 0,
      bestMarketplaceChanged: false,
      newBrandContacts: 0,
    };
  }

  const previous = sameProduct[0];
  const prevContacts = getSnapshotData<unknown[]>(
    (await getAnalysisRun(previous.id))?.snapshots ?? [],
    "brand_contacts"
  ) ?? [];
  const currContacts = getSnapshotData<unknown[]>(current.snapshots, "brand_contacts") ?? [];

  return {
    kaspiPriceChanged: previous.kaspiPriceKzt !== current.kaspiPriceKzt,
    kaspiPriceDiff: current.kaspiPriceKzt - previous.kaspiPriceKzt,
    purchasePriceChanged:
      (previous.bestPurchasePriceKzt ?? 0) !== (current.bestPurchasePriceKzt ?? 0),
    purchasePriceDiff:
      (current.bestPurchasePriceKzt ?? 0) - (previous.bestPurchasePriceKzt ?? 0),
    profitChanged:
      (previous.bestNetProfitKzt ?? 0) !== (current.bestNetProfitKzt ?? 0),
    profitDiff: (current.bestNetProfitKzt ?? 0) - (previous.bestNetProfitKzt ?? 0),
    roiChanged: (previous.bestRoiPercent ?? 0) !== (current.bestRoiPercent ?? 0),
    roiDiff: (current.bestRoiPercent ?? 0) - (previous.bestRoiPercent ?? 0),
    bestMarketplaceChanged: previous.bestMarketplace !== current.bestMarketplace,
    previousBestMarketplace: previous.bestMarketplace
      ? MARKETPLACE_LABELS[previous.bestMarketplace] ?? previous.bestMarketplace
      : null,
    currentBestMarketplace: current.bestMarketplace
      ? MARKETPLACE_LABELS[current.bestMarketplace] ?? current.bestMarketplace
      : null,
    newBrandContacts: Math.max(0, currContacts.length - prevContacts.length),
    previousRun: previous,
  };
}

async function findLatestRunByKaspiUrl(
  kaspiUrl: string
): Promise<AnalysisRun | null> {
  seedMockStore();

  let runs: AnalysisRun[];
  if (!(await isDbAvailable())) {
    runs = mockStore.analysisRuns.getAll();
  } else {
    try {
      const rows = await prisma.analysisRun.findMany({
        where: { kaspiUrl },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      return rows[0] ? mapPrismaRun(rows[0]) : null;
    } catch {
      runs = mockStore.analysisRuns.getAll();
    }
  }

  return (
    runs
      .filter((run) => run.kaspiUrl === kaspiUrl)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] ?? null
  );
}

function dedupeRunsByKaspiUrl(runs: AnalysisRun[]): AnalysisRun[] {
  const byUrl = new Map<string, AnalysisRun>();
  for (const run of runs) {
    const existing = byUrl.get(run.kaspiUrl);
    if (
      !existing ||
      new Date(run.createdAt).getTime() > new Date(existing.createdAt).getTime()
    ) {
      byUrl.set(run.kaspiUrl, run);
    }
  }
  return Array.from(byUrl.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function applyFilters(runs: AnalysisRun[], filters: AnalysisHistoryFilters): AnalysisRun[] {
  return runs.filter((run) => {
    if (filters.dateFrom && filters.dateTo && filters.dateFrom.slice(0, 10) === filters.dateTo.slice(0, 10)) {
      if (!isIsoInDay(run.createdAt, filters.dateFrom.slice(0, 10))) return false;
    } else {
      if (filters.dateFrom && run.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && run.createdAt > `${filters.dateTo.slice(0, 10)}T23:59:59.999`) return false;
    }
    if (filters.brand && !run.productBrand?.toLowerCase().includes(filters.brand.toLowerCase())) {
      return false;
    }
    if (
      filters.category &&
      !run.productCategory?.toLowerCase().includes(filters.category.toLowerCase())
    ) {
      return false;
    }
    if (filters.country && run.bestCountry !== filters.country) return false;
    if (filters.marketplace && run.bestMarketplace !== filters.marketplace) return false;
    if (filters.roiMin != null && (run.bestRoiPercent ?? 0) < filters.roiMin) return false;
    if (filters.roiMax != null && (run.bestRoiPercent ?? 0) > filters.roiMax) return false;
    if (filters.profitMin != null && (run.bestNetProfitKzt ?? 0) < filters.profitMin) {
      return false;
    }
    if (filters.profitMax != null && (run.bestNetProfitKzt ?? 0) > filters.profitMax) {
      return false;
    }
    if (filters.status && run.status !== filters.status) return false;
    return true;
  });
}

function mapPrismaRun(row: {
  id: string;
  kaspiUrl: string;
  productId: string | null;
  status: string;
  source: string;
  productTitle: string;
  productBrand: string | null;
  productCategory: string | null;
  productImageUrl: string | null;
  kaspiPriceKzt: number;
  totalMarketplaceResults: number;
  bestCountry: string | null;
  bestMarketplace: string | null;
  bestPurchasePriceKzt: number | null;
  bestNetProfitKzt: number | null;
  bestRoiPercent: number | null;
  aiRecommendation: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AnalysisRun {
  return {
    id: row.id,
    kaspiUrl: row.kaspiUrl,
    productId: row.productId,
    status: row.status as AnalysisRun["status"],
    source: row.source,
    productTitle: row.productTitle,
    productBrand: row.productBrand,
    productCategory: row.productCategory,
    productImageUrl: row.productImageUrl,
    kaspiPriceKzt: row.kaspiPriceKzt,
    totalMarketplaceResults: row.totalMarketplaceResults,
    bestCountry: row.bestCountry,
    bestMarketplace: row.bestMarketplace,
    bestPurchasePriceKzt: row.bestPurchasePriceKzt,
    bestNetProfitKzt: row.bestNetProfitKzt,
    bestRoiPercent: row.bestRoiPercent,
    aiRecommendation: row.aiRecommendation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaRunDetail(row: {
  id: string;
  kaspiUrl: string;
  productId: string | null;
  status: string;
  source: string;
  productTitle: string;
  productBrand: string | null;
  productCategory: string | null;
  productImageUrl: string | null;
  kaspiPriceKzt: number;
  totalMarketplaceResults: number;
  bestCountry: string | null;
  bestMarketplace: string | null;
  bestPurchasePriceKzt: number | null;
  bestNetProfitKzt: number | null;
  bestRoiPercent: number | null;
  aiRecommendation: string | null;
  createdAt: Date;
  updatedAt: Date;
  snapshots: Array<{
    id: string;
    analysisRunId: string;
    snapshotType: string;
    data: unknown;
    createdAt: Date;
  }>;
}): AnalysisRunDetail {
  return {
    ...mapPrismaRun(row),
    snapshots: row.snapshots.map((s) => ({
      id: s.id,
      analysisRunId: s.analysisRunId,
      snapshotType: s.snapshotType as AnalysisSnapshotType,
      data: s.data,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export function seedMockAnalysisHistory() {
  // History is populated from real user analyses only
}
