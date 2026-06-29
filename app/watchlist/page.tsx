"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertStatusBadge } from "@/components/alerts/BuyAlertComponents";
import { getCurrencySymbol } from "@/lib/currency";
import { formatKzt, formatPercent } from "@/lib/utils";
import { COUNTRY_LABELS, MARKETPLACE_LABELS, DEFAULT_SETTINGS } from "@/lib/types";
import type { AppSettings } from "@/lib/types";
import { WATCHLIST_STATUS_LABELS } from "@/lib/types/extended";
import type { WatchlistItemData } from "@/lib/types/extended";
import { computeWatchlistMetricsAtTarget, isCalculatorWatchlistItem } from "@/lib/watchlist/watchlistProfit";
import { Pause, Play, Trash2, Pencil, Check, X } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItemData[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState(0);

  const load = useCallback(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((res) => setItems(res.data ?? []));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAppSettings(res.data);
      })
      .catch(() => {});
  }, [load]);

  const action = async (actionName: string, id: string) => {
    if (actionName === "remove") {
      await fetch("/api/watchlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } else {
      await fetch("/api/watchlist/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: actionName === "pause" ? "paused" : "active",
          alertStatus: actionName === "pause" ? "paused" : "active",
        }),
      });
    }
    load();
  };

  const startEditGoal = (item: WatchlistItemData) => {
    setEditingGoalId(item.id);
    setGoalDraft(item.targetBuyPrice ?? item.currentPrice);
  };

  const saveGoal = async (item: WatchlistItemData) => {
    const metrics = computeWatchlistMetricsAtTarget(
      { ...item, targetBuyPrice: goalDraft },
      appSettings,
      goalDraft
    );
    await fetch("/api/watchlist/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        targetBuyPrice: goalDraft,
        targetPurchasePrice: goalDraft,
        purchasePriceKzt: metrics.purchasePriceKzt,
        netProfitKzt: metrics.netProfitKzt,
        roiPercent: metrics.roiPercent,
        marginPercent: metrics.marginPercent,
        minProfit: metrics.netProfitKzt,
        minRoi: metrics.roiPercent,
      }),
    });
    setEditingGoalId(null);
    load();
  };

  const metricsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeWatchlistMetricsAtTarget>>();
    for (const item of items) {
      const override =
        editingGoalId === item.id ? goalDraft : undefined;
      map.set(
        item.id,
        computeWatchlistMetricsAtTarget(item, appSettings, override)
      );
    }
    return map;
  }, [items, appSettings, editingGoalId, goalDraft]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-slate-500">
          Прибыль и ROI пересчитываются от{" "}
          <strong>целевой цены закупки</strong>
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-slate-400">
          Нет товаров в отслеживании. Добавьте из{" "}
          <Link href="/analysis-history" className="text-blue-600 underline">
            истории анализов
          </Link>{" "}
          или{" "}
          <Link href="/calculator" className="text-blue-600 underline">
            калькулятора
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const metrics = metricsById.get(item.id)!;
            const currencySymbol = getCurrencySymbol(item.currentCurrency);
            const fromCalculator = isCalculatorWatchlistItem(item);

            return (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.productTitle && item.productTitle !== item.title && (
                        <p className="text-sm text-slate-500">{item.productTitle}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {MARKETPLACE_LABELS[item.marketplace] ?? item.marketplace}
                        </Badge>
                        <Badge variant="secondary">
                          {COUNTRY_LABELS[item.country] ?? item.country}
                        </Badge>
                        <Badge variant="outline">
                          {WATCHLIST_STATUS_LABELS[item.status]}
                        </Badge>
                        {item.buyAlertEnabled && (
                          <AlertStatusBadge status={item.alertStatus} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-1 text-right text-sm sm:grid-cols-2 sm:gap-x-6">
                    {item.kaspiPrice != null && item.kaspiPrice > 0 && (
                      <p className="text-slate-600">
                        {fromCalculator ? "Продажа (план)" : "Kaspi"}:{" "}
                        <strong>{formatKzt(item.kaspiPrice)}</strong>
                      </p>
                    )}
                    {fromCalculator && item.landedCostKzt != null && (
                      <p className="text-slate-600">
                        Себестоимость в Алматы:{" "}
                        <strong>{formatKzt(metrics.purchasePriceKzt)}</strong>
                      </p>
                    )}
                    {!fromCalculator && metrics.purchasePriceKzt > 0 && (
                      <p className="text-slate-600">
                        Закупка (цель):{" "}
                        <strong>{formatKzt(metrics.purchasePriceKzt)}</strong>
                        {item.currentCurrency !== "KZT" && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({metrics.targetPriceForeign.toLocaleString("ru-RU")}{" "}
                            {currencySymbol})
                          </span>
                        )}
                      </p>
                    )}
                    <p
                      className={
                        metrics.netProfitKzt >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }
                    >
                      Прибыль:{" "}
                      <strong>{formatKzt(metrics.netProfitKzt)}</strong>
                    </p>
                    <p className="text-blue-600">
                      ROI: <strong>{formatPercent(metrics.roiPercent)}</strong>
                    </p>
                    {metrics.marginPercent !== 0 && (
                      <p className="text-slate-600">
                        Маржа:{" "}
                        <strong>{formatPercent(metrics.marginPercent)}</strong>
                      </p>
                    )}
                    <p className="text-slate-500">
                      Сейчас:{" "}
                      <strong>
                        {item.currentPrice.toLocaleString("ru-RU")}{" "}
                        {currencySymbol}
                      </strong>
                    </p>
                    {editingGoalId === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <NumericInput
                          value={goalDraft}
                          onChange={setGoalDraft}
                          className="h-8 w-24 text-right text-sm"
                        />
                        <span className="text-slate-500">{currencySymbol}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => saveGoal(item)}
                        >
                          <Check className="h-3 w-3 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingGoalId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="flex items-center justify-end gap-1 font-medium text-indigo-700">
                        Цель:{" "}
                        <strong>
                          {metrics.targetPriceForeign.toLocaleString("ru-RU")}{" "}
                          {currencySymbol}
                        </strong>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEditGoal(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </p>
                    )}
                  </div>
                </div>

                {metrics.targetPriceForeign !== item.currentPrice && (
                  <p className="mt-2 text-xs text-indigo-600">
                    Расчёт по целевой цене{" "}
                    {metrics.targetPriceForeign.toLocaleString("ru-RU")}{" "}
                    {currencySymbol}
                    {item.currentPrice > metrics.targetPriceForeign
                      ? " (ниже текущей — выгоднее)"
                      : " (выше текущей)"}
                  </p>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-blue-600 underline"
                  >
                    Ссылка на товар
                  </a>
                )}

                <p className="mt-1 text-xs text-slate-400">
                  Проверено:{" "}
                  {new Date(item.lastCheckedAt).toLocaleString("ru-RU")}
                </p>

                {item.comment && (
                  <p className="mt-2 text-sm text-slate-600">{item.comment}</p>
                )}

                <div className="mt-3 flex gap-2">
                  {item.status === "paused" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => action("resume", item.id)}
                    >
                      <Play className="h-3 w-3" /> Возобновить
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => action("pause", item.id)}
                    >
                      <Pause className="h-3 w-3" /> Приостановить
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => action("remove", item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" /> Удалить
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
