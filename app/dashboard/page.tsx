"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKzt, formatPercent } from "@/lib/utils";
import { formatLocalDateYmd } from "@/lib/dateRange";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  totalAnalyzed: number;
  profitableCount: number;
  averageMargin: number;
  topProducts?: Array<{
    id: string;
    title: string;
    roi: number;
    margin: number;
    profit: number;
    marketplace: string;
  }>;
  recentAnalyses: Array<{
    id: string;
    title: string;
    status: string;
    date: string;
  }>;
  opportunities: {
    highRoi: number;
    lowRisk: number;
    bigPriceDiff: number;
    manualCheck: number;
  };
  bestCountry?: { country: string; avgRoi: number; itemCount: number };
  bestByRoi?: Array<{ id: string; title: string; roi: number; profit: number; marketplace: string }>;
  bestByProfit?: Array<{ id: string; title: string; profit: number; roi: number; marketplace: string }>;
  watchlistCount?: number;
  basketCount?: number;
  basketProfit?: number;
  manualReviewCount?: number;
  unreadAlerts?: number;
  profitByCountry?: Array<{ country: string; profit: number; roi: number }>;
  brandContactsStats?: {
    brandOwners: number;
    distributorsKz: number;
    distributorsRu: number;
    highConfidence: number;
    pendingEmails: number;
    sentManually: number;
    totalContacts: number;
  };
  analysisHistoryRecent?: Array<{
    id: string;
    title: string;
    date: string;
    profit: number;
    roi: number;
    marketplace: string;
    status: string;
  }>;
  filterDate?: string;
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatLocalDateYmd());

  useEffect(() => {
    fetch(`/api/dashboard?date=${selectedDate}`)
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [selectedDate]);

  const stats = [
    {
      label: "Проанализировано",
      value: data?.totalAnalyzed ?? 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Прибыльных",
      value: data?.profitableCount ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Средняя маржа",
      value: formatPercent(data?.averageMargin ?? 0),
      icon: DollarSign,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "ROI > 40%",
      value: data?.opportunities.highRoi ?? 0,
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const chartData =
    data?.topProducts?.map((p) => ({
      name: p.title.slice(0, 15) + "…",
      roi: p.roi,
      profit: p.profit / 1000,
    })) ?? [];

  const opportunityCards = [
    {
      title: "Высокий ROI (>40%)",
      count: data?.opportunities.highRoi ?? 0,
      icon: TrendingUp,
      color: "border-emerald-200 bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Низкий риск",
      count: data?.opportunities.lowRisk ?? 0,
      icon: Sparkles,
      color: "border-blue-200 bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Большая разница цен",
      count: data?.opportunities.bigPriceDiff ?? 0,
      icon: DollarSign,
      color: "border-indigo-200 bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      title: "Проверить вручную",
      count: data?.opportunities.manualCheck ?? 0,
      icon: AlertTriangle,
      color: "border-amber-200 bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
          <p className="text-slate-500">
            Анализы за {formatDisplayDate(data?.filterDate ?? selectedDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="dashboard-date" className="text-xs text-slate-500">
              Дата
            </Label>
            <Input
              id="dashboard-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button asChild>
            <Link href="/analyze">
              Новый анализ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-violet-600" />
              Контакты брендов
            </CardTitle>
            <CardDescription>
              Правообладатели и дистрибьюторы из Brand Finder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Правообладатели</p>
                <p className="text-2xl font-bold">
                  {data?.brandContactsStats?.brandOwners ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Дистрибьюторы KZ</p>
                <p className="text-2xl font-bold">
                  {data?.brandContactsStats?.distributorsKz ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Дистрибьюторы RU</p>
                <p className="text-2xl font-bold">
                  {data?.brandContactsStats?.distributorsRu ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Высокая уверенность</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {data?.brandContactsStats?.highConfidence ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Письма к отправке</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data?.brandContactsStats?.pendingEmails ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Отправлено вручную</p>
                <p className="text-2xl font-bold">
                  {data?.brandContactsStats?.sentManually ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Opportunities</CardTitle>
            <CardDescription>
              Товары с высоким потенциалом прибыли
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {opportunityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`rounded-lg border p-4 ${card.color}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${card.iconColor}`} />
                      <span className="text-sm font-medium">{card.title}</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{card.count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ROI по товарам</CardTitle>
            <CardDescription>Лучшие товары дня</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="roi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-slate-400">
                Нет данных для графика
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700">Лучшая страна сегодня</p>
            <p className="text-lg font-bold text-emerald-900">
              {data?.bestCountry?.country ?? "—"}
            </p>
            <p className="text-sm text-emerald-700">
              ROI {formatPercent(data?.bestCountry?.avgRoi ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Watchlist</p>
            <p className="text-2xl font-bold">{data?.watchlistCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Корзина закупки</p>
            <p className="text-2xl font-bold">{data?.basketCount ?? 0}</p>
            <p className="text-sm text-emerald-600">
              {formatKzt(data?.basketProfit ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700">🔥 Срочно купить</p>
            <p className="text-2xl font-bold text-red-900">
              {data?.unreadAlerts ?? 0}
            </p>
            <p className="text-sm text-red-700">
              Проверить: {data?.manualReviewCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Лучшие по ROI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.bestByRoi ?? []).map((item, i) => (
              <div key={item.id} className="flex justify-between rounded-lg border p-3 text-sm">
                <span>{i + 1}. {item.title.slice(0, 40)}…</span>
                <span className="font-semibold text-blue-600">{formatPercent(item.roi)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Лучшие по прибыли</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.bestByProfit ?? []).map((item, i) => (
              <div key={item.id} className="flex justify-between rounded-lg border p-3 text-sm">
                <span>{i + 1}. {item.title.slice(0, 40)}…</span>
                <span className="font-semibold text-emerald-600">{formatKzt(item.profit)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data?.profitByCountry && data.profitByCountry.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Прибыль по странам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.profitByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Лучшие товары дня</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.topProducts ?? []).map((product, i) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{product.title}</p>
                    <Badge variant="outline" className="mt-1">
                      {product.marketplace}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    {formatKzt(product.profit)}
                  </p>
                  <p className="text-sm text-slate-500">
                    ROI {formatPercent(product.roi)} · Маржа {formatPercent(product.margin)}
                  </p>
                </div>
              </div>
            ))}
            {(!data?.topProducts || data.topProducts.length === 0) && (
              <p className="text-center text-slate-400 py-8">
                Запустите анализ, чтобы увидеть лучшие товары
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Последние анализы</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analysis-history">Вся история</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data?.analysisHistoryRecent ?? []).map((analysis) => (
              <Link
                key={analysis.id}
                href={`/analysis-history/${analysis.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div>
                  <span className="font-medium">{analysis.title}</span>
                  <p className="text-sm text-emerald-600">
                    {formatKzt(analysis.profit)} · ROI {formatPercent(analysis.roi)}
                    {analysis.marketplace !== "—" && <> · {analysis.marketplace}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      analysis.status === "completed" ? "success" : "danger"
                    }
                  >
                    {analysis.status === "completed" ? "Готово" : "Ошибка"}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {new Date(analysis.date).toLocaleString("ru-RU")}
                  </span>
                </div>
              </Link>
            ))}
            {(!data?.analysisHistoryRecent || data.analysisHistoryRecent.length === 0) &&
              (data?.recentAnalyses ?? []).map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <span className="font-medium">{analysis.title}</span>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        analysis.status === "completed" ? "success" : "danger"
                      }
                    >
                      {analysis.status === "completed" ? "Готово" : "Ошибка"}
                    </Badge>
                    <span className="text-sm text-slate-400">
                      {new Date(analysis.date).toLocaleString("ru-RU")}
                    </span>
                  </div>
                </div>
              ))}
            {(!data?.analysisHistoryRecent?.length && !data?.recentAnalyses?.length) && (
              <p className="py-8 text-center text-slate-400">
                Запустите анализ, чтобы увидеть историю
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
