import type {
  AlertNotificationData,
  BasketItemInput,
  WatchlistItemData,
  PriceHistoryPoint,
  ManualStatus,
} from "../types/extended";
import type { ProfitAnalysisResult } from "../types";
import type {
  BrandContact,
  BrandContactEvidence,
  CompanyProfile,
  OutreachEmail,
} from "../types/brandFinder";
import { DEFAULT_COMPANY_PROFILE } from "../types/brandFinder";
import type { PriceCorrectionHistory } from "../types/priceVerification";
import type { LinkStatus, PriceSource } from "../types/priceVerification";
import type {
  AnalysisRun,
  AnalysisSnapshot,
} from "../types/analysisHistory";
import {
  loadMockStoreFromDisk,
  saveMockStoreToDisk,
} from "./mockStorePersistence";

export interface StoredAnalysisResult {
  id: string;
  marketplace: string;
  country: string;
  title: string;
  profit: ProfitAnalysisResult;
  riskScore?: number;
  matchScore?: number;
}

export interface StoredAnalysis {
  id: string;
  productTitle: string;
  kaspiPrice: number;
  analyzedAt: string;
  status: "completed" | "failed";
  marketplaceResults: StoredAnalysisResult[];
}

// In-memory store for mock mode when DB is unavailable
const basketItems: Map<string, BasketItemInput & { id: string; createdAt: string }> = new Map();
const watchlist: Map<string, WatchlistItemData> = new Map();
const alerts: Map<string, AlertNotificationData> = new Map();
const priceHistory: Map<string, PriceHistoryPoint[]> = new Map();
const manualStatuses: Map<string, ManualStatus> = new Map();
const favorites: Set<string> = new Set();
const notes: Map<string, { userNotes?: string; aiNotes?: string }> = new Map();
const analyses: StoredAnalysis[] = [];
const brandContacts: Map<string, BrandContact> = new Map();
const brandContactEvidence: Map<string, BrandContactEvidence[]> = new Map();
const outreachEmails: Map<string, OutreachEmail> = new Map();
const priceCorrections: Map<string, PriceCorrectionHistory[]> = new Map();
const marketplaceResults: Map<
  string,
  {
    id: string;
    price: number;
    originalPrice?: number;
    correctedPrice?: number | null;
    finalPrice?: number;
    priceSource?: PriceSource;
    linkStatus?: LinkStatus;
    priceVerifiedAt?: string;
    manuallyCorrectedAt?: string;
    correctionReason?: string | null;
    correctionComment?: string | null;
    isMockPrice?: boolean;
  }
> = new Map();
let companyProfile: CompanyProfile = {
  id: "default",
  ...DEFAULT_COMPANY_PROFILE,
  updatedAt: new Date().toISOString(),
};
const analysisRuns: Map<
  string,
  { run: AnalysisRun; snapshots: AnalysisSnapshot[] }
> = new Map();

let idCounter = 1;
function genId(prefix: string) {
  return `${prefix}-mock-${idCounter++}`;
}

/** Уникальный id для mock-сущностей (marketplace results, analyses и т.д.) */
export function nextMockId(prefix: string) {
  return genId(prefix);
}

let appSettingsOverrides: Partial<import("../types").AppSettings> = {};

function persistMockStore() {
  saveMockStoreToDisk({
    appSettingsOverrides,
    analysisRuns: Array.from(analysisRuns.values()).map((entry) => ({
      run: entry.run as unknown as Record<string, unknown>,
      snapshots: entry.snapshots as unknown as Array<Record<string, unknown>>,
    })),
    analyses: analyses as unknown as Array<Record<string, unknown>>,
    marketplaceResults: Object.fromEntries(marketplaceResults),
    priceCorrections: Object.fromEntries(priceCorrections) as unknown as Record<
      string,
      Array<Record<string, unknown>>
    >,
    watchlist: Array.from(watchlist.values()) as unknown as Array<
      Record<string, unknown>
    >,
    alerts: Array.from(alerts.values()) as unknown as Array<Record<string, unknown>>,
    idCounter,
  });
}

function hydrateMockStore() {
  const data = loadMockStoreFromDisk();
  if (!data) return;

  if (data.idCounter) idCounter = data.idCounter;
  if (data.appSettingsOverrides) {
    appSettingsOverrides = data.appSettingsOverrides as Partial<
      import("../types").AppSettings
    >;
  }
  if (data.analysisRuns) {
    for (const entry of data.analysisRuns) {
      const run = entry.run as unknown as AnalysisRun;
      const snapshots = entry.snapshots as unknown as AnalysisSnapshot[];
      analysisRuns.set(run.id, { run, snapshots });
    }
  }
  if (data.analyses) {
    for (const item of data.analyses) {
      analyses.push(item as unknown as StoredAnalysis);
    }
  }
  if (data.marketplaceResults) {
    for (const [id, value] of Object.entries(data.marketplaceResults)) {
      marketplaceResults.set(
        id,
        value as {
          id: string;
          price: number;
          originalPrice?: number;
          correctedPrice?: number | null;
          finalPrice?: number;
          priceSource?: PriceSource;
          linkStatus?: LinkStatus;
          priceVerifiedAt?: string;
          manuallyCorrectedAt?: string;
          correctionReason?: string | null;
          correctionComment?: string | null;
          isMockPrice?: boolean;
        }
      );
    }
  }
  if (data.priceCorrections) {
    for (const [id, value] of Object.entries(data.priceCorrections)) {
      priceCorrections.set(id, value as unknown as PriceCorrectionHistory[]);
    }
  }
  if (data.watchlist) {
    for (const item of data.watchlist) {
      const wl = item as unknown as WatchlistItemData;
      watchlist.set(wl.id, wl);
    }
  }
  if (data.alerts) {
    for (const item of data.alerts) {
      const alert = item as unknown as AlertNotificationData;
      alerts.set(alert.id, alert);
    }
  }
}

hydrateMockStore();

export const mockStore = {
  basket: {
    getAll: () => Array.from(basketItems.values()),
    add: (item: BasketItemInput) => {
      const id = genId("basket");
      const entry = { ...item, id, createdAt: new Date().toISOString() };
      basketItems.set(id, entry);
      return entry;
    },
    update: (id: string, data: Partial<BasketItemInput>) => {
      const existing = basketItems.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      basketItems.set(id, updated);
      return updated;
    },
    remove: (id: string) => basketItems.delete(id),
    clear: () => basketItems.clear(),
  },
  watchlist: {
    getAll: () => Array.from(watchlist.values()),
    add: (item: Omit<WatchlistItemData, "id">) => {
      const id = genId("wl");
      const entry = { ...item, id };
      watchlist.set(id, entry);
      persistMockStore();
      return entry;
    },
    update: (id: string, data: Partial<WatchlistItemData>) => {
      const existing = watchlist.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      watchlist.set(id, updated);
      persistMockStore();
      return updated;
    },
    remove: (id: string) => {
      const removed = watchlist.delete(id);
      persistMockStore();
      return removed;
    },
    get: (id: string) => watchlist.get(id),
  },
  alerts: {
    getAll: () =>
      Array.from(alerts.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    add: (item: Omit<AlertNotificationData, "id">) => {
      const id = genId("alert");
      const entry = { ...item, id };
      alerts.set(id, entry);
      persistMockStore();
      return entry;
    },
    update: (id: string, data: Partial<AlertNotificationData>) => {
      const existing = alerts.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      alerts.set(id, updated);
      persistMockStore();
      return updated;
    },
    getUnreadCount: () =>
      Array.from(alerts.values()).filter((a) => a.status === "unread").length,
  },
  priceHistory: {
    get: (marketplaceResultId: string) =>
      priceHistory.get(marketplaceResultId) ?? [],
    add: (marketplaceResultId: string, point: Omit<PriceHistoryPoint, "id">) => {
      const id = genId("ph");
      const entry = { ...point, id };
      const existing = priceHistory.get(marketplaceResultId) ?? [];
      priceHistory.set(marketplaceResultId, [...existing, entry]);
      return entry;
    },
  },
  manualStatus: {
    get: (id: string) => manualStatuses.get(id) ?? "review",
    set: (id: string, status: ManualStatus) => manualStatuses.set(id, status),
  },
  favorites: {
    has: (id: string) => favorites.has(id),
    toggle: (id: string) => {
      if (favorites.has(id)) {
        favorites.delete(id);
        return false;
      }
      favorites.add(id);
      return true;
    },
    getAll: () => Array.from(favorites),
  },
  notes: {
    get: (entityId: string) => notes.get(entityId) ?? {},
    set: (entityId: string, data: { userNotes?: string; aiNotes?: string }) => {
      const existing = notes.get(entityId) ?? {};
      notes.set(entityId, { ...existing, ...data });
      return notes.get(entityId);
    },
  },
  analyses: {
    getAll: () =>
      [...analyses].sort(
        (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
      ),
    add: (analysis: Omit<StoredAnalysis, "id">) => {
      const id = genId("analysis");
      const entry = { ...analysis, id };
      analyses.push(entry);
      persistMockStore();
      return entry;
    },
    clear: () => {
      analyses.length = 0;
    },
  },
  brandContacts: {
    getAll: () => Array.from(brandContacts.values()),
    getByProductId: (productId: string) =>
      Array.from(brandContacts.values())
        .filter((c) => c.productId === productId)
        .map((c) => ({
          ...c,
          evidence: brandContactEvidence.get(c.id) ?? c.evidence ?? [],
        })),
    add: (contact: BrandContact) => {
      const { evidence, ...rest } = contact;
      brandContacts.set(contact.id, rest);
      if (evidence?.length) {
        brandContactEvidence.set(contact.id, evidence);
      }
      return { ...rest, evidence: evidence ?? [] };
    },
    update: (id: string, data: Partial<BrandContact>) => {
      const existing = brandContacts.get(id);
      if (!existing) return null;
      const { evidence, ...rest } = data;
      const updated = {
        ...existing,
        ...rest,
        updatedAt: new Date().toISOString(),
      };
      brandContacts.set(id, updated);
      if (evidence) brandContactEvidence.set(id, evidence);
      return {
        ...updated,
        evidence: brandContactEvidence.get(id) ?? evidence ?? [],
      };
    },
    removeByProductId: (productId: string) => {
      for (const [id, contact] of brandContacts) {
        if (contact.productId === productId) {
          brandContacts.delete(id);
          brandContactEvidence.delete(id);
        }
      }
    },
  },
  priceCorrections: {
    getByMarketplaceResultId: (marketplaceResultId: string) =>
      priceCorrections.get(marketplaceResultId) ?? [],
    add: (entry: PriceCorrectionHistory) => {
      const existing = priceCorrections.get(entry.marketplaceResultId) ?? [];
      priceCorrections.set(entry.marketplaceResultId, [entry, ...existing]);
      persistMockStore();
      return entry;
    },
  },
  marketplaceResults: {
    get: (id: string) => marketplaceResults.get(id),
    set: (
      id: string,
      data: {
        price: number;
        originalPrice?: number;
        correctedPrice?: number | null;
        finalPrice?: number;
        currency?: string;
        priceSource?: PriceSource;
        linkStatus?: LinkStatus;
        priceVerifiedAt?: string;
        manuallyCorrectedAt?: string;
        correctionReason?: string | null;
        correctionComment?: string | null;
        isMockPrice?: boolean;
        needsProfitReview?: boolean;
      }
    ) => {
      marketplaceResults.set(id, { id, ...data });
      persistMockStore();
      return marketplaceResults.get(id);
    },
    update: (
      id: string,
      data: Partial<{
        price: number;
        originalPrice?: number;
        correctedPrice?: number | null;
        finalPrice?: number;
        currency?: string;
        priceSource?: PriceSource;
        linkStatus?: LinkStatus;
        priceVerifiedAt?: string;
        manuallyCorrectedAt?: string;
        correctionReason?: string | null;
        correctionComment?: string | null;
        isMockPrice?: boolean;
        needsProfitReview?: boolean;
      }>
    ) => {
      const existing = marketplaceResults.get(id) ?? { id, price: 0 };
      const updated = { ...existing, ...data };
      marketplaceResults.set(id, updated);
      persistMockStore();
      return updated;
    },
  },
  outreachEmails: {
    getAll: () =>
      Array.from(outreachEmails.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    add: (email: OutreachEmail) => {
      outreachEmails.set(email.id, email);
      return email;
    },
    update: (id: string, data: Partial<OutreachEmail>) => {
      const existing = outreachEmails.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      outreachEmails.set(id, updated);
      return updated;
    },
  },
  companyProfile: {
    get: () => companyProfile,
    set: (data: Omit<CompanyProfile, "id">) => {
      companyProfile = { id: "default", ...data };
      return companyProfile;
    },
  },
  analysisRuns: {
    getAll: () =>
      Array.from(analysisRuns.values())
        .map((entry) => entry.run)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    get: (id: string) => {
      const entry = analysisRuns.get(id);
      if (!entry) return null;
      return { ...entry.run, snapshots: entry.snapshots };
    },
    add: (run: AnalysisRun, snapshots: AnalysisSnapshot[]) => {
      analysisRuns.set(run.id, { run, snapshots });
      persistMockStore();
      return { ...run, snapshots };
    },
    update: (id: string, run: AnalysisRun, snapshots: AnalysisSnapshot[]) => {
      analysisRuns.set(id, { run, snapshots });
      persistMockStore();
      return { ...run, snapshots };
    },
    remove: (id: string) => {
      const removed = analysisRuns.delete(id);
      persistMockStore();
      return removed;
    },
  },
  appSettings: {
    get: () => ({ ...appSettingsOverrides }),
    set: (data: Partial<import("../types").AppSettings>) => {
      appSettingsOverrides = { ...appSettingsOverrides, ...data };
      persistMockStore();
      return appSettingsOverrides;
    },
  },
};

export function seedMockStore() {
  // No default seed data — real analyses come from user actions
}
