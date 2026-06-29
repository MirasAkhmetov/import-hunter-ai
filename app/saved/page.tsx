"use client";

import { useEffect, useState } from "react";
import { SavedProductsTable, type SavedProductRow } from "@/components/SavedProductsTable";

export default function SavedPage() {
  const [items, setItems] = useState<SavedProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/saved")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setItems(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isSaved: false }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Избранное</h1>
        <p className="text-slate-500">
          Товары, отобранные для закупки
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Загрузка...</div>
      ) : (
        <SavedProductsTable data={items} onRemove={handleRemove} />
      )}
    </div>
  );
}
