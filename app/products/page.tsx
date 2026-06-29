"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKzt } from "@/lib/utils";
import type { ProductFilters } from "@/lib/types/extended";
import Image from "next/image";

interface ProductItem {
  id: string;
  title: string;
  brand?: string | null;
  price: number;
  imageUrl?: string | null;
  url: string;
  createdAt: string;
  marketplaceResults?: Array<{
    marketplace: string;
    profitAnalyses?: Array<{ roiPercent: number; netProfitKzt: number }>;
  }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/list")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setProducts(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase()))
      return false;
    if (filters.brand && p.brand?.toLowerCase() !== filters.brand.toLowerCase())
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Товары</h1>
          <p className="text-slate-500">Все проанализированные товары</p>
        </div>
        <Button asChild>
          <Link href="/analyze">Новый анализ</Link>
        </Button>
      </div>

      <AdvancedFilters
        filters={{ ...filters, search: filters.search }}
        onChange={(f) => setFilters(f)}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Поиск по названию..."
          className="pl-9"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">Нет проанализированных товаров</p>
            <Button asChild className="mt-4">
              <Link href="/analyze">Запустить первый анализ</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const bestProfit = product.marketplaceResults?.[0]?.profitAnalyses?.[0];
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-40 bg-slate-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        Нет фото
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="line-clamp-2 font-medium">{product.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600">
                        {formatKzt(product.price)}
                      </span>
                      {product.brand && (
                        <Badge variant="outline">{product.brand}</Badge>
                      )}
                    </div>
                    {bestProfit && (
                      <div className="flex gap-2">
                        <Badge variant="success">
                          +{formatKzt(bestProfit.netProfitKzt)}
                        </Badge>
                        <Badge variant="outline">
                          ROI {bestProfit.roiPercent.toFixed(0)}%
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 items-center">
                      <span className="text-xs text-slate-400">
                        {new Date(product.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                      <div className="flex gap-1">
                        <FavoriteButton entityId={product.id} entityType="product" />
                        <Button variant="ghost" size="sm" asChild>
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
