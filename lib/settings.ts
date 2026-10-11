import { prisma } from "./db";
import { isDbAvailable } from "./db/availability";
import { DEFAULT_SETTINGS, type AppSettings } from "./types";
import { localStore } from "./store/localStore";

type SettingsRow = NonNullable<
  Awaited<ReturnType<typeof prisma.settings.findUnique>>
>;

function rowToSettings(settings: SettingsRow): AppSettings {
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
  };
}

function localSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...localStore.appSettings.get() };
}

export async function getSettings(): Promise<AppSettings> {
  if (!(await isDbAvailable())) return localSettings();

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      await prisma.settings.create({
        data: { id: "default", ...DEFAULT_SETTINGS },
      });
      return { ...DEFAULT_SETTINGS };
    }

    return rowToSettings(settings);
  } catch {
    return localSettings();
  }
}

export async function updateSettings(
  data: Partial<AppSettings>
): Promise<AppSettings> {
  if (!(await isDbAvailable())) {
    localStore.appSettings.set(data);
    return localSettings();
  }

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_SETTINGS, ...data },
    update: data,
  });

  return rowToSettings(settings);
}
