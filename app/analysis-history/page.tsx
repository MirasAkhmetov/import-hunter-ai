"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { AnalysisHistoryTable } from "@/components/analysis-history/AnalysisHistoryTable";
import type { AnalysisRun } from "@/lib/types/analysisHistory";

export default function AnalysisHistoryPage() {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const loadRuns = useCallback(async () => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`/api/analysis-history?${params}`);
    const data = await res.json();
    if (data.success) setRuns(data.data);
  }, [filters]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleFilterChange = (partial: Record<string, string>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <History className="h-6 w-6" />
          История анализов
        </h1>
        <p className="text-slate-500">
          Все запуски анализа с сохранёнными snapshot-данными
        </p>
      </div>

      <AnalysisHistoryTable
        runs={runs}
        onFilterChange={handleFilterChange}
        onDeleted={(id) => setRuns((prev) => prev.filter((run) => run.id !== id))}
      />
    </div>
  );
}
