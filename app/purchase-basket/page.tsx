"use client";

import { useEffect, useState, useCallback } from "react";
import { BasketItemTable } from "@/components/basket/BasketItemTable";
import { BasketSummaryCard } from "@/components/basket/BasketSummaryCard";
import { BasketCountryBreakdown } from "@/components/basket/BasketCountryBreakdown";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ExportButtons } from "@/components/ExportButtons";
import type { ProductFilters } from "@/lib/types/extended";
import type { BasketSummary } from "@/lib/basket/basketCalculator";
import type { BasketItemRow } from "@/components/basket/BasketItemTable";

export default function PurchaseBasketPage() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [items, setItems] = useState<BasketItemRow[]>([]);
  const [summary, setSummary] = useState<BasketSummary | null>(null);

  const load = useCallback(() => {
    fetch("/api/basket")
      .then((r) => r.json())
      .then((res) => {
        let basketItems = res.data?.items ?? [];
        if (filters.country) {
          basketItems = basketItems.filter(
            (i: BasketItemRow) => i.country === filters.country
          );
        }
        if (filters.marketplace) {
          basketItems = basketItems.filter(
            (i: BasketItemRow) => i.marketplace === filters.marketplace
          );
        }
        setItems(basketItems);
        setSummary(res.data?.summary ?? null);
      });
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Корзина закупки</h1>
          <p className="text-slate-500">Планирование закупки и расчёт прибыли</p>
        </div>
        <ExportButtons />
      </div>

      <AdvancedFilters filters={filters} onChange={setFilters} showManualStatus={false} />

      {summary && <BasketSummaryCard summary={summary} />}
      <BasketItemTable items={items} onUpdate={load} />
      {summary && <BasketCountryBreakdown byCountry={summary.byCountry} />}
    </div>
  );
}
