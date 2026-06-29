"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnalysisHistoryDetail } from "@/components/analysis-history/AnalysisHistoryDetail";
import type { AnalysisRunDetail, AnalysisCompareResult } from "@/lib/types/analysisHistory";

export default function AnalysisHistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = useState<AnalysisRunDetail | null>(null);
  const [comparison, setComparison] = useState<AnalysisCompareResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analysis-history/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setRun(res.data);
          setComparison(res.comparison ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!run) {
    return (
      <p className="py-20 text-center text-slate-500">Анализ не найден</p>
    );
  }

  return <AnalysisHistoryDetail run={run} comparison={comparison} />;
}
