"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceHistoryPoint } from "@/lib/types/extended";

interface PriceHistoryChartProps {
  marketplaceResultId: string;
  basePrice?: number;
}

export function PriceHistoryChart({
  marketplaceResultId,
  basePrice = 95000,
}: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);

  useEffect(() => {
    fetch(
      `/api/price-history?marketplaceResultId=${marketplaceResultId}&basePrice=${basePrice}`
    )
      .then((r) => r.json())
      .then((res) => setData(res.data ?? []));
  }, [marketplaceResultId, basePrice]);

  const chartData = data.map((p) => ({
    date: new Date(p.checkedAt).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    }),
    price: p.priceKzt,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">История цены</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₸`, "Цена"]} />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-400 py-8">Загрузка...</p>
        )}
      </CardContent>
    </Card>
  );
}
