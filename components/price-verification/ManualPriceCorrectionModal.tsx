"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { getCurrencySymbol } from "@/lib/currency";
import type { PriceSource } from "@/lib/types/priceVerification";

export interface ManualPriceCorrectionResult {
  correctedPrice: number;
  finalPrice: number;
  originalPrice?: number;
  currency: string;
  priceSource: PriceSource;
  isMockPrice: false;
}

interface ManualPriceCorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketplaceResultId: string;
  currentPrice: number;
  currency: string;
  onSaved?: (result: ManualPriceCorrectionResult) => void;
}

const CURRENCY_LABELS: Record<string, string> = {
  KZT: "Тенге (₸)",
  RUB: "Рубли (₽)",
  TRY: "Лиры (₺)",
  USD: "Доллары ($)",
  AED: "Дирхамы (AED)",
  CNY: "Юани (¥)",
  INR: "Рупии (₹)",
};

function currencyLabel(code: string): string {
  return CURRENCY_LABELS[code] ?? code;
}

export function ManualPriceCorrectionModal({
  open,
  onOpenChange,
  marketplaceResultId,
  currentPrice,
  currency,
  onSaved,
}: ManualPriceCorrectionModalProps) {
  const [correctedPrice, setCorrectedPrice] = useState(currentPrice);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyOptions = useMemo(() => {
    const options = [currency, "KZT"].filter(
      (code, index, arr) => arr.indexOf(code) === index
    );
    return options;
  }, [currency]);

  useEffect(() => {
    if (open) {
      setCorrectedPrice(currentPrice);
      setSelectedCurrency(currency);
      setError(null);
    }
  }, [open, currentPrice, currency]);

  const handleSave = async () => {
    if (!correctedPrice || correctedPrice <= 0) {
      setError("Укажите корректную цену (например 1299,99 или 1.299,99)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/price-correction/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplaceResultId,
          correctedPrice,
          currency: selectedCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }

      onSaved?.({
        correctedPrice: data.data.correctedPrice ?? correctedPrice,
        finalPrice: data.data.finalPrice ?? correctedPrice,
        originalPrice: data.data.originalPrice,
        currency: data.data.currency ?? selectedCurrency,
        priceSource: "manual_override",
        isMockPrice: false,
      });
      onOpenChange(false);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Исправить цену</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Если парсинг не сработал, введите цену вручную. При выборе{" "}
            <strong>тенге (₸)</strong> прибыль считается от этой суммы без
            пересчёта по курсу.
          </p>

          <div className="space-y-1">
            <Label htmlFor="priceCurrency">Валюта цены</Label>
            <select
              id="priceCurrency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            >
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {currencyLabel(code)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="correctedPrice">
              Закупочная цена ({getCurrencySymbol(selectedCurrency)})
            </Label>
            <NumericInput
              id="correctedPrice"
              min={0}
              step="0.01"
              value={correctedPrice}
              onChange={setCorrectedPrice}
            />
            <p className="text-xs text-slate-500">
              Форматы: 1299,99 · 1.299,99 · для ₸ — просто число в тенге
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Сохранение…" : "Сохранить и пересчитать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
