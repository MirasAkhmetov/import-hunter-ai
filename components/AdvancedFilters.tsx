"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductFilters } from "@/lib/types/extended";
import { COUNTRY_LABELS, MARKETPLACE_LABELS } from "@/lib/types";

interface AdvancedFiltersProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  showManualStatus?: boolean;
}

export function AdvancedFilters({
  filters,
  onChange,
  showManualStatus = true,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof ProductFilters, value: string | number | boolean | undefined) => {
    onChange({ ...filters, [key]: value === "" ? undefined : value });
  };

  const clear = () => onChange({});

  const numInput = (
    key: keyof ProductFilters,
    label: string,
    placeholder?: string
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        placeholder={placeholder}
        value={(filters[key] as number | undefined) ?? ""}
        onChange={(e) =>
          update(key, e.target.value ? parseFloat(e.target.value) : undefined)
        }
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          <Filter className="h-4 w-4" />
          Фильтры
        </Button>
        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="h-4 w-4" />
            Сбросить
          </Button>
        )}
      </div>

      {open && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Расширенные фильтры</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Страна</Label>
              <select
                className="flex h-8 w-full rounded-md border px-2 text-sm"
                value={filters.country ?? ""}
                onChange={(e) => update("country", e.target.value)}
              >
                <option value="">Все</option>
                {Object.entries(COUNTRY_LABELS).filter(([k]) => k !== "KZ").map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Маркетплейс</Label>
              <select
                className="flex h-8 w-full rounded-md border px-2 text-sm"
                value={filters.marketplace ?? ""}
                onChange={(e) => update("marketplace", e.target.value)}
              >
                <option value="">Все</option>
                {Object.entries(MARKETPLACE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Бренд</Label>
              <Input
                className="h-8 text-sm"
                value={filters.brand ?? ""}
                onChange={(e) => update("brand", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Категория</Label>
              <Input
                className="h-8 text-sm"
                value={filters.category ?? ""}
                onChange={(e) => update("category", e.target.value)}
              />
            </div>

            {numInput("profitMin", "Прибыль от, ₸")}
            {numInput("profitMax", "Прибыль до, ₸")}
            {numInput("roiMin", "ROI от, %")}
            {numInput("roiMax", "ROI до, %")}
            {numInput("matchScoreMin", "Match от")}
            {numInput("matchScoreMax", "Match до")}
            {numInput("riskScoreMin", "Риск от")}
            {numInput("riskScoreMax", "Риск до")}

            {showManualStatus && (
              <div className="space-y-1">
                <Label className="text-xs">Ручная проверка</Label>
                <select
                  className="flex h-8 w-full rounded-md border px-2 text-sm"
                  value={filters.manualStatus ?? ""}
                  onChange={(e) => update("manualStatus", e.target.value)}
                >
                  <option value="">Все</option>
                  <option value="approved">Подходит</option>
                  <option value="review">Проверить</option>
                  <option value="rejected">Не подходит</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
