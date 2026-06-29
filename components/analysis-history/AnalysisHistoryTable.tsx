"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKzt, formatPercent } from "@/lib/utils";
import { MARKETPLACE_LABELS, COUNTRY_LABELS } from "@/lib/types";
import { ReRunAnalysisButton } from "./ReRunAnalysisButton";
import { DeleteAnalysisButton } from "./DeleteAnalysisButton";
import { AddToWatchlistFromHistoryButton } from "./AddToWatchlistFromHistoryButton";
import type { AnalysisRun } from "@/lib/types/analysisHistory";

interface AnalysisHistoryTableProps {
  runs: AnalysisRun[];
  onFilterChange?: (filters: Record<string, string>) => void;
  onDeleted?: (id: string) => void;
}

export function AnalysisHistoryTable({
  runs,
  onFilterChange,
  onDeleted,
}: AnalysisHistoryTableProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: "brand", label: "Бренд" },
            { key: "category", label: "Категория" },
            { key: "country", label: "Страна" },
            { key: "marketplace", label: "Маркетплейс" },
            { key: "dateFrom", label: "Дата от", type: "date" },
            { key: "dateTo", label: "Дата до", type: "date" },
            { key: "roiMin", label: "ROI от" },
            { key: "profitMin", label: "Прибыль от" },
          ].map((field) => (
            <div key={field.key} className="space-y-1">
              <Label>{field.label}</Label>
              <Input
                type={field.type ?? "text"}
                onChange={(e) =>
                  onFilterChange?.({ [field.key]: e.target.value })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Дата</th>
              <th className="p-3">Фото</th>
              <th className="p-3">Товар</th>
              <th className="p-3">Бренд</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Kaspi</th>
              <th className="p-3">Аналогов</th>
              <th className="p-3">Страна</th>
              <th className="p-3">Маркетплейс</th>
              <th className="p-3">Закупка</th>
              <th className="p-3">Прибыль</th>
              <th className="p-3">ROI</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="p-3 whitespace-nowrap">
                  {new Date(run.createdAt).toLocaleString("ru-RU")}
                </td>
                <td className="p-3">
                  {run.productImageUrl ? (
                    <Image
                      src={run.productImageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-100" />
                  )}
                </td>
                <td className="max-w-[200px] truncate p-3 font-medium">
                  {run.productTitle}
                </td>
                <td className="p-3">{run.productBrand ?? "—"}</td>
                <td className="p-3">{run.productCategory ?? "—"}</td>
                <td className="p-3">{formatKzt(run.kaspiPriceKzt)}</td>
                <td className="p-3">{run.totalMarketplaceResults}</td>
                <td className="p-3">
                  {run.bestCountry
                    ? COUNTRY_LABELS[run.bestCountry as keyof typeof COUNTRY_LABELS] ??
                      run.bestCountry
                    : "—"}
                </td>
                <td className="p-3">
                  {run.bestMarketplace
                    ? MARKETPLACE_LABELS[run.bestMarketplace] ?? run.bestMarketplace
                    : "—"}
                </td>
                <td className="p-3">
                  {run.bestPurchasePriceKzt != null
                    ? formatKzt(run.bestPurchasePriceKzt)
                    : "—"}
                </td>
                <td className="p-3 text-emerald-600">
                  {run.bestNetProfitKzt != null
                    ? formatKzt(run.bestNetProfitKzt)
                    : "—"}
                </td>
                <td className="p-3">
                  {run.bestRoiPercent != null
                    ? formatPercent(run.bestRoiPercent)
                    : "—"}
                </td>
                <td className="p-3">
                  <Badge
                    variant={run.status === "completed" ? "success" : "danger"}
                  >
                    {run.status === "completed" ? "Готово" : run.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <AddToWatchlistFromHistoryButton runId={run.id} />
                    <ReRunAnalysisButton kaspiUrl={run.kaspiUrl} runId={run.id} />
                    <DeleteAnalysisButton id={run.id} onDeleted={onDeleted} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <p className="py-12 text-center text-slate-400">
            История анализов пуста. Запустите анализ на странице /analyze
          </p>
        )}
      </div>
    </div>
  );
}
