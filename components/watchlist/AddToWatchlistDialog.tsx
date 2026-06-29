"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
import { MARKETPLACE_LABELS } from "@/lib/types";
import { isMarketplaceSearchUrl } from "@/lib/price-verification/urlUtils";

export interface WatchlistItemPayload {
  productId: string;
  marketplaceResultId: string;
  title: string;
  productTitle?: string;
  marketplace: string;
  country: string;
  url?: string | null;
  currency: string;
  currentPrice: number;
  imageUrl?: string | null;
  kaspiPrice?: number;
}

interface AddToWatchlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WatchlistItemPayload | null;
  onAdded?: () => void;
}

export function AddToWatchlistDialog({
  open,
  onOpenChange,
  item,
  onAdded,
}: AddToWatchlistDialogProps) {
  const [targetPrice, setTargetPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && item) {
      setTargetPrice(item.currentPrice);
      setError(null);
      setSuccess(false);
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!item) return;
    if (!item.url || isMarketplaceSearchUrl(item.url)) {
      setError(
        "Нужна ссылка на страницу товара (не поиск). Укажите её на странице анализа через «Применить»."
      );
      return;
    }
    if (targetPrice <= 0) {
      setError("Укажите целевую цену");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          marketplaceResultId: item.marketplaceResultId,
          title: item.title,
          productTitle: item.productTitle,
          marketplace: item.marketplace,
          country: item.country,
          url: item.url,
          currentPrice: item.currentPrice,
          currentCurrency: item.currency,
          targetPurchasePrice: targetPrice,
          targetBuyPrice: targetPrice,
          buyAlertEnabled: true,
          minProfit: 0,
          minRoi: 0,
          imageUrl: item.imageUrl,
          kaspiPrice: item.kaspiPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        onAdded?.();
        setTimeout(() => onOpenChange(false), 1200);
      } else {
        setError(data.error ?? "Не удалось добавить");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const symbol = getCurrencySymbol(item.currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Добавить в Watchlist
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-slate-500">
              {MARKETPLACE_LABELS[item.marketplace] ?? item.marketplace} · текущая
              цена: {item.currentPrice.toLocaleString("ru-RU")} {symbol}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="targetPrice">
              Целевая цена ({symbol}) — уведомить, когда ≤
            </Label>
            <NumericInput
              id="targetPrice"
              value={targetPrice}
              onChange={setTargetPrice}
            />
            <p className="text-xs text-slate-500">
              Автоматически проверяем реальную цену на сайте маркетплейса
            </p>
          </div>

          {item.url && !isMarketplaceSearchUrl(item.url) ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-xs text-blue-600 underline"
            >
              {item.url}
            </a>
          ) : (
            <p className="text-xs text-amber-700">
              ⚠ Нет прямой ссылки на товар — уведомления не сработают
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-emerald-600">
              Добавлено! Уведомим, когда цена будет ≤ {targetPrice} {symbol}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={loading || success} className="w-full">
            {loading ? "Сохранение…" : "Отслеживать цену"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
