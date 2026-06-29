"use client";

import Image from "next/image";
import { ExternalLink, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKzt } from "@/lib/utils";

interface KaspiProductCardProps {
  product: {
    title: string;
    price: number;
    currency: string;
    url: string;
    imageUrl?: string | null;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    specifications?: Record<string, string> | null;
  };
}

export function KaspiProductCard({ product }: KaspiProductCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Товар на Kaspi</CardTitle>
          <Badge variant="secondary">Kaspi.kz</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 md:h-40 md:w-40">
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

          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold text-blue-600">
                {formatKzt(product.price)}
              </span>
              {product.reviewCount != null && product.reviewCount > 0 ? (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  {product.rating != null && product.rating > 0 && (
                    <>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{product.rating}</span>
                    </>
                  )}
                  <span className={product.rating != null && product.rating > 0 ? "text-slate-400" : ""}>
                    ({product.reviewCount.toLocaleString("ru-RU")} отзывов)
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Нет отзывов</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {product.brand && <Badge variant="outline">Бренд: {product.brand}</Badge>}
              {product.model && <Badge variant="outline">Модель: {product.model}</Badge>}
              {product.category && <Badge variant="outline">{product.category}</Badge>}
            </div>

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">{key}</span>
                    <span className="font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" asChild>
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Открыть на Kaspi
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
