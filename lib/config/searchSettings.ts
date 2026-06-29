import { isMockMode } from "./mockMode";
import type { SearchSettings } from "../types/brandFinder";

export function isMockBrandContactsEnabled(): boolean {
  return process.env.MOCK_BRAND_CONTACTS_ENABLED === "true";
}

export function shouldUseMockBrandContacts(settings?: SearchSettings): boolean {
  const mockEnabled =
    settings?.mockBrandContactsEnabled ?? isMockBrandContactsEnabled();
  return isMockMode() && mockEnabled;
}

export function getSearchSettings(): SearchSettings {
  return {
    mockBrandContactsEnabled: isMockBrandContactsEnabled(),
  };
}

export function mergeSearchSettings(
  dbSettings?: Partial<SearchSettings>
): SearchSettings {
  const env = getSearchSettings();
  return {
    mockBrandContactsEnabled:
      dbSettings?.mockBrandContactsEnabled ?? env.mockBrandContactsEnabled,
  };
}

export { isMockMode };
