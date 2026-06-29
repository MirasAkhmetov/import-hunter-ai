"use client";

import { MARKETPLACE_LABELS } from "@/lib/types";
import { formatKzt, formatPercent } from "@/lib/utils";
import type { MarketplaceCountryStat } from "@/lib/types/extended";

interface CountryMarketplaceTableProps {
  stats: MarketplaceCountryStat[];
}

export function CountryMarketplaceTable({ stats }: CountryMarketplaceTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="px-4 py-2 text-left font-medium">Маркетплейс</th>
            <th className="px-4 py-2 text-left font-medium">Товаров</th>
            <th className="px-4 py-2 text-left font-medium">Ср. закупка</th>
            <th className="px-4 py-2 text-left font-medium">Ср. прибыль</th>
            <th className="px-4 py-2 text-left font-medium">Ср. ROI</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.marketplace} className="border-b">
              <td className="px-4 py-2">{MARKETPLACE_LABELS[s.marketplace] ?? s.marketplace}</td>
              <td className="px-4 py-2">{s.itemCount}</td>
              <td className="px-4 py-2">{formatKzt(s.avgPurchasePrice)}</td>
              <td className="px-4 py-2">{formatKzt(s.avgProfit)}</td>
              <td className="px-4 py-2">{formatPercent(s.avgRoi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
