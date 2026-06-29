"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKzt, formatPercent } from "@/lib/utils";
import { COUNTRY_LABELS, MARKETPLACE_LABELS } from "@/lib/types";
import { calculateBasketItemTotals } from "@/lib/basket/basketCalculator";

export interface BasketItemRow {
  id: string;
  title: string;
  marketplace: string;
  country: string;
  quantity: number;
  purchasePrice: number;
  deliveryPerUnit: number;
  extraCosts: number;
  targetSalePrice: number;
}

interface BasketItemTableProps {
  items: BasketItemRow[];
  onUpdate: () => void;
}

export function BasketItemTable({ items, onUpdate }: BasketItemTableProps) {
  const [editing, setEditing] = useState<string | null>(null);

  const save = async (id: string, data: Partial<BasketItemRow>) => {
    await fetch("/api/basket/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setEditing(null);
    onUpdate();
  };

  const remove = async (id: string) => {
    await fetch("/api/basket/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdate();
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-slate-400">
        Корзина пуста. Добавьте товары из результатов анализа.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="px-3 py-2 text-left">Товар</th>
            <th className="px-3 py-2 text-left">Страна</th>
            <th className="px-3 py-2 text-left">МП</th>
            <th className="px-3 py-2 text-left">Кол-во</th>
            <th className="px-3 py-2 text-left">Закупка</th>
            <th className="px-3 py-2 text-left">Доставка/ед</th>
            <th className="px-3 py-2 text-left">Расходы</th>
            <th className="px-3 py-2 text-left">Цена Kaspi</th>
            <th className="px-3 py-2 text-left">Прибыль</th>
            <th className="px-3 py-2 text-left">ROI</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const totals = calculateBasketItemTotals(item);
            const isEdit = editing === item.id;

            return (
              <tr key={item.id} className="border-b">
                <td className="px-3 py-2 max-w-[180px]">
                  <span className="line-clamp-2 font-medium">{item.title}</span>
                </td>
                <td className="px-3 py-2">{COUNTRY_LABELS[item.country] ?? item.country}</td>
                <td className="px-3 py-2">{MARKETPLACE_LABELS[item.marketplace] ?? item.marketplace}</td>
                <td className="px-3 py-2">
                  {isEdit ? (
                    <Input
                      type="number"
                      className="h-7 w-16"
                      defaultValue={item.quantity}
                      onBlur={(e) =>
                        save(item.id, { quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  ) : (
                    <button className="underline" onClick={() => setEditing(item.id)}>
                      {item.quantity}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">{formatKzt(item.purchasePrice)}</td>
                <td className="px-3 py-2">{formatKzt(item.deliveryPerUnit)}</td>
                <td className="px-3 py-2">{formatKzt(item.extraCosts)}</td>
                <td className="px-3 py-2">{formatKzt(item.targetSalePrice)}</td>
                <td className="px-3 py-2 font-semibold text-emerald-600">
                  {formatKzt(totals.netProfit)}
                </td>
                <td className="px-3 py-2">{formatPercent(totals.roiPercent)}</td>
                <td className="px-3 py-2">
                  <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
