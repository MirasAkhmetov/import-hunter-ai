"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NumericInput } from "@/components/ui/numeric-input";
import { ALERT_STATUS_LABELS } from "@/lib/types/extended";
import type { AlertStatus } from "@/lib/types/extended";

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const variant =
    status === "triggered"
      ? "danger"
      : status === "active"
        ? "success"
        : status === "paused"
          ? "warning"
          : "secondary";

  return <Badge variant={variant}>{ALERT_STATUS_LABELS[status]}</Badge>;
}

interface BuyAlertCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function BuyAlertCheckbox({ checked, onChange, disabled }: BuyAlertCheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300"
      />
      <span className="text-slate-600">Отслеживать цену</span>
    </label>
  );
}

interface BuyAlertModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    targetBuyPrice: number;
    minProfit: number;
    minRoi: number;
    targetQuantity: number;
    comment: string;
  }) => void;
  defaults?: {
    targetBuyPrice?: number;
    minProfit?: number;
    minRoi?: number;
  };
}

export function BuyAlertModal({ open, onClose, onSubmit, defaults }: BuyAlertModalProps) {
  const [targetBuyPrice, setTargetBuyPrice] = useState(defaults?.targetBuyPrice ?? 0);
  const [minProfit, setMinProfit] = useState(defaults?.minProfit ?? 5000);
  const [minRoi, setMinRoi] = useState(defaults?.minRoi ?? 30);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [comment, setComment] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Buy Alert — срочная покупка</h3>
        <p className="mt-1 text-sm text-slate-500">
          Уведомим, когда цена достигнет целевой
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Целевая закупочная цена, ₸" value={targetBuyPrice} onChange={setTargetBuyPrice} />
          <Field label="Мин. прибыль, ₸" value={minProfit} onChange={setMinProfit} />
          <Field label="Мин. ROI, %" value={minRoi} onChange={setMinRoi} />
          <Field label="Количество" value={targetQuantity} onChange={setTargetQuantity} />
          <div>
            <label className="text-sm font-medium">Комментарий</label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-md px-4 py-2 text-sm" onClick={onClose}>
            Отмена
          </button>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => {
              onSubmit({ targetBuyPrice, minProfit, minRoi, targetQuantity, comment });
              onClose();
            }}
          >
            Включить alert
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <NumericInput
        className="mt-1"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export function TargetPriceInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <NumericInput
      className="h-7 w-24"
      value={value}
      onChange={onChange}
      placeholder="Целевая ₸"
    />
  );
}
