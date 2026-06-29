"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MARKETPLACE_LABELS } from "@/lib/types";
import { formatKzt, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types/analysisResult";

type ResultItem = AnalysisResult["marketplaceResults"][number];

interface TurkeyResultsBreakdownProps {
  results: ResultItem[];
  activeMarketplace?: string;
  onMarketplaceSelect?: (marketplaceId: string, country?: string) => void;
}

export function TurkeyResultsBreakdown({
  results,
  activeMarketplace = "all",
  onMarketplaceSelect,
}: TurkeyResultsBreakdownProps) {
  const turkeyResults = results.filter((item) => item.country === "TR");
  if (turkeyResults.length === 0) return null;

  const byMarketplace = new Map<string, ResultItem[]>();
  for (const item of turkeyResults) {
    const list = byMarketplace.get(item.marketplace) ?? [];
    list.push(item);
    byMarketplace.set(item.marketplace, list);
  }

  const avg = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const bestByRoi = [...turkeyResults].sort(
    (a, b) => b.profit.roiPercent - a.profit.roiPercent
  )[0];
  const bestByProfit = [...turkeyResults].sort(
    (a, b) => b.profit.netProfitKzt - a.profit.netProfitKzt
  )[0];

  return (
    <Card className="border-red-100 bg-red-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Турция — сводка</CardTitle>
        <p className="text-sm text-slate-600">
          Найдено {turkeyResults.length} товаров на {byMarketplace.size} маркетплейсах
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-2 text-left font-medium">Маркетплейс</th>
                <th className="px-3 py-2 text-left font-medium">Товаров</th>
                <th className="px-3 py-2 text-left font-medium">Ср. цена</th>
                <th className="px-3 py-2 text-left font-medium">Ср. ROI</th>
              </tr>
            </thead>
            <tbody>
              {[...byMarketplace.entries()].map(([marketplace, items]) => (
                <tr key={marketplace} className="border-b">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onMarketplaceSelect?.(marketplace, "TR")}
                      className={cn(
                        "text-left font-medium transition-colors hover:text-blue-600 hover:underline",
                        activeMarketplace === marketplace && "text-blue-700"
                      )}
                    >
                      {MARKETPLACE_LABELS[marketplace] ?? marketplace}
                    </button>
                  </td>
                  <td className="px-3 py-2">{items.length}</td>
                  <td className="px-3 py-2">
                    {formatKzt(avg(items.map((item) => item.profit.purchasePriceKzt)))}
                  </td>
                  <td className="px-3 py-2">
                    {formatPercent(avg(items.map((item) => item.profit.roiPercent)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {bestByProfit && (
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs font-medium text-emerald-800">Лучший по прибыли</p>
              <p className="mt-1 text-sm font-semibold line-clamp-1">{bestByProfit.title}</p>
              <p className="text-sm text-emerald-700">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() =>
                    onMarketplaceSelect?.(bestByProfit.marketplace, "TR")
                  }
                >
                  {MARKETPLACE_LABELS[bestByProfit.marketplace]}
                </button>
                {" · "}
                {formatKzt(bestByProfit.profit.netProfitKzt)}
              </p>
            </div>
          )}
          {bestByRoi && (
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs font-medium text-blue-800">Лучший по ROI</p>
              <p className="mt-1 text-sm font-semibold line-clamp-1">{bestByRoi.title}</p>
              <p className="text-sm text-blue-700">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => onMarketplaceSelect?.(bestByRoi.marketplace, "TR")}
                >
                  {MARKETPLACE_LABELS[bestByRoi.marketplace]}
                </button>
                {" · "}
                {formatPercent(bestByRoi.profit.roiPercent)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
