"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKzt, formatPercent } from "@/lib/utils";
import type { BasketSummary } from "@/lib/basket/basketCalculator";

interface BasketSummaryCardProps {
  summary: BasketSummary;
}

export function BasketSummaryCard({ summary }: BasketSummaryCardProps) {
  const items = [
    { label: "Позиций", value: String(summary.totalItems) },
    { label: "Количество", value: String(summary.totalQuantity) },
    { label: "Закупка", value: formatKzt(summary.totalPurchase) },
    { label: "Доставка", value: formatKzt(summary.totalDelivery) },
    { label: "Расходы", value: formatKzt(summary.totalExtraCosts) },
    { label: "Себестоимость", value: formatKzt(summary.totalCost) },
    { label: "Выручка", value: formatKzt(summary.totalRevenue) },
    { label: "Прибыль", value: formatKzt(summary.netProfit), highlight: true },
    { label: "Ср. маржа", value: formatPercent(summary.avgMargin) },
    { label: "Ср. ROI", value: formatPercent(summary.avgRoi) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Итого по корзине</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg p-3 ${item.highlight ? "bg-emerald-50" : "bg-slate-50"}`}
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`font-bold ${item.highlight ? "text-emerald-600" : ""}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
