import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { getMockCountryBreakdownData } from "../mock/countryBreakdown";
import { COUNTRY_LABELS, MARKETPLACE_LABELS } from "../types";
import { MANUAL_STATUS_LABELS } from "../types/extended";
import type { ExportRow, ManualStatus } from "../types/extended";

function mapMockToExport(): ExportRow[] {
  return getMockCountryBreakdownData().map((item) => ({
    kaspiTitle: item.productTitle,
    country: COUNTRY_LABELS[item.country] ?? item.country,
    marketplace: MARKETPLACE_LABELS[item.marketplace] ?? item.marketplace,
    foundTitle: item.title,
    purchasePrice: item.purchasePriceKzt,
    priceKzt: item.purchasePriceKzt,
    delivery: item.deliveryCostKzt,
    totalCost: item.purchasePriceKzt + item.deliveryCostKzt,
    kaspiSalePrice: 129990,
    netProfit: item.netProfitKzt,
    marginPercent: (item.netProfitKzt / 129990) * 100,
    roiPercent: item.roiPercent,
    matchScore: item.matchScore,
    riskScore: item.riskScore,
    manualStatus:
      MANUAL_STATUS_LABELS[item.manualStatus as ManualStatus] ??
      item.manualStatus,
    url: `https://example.com/${item.marketplace}/${item.id}`,
  }));
}

export async function getExportData(): Promise<ExportRow[]> {
  if (!(await isDbAvailable())) {
    return mapMockToExport();
  }

  try {
    const results = await prisma.marketplaceResult.findMany({
      include: {
        product: true,
        profitAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return results
      .filter((r) => r.profitAnalyses.length > 0)
      .map((r) => {
        const p = r.profitAnalyses[0];
        return {
          kaspiTitle: r.product.title,
          country: COUNTRY_LABELS[r.country] ?? r.country,
          marketplace: MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace,
          foundTitle: r.title,
          purchasePrice: p.purchasePriceKzt,
          priceKzt: p.purchasePriceKzt,
          delivery: p.deliveryCostKzt,
          totalCost: p.totalCostKzt,
          kaspiSalePrice: p.kaspiPriceKzt,
          netProfit: p.netProfitKzt,
          marginPercent: p.marginPercent,
          roiPercent: p.roiPercent,
          matchScore: r.matchScore,
          riskScore: r.riskScore,
          manualStatus:
            MANUAL_STATUS_LABELS[r.manualStatus as ManualStatus] ??
            r.manualStatus,
          url: r.url,
        };
      });
  } catch {
    return mapMockToExport();
  }
}

const CSV_HEADERS = [
  "Kaspi товар",
  "Страна",
  "Маркетплейс",
  "Найденный товар",
  "Цена закупки",
  "Цена KZT",
  "Доставка",
  "Себестоимость",
  "Цена Kaspi",
  "Чистая прибыль",
  "Маржа %",
  "ROI %",
  "Match score",
  "Risk score",
  "Статус проверки",
  "Ссылка",
];

function rowToArray(row: ExportRow): (string | number)[] {
  return [
    row.kaspiTitle,
    row.country,
    row.marketplace,
    row.foundTitle,
    row.purchasePrice,
    row.priceKzt,
    row.delivery,
    row.totalCost,
    row.kaspiSalePrice,
    row.netProfit,
    row.marginPercent.toFixed(1),
    row.roiPercent.toFixed(1),
    row.matchScore,
    row.riskScore,
    row.manualStatus,
    row.url,
  ];
}

export async function exportToCsv(): Promise<string> {
  const data = await getExportData();
  const lines = [
    CSV_HEADERS.join(";"),
    ...data.map((row) =>
      rowToArray(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export async function exportToXlsxBuffer(): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const data = await getExportData();
  const sheetData = [CSV_HEADERS, ...data.map((row) => rowToArray(row))];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ImportHunter");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
