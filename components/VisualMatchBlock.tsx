"use client";

import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageSimilarityBadge } from "@/components/ImageSimilarityBadge";

interface VisualMatchBlockProps {
  kaspiImageUrl?: string | null;
  candidateImageUrl?: string | null;
  kaspiTitle?: string;
  candidateTitle?: string;
  imageSimilarityScore?: number;
  matchWarnings?: string[];
}

export function VisualMatchBlock({
  kaspiImageUrl,
  candidateImageUrl,
  kaspiTitle = "Kaspi",
  candidateTitle = "Найденный товар",
  imageSimilarityScore = 0,
  matchWarnings = [],
}: VisualMatchBlockProps) {
  if (!kaspiImageUrl && !candidateImageUrl) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Визуальное совпадение</CardTitle>
          <ImageSimilarityBadge score={imageSimilarityScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Kaspi</p>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {kaspiImageUrl ? (
                <Image
                  src={kaspiImageUrl}
                  alt={kaspiTitle}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Нет фото
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs text-slate-600">{kaspiTitle}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Найденный товар</p>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {candidateImageUrl ? (
                <Image
                  src={candidateImageUrl}
                  alt={candidateTitle}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Нет фото
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs text-slate-600">{candidateTitle}</p>
          </div>
        </div>

        {matchWarnings.length > 0 && (
          <div className="space-y-2">
            {matchWarnings.map((warning) => (
              <div
                key={warning}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
