import { prisma } from "./db";
import { isMockMode } from "./config/mockMode";
import { DEFAULT_SETTINGS, type AppSettings } from "./types";
import { MOCK_SETTINGS } from "./mock/data";
import { mergeSearchSettings } from "./config/searchSettings";
import { mockStore } from "./store/mockStore";

function buildSettings(
  base: AppSettings,
  overrides?: Partial<AppSettings>
): AppSettings {
  return {
    ...base,
    ...overrides,
    ...mergeSearchSettings({
      searchApiProvider: overrides?.searchApiProvider ?? base.searchApiProvider,
      searchApiKey: overrides?.searchApiKey ?? base.searchApiKey,
      mockBrandContactsEnabled:
        overrides?.mockBrandContactsEnabled ?? base.mockBrandContactsEnabled,
    }),
  };
}

export async function getSettings(): Promise<AppSettings> {
  if (isMockMode()) {
    return buildSettings(MOCK_SETTINGS, mockStore.appSettings.get());
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      await prisma.settings.create({
        data: { id: "default", ...DEFAULT_SETTINGS },
      });
      return buildSettings(DEFAULT_SETTINGS);
    }

    return buildSettings({
      tryToKzt: settings.tryToKzt,
      aedToKzt: settings.aedToKzt,
      cnyToKzt: settings.cnyToKzt,
      usdToKzt: settings.usdToKzt,
      inrToKzt: settings.inrToKzt ?? DEFAULT_SETTINGS.inrToKzt,
      rubToKzt: (settings as { rubToKzt?: number }).rubToKzt ?? DEFAULT_SETTINGS.rubToKzt,
      deliveryTurkeyKzt: settings.deliveryTurkeyKzt,
      deliveryUaeKzt: settings.deliveryUaeKzt,
      deliveryChinaKzt: settings.deliveryChinaKzt,
      deliveryIndiaKzt: settings.deliveryIndiaKzt ?? DEFAULT_SETTINGS.deliveryIndiaKzt,
      deliveryRussiaKzt: (settings as { deliveryRussiaKzt?: number }).deliveryRussiaKzt ?? DEFAULT_SETTINGS.deliveryRussiaKzt,
      kaspiCommissionPercent: settings.kaspiCommissionPercent,
      taxPercent: settings.taxPercent,
      taxRegime: (settings as { taxRegime?: string }).taxRegime as AppSettings["taxRegime"] ?? DEFAULT_SETTINGS.taxRegime,
      adsPercent: settings.adsPercent,
      customsPercent: (settings as { customsPercent?: number }).customsPercent ?? DEFAULT_SETTINGS.customsPercent,
      minMarginPercent: settings.minMarginPercent,
      minRoiPercent: settings.minRoiPercent,
      searchApiProvider: settings.searchApiProvider ?? undefined,
      searchApiKey: settings.searchApiKey ?? undefined,
      mockBrandContactsEnabled: settings.mockBrandContactsEnabled ?? false,
    });
  } catch {
    return buildSettings(MOCK_SETTINGS, mockStore.appSettings.get());
  }
}

export async function updateSettings(
  data: Partial<AppSettings>
): Promise<AppSettings> {
  if (isMockMode()) {
    mockStore.appSettings.set(data);
    return getSettings();
  }

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_SETTINGS, ...data },
    update: data,
  });

  return {
    tryToKzt: settings.tryToKzt,
    aedToKzt: settings.aedToKzt,
    cnyToKzt: settings.cnyToKzt,
    usdToKzt: settings.usdToKzt,
    inrToKzt: settings.inrToKzt ?? DEFAULT_SETTINGS.inrToKzt,
    rubToKzt: (settings as { rubToKzt?: number }).rubToKzt ?? DEFAULT_SETTINGS.rubToKzt,
    deliveryTurkeyKzt: settings.deliveryTurkeyKzt,
    deliveryUaeKzt: settings.deliveryUaeKzt,
    deliveryChinaKzt: settings.deliveryChinaKzt,
    deliveryIndiaKzt: settings.deliveryIndiaKzt ?? DEFAULT_SETTINGS.deliveryIndiaKzt,
    deliveryRussiaKzt: (settings as { deliveryRussiaKzt?: number }).deliveryRussiaKzt ?? DEFAULT_SETTINGS.deliveryRussiaKzt,
    kaspiCommissionPercent: settings.kaspiCommissionPercent,
    taxPercent: settings.taxPercent,
    taxRegime: (settings as { taxRegime?: string }).taxRegime as AppSettings["taxRegime"] ?? DEFAULT_SETTINGS.taxRegime,
    adsPercent: settings.adsPercent,
    customsPercent: (settings as { customsPercent?: number }).customsPercent ?? DEFAULT_SETTINGS.customsPercent,
    minMarginPercent: settings.minMarginPercent,
    minRoiPercent: settings.minRoiPercent,
    searchApiProvider: settings.searchApiProvider ?? undefined,
    searchApiKey: settings.searchApiKey ?? undefined,
    mockBrandContactsEnabled: settings.mockBrandContactsEnabled ?? false,
  };
}
