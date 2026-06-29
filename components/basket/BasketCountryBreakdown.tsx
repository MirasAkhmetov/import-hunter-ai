"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRY_LABELS } from "@/lib/types";
import { formatKzt, formatPercent } from "@/lib/utils";
import type { BasketCountrySummary } from "@/lib/types/extended";

interface BasketCountryBreakdownProps {
  byCountry: BasketCountrySummary[];
}

export function BasketCountryBreakdown({ byCountry }: BasketCountryBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Разбивка по странам</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {byCountry.map((c) => (
            <div key={c.country} className="rounded-lg border p-4">
              <h4 className="font-semibold">{COUNTRY_LABELS[c.country] ?? c.country}</h4>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Товаров" value={String(c.itemCount)} />
                <Row label="Закупка" value={formatKzt(c.totalPurchase)} />
                <Row label="Доставка" value={formatKzt(c.totalDelivery)} />
                <Row label="Себестоимость" value={formatKzt(c.totalCost)} />
                <Row label="Выручка" value={formatKzt(c.totalRevenue)} />
                <Row label="Прибыль" value={formatKzt(c.netProfit)} highlight />
                <Row label="ROI" value={formatPercent(c.roiPercent)} />
              </dl>
            </div>
          ))}
          {byCountry.length === 0 && (
            <p className="text-slate-400 col-span-3 text-center py-4">Нет товаров в корзине</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={highlight ? "font-semibold text-emerald-600" : "font-medium"}>
        {value}
      </dd>
    </div>
  );
}
