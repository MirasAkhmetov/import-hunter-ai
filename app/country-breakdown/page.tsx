"use client";

import { useEffect, useState, useCallback } from "react";
import { CountrySummaryCard } from "@/components/country/CountrySummaryCard";
import { CountryMarketplaceTable } from "@/components/country/CountryMarketplaceTable";
import { CountryProfitChart } from "@/components/country/CountryProfitChart";
import { CountryRoiChart } from "@/components/country/CountryRoiChart";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ExportButtons } from "@/components/ExportButtons";
import type { CountryBreakdownStats, ProductFilters } from "@/lib/types/extended";

export default function CountryBreakdownPage() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [breakdown, setBreakdown] = useState<CountryBreakdownStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "") params.set(k, String(v));
    });
    fetch(`/api/country-breakdown?${params}`)
      .then((r) => r.json())
      .then((res) => setBreakdown(res.data?.breakdown ?? []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Разбивка по странам</h1>
          <p className="text-slate-500">Анализ закупки: Турция, Китай, ОАЭ</p>
        </div>
        <ExportButtons />
      </div>

      <AdvancedFilters filters={filters} onChange={setFilters} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CountryProfitChart breakdown={breakdown} />
        <CountryRoiChart breakdown={breakdown} />
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">Загрузка...</p>
      ) : (
        <div className="space-y-6">
          {breakdown.map((stats) => (
            <div key={stats.country} className="space-y-3">
              <CountrySummaryCard stats={stats} />
              <CountryMarketplaceTable stats={stats.marketplaceStats} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
