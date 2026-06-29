"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ExportButtons } from "@/components/ExportButtons";
import { NotesEditor } from "@/components/NotesEditor";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { getMarketplaceDisplayPrice } from "@/lib/analysis-history/resolveBestResult";
import { pickBestPerMarketplace } from "@/lib/matching/pickBestPerMarketplace";
import { Sparkles } from "lucide-react";
import { ProductInput } from "@/components/ProductInput";
import { KaspiProductCard } from "@/components/KaspiProductCard";
import { MarketplaceResultCard } from "@/components/MarketplaceResultCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import { BrandContactsBlock } from "@/components/brand-finder/BrandContactsBlock";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisStatus, AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, MARKETPLACE_LABELS, COUNTRY_LABELS } from "@/lib/types";
import { COUNTRY_MARKETPLACES } from "@/lib/types/extended";
import type { AnalysisResult } from "@/lib/types/analysisResult";
import {
  buildProfitFromUserInputs,
  initProfitUserInputsFromSettings,
  applyTaxFromSettings,
  type ProfitUserInputs,
} from "@/lib/profitCalculator";
import { PriceCorrectionHistoryTable } from "@/components/price-verification/PriceCorrectionHistoryTable";
import { RecalculateProfitButton } from "@/components/price-verification/RecalculateProfitButton";
const PROGRESS_STEPS: AnalysisStatus[] = [
  "parsing_kaspi",
  "searching_marketplaces",
  "matching_products",
  "calculating_profit",
  "completed",
];

const COUNTRY_FILTER_OPTIONS = [
  { id: "all", label: "Все страны" },
  { id: "TR", label: COUNTRY_LABELS.TR },
  { id: "AE", label: COUNTRY_LABELS.AE },
  { id: "CN", label: COUNTRY_LABELS.CN },
  { id: "IN", label: COUNTRY_LABELS.IN },
  { id: "RU", label: COUNTRY_LABELS.RU },
] as const;

type CountryFilterId = (typeof COUNTRY_FILTER_OPTIONS)[number]["id"];

function marketplaceOptionsForCountry(countryFilter: CountryFilterId) {
  const allOption = { id: "all", label: "Все маркетплейсы" };

  if (countryFilter === "all") {
    const ids = [
      ...COUNTRY_MARKETPLACES.TR,
      ...COUNTRY_MARKETPLACES.AE.filter((id) => id === "amazon-ae" || id === "noon"),
      ...COUNTRY_MARKETPLACES.CN,
      ...COUNTRY_MARKETPLACES.IN,
      ...COUNTRY_MARKETPLACES.RU,
    ];
    return [
      allOption,
      ...ids.map((id) => ({ id, label: MARKETPLACE_LABELS[id] ?? id })),
    ];
  }

  const ids = COUNTRY_MARKETPLACES[countryFilter] ?? [];
  return [
    {
      id: "all",
      label: `Все (${COUNTRY_LABELS[countryFilter] ?? countryFilter})`,
    },
    ...ids.map((id) => ({ id, label: MARKETPLACE_LABELS[id] ?? id })),
  ];
}

export default function AnalyzePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>("pending");
  const [currentLabel, setCurrentLabel] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedProfitIndex, setSelectedProfitIndex] = useState(0);
  const [countryFilter, setCountryFilter] = useState<CountryFilterId>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [profitUserInputs, setProfitUserInputs] = useState<ProfitUserInputs | null>(
    null
  );
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const profitInitKey = useRef("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAppSettings(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!result) {
      setProfitUserInputs(null);
      profitInitKey.current = "";
      return;
    }

    const key = result.product.id;
    if (profitInitKey.current === key) return;
    profitInitKey.current = key;

    const first = result.marketplaceResults[0];
    setProfitUserInputs(
      initProfitUserInputsFromSettings(
        appSettings,
        result.product.price,
        first?.country ?? "TR",
        first?.currency ?? "TRY",
        result.product.category,
        result.product.title
      )
    );
    setSelectedProfitIndex(0);
  }, [result, appSettings]);

  useEffect(() => {
    if (!profitUserInputs) return;
    setProfitUserInputs((prev) =>
      prev ? applyTaxFromSettings(prev, appSettings) : prev
    );
  }, [appSettings.taxRegime, appSettings.taxPercent]);
  const marketplaceFilterOptions = useMemo(
    () => marketplaceOptionsForCountry(countryFilter),
    [countryFilter]
  );

  const handleCountryFilterChange = (country: CountryFilterId) => {
    setCountryFilter(country);
    setMarketplaceFilter("all");
    setSelectedProfitIndex(0);
  };

  const handleMarketplaceFilterChange = (marketplace: string) => {
    setMarketplaceFilter(marketplace);
    setSelectedProfitIndex(0);
  };

  const handleMarketplaceSelect = (
    marketplaceId: string,
    country?: string
  ) => {
    setMarketplaceFilter(marketplaceId);
    if (country && country !== "all") {
      setCountryFilter(country as CountryFilterId);
    } else {
      const match = result?.marketplaceResults.find(
        (item) => item.marketplace === marketplaceId
      );
      if (match) setCountryFilter(match.country as CountryFilterId);
    }
    setSelectedProfitIndex(0);
  };

  const simulateProgress = useCallback(async () => {
    const labels = [
      "Получаем данные Kaspi…",
      "Ищем на Trendyol…",
      "Ищем на Hepsiburada…",
      "Ищем на Amazon Turkey…",
      "Ищем на n11…",
      "Ищем в ОАЭ…",
      "Сравниваем характеристики…",
      "Считаем прибыль…",
    ];

    for (let i = 0; i < PROGRESS_STEPS.length - 1; i++) {
      setStatus(PROGRESS_STEPS[i]);
      setCurrentLabel(labels[i] ?? labels[Math.min(i, labels.length - 1)]);
      setProgress(((i + 1) / PROGRESS_STEPS.length) * 100);
      await new Promise((r) => setTimeout(r, 400));
    }
  }, []);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSaveMessage(null);    setStatus("parsing_kaspi");
    setProgress(10);

    const progressPromise = simulateProgress();

    try {
      const body: Record<string, unknown> = { url };
      if (countryFilter !== "all") {
        body.countries = [countryFilter];
      }
      if (marketplaceFilter !== "all") {
        body.marketplaces = [marketplaceFilter];
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await progressPromise;

      const data = await response.json();

      if (!data.success) {
        setStatus("failed");
        setError(data.error ?? "Не удалось выполнить анализ");
        return;
      }

      setStatus("completed");
      setProgress(100);
      const analysis: AnalysisResult = data.data;
      setResult(analysis);
      setSelectedProfitIndex(0);    } catch (err) {
      setStatus("failed");
      const isTimeout =
        err instanceof DOMException && err.name === "AbortError";
      setError(
        isTimeout
          ? "Анализ занял слишком много времени. Попробуйте снова или выберите одну страну в фильтре."
          : "Ошибка сети. Проверьте подключение и что сервер запущен (npm run dev)."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnalysis = async (marketplaceResultId?: string) => {
    if (!result) return;
    setSavingAnalysis(true);
    setSaveMessage(null);
    try {
      const selected =
        (marketplaceResultId
          ? dedupedResults.find((r) => r.id === marketplaceResultId)
          : undefined) ??
        visibleResults[selectedProfitIndex] ??
        visibleResults[0];
      const payload = {
        kaspiUrl: result.product.url,
        result: {
          ...result,
          marketplaceResults: dedupedResults,
          bestOption: selected?.marketplace ?? result.bestOption,
        },
        selectedMarketplaceResultId: selected?.id,
        updateRunId: result.historyRunId,
      };

      const response = await fetch("/api/analysis-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setResult((prev) =>
          prev ? { ...prev, historyRunId: data.data.id } : prev
        );
        setSaveMessage("Сохранено в историю анализов");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(data.error ?? "Ошибка сохранения");
      }
    } catch {
      setSaveMessage("Ошибка сети");
    } finally {
      setSavingAnalysis(false);
    }
  };

  const handleResultUpdate = (
    id: string,
    patch: Record<string, unknown>
  ) => {
    setResult((prev) => {
      if (!prev) return prev;
      const marketplaceResults = prev.marketplaceResults.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
      if (patch.isMockPrice === false) {
        const deduped = pickBestPerMarketplace(marketplaceResults);
        const idx = deduped.findIndex((r) => r.id === id);
        if (idx >= 0) {
          setSelectedProfitIndex(idx);
        }
      }
      return { ...prev, marketplaceResults };
    });
    if (patch.isMockPrice === false && typeof patch.currency === "string") {
      const rateMap: Record<string, number> = {
        TRY: appSettings.tryToKzt,
        AED: appSettings.aedToKzt,
        CNY: appSettings.cnyToKzt,
        USD: appSettings.usdToKzt,
        INR: appSettings.inrToKzt,
        RUB: appSettings.rubToKzt,
        KZT: 1,
      };
      const rate = rateMap[patch.currency] ?? appSettings.tryToKzt;
      setProfitUserInputs((prev) =>
        prev
          ? {
              ...prev,
              exchangeRates: {
                ...prev.exchangeRates,
                [patch.currency as string]: rate,
              },
            }
          : prev
      );
    }
  };

  const recalculatedResults = useMemo(() => {
    if (!result || !profitUserInputs) return [];

    const inputs = applyTaxFromSettings(profitUserInputs, appSettings);

    return result.marketplaceResults.map((item) => {
      const purchasePrice = !item.isMockPrice
        ? getMarketplaceDisplayPrice(item)
        : 0;
      const priceVerified = !item.isMockPrice && purchasePrice > 0;

      return {
        ...item,
        profit: priceVerified
          ? buildProfitFromUserInputs(inputs, purchasePrice, item.currency)
          : item.profit,
      };
    });
  }, [result, profitUserInputs, appSettings]);

  const dedupedResults = useMemo(() => {
    const deduped = pickBestPerMarketplace(recalculatedResults);
    return [...deduped].sort((a, b) => {
      const aNotFound = a.searchMethod === "not_found";
      const bNotFound = b.searchMethod === "not_found";
      if (aNotFound !== bNotFound) return aNotFound ? 1 : -1;

      const aVerified = !a.isMockPrice && getMarketplaceDisplayPrice(a) > 0;
      const bVerified = !b.isMockPrice && getMarketplaceDisplayPrice(b) > 0;
      if (aVerified && bVerified) {
        return getMarketplaceDisplayPrice(a) - getMarketplaceDisplayPrice(b);
      }
      if (aVerified !== bVerified) return aVerified ? -1 : 1;

      return (
        (b.finalMatchScore ?? b.matchScore ?? 0) -
        (a.finalMatchScore ?? a.matchScore ?? 0)
      );
    });
  }, [recalculatedResults]);

  const visibleResults = useMemo(() => {
    return dedupedResults.filter((item) => {
      if (countryFilter !== "all" && item.country !== countryFilter) {
        return false;
      }
      if (marketplaceFilter !== "all" && item.marketplace !== marketplaceFilter) {
        return false;
      }
      return true;
    });
  }, [dedupedResults, countryFilter, marketplaceFilter]);

  const comparisonData =
    visibleResults
      .filter((r) => r.searchMethod !== "not_found")
      .map((r) => ({
      id: r.id,
      country: r.country,
      marketplace: r.marketplace,
      title: r.title,
      price: getMarketplaceDisplayPrice(r),
      currency: r.currency,
      priceKzt: r.profit.purchasePriceKzt,
      imageUrl: r.imageUrl,
      sellerName: r.sellerName,
      matchScore: r.finalMatchScore ?? r.matchScore ?? 0,
      imageSimilarityScore: r.imageSimilarityScore ?? 0,
      riskScore: r.riskScore ?? 0,
      netProfitKzt: r.profit.netProfitKzt,
      roiPercent: r.profit.roiPercent,
      url: r.url,
      isExactMatch: r.isExactMatch,
      linkStatus: r.linkStatus,
      priceSource: r.priceSource,
      isMockPrice: r.isMockPrice,
      needsProfitReview: r.needsProfitReview,
      correctedPrice: r.correctedPrice,
      originalPrice: r.originalPrice,
    })) ?? [];

  const cheapestVerifiedId = useMemo(() => {
    const verified = visibleResults.filter(
      (item) =>
        item.searchMethod !== "not_found" &&
        !item.isMockPrice &&
        getMarketplaceDisplayPrice(item) > 0
    );
    if (verified.length === 0) return null;
    return verified.reduce((best, item) =>
      getMarketplaceDisplayPrice(item) < getMarketplaceDisplayPrice(best)
        ? item
        : best
    ).id;
  }, [visibleResults]);

  const bestResult = useMemo(() => {
    const selected = visibleResults[selectedProfitIndex] ?? visibleResults[0];
    if (
      selected &&
      selected.searchMethod !== "not_found" &&
      !selected.isMockPrice &&
      getMarketplaceDisplayPrice(selected) > 0
    ) {
      return selected;
    }
    return (
      visibleResults.find(
        (r) =>
          r.searchMethod !== "not_found" &&
          !r.isMockPrice &&
          getMarketplaceDisplayPrice(r) > 0
      ) ?? selected
    );
  }, [visibleResults, selectedProfitIndex]);

  const bestPurchasePrice =
    bestResult && !bestResult.isMockPrice
      ? getMarketplaceDisplayPrice(bestResult)
      : undefined;

  const bestPriceVerified =
    Boolean(bestResult && !bestResult.isMockPrice && (bestPurchasePrice ?? 0) > 0);

  const exchangeCurrency =
    bestResult?.currency ??
    result?.marketplaceResults[0]?.currency ??
    "TRY";

  const renderResultCard = (r: AnalysisResult["marketplaceResults"][number]) => (
    <MarketplaceResultCard
      key={r.id}
      result={{
        ...r,
        profit: r.profit,
      }}
      kaspiImageUrl={result?.product.imageUrl}
      kaspiTitle={result?.product.title}
      isBest={r.id === cheapestVerifiedId}
      onSave={() => handleSaveAnalysis(r.id)}
      onResultUpdate={handleResultUpdate}
      saving={savingAnalysis}
      saveLabel="Сохранить в историю"
    />
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Анализ товара</h1>
        <p className="text-slate-500">
          Вставьте ссылку Kaspi — найдём аналоги и посчитаем прибыль
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-slate-50/80 p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Страна</p>
          <div className="flex flex-wrap gap-2">
            {COUNTRY_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={countryFilter === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCountryFilterChange(option.id)}
                disabled={isLoading}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Маркетплейс</p>
          <div className="flex flex-wrap gap-2">
            {marketplaceFilterOptions.map((option) => (
              <Button
                key={option.id}
                variant={marketplaceFilter === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleMarketplaceFilterChange(option.id)}
                disabled={isLoading}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {(countryFilter !== "all" || marketplaceFilter !== "all") && result && (
          <p className="text-xs text-slate-500">
            Показано {visibleResults.length} из {result.marketplaceResults.length}{" "}
            товаров
            {marketplaceFilter !== "all" && (
              <>
                {" "}
                ·{" "}
                <button
                  type="button"
                  className="text-blue-600 underline"
                  onClick={() => {
                    setMarketplaceFilter("all");
                    setSelectedProfitIndex(0);
                  }}
                >
                  сбросить маркетплейс
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <ProductInput onAnalyze={handleAnalyze} isLoading={isLoading} />

      {isLoading && (
        <LoadingProgress
          status={status}
          currentLabel={currentLabel}
          progress={progress}
        />
      )}

      {error && !isLoading && (
        <LoadingProgress status="failed" progress={0} error={error} />
      )}

      {result && !isLoading && (
        <div className="space-y-6">
          <KaspiProductCard product={result.product} />

          {profitUserInputs && (
            <ProfitCalculator
              variant="params"
              userInputs={profitUserInputs}
              onUserInputsChange={setProfitUserInputs}
              appSettings={appSettings}
              purchasePrice={bestPurchasePrice ?? 0}
              purchaseCurrency={exchangeCurrency}
              priceVerified={bestPriceVerified}
            />
          )}

          <BrandContactsBlock
            product={result.product}
            initialContacts={result.brandContacts}
            initialMeta={result.brandFinderMeta}
          />

          {result.recommendation && (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="flex gap-3 p-6">
                <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">AI-рекомендация</p>
                  <p className="mt-1 text-sm text-blue-800">
                    {result.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="cards">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="cards">Карточки</TabsTrigger>
                <TabsTrigger value="table">Таблица</TabsTrigger>
                <TabsTrigger value="profit">Прибыль</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <ExportButtons />
                {saveMessage && (
                  <span className="self-center text-sm text-emerald-600">{saveMessage}</span>
                )}
              </div>            </div>

            <TabsContent value="cards" className="mt-4 space-y-4">
              {visibleResults.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Нет товаров для выбранного фильтра. Выберите другую страну или
                  маркетплейс.
                </p>
              ) : (
                visibleResults.map((r) => renderResultCard(r))
              )}
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <ComparisonTable
                data={comparisonData}
                productId={result.product.id}
                kaspiPrice={result.product.price}
                activeMarketplace={marketplaceFilter}
                onMarketplaceSelect={handleMarketplaceSelect}
              />
            </TabsContent>

            <TabsContent value="profit" className="mt-4 space-y-4">
              {visibleResults.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visibleResults.map((r, i) => (
                    <Button
                      key={r.id}
                      variant={selectedProfitIndex === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProfitIndex(i)}
                    >
                      {MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace}
                    </Button>
                  ))}
                </div>
              )}
              {bestResult && profitUserInputs && (
                <>
                  <ProfitCalculator
                    variant="results"
                    userInputs={profitUserInputs}
                    onUserInputsChange={setProfitUserInputs}
                    appSettings={appSettings}
                    purchasePrice={bestPurchasePrice ?? 0}
                    purchaseCurrency={bestResult.currency}
                    marketplaceName={
                      MARKETPLACE_LABELS[bestResult.marketplace] ??
                      bestResult.marketplace
                    }
                    priceVerified={bestPriceVerified}
                  />
                  {bestPriceVerified && (
                    <>
                      <RecalculateProfitButton
                        payload={{
                          kaspiPriceKzt: profitUserInputs.kaspiPriceKzt,
                          purchasePrice: bestResult.price,
                          purchaseCurrency: bestResult.currency,
                          country: bestResult.country,
                          kaspiCategory: result.product.category,
                          kaspiProductTitle: result.product.title,
                          correctedPrice: bestResult.correctedPrice,
                          originalPrice: bestResult.originalPrice,
                        }}
                      />
                      <PriceCorrectionHistoryTable
                        marketplaceResultId={bestResult.id}
                      />
                      <PriceHistoryChart
                        marketplaceResultId={bestResult.id}
                        basePrice={bestResult.profit.purchasePriceKzt}
                      />
                    </>
                  )}
                </>
              )}
            </TabsContent>          </Tabs>

          <NotesEditor
            entityId={result.product.id}
            entityType="product"
            initialAiNotes={result.recommendation}
          />
        </div>
      )}
    </div>
  );
}
