"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecalculateProfitButtonProps {
  payload: {
    kaspiPriceKzt: number;
    purchasePrice: number;
    purchaseCurrency: string;
    country: string;
    kaspiCategory?: string | null;
    kaspiProductTitle?: string;
    correctedPrice?: number | null;
    originalPrice?: number;
  };
  onRecalculated?: (profit: {
    netProfitKzt: number;
    roiPercent: number;
    marginPercent: number;
    purchasePriceKzt: number;
  }) => void;
}

export function RecalculateProfitButton({
  payload,
  onRecalculated,
}: RecalculateProfitButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profit/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onRecalculated?.(data.data.profit);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={loading}>
      <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Пересчитать прибыль
    </Button>
  );
}
