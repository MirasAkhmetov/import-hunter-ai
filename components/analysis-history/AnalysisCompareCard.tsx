"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatKzt, formatPercent } from "@/lib/utils";
import type { AnalysisCompareResult } from "@/lib/types/analysisHistory";

interface AnalysisCompareCardProps {
  comparison: AnalysisCompareResult;
}

function ChangeRow({
  label,
  changed,
  diff,
  format,
}: {
  label: string;
  changed: boolean;
  diff: number;
  format: (v: number) => string;
}) {
  if (!changed) return null;
  const sign = diff > 0 ? "+" : "";
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className={diff >= 0 ? "text-emerald-600" : "text-red-600"}>
        {sign}
        {format(diff)}
      </span>
    </div>
  );
}

export function AnalysisCompareCard({ comparison }: AnalysisCompareCardProps) {
  const hasChanges =
    comparison.kaspiPriceChanged ||
    comparison.purchasePriceChanged ||
    comparison.profitChanged ||
    comparison.roiChanged ||
    comparison.bestMarketplaceChanged ||
    comparison.newBrandContacts > 0;

  if (!hasChanges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сравнение с предыдущим анализом</CardTitle>
          <CardDescription>Изменений не обнаружено</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-base">Сравнение с предыдущим анализом</CardTitle>
        {comparison.previousRun && (
          <CardDescription>
            Предыдущий: {new Date(comparison.previousRun.createdAt).toLocaleString("ru-RU")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <ChangeRow
          label="Цена Kaspi"
          changed={comparison.kaspiPriceChanged}
          diff={comparison.kaspiPriceDiff}
          format={formatKzt}
        />
        <ChangeRow
          label="Закупочная цена"
          changed={comparison.purchasePriceChanged}
          diff={comparison.purchasePriceDiff}
          format={formatKzt}
        />
        <ChangeRow
          label="Чистая прибыль"
          changed={comparison.profitChanged}
          diff={comparison.profitDiff}
          format={formatKzt}
        />
        <ChangeRow
          label="ROI"
          changed={comparison.roiChanged}
          diff={comparison.roiDiff}
          format={(v) => formatPercent(v)}
        />
        {comparison.bestMarketplaceChanged && (
          <div className="flex justify-between text-sm">
            <span>Лучший маркетплейс</span>
            <span>
              {comparison.previousBestMarketplace} → {comparison.currentBestMarketplace}
            </span>
          </div>
        )}
        {comparison.newBrandContacts > 0 && (
          <div className="flex justify-between text-sm">
            <span>Новые контакты брендов</span>
            <span className="text-emerald-600">+{comparison.newBrandContacts}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
