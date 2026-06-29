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

interface CountryRoiChartProps {
  breakdown: CountryBreakdownStats[];
}

export function CountryRoiChart({ breakdown }: CountryRoiChartProps) {
  const data = breakdown.map((b) => ({
    name: b.countryLabel,
    roi: Math.round(b.avgRoi * 10) / 10,
    highRoi: b.highRoiCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ROI по странам</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "ROI"]} />
            <Bar dataKey="roi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
