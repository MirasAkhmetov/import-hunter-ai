"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountryBreakdownStats } from "@/lib/types/extended";

interface CountryProfitChartProps {
  breakdown: CountryBreakdownStats[];
}

export function CountryProfitChart({ breakdown }: CountryProfitChartProps) {
  const data = breakdown.map((b) => ({
    name: b.countryLabel,
    profit: Math.round(b.avgNetProfit),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Средняя прибыль по странам</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₸`, "Прибыль"]} />
            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
