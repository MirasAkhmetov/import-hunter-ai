"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Separator } from "@/components/ui/separator";
import { formatKzt, formatPercent } from "@/lib/utils";
import {
  buildProfitFromUserInputs,
  type ProfitUserInputs,
} from "@/lib/profitCalculator";
import { getCurrencySymbol } from "@/lib/currency";
import {
  OFFICIAL_IMPORT_VAT_PERCENT,
  TAX_REGIME_LABELS,
} from "@/lib/kaspi/commission";
import type { AppSettings } from "@/lib/types";

interface ProfitCalculatorProps {
  userInputs: ProfitUserInputs;
  onUserInputsChange: (next: ProfitUserInputs) => void;
  appSettings: AppSettings;
  purchasePrice: number;
  purchaseCurrency: string;
  marketplaceName?: string;
  priceVerified?: boolean;
  variant?: "full" | "params" | "results";
}

export function ProfitCalculator({
  userInputs,
  onUserInputsChange,
  appSettings,
  purchasePrice,
  purchaseCurrency,
  marketplaceName,
  priceVerified = true,
  variant = "full",
}: ProfitCalculatorProps) {
  const calculated = priceVerified
    ? buildProfitFromUserInputs(userInputs, purchasePrice, purchaseCurrency)
    : null;
  const currencySymbol = getCurrencySymbol(purchaseCurrency);
  const exchangeRate = userInputs.exchangeRates[purchaseCurrency] ?? 1;

  const taxRegime = appSettings.taxRegime ?? "simplified";
  const effectiveTaxPercent =
    taxRegime === "official"
      ? OFFICIAL_IMPORT_VAT_PERCENT
      : appSettings.taxPercent;

  const inputsWithTax: ProfitUserInputs = {
    ...userInputs,
    taxRegime,
    simplifiedTaxPercent: appSettings.taxPercent,
  };

  const patch = (partial: Partial<ProfitUserInputs>) => {
    onUserInputsChange({ ...userInputs, ...partial });
  };

  const patchExchangeRate = (rate: number) => {
    onUserInputsChange({
      ...userInputs,
      exchangeRates: {
        ...userInputs.exchangeRates,
        [purchaseCurrency]: rate,
      },
    });
  };

  const displayCalculated = priceVerified
    ? buildProfitFromUserInputs(inputsWithTax, purchasePrice, purchaseCurrency)
    : calculated;

  return (
    <div className="space-y-4">
      {(variant === "full" || variant === "params") && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Параметры расчёта</CardTitle>
          <p className="text-xs text-slate-500">
            Общие для всех карточек. Себестоимость берётся из каждой карточки
            отдельно.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-blue-800">Налог</p>
                <p className="text-sm text-blue-900">
                  {TAX_REGIME_LABELS[taxRegime]}
                  {taxRegime === "official"
                    ? ` — ${OFFICIAL_IMPORT_VAT_PERCENT}% (НДС)`
                    : ` — ${formatPercent(appSettings.taxPercent)}`}
                </p>
              </div>
              <Link
                href="/settings"
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Изменить в настройках
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="kaspiPriceKzt">Цена Kaspi (₸)</Label>
              <NumericInput
                id="kaspiPriceKzt"
                value={userInputs.kaspiPriceKzt}
                onChange={(v) => patch({ kaspiPriceKzt: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kaspiCommission">
                Комиссия Kaspi (%)
                {userInputs.kaspiCommissionCategory && (
                  <span className="ml-1 font-normal text-slate-400">
                    · {userInputs.kaspiCommissionCategory}
                  </span>
                )}
              </Label>
              <NumericInput
                id="kaspiCommission"
                value={userInputs.kaspiCommissionPercent}
                onChange={(v) => patch({ kaspiCommissionPercent: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adsPercent">Реклама (%)</Label>
              <NumericInput
                id="adsPercent"
                value={userInputs.adsPercent}
                onChange={(v) => patch({ adsPercent: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="customsPercent">Таможня (% от закупки)</Label>
              <NumericInput
                id="customsPercent"
                value={userInputs.customsPercent}
                onChange={(v) => patch({ customsPercent: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deliveryCostKzt">Логистика за единицу (₸)</Label>
              <NumericInput
                id="deliveryCostKzt"
                value={userInputs.deliveryCostKzt}
                onChange={(v) => patch({ deliveryCostKzt: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exchangeRate">
                Курс {purchaseCurrency} → KZT
              </Label>
              <NumericInput
                id="exchangeRate"
                value={exchangeRate}
                onChange={patchExchangeRate}
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {(variant === "full" || variant === "results") && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Расчёт прибыли{marketplaceName ? ` — ${marketplaceName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!priceVerified || !displayCalculated ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Цена закупки не подтверждена. Укажите ссылку на товар или исправьте
              цену в карточке — себестоимость подтянется оттуда.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-xs text-slate-500">Цена Kaspi</p>
                  <p className="font-semibold">
                    {formatKzt(inputsWithTax.kaspiPriceKzt)}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-xs text-slate-500">
                    Себестоимость ({currencySymbol}) — из карточки
                  </p>
                  <p className="font-semibold">
                    {purchasePrice.toLocaleString("ru-RU")} {purchaseCurrency}
                  </p>
                  <p className="text-xs text-slate-500">
                    ≈ {formatKzt(displayCalculated.purchasePriceKzt)} · курс{" "}
                    {exchangeRate}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-slate-50/50 p-4 text-sm">
                <p className="font-medium text-slate-700">Расходы</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Комиссия Kaspi </span>
                    {formatPercent(inputsWithTax.kaspiCommissionPercent)} —{" "}
                    {formatKzt(displayCalculated.kaspiCommissionKzt)}
                  </div>
                  <div>
                    <span className="text-slate-500">Налог </span>
                    {TAX_REGIME_LABELS[taxRegime]} ({formatPercent(effectiveTaxPercent)}) —{" "}
                    {formatKzt(displayCalculated.taxKzt)}
                  </div>
                  <div>
                    <span className="text-slate-500">Реклама </span>
                    {formatPercent(inputsWithTax.adsPercent)} —{" "}
                    {formatKzt(displayCalculated.adsCostKzt)}
                  </div>
                  <div>
                    <span className="text-slate-500">Доставка </span>
                    {formatKzt(displayCalculated.deliveryCostKzt)}
                  </div>
                  <div>
                    <span className="text-slate-500">
                      Таможня ({inputsWithTax.customsPercent}%)
                    </span>{" "}
                    — {formatKzt(displayCalculated.customsCostKzt)}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Чистая прибыль</p>
                  <p
                    className={`text-lg font-bold ${
                      displayCalculated.netProfitKzt > 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatKzt(displayCalculated.netProfitKzt)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Маржа</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatPercent(displayCalculated.marginPercent)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">ROI</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {formatPercent(displayCalculated.roiPercent)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-3 text-center text-sm text-slate-500">
                Общие расходы: {formatKzt(displayCalculated.totalCostKzt)}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
