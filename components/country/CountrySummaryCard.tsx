"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKzt, formatPercent } from "@/lib/utils";
import { MARKETPLACE_LABELS } from "@/lib/types";
import type { CountryBreakdownStats } from "@/lib/types/extended";

interface CountrySummaryCardProps {
  stats: CountryBreakdownStats;
}

export function CountrySummaryCard({ stats }: CountrySummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{stats.countryLabel}</CardTitle>
          <Badge variant="secondary">{stats.itemCount} товаров</Badge>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {stats.marketplaces.map((mp) => (
            <Badge key={mp} variant="outline" className="text-xs">
              {MARKETPLACE_LABELS[mp] ?? mp}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ср. закупка" value={formatKzt(stats.avgPurchasePrice)} />
          <Stat label="Ср. доставка" value={formatKzt(stats.avgDelivery)} />
          <Stat label="Ср. прибыль" value={formatKzt(stats.avgNetProfit)} />
          <Stat label="Ср. ROI" value={formatPercent(stats.avgRoi)} />
          <Stat label="ROI > 40%" value={String(stats.highRoiCount)} />
          <Stat label="Низкий риск" value={String(stats.lowRiskCount)} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {stats.bestByProfit && (
            <div className="rounded-lg border bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-800">Лучший по прибыли</p>
              <p className="mt-1 text-sm font-semibold line-clamp-1">{stats.bestByProfit.title}</p>
              <p className="text-sm text-emerald-700">{formatKzt(stats.bestByProfit.netProfit)}</p>
            </div>
          )}
          {stats.bestByRoi && (
            <div className="rounded-lg border bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800">Лучший по ROI</p>
              <p className="mt-1 text-sm font-semibold line-clamp-1">{stats.bestByRoi.title}</p>
              <p className="text-sm text-blue-700">{formatPercent(stats.bestByRoi.roiPercent)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}
