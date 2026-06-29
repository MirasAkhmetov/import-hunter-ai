"use client";

import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { KaspiProductCard } from "@/components/KaspiProductCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { BrandContactsBlock } from "@/components/brand-finder/BrandContactsBlock";
import { AnalysisCompareCard } from "./AnalysisCompareCard";
import { AnalysisSnapshotViewer } from "./AnalysisSnapshotViewer";
import { HistoryWatchlistSection } from "./HistoryWatchlistSection";
import { ReRunAnalysisButton } from "./ReRunAnalysisButton";
import { DeleteAnalysisButton } from "./DeleteAnalysisButton";
import { getSnapshotData } from "@/lib/analysis-history/snapshotUtils";
import { getMarketplaceDisplayPrice } from "@/lib/analysis-history/resolveBestResult";
import type { AnalysisRunDetail, AnalysisCompareResult } from "@/lib/types/analysisHistory";
import type { BrandContact } from "@/lib/types/brandFinder";
import type { MarketplaceResultData, ProfitAnalysisResult } from "@/lib/types";

interface AnalysisHistoryDetailProps {
  run: AnalysisRunDetail;
  comparison?: AnalysisCompareResult | null;
}

export function AnalysisHistoryDetail({
  run,
  comparison,
}: AnalysisHistoryDetailProps) {
  const kaspiProduct = getSnapshotData<Record<string, unknown>>(
    run.snapshots,
    "kaspi_product"
  );
  const marketplaceResults =
    getSnapshotData<
      Array<
        MarketplaceResultData & {
          id: string;
          profit: ProfitAnalysisResult;
        }
      >
    >(run.snapshots, "marketplace_results") ?? [];
  const brandContacts =
    getSnapshotData<BrandContact[]>(run.snapshots, "brand_contacts") ?? [];
  const aiRec = getSnapshotData<{ recommendation?: string }>(
    run.snapshots,
    "ai_recommendation"
  );

  const product = kaspiProduct
    ? {
        id: run.productId ?? run.id,
        source: run.source,
        title: String(kaspiProduct.title ?? run.productTitle),
        brand: (kaspiProduct.brand as string) ?? run.productBrand,
        model: kaspiProduct.model as string | undefined,
        category: (kaspiProduct.category as string) ?? run.productCategory,
        price: Number(kaspiProduct.price ?? run.kaspiPriceKzt),
        currency: String(kaspiProduct.currency ?? "KZT"),
        url: String(kaspiProduct.url ?? run.kaspiUrl),
        imageUrl: (kaspiProduct.imageUrl as string) ?? run.productImageUrl,
        rating: kaspiProduct.rating as number | undefined,
        reviewCount: kaspiProduct.reviewCount as number | undefined,
        specifications: kaspiProduct.specifications as
          | Record<string, string>
          | undefined,
      }
    : {
        id: run.productId ?? run.id,
        source: run.source,
        title: run.productTitle,
        brand: run.productBrand,
        category: run.productCategory,
        price: run.kaspiPriceKzt,
        currency: "KZT",
        url: run.kaspiUrl,
        imageUrl: run.productImageUrl,
      };

  const comparisonData = marketplaceResults.map((r) => ({
    id: r.id,
    country: r.country,
    marketplace: r.marketplace,
    title: r.title,
    price: getMarketplaceDisplayPrice(r),
    currency: r.currency,
    priceKzt: r.profit?.purchasePriceKzt ?? 0,
    imageUrl: r.imageUrl,
    sellerName: r.sellerName,
    matchScore: r.finalMatchScore ?? r.matchScore ?? 0,
    imageSimilarityScore: r.imageSimilarityScore ?? 0,
    riskScore: r.riskScore ?? 0,
    netProfitKzt: r.profit?.netProfitKzt ?? 0,
    roiPercent: r.profit?.roiPercent ?? 0,
    url: r.url,
    isExactMatch: r.isExactMatch,
    matchDetails: r.matchDetails,
    specifications: r.specifications,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{run.productTitle}</h1>
          <p className="text-sm text-slate-500">
            {new Date(run.createdAt).toLocaleString("ru-RU")} · {run.kaspiUrl}
          </p>
        </div>
        <div className="flex gap-2">
          <ReRunAnalysisButton kaspiUrl={run.kaspiUrl} runId={run.id} variant="default" />
          <DeleteAnalysisButton
            id={run.id}
            redirectTo="/analysis-history"
          />
        </div>
      </div>

      {comparison && <AnalysisCompareCard comparison={comparison} />}

      <KaspiProductCard product={product} />

      {(aiRec?.recommendation ?? run.aiRecommendation) && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="flex gap-3 p-6">
            <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">AI-рекомендация (snapshot)</p>
              <p className="mt-1 text-sm text-blue-800">
                {aiRec?.recommendation ?? run.aiRecommendation}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonData.length > 0 && (
        <ComparisonTable
          data={comparisonData}
          productId={product.id}
          productTitle={product.title}
          kaspiPrice={product.price}
          showWatchlist
        />
      )}

      {marketplaceResults.length > 0 && (
        <HistoryWatchlistSection
          productId={product.id}
          productTitle={product.title}
          kaspiPrice={product.price}
          results={marketplaceResults}
        />
      )}

      <BrandContactsBlock product={product} initialContacts={brandContacts} />

      <AnalysisSnapshotViewer
        snapshots={run.snapshots}
        type="settings_used"
        title="Настройки расчёта (snapshot)"
      />
    </div>
  );
}
