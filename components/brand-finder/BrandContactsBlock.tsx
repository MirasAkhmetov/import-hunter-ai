"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandContactCard } from "./BrandContactCard";
import type {
  BrandContact,
  BrandContactStatus,
  BrandFinderMeta,
} from "@/lib/types/brandFinder";
import {
  BRAND_FINDER_MESSAGES,
} from "@/lib/types/brandFinder";
import type { AnalysisResult } from "@/lib/types/analysisResult";

interface BrandContactsBlockProps {
  product: AnalysisResult["product"];
  initialContacts?: BrandContact[];
  initialMeta?: BrandFinderMeta;
}

export function BrandContactsBlock({
  product,
  initialContacts = [],
  initialMeta,
}: BrandContactsBlockProps) {
  const [contacts, setContacts] = useState<BrandContact[]>(initialContacts);
  const [meta, setMeta] = useState<BrandFinderMeta | undefined>(initialMeta);
  const [loading, setLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    website: "",
    sourceUrl: "",
  });

  const loadContacts = useCallback(async () => {
    const res = await fetch(
      `/api/brand-contacts?productId=${encodeURIComponent(product.id)}`
    );
    const data = await res.json();
    if (data.success) setContacts(data.data);
  }, [product.id]);

  useEffect(() => {
    if (initialContacts.length > 0) {
      setContacts(initialContacts);
      setMeta(initialMeta);
    } else {
      loadContacts();
    }
  }, [initialContacts, initialMeta, loadContacts]);

  const handleFind = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand-contacts/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
        if (data.meta) setMeta(data.meta);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: BrandContactStatus) => {
    await fetch(`/api/brand-contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const handleAddManual = async () => {
    if (!manualForm.companyName.trim()) return;
    const res = await fetch("/api/brand-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        brand: product.brand ?? product.title.split(/\s+/)[0],
        companyName: manualForm.companyName,
        email: manualForm.email,
        phone: manualForm.phone,
        website: manualForm.website,
        sourceUrl: manualForm.sourceUrl || undefined,
        sourceTitle: manualForm.sourceUrl ? "Добавлено вручную" : undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setContacts((prev) => [...prev, data.data]);
      setShowManualForm(false);
      setManualForm({
        companyName: "",
        email: "",
        phone: "",
        website: "",
        sourceUrl: "",
      });
    }
  };

  const showMockBanner =
    meta?.mockBrandContactsEnabled && meta?.mockMode;
  const emptyMessage =
    meta?.message ??
    (contacts.length === 0 ? BRAND_FINDER_MESSAGES.NO_REAL_CONTACTS : undefined);

  return (
    <Card className="border-violet-200">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-violet-600" />
              Правообладатель и дистрибьюторы
            </CardTitle>
            <CardDescription>
              Бренд: {product.brand ?? "—"} · Сначала Казахстан, затем Россия — из
              встроенной базы дистрибьюторов и официальных сайтов
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleFind} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Найти контакты
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowManualForm(!showManualForm)}>
              <Plus className="mr-1 h-4 w-4" />
              Добавить вручную
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showMockBanner && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {BRAND_FINDER_MESSAGES.MOCK_BANNER}
          </div>
        )}

        {!showMockBanner && contacts.length === 0 && emptyMessage && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>{emptyMessage}</p>
            <p className="mt-2 text-slate-600">
              Поддерживаются бренды: Bioderma, Braun, Philips, Samsung, Oral-B и др.
              Нет вашего бренда — нажмите «Добавить вручную».
            </p>
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Модуль не принимает юридических решений — только собирает и показывает
            найденные данные. Проверяйте документы и статус дистрибьютора самостоятельно.
          </p>
        </div>

        {showManualForm && (
          <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Название компании</Label>
                <Input
                  value={manualForm.companyName}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={manualForm.email}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Телефон</Label>
                <Input
                  value={manualForm.phone}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Сайт</Label>
                <Input
                  value={manualForm.website}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>URL источника (обязательно для проверки)</Label>
                <Input
                  value={manualForm.sourceUrl}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, sourceUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <Button size="sm" onClick={handleAddManual}>
              Сохранить контакт
            </Button>
          </div>
        )}

        {contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {emptyMessage ?? "Контакты не найдены. Добавьте вручную или попробуйте поиск по бренду."}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {contacts.map((contact) => (
              <BrandContactCard
                key={contact.id}
                contact={contact}
                product={product}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
