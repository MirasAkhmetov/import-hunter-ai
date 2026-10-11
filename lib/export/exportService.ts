import { getAnalysisItems } from "../store/analysisItems";
import { COUNTRY_LABELS, MARKETPLACE_LABELS } from "../types";
import { MANUAL_STATUS_LABELS } from "../types/extended";
import type { ExportRow, ManualStatus } from "../types/extended";

async function mapAnalysisItemsToExport(): Promise<ExportRow[]> {
  return (await getAnalysisItems()).map((item) => ({
    kaspiTitle: item.productTitle,
    country: COUNTRY_LABELS[item.country] ?? item.country,
    marketplace: MARKETPLACE_LABELS[item.marketplace] ?? item.marketplace,
    foundTitle: item.title,
    purchasePrice: item.purchasePriceKzt,
    priceKzt: item.purchasePriceKzt,
    delivery: item.deliveryCostKzt,
    totalCost: item.totalCostKzt,
    kaspiSalePrice: item.kaspiPriceKzt,
    netProfit: item.netProfitKzt,
    marginPercent: item.marginPercent,
    roiPercent: item.roiPercent,
    matchScore: item.matchScore,
    riskScore: item.riskScore,
    manualStatus:
      MANUAL_STATUS_LABELS[item.manualStatus as ManualStatus] ??
      item.manualStatus,
    url: item.url ?? "",
  }));
}

export async function getExportData(): Promise<ExportRow[]> {
  return mapAnalysisItemsToExport();
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
