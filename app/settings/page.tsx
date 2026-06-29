"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { CompanyProfileForm } from "@/components/brand-finder/CompanyProfileForm";
import {
  OFFICIAL_IMPORT_VAT_PERCENT,
  TAX_REGIME_LABELS,
  type TaxRegime,
} from "@/lib/kaspi/commission";

const settingsSchema = z.object({
  tryToKzt: z.coerce.number().positive(),
  aedToKzt: z.coerce.number().positive(),
  cnyToKzt: z.coerce.number().positive(),
  usdToKzt: z.coerce.number().positive(),
  inrToKzt: z.coerce.number().positive(),
  rubToKzt: z.coerce.number().positive(),
  deliveryTurkeyKzt: z.coerce.number().min(0),
  deliveryUaeKzt: z.coerce.number().min(0),
  deliveryChinaKzt: z.coerce.number().min(0),
  deliveryIndiaKzt: z.coerce.number().min(0),
  deliveryRussiaKzt: z.coerce.number().min(0),
  kaspiCommissionPercent: z.coerce.number().min(0).max(100),
  taxPercent: z.coerce.number().min(0).max(100),
  taxRegime: z.enum(["official", "simplified"]),
  adsPercent: z.coerce.number().min(0).max(100),
  customsPercent: z.coerce.number().min(0).max(100),
  minMarginPercent: z.coerce.number().min(0).max(100),
  minRoiPercent: z.coerce.number().min(0),
  mockBrandContactsEnabled: z.coerce.boolean().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) reset(res.data);
      })
      .catch(() => {});
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const currencyFields: Array<{ key: keyof SettingsForm; label: string }> = [
    { key: "tryToKzt", label: "TRY → KZT" },
    { key: "aedToKzt", label: "AED → KZT" },
    { key: "cnyToKzt", label: "CNY → KZT" },
    { key: "usdToKzt", label: "USD → KZT" },
    { key: "inrToKzt", label: "INR → KZT" },
    { key: "rubToKzt", label: "RUB → KZT" },
  ];

  const deliveryFields: Array<{ key: keyof SettingsForm; label: string }> = [
    { key: "deliveryTurkeyKzt", label: "Турция → Казахстан (₸)" },
    { key: "deliveryUaeKzt", label: "ОАЭ → Казахстан (₸)" },
    { key: "deliveryChinaKzt", label: "Китай → Казахстан (₸)" },
    { key: "deliveryIndiaKzt", label: "Индия → Казахстан (₸)" },
    { key: "deliveryRussiaKzt", label: "Россия → Казахстан (₸)" },
  ];

  const costFields: Array<{ key: keyof SettingsForm; label: string }> = [
    { key: "taxPercent", label: "Упрощёнка (%)" },
  ];

  const taxRegime = watch("taxRegime");

  const thresholdFields: Array<{ key: keyof SettingsForm; label: string }> = [
    { key: "minMarginPercent", label: "Минимальная маржа (%)" },
    { key: "minRoiPercent", label: "Минимальный ROI (%)" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Настройки</h1>
        <p className="text-slate-500">
          Курсы валют, доставка и параметры расчёта прибыли
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Курсы валют</CardTitle>
            <CardDescription>
              Актуальные курсы для конвертации цен закупки
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {currencyFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  step="0.01"
                  {...register(field.key)}
                />
                {errors[field.key] && (
                  <p className="text-sm text-red-600">Некорректное значение</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Доставка</CardTitle>
            <CardDescription>
              Средняя стоимость доставки за единицу товара
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveryFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  step="100"
                  {...register(field.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Налог</CardTitle>
            <CardDescription>
              Налоговый режим для всех расчётов прибыли. Остальные параметры
              (реклама, логистика, таможня, курс) — на странице анализа.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Налоговый режим</Label>
              <div className="space-y-2">
                {(["official", "simplified"] as TaxRegime[]).map((regime) => (
                  <label
                    key={regime}
                    className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      value={regime}
                      {...register("taxRegime")}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{TAX_REGIME_LABELS[regime]}</span>
                      {regime === "official" && (
                        <span className="block text-xs text-slate-500">
                          НДС {OFFICIAL_IMPORT_VAT_PERCENT}% от цены Kaspi
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {costFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    step="0.1"
                    {...register(field.key)}
                    disabled={field.key === "taxPercent" && taxRegime === "official"}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Пороги прибыльности</CardTitle>
            <CardDescription>
              Минимальные показатели для рекомендации товара
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {thresholdFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  step="1"
                  {...register(field.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить настройки
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600">Сохранено!</span>
          )}
        </div>
      </form>

      <CompanyProfileForm />
    </div>
  );
}
