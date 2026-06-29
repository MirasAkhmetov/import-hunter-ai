import type { AppSettings } from "./types";

const CURRENCY_TO_KZT_KEY: Record<string, keyof AppSettings> = {
  TRY: "tryToKzt",
  AED: "aedToKzt",
  CNY: "cnyToKzt",
  USD: "usdToKzt",
  INR: "inrToKzt",
  RUB: "rubToKzt",
  KZT: "usdToKzt", // fallback, handled separately
};

export function getExchangeRate(
  currency: string,
  settings: AppSettings
): number {
  if (currency === "KZT") return 1;
  const key = CURRENCY_TO_KZT_KEY[currency];
  if (!key) {
    console.warn(`Unknown currency: ${currency}, using USD rate`);
    return settings.usdToKzt;
  }
  return settings[key as keyof AppSettings] as number;
}

export function convertToKzt(
  amount: number,
  currency: string,
  settings: AppSettings
): number {
  if (currency === "KZT") return amount;
  return amount * getExchangeRate(currency, settings);
}

export function getDeliveryCost(
  country: string,
  settings: AppSettings
): number {
  switch (country) {
    case "TR":
      return settings.deliveryTurkeyKzt;
    case "AE":
      return settings.deliveryUaeKzt;
    case "CN":
      return settings.deliveryChinaKzt;
    case "IN":
      return settings.deliveryIndiaKzt;
    case "RU":
      return settings.deliveryRussiaKzt;
    default:
      return settings.deliveryTurkeyKzt;
  }
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    KZT: "₸",
    TRY: "₺",
    AED: "د.إ",
    CNY: "¥",
    USD: "$",
    INR: "₹",
    RUB: "₽",
  };
  return symbols[currency] ?? currency;
}
