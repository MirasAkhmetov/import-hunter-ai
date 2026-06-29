"use client";

import { useEffect, useState } from "react";
import type { PriceCorrectionHistory } from "@/lib/types/priceVerification";
import { getCurrencySymbol } from "@/lib/currency";

interface PriceCorrectionHistoryTableProps {
  marketplaceResultId: string;
}

export function PriceCorrectionHistoryTable({
  marketplaceResultId,
}: PriceCorrectionHistoryTableProps) {
  const [history, setHistory] = useState<PriceCorrectionHistory[]>([]);

  useEffect(() => {
    fetch(`/api/price-correction/history/${marketplaceResultId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setHistory(res.data);
      })
      .catch(() => {});
  }, [marketplaceResultId]);

  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-500">История коррекций пуста</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left">Дата</th>
            <th className="px-3 py-2 text-left">Было</th>
            <th className="px-3 py-2 text-left">Стало</th>
            <th className="px-3 py-2 text-left">Причина</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2">
                {new Date(row.createdAt).toLocaleString("ru-RU")}
              </td>
              <td className="px-3 py-2">
                {row.originalPrice.toLocaleString("ru-RU")}{" "}
                {getCurrencySymbol(row.currency)}
              </td>
              <td className="px-3 py-2 font-medium">
                {row.correctedPrice.toLocaleString("ru-RU")}{" "}
                {getCurrencySymbol(row.currency)}
              </td>
              <td className="px-3 py-2 text-slate-600">
                {row.reason}
                {row.comment ? ` — ${row.comment}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
