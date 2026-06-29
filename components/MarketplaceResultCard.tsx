"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Bookmark, CheckCircle2, Pencil, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { ImageSimilarityBadge } from "@/components/ImageSimilarityBadge";
import { VisualMatchBlock } from "@/components/VisualMatchBlock";
import { RiskBadge } from "@/components/RiskBadge";
import { formatKzt } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import { MARKETPLACE_LABELS, COUNTRY_LABELS } from "@/lib/types";
import { PriceVerificationBadge } from "@/components/price-verification/PriceVerificationBadge";
import { LinkStatusBadge } from "@/components/price-verification/LinkStatusBadge";
import { ManualPriceCorrectionModal } from "@/components/price-verification/ManualPriceCorrectionModal";
import {
  isMarketplaceSearchUrl,
  normalizeMarketplaceUrl,
} from "@/lib/price-verification/urlUtils";
import type { LinkStatus, PriceSource } from "@/lib/types/priceVerification";

interface MarketplaceResultCardProps {
  result: {
    id: string;
    marketplace: string;
    country: string;
    title: string;
    price: number;
    currency: string;
    url: string;
    imageUrl?: string | null;
    sellerName?: string | null;
    sellerRating?: number | null;
    matchScore?: number;
    finalMatchScore?: number;
    imageSimilarityScore?: number;
    riskScore?: number;
    isExactMatch?: boolean;
    isTopMatch?: boolean;
    matchWarnings?: string[];
    matchDetails?: {
      brandMatch: boolean;
      modelMatch: boolean;
      specsMatchPercent: number;
      imageMatch: boolean;
      titleMatchPercent: number;
      imageSimilarityScore?: number;
      categoryMatch?: boolean;
      priceScore?: number;
    };
    specifications?: Record<string, string> | null;
    profit?: {
      purchasePriceKzt: number;
      netProfitKzt: number;
      roiPercent: number;
      marginPercent: number;
    };
    originalPrice?: number;
    correctedPrice?: number | null;
    finalPrice?: number;
    priceSource?: PriceSource;
    linkStatus?: LinkStatus;
    isMockPrice?: boolean;
    needsProfitReview?: boolean;
  };
  kaspiImageUrl?: string | null;
  kaspiTitle?: string;
  onSave?: (resultId?: string) => void;
  onResultUpdate?: (id: string, patch: Partial<MarketplaceResultCardProps["result"]>) => void;
  isBest?: boolean;
  saveLabel?: string;
  saving?: boolean;
}

export function MarketplaceResultCard({
  result,
  kaspiImageUrl,
  kaspiTitle,
  onSave,
  onResultUpdate,
  isBest,
  saveLabel = "Сохранить",
  saving = false,
}: MarketplaceResultCardProps) {
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [manualLink, setManualLink] = useState(result.url);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const displayScore = result.finalMatchScore ?? result.matchScore ?? 0;
  const browseUrl = normalizeMarketplaceUrl(result.url);
  const isSearchLink = isMarketplaceSearchUrl(result.url);
  const imageScore =
    result.imageSimilarityScore ?? result.matchDetails?.imageSimilarityScore ?? 0;
  const priceVerified = !result.isMockPrice && (result.finalPrice ?? result.price) > 0;
  const displayPrice = priceVerified
    ? (result.finalPrice ?? result.price)
    : null;

  const handleApplyLink = async () => {
    if (!manualLink.trim()) return;
    setLinkLoading(true);
    setLinkError(null);
    try {
      const res = await fetch("/api/marketplace-result/apply-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplaceResultId: result.id,
          url: manualLink.trim(),
          marketplace: result.marketplace,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResultUpdate?.(result.id, {
          url: data.data.url,
          title: data.data.title,
          price: data.data.price,
          originalPrice: data.data.originalPrice ?? data.data.price,
          finalPrice: data.data.finalPrice,
          currency: data.data.currency,
          imageUrl: data.data.imageUrl ?? result.imageUrl,
          isMockPrice: false,
          needsProfitReview: false,
          priceSource: "product_page",
          linkStatus: "verified",
        });
      } else {
        setLinkError(data.error ?? "Не удалось загрузить товар");
      }
    } catch {
      setLinkError("Ошибка сети");
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <Card className={isBest ? "border-blue-300 ring-2 ring-blue-100" : ""}>
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {result.imageUrl ? (
              <Image
                src={result.imageUrl}
                alt={result.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Нет фото
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">
                    {COUNTRY_LABELS[result.country] ?? result.country}
                  </Badge>
                  <Badge variant="outline">
                    {MARKETPLACE_LABELS[result.marketplace] ?? result.marketplace}
                  </Badge>
                  {result.isExactMatch && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Точное совпадение
                    </Badge>
                  )}
                  {result.isTopMatch === false && imageScore > 0 && imageScore < 60 && (
                    <Badge variant="warning">Фото не подтверждено</Badge>
                  )}
                  {isBest && <Badge variant="success">Лучший вариант</Badge>}
                </div>
                <h4 className="mt-1.5 line-clamp-2 text-sm font-medium">{result.title}</h4>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {displayPrice != null ? (
                <span className="font-semibold">
                  {displayPrice.toLocaleString("ru-RU")}{" "}
                  {getCurrencySymbol(result.currency)}
                </span>
              ) : (
                <span className="font-medium text-amber-700">
                  Цена не подтверждена — укажите ссылку на товар
                </span>
              )}
              {result.correctedPrice != null && result.originalPrice != null && (
                <span className="text-xs text-slate-400 line-through">
                  {result.originalPrice.toLocaleString("ru-RU")}
                </span>
              )}
              {priceVerified && result.profit && (
                <span className="text-slate-500">
                  ≈ {formatKzt(result.profit.purchasePriceKzt)}
                </span>
              )}
            </div>

            {result.sellerName && (
              <p className="text-xs text-slate-500">
                Продавец: {result.sellerName}
                {result.sellerRating && ` (${result.sellerRating}★)`}
              </p>
            )}

            {result.matchDetails && (
              <p className="text-xs text-slate-500">
                Бренд {result.matchDetails.brandMatch ? "✓" : "✗"} · Модель{" "}
                {result.matchDetails.modelMatch ? "✓" : "✗"} · Характеристики{" "}
                {result.matchDetails.specsMatchPercent}% · Фото {imageScore}%
              </p>
            )}

            {result.specifications && Object.keys(result.specifications).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(result.specifications)
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs font-normal">
                      {key}: {value}
                    </Badge>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <MatchScoreBadge score={displayScore} />
              <ImageSimilarityBadge score={imageScore} />
              <RiskBadge score={result.riskScore ?? 0} />
              <LinkStatusBadge status={result.linkStatus} />
              <PriceVerificationBadge
                priceSource={result.priceSource}
                isMockPrice={result.isMockPrice}
                needsReview={result.needsProfitReview}
              />
              {priceVerified && result.profit && (
                <>
                  <Badge variant={result.profit.netProfitKzt > 0 ? "success" : "danger"}>
                    {formatKzt(result.profit.netProfitKzt)}
                  </Badge>
                  <Badge variant="outline">ROI {result.profit.roiPercent.toFixed(0)}%</Badge>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="sm" asChild>
                <a href={browseUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  {isSearchLink ? "Поиск на маркетплейсе" : "Открыть товар"}
                </a>
              </Button>
              <div className="flex min-w-0 flex-1 gap-2">
                <Input
                  type="url"
                  placeholder="Ссылка на страницу товара (не поиск)"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyLink}
                  disabled={linkLoading}
                >
                  <Link2 className="h-3 w-3" />
                  {linkLoading ? "…" : "Применить"}
                </Button>
              </div>
            </div>
            {isSearchLink && (
              <p className="text-xs text-slate-500">
                Кнопка выше откроет поиск. Для цены вставьте ссылку на конкретный товар
                (…-p-HBC… или …-pm-HBC…) и нажмите «Применить».
              </p>
            )}
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCorrectionOpen(true)}>
                <Pencil className="h-3 w-3" />
                Исправить цену
              </Button>
              {onSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave(result.id)}
                  disabled={saving}
                >
                  <Bookmark className="h-3 w-3" />
                  {saving ? "Сохранение…" : saveLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {(kaspiImageUrl || result.imageUrl) && (
          <VisualMatchBlock
            kaspiImageUrl={kaspiImageUrl}
            candidateImageUrl={result.imageUrl}
            kaspiTitle={kaspiTitle}
            candidateTitle={result.title}
            imageSimilarityScore={imageScore}
            matchWarnings={result.matchWarnings}
          />
        )}
      </CardContent>

      <ManualPriceCorrectionModal
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        marketplaceResultId={result.id}
        currentPrice={result.finalPrice ?? result.price ?? 0}
        currency={result.currency}
        onSaved={(saved) => {
          onResultUpdate?.(result.id, {
            correctedPrice: saved.correctedPrice,
            finalPrice: saved.finalPrice,
            price: saved.finalPrice,
            currency: saved.currency,
            originalPrice: saved.originalPrice ?? result.originalPrice ?? result.price,
            isMockPrice: false,
            needsProfitReview: false,
            priceSource: saved.priceSource,
          });
        }}
      />
    </Card>
  );
}
