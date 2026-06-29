"use client";

import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_LABELS, COUNTRY_LABELS } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currency";
import { isMarketplaceSearchUrl } from "@/lib/price-verification/urlUtils";
import {
  AddToWatchlistDialog,
  type WatchlistItemPayload,
} from "@/components/watchlist/AddToWatchlistDialog";
import type { MarketplaceResultData, ProfitAnalysisResult } from "@/lib/types";

interface HistoryWatchlistSectionProps {
  productId: string;
  productTitle: string;
  kaspiPrice?: number;
  results: Array<
    MarketplaceResultData & {
      id: string;
      profit: ProfitAnalysisResult;
    }
  >;
}

export function HistoryWatchlistSection({
  productId,
  productTitle,
  kaspiPrice,
  results,
}: HistoryWatchlistSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WatchlistItemPayload | null>(null);

  const openDialog = (
    r: MarketplaceResultData & { id: string; profit: ProfitAnalysisResult }
  ) => {
    setSelected({
      productId,
      marketplaceResultId: r.id,
      title: r.title,
      productTitle,
      marketplace: r.marketplace,
      country: r.country,
      url: r.url,
      currency: r.currency,
      currentPrice: r.finalPrice ?? r.correctedPrice ?? r.price,
      imageUrl: r.imageUrl,
      kaspiPrice,
    });
    setDialogOpen(true);
  };

  if (results.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Watchlist — отслеживание цены
          </CardTitle>
          <p className="text-sm text-slate-500">
            Выберите товар и укажите целевую цену. При снижении придёт
            уведомление со ссылкой и датой проверки.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.slice(0, 12).map((r) => {
            const price = r.finalPrice ?? r.correctedPrice ?? r.price;
            const hasProductUrl = r.url && !isMarketplaceSearchUrl(r.url);
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace}
                    </Badge>
                    <Badge variant="secondary">
                      {COUNTRY_LABELS[r.country as keyof typeof COUNTRY_LABELS] ??
                        r.country}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {price.toLocaleString("ru-RU")}{" "}
                      {getCurrencySymbol(r.currency)}
                    </span>
                    {!hasProductUrl && (
                      <Badge variant="danger">Нужна ссылка на товар</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasProductUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Товар
                      </a>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openDialog(r)}>
                    <Bell className="mr-1 h-3 w-3" />
                    Watchlist
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AddToWatchlistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selected}
      />
    </>
  );
}
