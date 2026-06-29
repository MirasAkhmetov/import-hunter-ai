import fs from "fs";
import path from "path";
import { isMockMode } from "../config/mockMode";

const STORE_FILE = path.join(process.cwd(), ".mock-data", "store.json");

export interface PersistedMockData {
  appSettingsOverrides?: Record<string, unknown>;
  analysisRuns?: Array<{
    run: Record<string, unknown>;
    snapshots: Array<Record<string, unknown>>;
  }>;
  analyses?: Array<Record<string, unknown>>;
  marketplaceResults?: Record<string, Record<string, unknown>>;
  priceCorrections?: Record<string, Array<Record<string, unknown>>>;
  watchlist?: Array<Record<string, unknown>>;
  alerts?: Array<Record<string, unknown>>;
  idCounter?: number;
}

let loaded = false;

export function loadMockStoreFromDisk(): PersistedMockData | null {
  if (!isMockMode() || loaded) return null;
  loaded = true;

  try {
    if (!fs.existsSync(STORE_FILE)) return null;
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw) as PersistedMockData;
  } catch {
    return null;
  }
}

export function saveMockStoreToDisk(data: PersistedMockData): void {
  if (!isMockMode()) return;

  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.warn("Failed to persist mock store:", error);
  }
}
