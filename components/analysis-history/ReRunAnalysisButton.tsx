"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReRunAnalysisButtonProps {
  kaspiUrl: string;
  runId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}

export function ReRunAnalysisButton({
  kaspiUrl,
  runId,
  variant = "outline",
  size = "sm",
}: ReRunAnalysisButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis-history/re-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kaspiUrl, runId }),
      });
      const data = await res.json();

      if (data.success && data.data?.id) {
        router.push(`/analysis-history/${data.data.id}`);
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        return;
      }

      setError(data.error ?? "Не удалось повторить анализ");
    } catch {
      setError("Ошибка сети. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleReRun}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="mr-1 h-4 w-4" />
        )}
        {loading ? "Анализ…" : "Повторить анализ"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
