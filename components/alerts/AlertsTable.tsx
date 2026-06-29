"use client";

import { COUNTRY_LABELS, MARKETPLACE_LABELS } from "@/lib/types";

import { getCurrencySymbol } from "@/lib/currency";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import type { AlertNotificationData } from "@/lib/types/extended";

import { ExternalLink } from "lucide-react";



interface AlertsTableProps {

  alerts: AlertNotificationData[];

  onAction: (action: string, id: string, watchlistItemId?: string) => void;

}



function formatPrice(amount: number | null | undefined, currency?: string | null) {

  if (amount == null) return "—";

  const sym = currency ? getCurrencySymbol(currency) : "₸";

  return `${amount.toLocaleString("ru-RU")} ${sym}`;

}



export function AlertsTable({ alerts, onAction }: AlertsTableProps) {

  if (alerts.length === 0) {

    return (

      <div className="rounded-xl border border-dashed p-12 text-center text-slate-400">

        Нет уведомлений. Добавьте товар в Watchlist из истории анализов.

      </div>

    );

  }



  return (

    <div className="overflow-x-auto rounded-xl border">

      <table className="w-full text-sm">

        <thead>

          <tr className="border-b bg-slate-50">

            <th className="px-4 py-3 text-left">Товар</th>

            <th className="px-4 py-3 text-left">МП</th>

            <th className="px-4 py-3 text-left">Было</th>

            <th className="px-4 py-3 text-left">Сейчас</th>

            <th className="px-4 py-3 text-left">Цель</th>

            <th className="px-4 py-3 text-left">Дата цены</th>

            <th className="px-4 py-3 text-left">Ссылка</th>

            <th className="px-4 py-3 text-left">Статус</th>

            <th className="px-4 py-3 text-left">Действия</th>

          </tr>

        </thead>

        <tbody>

          {alerts.map((alert) => (

            <tr key={alert.id} className="border-b hover:bg-slate-50/50">

              <td className="px-4 py-3">

                <div>

                  <p className="font-medium">{alert.title}</p>

                  <p className="text-xs text-slate-500">{alert.productTitle}</p>

                  <p className="mt-1 text-xs text-slate-600">{alert.message}</p>

                </div>

              </td>

              <td className="px-4 py-3">

                {MARKETPLACE_LABELS[alert.marketplace ?? ""] ?? alert.marketplace}

                <br />

                <span className="text-xs text-slate-400">

                  {COUNTRY_LABELS[alert.country as keyof typeof COUNTRY_LABELS] ??

                    alert.country}

                </span>

              </td>

              <td className="px-4 py-3">

                {formatPrice(alert.oldPrice, alert.currentCurrency)}

              </td>

              <td className="px-4 py-3 font-semibold text-emerald-700">

                {formatPrice(alert.currentPrice, alert.currentCurrency)}

              </td>

              <td className="px-4 py-3">

                {formatPrice(alert.targetPrice, alert.currentCurrency)}

              </td>

              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">

                {alert.priceCheckedAt

                  ? new Date(alert.priceCheckedAt).toLocaleString("ru-RU")

                  : new Date(alert.createdAt).toLocaleString("ru-RU")}

              </td>

              <td className="px-4 py-3">

                {alert.productUrl ? (

                  <a

                    href={alert.productUrl}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="inline-flex items-center gap-1 text-blue-600 underline"

                  >

                    <ExternalLink className="h-3 w-3" />

                    Товар

                  </a>

                ) : (

                  "—"

                )}

              </td>

              <td className="px-4 py-3">

                <Badge variant={alert.status === "unread" ? "danger" : "secondary"}>

                  {alert.status === "unread" ? "Новое" : "Прочитано"}

                </Badge>

              </td>

              <td className="px-4 py-3">

                <div className="flex flex-wrap gap-1">

                  <Button

                    size="sm"

                    variant="outline"

                    onClick={() => onAction("mark_read", alert.id)}

                  >

                    Прочитано

                  </Button>

                  <Button

                    size="sm"

                    variant="outline"

                    onClick={() =>

                      onAction("mark_purchased", alert.id, alert.watchlistItemId ?? undefined)

                    }

                  >

                    Куплено

                  </Button>

                  <Button

                    size="sm"

                    variant="ghost"

                    onClick={() =>

                      onAction("ignore", alert.id, alert.watchlistItemId ?? undefined)

                    }

                  >

                    Игнор

                  </Button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}


