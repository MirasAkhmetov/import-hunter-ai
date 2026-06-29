"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, ExternalLink, Link2, Bookmark, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { formatKzt, formatPercent } from "@/lib/utils";
import { getCurrencySymbol, getExchangeRate } from "@/lib/currency";
import { DEFAULT_SETTINGS, MARKETPLACE_LABELS } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

export default function CalculatorPage() {
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [productUrl, setProductUrl] = useState("");
  const [title, setTitle] = useState("");
  const [marketplace, setMarketplace] = useState("hepsiburada");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [purchaseCurrency, setPurchaseCurrency] = useState("TRY");
  const [deliveryCostKzt, setDeliveryCostKzt] = useState(
    DEFAULT_SETTINGS.deliveryTurkeyKzt
  );
  const [sellingPriceKzt, setSellingPriceKzt] = useState(0);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAppSettings(res.data);
          setDeliveryCostKzt(
            res.data.deliveryTurkeyKzt ?? DEFAULT_SETTINGS.deliveryTurkeyKzt
          );
        }
      })
      .catch(() => {});
  }, []);

  const exchangeRate = getExchangeRate(purchaseCurrency, appSettings);

  const purchasePriceKzt = useMemo(
    () => (purchasePrice > 0 ? purchasePrice * exchangeRate : 0),
    [purchasePrice, exchangeRate]
  );

  /** Себестоимость в Алматы = закупка (₸) + логистика (₸) */
  const landedCostKzt = useMemo(
    () => (purchasePriceKzt > 0 ? purchasePriceKzt + deliveryCostKzt : 0),
    [purchasePriceKzt, deliveryCostKzt]
  );

  const estimatedProfit = useMemo(() => {
    if (sellingPriceKzt <= 0 || landedCostKzt <= 0) return null;
    const net = sellingPriceKzt - landedCostKzt;
    return {
      net,
      roi: (net / landedCostKzt) * 100,
      margin: (net / sellingPriceKzt) * 100,
    };
  }, [sellingPriceKzt, landedCostKzt]);

  const handleLoadPrice = async () => {
    if (!productUrl.trim()) return;
    setLinkLoading(true);
    setLinkError(null);
    try {
      const res = await fetch("/api/parse-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTitle(data.data.title);
        setMarketplace(data.data.marketplace);
        setPurchasePrice(data.data.price);
        setPurchaseCurrency(data.data.currency);
        setProductUrl(data.data.url);
      } else {
        setLinkError(data.error ?? "Не удалось загрузить товар");
      }
    } catch {
      setLinkError("Ошибка сети");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSaveWatchlist = async () => {
    if (
      !title.trim() ||
      purchasePrice <= 0 ||
      landedCostKzt <= 0 ||
      sellingPriceKzt <= 0
    ) {
      setSaveMessage("Укажите закупку и примерную цену продажи");
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const id = `manual-${Date.now()}`;
      const netProfitKzt = sellingPriceKzt - landedCostKzt;
      const roiPercent = (netProfitKzt / landedCostKzt) * 100;
      const marginPercent = (netProfitKzt / sellingPriceKzt) * 100;

      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          marketplaceResultId: id,
          title: title.trim(),
          productTitle: title.trim(),
          marketplace,
          country: "TR",
          url: productUrl.trim() || undefined,
          currentPrice: purchasePrice,
          currentCurrency: purchaseCurrency,
          targetBuyPrice: purchasePrice,
          targetPurchasePrice: purchasePrice,
          kaspiPrice: sellingPriceKzt,
          purchasePriceKzt,
          landedCostKzt,
          netProfitKzt,
          roiPercent,
          marginPercent,
          minProfit: netProfitKzt,
          minRoi: roiPercent,
          buyAlertEnabled: Boolean(productUrl.trim()),
          comment: "Добавлено из калькулятора (без Kaspi)",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("Сохранено в Watchlist");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(data.error ?? "Ошибка сохранения");
      }
    } catch {
      setSaveMessage("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = getCurrencySymbol(purchaseCurrency);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Calculator className="h-6 w-6" />
          Калькулятор без Kaspi
        </h1>
        <p className="text-slate-500">
          Закупка + логистика = себестоимость в Алматы. Укажите примерную цену
          продажи — так будет понятнее в Watchlist.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Товар на маркетплейсе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Ссылка Hepsiburada / Trendyol…"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
            />
            <Button onClick={handleLoadPrice} disabled={linkLoading}>
              {linkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {linkLoading ? "…" : "Загрузить"}
            </Button>
          </div>
          {linkError && <p className="text-sm text-red-600">{linkError}</p>}
          {title && (
            <p className="text-sm font-medium text-slate-800">{title}</p>
          )}
          {marketplace && title && (
            <p className="text-xs text-slate-500">
              {MARKETPLACE_LABELS[marketplace] ?? marketplace}
            </p>
          )}
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
            >
              Открыть товар <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Параметры расчёта</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Закупочная цена ({currencySymbol})</Label>
            <NumericInput value={purchasePrice} onChange={setPurchasePrice} />
            {purchasePriceKzt > 0 && (
              <p className="text-xs text-slate-500">
                ≈ {formatKzt(purchasePriceKzt)} (курс {exchangeRate} ₸/
                {currencySymbol})
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Логистика за единицу (₸)</Label>
            <NumericInput value={deliveryCostKzt} onChange={setDeliveryCostKzt} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Примерная цена продажи (₸)</Label>
            <NumericInput value={sellingPriceKzt} onChange={setSellingPriceKzt} />
            <p className="text-xs text-slate-500">
              Сколько планируете продавать в Алматы (Kaspi, Instagram, магазин)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="text-lg">Себестоимость в Алматы</CardTitle>
        </CardHeader>
        <CardContent>
          {landedCostKzt <= 0 ? (
            <p className="text-sm text-slate-600">
              Укажите закупочную цену — рассчитаем автоматически.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-3xl font-bold text-blue-900">
                {formatKzt(landedCostKzt)}
              </p>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs text-slate-500">Закупка</p>
                  <p className="font-medium">{formatKzt(purchasePriceKzt)}</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs text-slate-500">+ Логистика</p>
                  <p className="font-medium">{formatKzt(deliveryCostKzt)}</p>
                </div>
              </div>
              {estimatedProfit && (
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Прибыль (продажа − себестоимость)</p>
                  <p
                    className={`text-lg font-semibold ${estimatedProfit.net >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatKzt(estimatedProfit.net)} · ROI{" "}
                    {formatPercent(estimatedProfit.roi)} · маржа{" "}
                    {formatPercent(estimatedProfit.margin)}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSaveWatchlist}
          disabled={
            saving || !title || landedCostKzt <= 0 || sellingPriceKzt <= 0
          }
        >
          <Bookmark className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить в Watchlist"}
        </Button>
        {saveMessage && (
          <span
            className={`text-sm ${saveMessage.includes("Ошибка") || saveMessage.includes("Укажите") ? "text-red-600" : "text-emerald-600"}`}
          >
            {saveMessage}
          </span>
        )}
        <Button variant="outline" asChild>
          <Link href="/watchlist">Открыть Watchlist</Link>
        </Button>
      </div>
    </div>
  );
}
