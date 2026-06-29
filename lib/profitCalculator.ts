import type { AppSettings, ProfitAnalysisResult } from "./types";
import { convertToKzt, getDeliveryCost, getExchangeRate } from "./currency";
import {
  resolveKaspiCommission,
  resolveTaxPercent,
  type TaxRegime,
} from "./kaspi/commission";

const COUNTRY_DELIVERY_KEY: Record<string, keyof AppSettings> = {
  TR: "deliveryTurkeyKzt",
  AE: "deliveryUaeKzt",
  CN: "deliveryChinaKzt",
  IN: "deliveryIndiaKzt",
  RU: "deliveryRussiaKzt",
};

export interface ProfitInput {
  kaspiPriceKzt: number;
  purchasePrice: number;
  purchaseCurrency: string;
  country: string;
  settings: AppSettings;
  kaspiCategory?: string | null;
  kaspiProductTitle?: string | null;
  taxRegime?: TaxRegime;
}

export function calculateProfit(input: ProfitInput): ProfitAnalysisResult {
  const {
    kaspiPriceKzt,
    purchasePrice,
    purchaseCurrency,
    country,
    settings,
    kaspiCategory,
    kaspiProductTitle,
    taxRegime = settings.taxRegime ?? "simplified",
  } = input;

  const exchangeRate = getExchangeRate(purchaseCurrency, settings);
  const purchasePriceKzt = convertToKzt(
    purchasePrice,
    purchaseCurrency,
    settings
  );
  const deliveryCostKzt = getDeliveryCost(country, settings);
  const customsCostKzt =
    purchasePriceKzt * ((settings.customsPercent ?? 5) / 100);

  const kaspiCommission = resolveKaspiCommission(
    kaspiCategory,
    kaspiProductTitle,
    settings.kaspiCommissionPercent
  );
  const kaspiCommissionPercent = kaspiCommission.percent;
  const taxPercent = resolveTaxPercent(taxRegime, settings.taxPercent);
  const adsPercent = settings.adsPercent;

  const kaspiCommissionKzt =
    kaspiPriceKzt * (kaspiCommissionPercent / 100);
  const taxKzt = kaspiPriceKzt * (taxPercent / 100);
  const adsCostKzt = kaspiPriceKzt * (adsPercent / 100);

  const totalCostKzt =
    purchasePriceKzt +
    deliveryCostKzt +
    customsCostKzt +
    kaspiCommissionKzt +
    taxKzt +
    adsCostKzt;

  const netProfitKzt = kaspiPriceKzt - totalCostKzt;
  const marginPercent =
    kaspiPriceKzt > 0 ? (netProfitKzt / kaspiPriceKzt) * 100 : 0;
  const investmentCost =
    purchasePriceKzt + deliveryCostKzt + customsCostKzt;
  const roiPercent =
    investmentCost > 0 ? (netProfitKzt / investmentCost) * 100 : 0;

  return {
    kaspiPriceKzt,
    purchasePriceKzt,
    deliveryCostKzt,
    customsCostKzt,
    kaspiCommissionKzt,
    taxKzt,
    adsCostKzt,
    totalCostKzt,
    netProfitKzt,
    marginPercent,
    roiPercent,
    purchasePriceOriginal: purchasePrice,
    purchaseCurrency,
    exchangeRate,
    kaspiCommissionPercent,
    kaspiCommissionCategory: kaspiCommission.categoryLabel,
    taxRegime,
    taxPercent,
    adsPercent,
  };
}

export type ProfitUserInputs = {
  kaspiPriceKzt: number;
  taxRegime: TaxRegime;
  simplifiedTaxPercent: number;
  adsPercent: number;
  deliveryCostKzt: number;
  customsPercent: number;
  exchangeRates: Record<string, number>;
  kaspiCommissionPercent: number;
  kaspiCommissionCategory?: string;
};

export function initProfitUserInputsFromSettings(
  settings: AppSettings,
  kaspiPriceKzt: number,
  country: string,
  purchaseCurrency: string,
  kaspiCategory?: string | null,
  kaspiProductTitle?: string | null
): ProfitUserInputs {
  const kaspiCommission = resolveKaspiCommission(
    kaspiCategory,
    kaspiProductTitle,
    settings.kaspiCommissionPercent
  );
  const deliveryKey = COUNTRY_DELIVERY_KEY[country];
  const deliveryCostKzt = deliveryKey
    ? (settings[deliveryKey] as number)
    : getDeliveryCost(country, settings);
  const exchangeRate = getExchangeRate(purchaseCurrency, settings);

  return {
    kaspiPriceKzt,
    taxRegime: settings.taxRegime ?? "simplified",
    simplifiedTaxPercent: settings.taxPercent,
    adsPercent: settings.adsPercent ?? 0,
    deliveryCostKzt,
    customsPercent: settings.customsPercent ?? 5,
    exchangeRates: {
      TRY: settings.tryToKzt,
      AED: settings.aedToKzt,
      CNY: settings.cnyToKzt,
      USD: settings.usdToKzt,
      INR: settings.inrToKzt,
      RUB: settings.rubToKzt,
      KZT: 1,
      [purchaseCurrency]: exchangeRate,
    },
    kaspiCommissionPercent: kaspiCommission.percent,
    kaspiCommissionCategory: kaspiCommission.categoryLabel,
  };
}

/** @deprecated Use initProfitUserInputsFromSettings — profit params live in Settings */
export function initProfitUserInputsFromAnalysis(
  kaspiPriceKzt: number,
  marketplaceResults: Array<{
    currency: string;
    profit: ProfitAnalysisResult;
  }>,
  settings?: AppSettings
): ProfitUserInputs {
  if (settings) {
    const first = marketplaceResults[0];
    return initProfitUserInputsFromSettings(
      settings,
      kaspiPriceKzt,
      "TR",
      first?.currency ?? "TRY"
    );
  }

  const first = marketplaceResults[0]?.profit;
  const exchangeRates: Record<string, number> = {};

  for (const item of marketplaceResults) {
    if (item.profit.exchangeRate != null) {
      exchangeRates[item.currency] = item.profit.exchangeRate;
    }
  }

  const taxRegime = first?.taxRegime ?? "simplified";

  return {
    kaspiPriceKzt,
    taxRegime,
    simplifiedTaxPercent:
      taxRegime === "official" ? 3 : first?.taxPercent ?? 3,
    adsPercent: first?.adsPercent ?? 0,
    deliveryCostKzt: first?.deliveryCostKzt ?? 0,
    customsPercent: 5,
    exchangeRates,
    kaspiCommissionPercent: first?.kaspiCommissionPercent ?? 12,
    kaspiCommissionCategory: first?.kaspiCommissionCategory,
  };
}

export function applyTaxFromSettings(
  inputs: ProfitUserInputs,
  settings: AppSettings
): ProfitUserInputs {
  return {
    ...inputs,
    taxRegime: settings.taxRegime ?? "simplified",
    simplifiedTaxPercent: settings.taxPercent,
  };
}

export function buildProfitFromUserInputs(
  inputs: ProfitUserInputs,
  purchasePrice: number,
  purchaseCurrency: string
): ProfitAnalysisResult {
  const exchangeRate =
    purchaseCurrency === "KZT"
      ? 1
      : inputs.exchangeRates[purchaseCurrency] ??
        inputs.exchangeRates.TRY ??
        14.5;
  const purchasePriceKzt = purchasePrice * exchangeRate;
  const customsCostKzt =
    purchasePriceKzt * ((inputs.customsPercent ?? 5) / 100);
  const taxPercent = resolveTaxPercent(
    inputs.taxRegime,
    inputs.simplifiedTaxPercent
  );

  const kaspiCommissionKzt =
    inputs.kaspiPriceKzt * (inputs.kaspiCommissionPercent / 100);
  const taxKzt = inputs.kaspiPriceKzt * (taxPercent / 100);
  const adsCostKzt = inputs.kaspiPriceKzt * (inputs.adsPercent / 100);

  const totalCostKzt =
    purchasePriceKzt +
    inputs.deliveryCostKzt +
    customsCostKzt +
    kaspiCommissionKzt +
    taxKzt +
    adsCostKzt;

  const netProfitKzt = inputs.kaspiPriceKzt - totalCostKzt;
  const marginPercent =
    inputs.kaspiPriceKzt > 0 ? (netProfitKzt / inputs.kaspiPriceKzt) * 100 : 0;
  const investmentCost =
    purchasePriceKzt + inputs.deliveryCostKzt + customsCostKzt;
  const roiPercent =
    investmentCost > 0 ? (netProfitKzt / investmentCost) * 100 : 0;

  return {
    kaspiPriceKzt: inputs.kaspiPriceKzt,
    purchasePriceKzt,
    deliveryCostKzt: inputs.deliveryCostKzt,
    customsCostKzt,
    kaspiCommissionKzt,
    taxKzt,
    adsCostKzt,
    totalCostKzt,
    netProfitKzt,
    marginPercent,
    roiPercent,
    purchasePriceOriginal: purchasePrice,
    purchaseCurrency,
    exchangeRate,
    kaspiCommissionPercent: inputs.kaspiCommissionPercent,
    kaspiCommissionCategory: inputs.kaspiCommissionCategory,
    taxRegime: inputs.taxRegime,
    taxPercent,
    adsPercent: inputs.adsPercent,
  };
}

export type ProfitEditableFields = {
  kaspiPriceKzt: number;
  purchasePriceOriginal?: number;
  purchaseCurrency?: string;
  exchangeRate?: number;
  purchasePriceKzt: number;
  deliveryCostKzt: number;
  customsCostKzt: number;
  kaspiCommissionPercent?: number;
  kaspiCommissionCategory?: string;
  taxRegime?: TaxRegime;
  taxPercent?: number;
  adsPercent?: number;
  kaspiCommissionKzt: number;
  taxKzt: number;
  adsCostKzt: number;
};

export function recalculateProfitTotals(
  fields: ProfitEditableFields
): ProfitAnalysisResult {
  const purchasePriceKzt =
    fields.purchasePriceOriginal != null && fields.exchangeRate != null
      ? fields.purchasePriceOriginal * fields.exchangeRate
      : fields.purchasePriceKzt;

  const kaspiCommissionKzt =
    fields.kaspiCommissionPercent != null
      ? fields.kaspiPriceKzt * (fields.kaspiCommissionPercent / 100)
      : fields.kaspiCommissionKzt;

  const effectiveTaxPercent =
    fields.taxRegime === "official"
      ? resolveTaxPercent("official", fields.taxPercent ?? 0)
      : fields.taxPercent ?? 0;

  const taxKzt = fields.kaspiPriceKzt * (effectiveTaxPercent / 100);

  const adsCostKzt =
    fields.adsPercent != null
      ? fields.kaspiPriceKzt * (fields.adsPercent / 100)
      : fields.adsCostKzt;

  const totalCostKzt =
    purchasePriceKzt +
    fields.deliveryCostKzt +
    fields.customsCostKzt +
    kaspiCommissionKzt +
    taxKzt +
    adsCostKzt;

  const netProfitKzt = fields.kaspiPriceKzt - totalCostKzt;
  const marginPercent =
    fields.kaspiPriceKzt > 0 ? (netProfitKzt / fields.kaspiPriceKzt) * 100 : 0;
  const investmentCost =
    purchasePriceKzt + fields.deliveryCostKzt + fields.customsCostKzt;
  const roiPercent =
    investmentCost > 0 ? (netProfitKzt / investmentCost) * 100 : 0;

  return {
    kaspiPriceKzt: fields.kaspiPriceKzt,
    purchasePriceKzt,
    deliveryCostKzt: fields.deliveryCostKzt,
    customsCostKzt: fields.customsCostKzt,
    kaspiCommissionKzt,
    taxKzt,
    adsCostKzt,
    totalCostKzt,
    netProfitKzt,
    marginPercent,
    roiPercent,
    purchasePriceOriginal: fields.purchasePriceOriginal,
    purchaseCurrency: fields.purchaseCurrency,
    exchangeRate: fields.exchangeRate,
    kaspiCommissionPercent: fields.kaspiCommissionPercent,
    kaspiCommissionCategory: fields.kaspiCommissionCategory,
    taxRegime: fields.taxRegime,
    taxPercent: effectiveTaxPercent,
    adsPercent: fields.adsPercent,
  };
}

export function isProfitable(
  analysis: ProfitAnalysisResult,
  settings: AppSettings
): boolean {
  return (
    analysis.marginPercent >= settings.minMarginPercent &&
    analysis.roiPercent >= settings.minRoiPercent &&
    analysis.netProfitKzt > 0
  );
}
