"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AnalysisStatus } from "@/lib/types";
import { ANALYSIS_STATUS_LABELS } from "@/lib/types";

interface LoadingProgressProps {
  status: AnalysisStatus;
  currentLabel?: string;
  progress: number;
  error?: string | null;
}

export function LoadingProgress({
  status,
  currentLabel,
  progress,
  error,
}: LoadingProgressProps) {
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {isFailed ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            <div>
              <p className="font-medium text-slate-900">
                {error ?? currentLabel ?? ANALYSIS_STATUS_LABELS[status]}
              </p>
              {!isFailed && !isCompleted && (
                <p className="text-sm text-slate-500">
                  Анализируем маркетплейсы Турции и ОАЭ...
                </p>
              )}
            </div>
          </div>

          {!isFailed && (
            <Progress value={isCompleted ? 100 : progress} className="h-2" />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-3">
            {[
              { key: "parsing_kaspi", label: "Kaspi" },
              { key: "searching_marketplaces", label: "Маркетплейсы" },
              { key: "matching_products", label: "Сопоставление" },
              { key: "calculating_profit", label: "Прибыль" },
            ].map((step) => {
              const stepOrder = [
                "parsing_kaspi",
                "searching_marketplaces",
                "matching_products",
                "calculating_profit",
                "completed",
              ];
              const currentIndex = stepOrder.indexOf(status);
              const stepIndex = stepOrder.indexOf(step.key as AnalysisStatus);
              const isDone = currentIndex > stepIndex || isCompleted;
              const isCurrent = status === step.key;

              return (
                <div
                  key={step.key}
                  className={`rounded-md px-2 py-1.5 ${
                    isDone
                      ? "bg-emerald-50 text-emerald-700"
                      : isCurrent
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-50"
                  }`}
                >
                  {isDone ? "✓" : isCurrent ? "→" : "○"} {step.label}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
