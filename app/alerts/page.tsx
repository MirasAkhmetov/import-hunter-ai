"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { AlertNotificationData } from "@/lib/types/extended";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertNotificationData[]>([]);
  const [checking, setChecking] = useState(false);

  const load = useCallback(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((res) => setAlerts(res.data ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkPrices = async () => {
    setChecking(true);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_prices" }),
      });
      load();
    } finally {
      setChecking(false);
    }
  };

  const onAction = async (action: string, id: string, watchlistItemId?: string) => {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, watchlistItemId }),
    });
    load();
  };

  const triggered = alerts.filter(
    (a) => a.type === "target_price_reached" || a.title.includes("🔥")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Уведомления</h1>
          <p className="text-slate-500">
            Автопроверка реальных цен каждые 15 мин · уведомление при достижении
            целевой цены
          </p>
        </div>
        <Button onClick={checkPrices} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          Проверить сейчас
        </Button>
      </div>

      {triggered.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">🔥 Срочно купить ({triggered.length})</h2>
          <p className="text-sm text-red-700 mt-1">
            Цена достигла целевой на {triggered.length} товар(ах)
          </p>
        </div>
      )}

      <AlertsTable alerts={alerts} onAction={onAction} />
    </div>
  );
}
