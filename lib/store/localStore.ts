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
  loadLocalStoreFromDisk,
  saveLocalStoreToDisk,
} from "./localStorePersistence";

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

// Локальное хранилище (память + файл .local-data/store.json), когда PostgreSQL недоступен
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
  return `${prefix}-local-${idCounter++}`;
}

/** Уникальный id для локальных сущностей (marketplace results, analyses и т.д.) */
export function nextLocalId(prefix: string) {
  return genId(prefix);
}

let appSettingsOverrides: Partial<import("../types").AppSettings> = {};

function persistLocalStore() {
  saveLocalStoreToDisk({
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
    basket: Array.from(basketItems.values()) as unknown as Array<Record<string, unknown>>,
    priceHistory: Object.fromEntries(priceHistory) as unknown as Record<
      string,
      Array<Record<string, unknown>>
    >,
    manualStatuses: Object.fromEntries(manualStatuses),
    favorites: Array.from(favorites),
    notes: Object.fromEntries(notes),
    brandContacts: Array.from(brandContacts.values()).map((c) => ({
      ...c,
      evidence: brandContactEvidence.get(c.id) ?? [],
    })) as unknown as Array<Record<string, unknown>>,
    outreachEmails: Array.from(outreachEmails.values()) as unknown as Array<
      Record<string, unknown>
    >,
    companyProfile: companyProfile as unknown as Record<string, unknown>,
    idCounter,
  });
}

function hydrateLocalStore() {
  const data = loadLocalStoreFromDisk();
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
  if (data.basket) {
    for (const item of data.basket) {
      const entry = item as unknown as BasketItemInput & { id: string; createdAt: string };
      basketItems.set(entry.id, entry);
    }
  }
  if (data.priceHistory) {
    for (const [id, points] of Object.entries(data.priceHistory)) {
      priceHistory.set(id, points as unknown as PriceHistoryPoint[]);
    }
  }
  if (data.manualStatuses) {
    for (const [id, status] of Object.entries(data.manualStatuses)) {
      manualStatuses.set(id, status as ManualStatus);
    }
  }
  if (data.favorites) {
    for (const id of data.favorites) favorites.add(id);
  }
  if (data.notes) {
    for (const [id, value] of Object.entries(data.notes)) {
      notes.set(id, value);
    }
  }
  if (data.brandContacts) {
    for (const item of data.brandContacts) {
      const { evidence, ...contact } = item as unknown as BrandContact;
      brandContacts.set(contact.id, contact);
      if (evidence?.length) brandContactEvidence.set(contact.id, evidence);
    }
  }
  if (data.outreachEmails) {
    for (const item of data.outreachEmails) {
      const email = item as unknown as OutreachEmail;
      outreachEmails.set(email.id, email);
    }
  }
  if (data.companyProfile) {
    companyProfile = data.companyProfile as unknown as CompanyProfile;
  }
}

hydrateLocalStore();

export const localStore = {
  basket: {
    getAll: () => Array.from(basketItems.values()),
    add: (item: BasketItemInput) => {
      const id = genId("basket");
      const entry = { ...item, id, createdAt: new Date().toISOString() };
      basketItems.set(id, entry);
      persistLocalStore();
      return entry;
    },
    update: (id: string, data: Partial<BasketItemInput>) => {
      const existing = basketItems.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      basketItems.set(id, updated);
      persistLocalStore();
      return updated;
    },
    remove: (id: string) => {
      const removed = basketItems.delete(id);
      persistLocalStore();
      return removed;
    },
    clear: () => {
      basketItems.clear();
      persistLocalStore();
    },
  },
  watchlist: {
    getAll: () => Array.from(watchlist.values()),
    add: (item: Omit<WatchlistItemData, "id">) => {
      const id = genId("wl");
      const entry = { ...item, id };
      watchlist.set(id, entry);
      persistLocalStore();
      return entry;
    },
    update: (id: string, data: Partial<WatchlistItemData>) => {
      const existing = watchlist.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      watchlist.set(id, updated);
      persistLocalStore();
      return updated;
    },
    remove: (id: string) => {
      const removed = watchlist.delete(id);
      persistLocalStore();
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
      persistLocalStore();
      return entry;
    },
    update: (id: string, data: Partial<AlertNotificationData>) => {
      const existing = alerts.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      alerts.set(id, updated);
      persistLocalStore();
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
      persistLocalStore();
      return entry;
    },
  },
  manualStatus: {
    get: (id: string) => manualStatuses.get(id) ?? "review",
    set: (id: string, status: ManualStatus) => {
      manualStatuses.set(id, status);
      persistLocalStore();
    },
  },
  favorites: {
    has: (id: string) => favorites.has(id),
    toggle: (id: string) => {
      const isFavorite = !favorites.has(id);
      if (isFavorite) favorites.add(id);
      else favorites.delete(id);
      persistLocalStore();
      return isFavorite;
    },
    getAll: () => Array.from(favorites),
  },
  notes: {
    get: (entityId: string) => notes.get(entityId) ?? {},
    set: (entityId: string, data: { userNotes?: string; aiNotes?: string }) => {
      const existing = notes.get(entityId) ?? {};
      notes.set(entityId, { ...existing, ...data });
      persistLocalStore();
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
      persistLocalStore();
      return entry;
    },
    clear: () => {
      analyses.length = 0;
      persistLocalStore();
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
      persistLocalStore();
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
      persistLocalStore();
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
      persistLocalStore();
    },
  },
  priceCorrections: {
    getByMarketplaceResultId: (marketplaceResultId: string) =>
      priceCorrections.get(marketplaceResultId) ?? [],
    add: (entry: PriceCorrectionHistory) => {
      const existing = priceCorrections.get(entry.marketplaceResultId) ?? [];
      priceCorrections.set(entry.marketplaceResultId, [entry, ...existing]);
      persistLocalStore();
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
      persistLocalStore();
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
      persistLocalStore();
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
      persistLocalStore();
      return email;
    },
    update: (id: string, data: Partial<OutreachEmail>) => {
      const existing = outreachEmails.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      outreachEmails.set(id, updated);
      persistLocalStore();
      return updated;
    },
  },
  companyProfile: {
    get: () => companyProfile,
    set: (data: Omit<CompanyProfile, "id">) => {
      companyProfile = { id: "default", ...data };
      persistLocalStore();
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
      persistLocalStore();
      return { ...run, snapshots };
    },
    update: (id: string, run: AnalysisRun, snapshots: AnalysisSnapshot[]) => {
      analysisRuns.set(id, { run, snapshots });
      persistLocalStore();
      return { ...run, snapshots };
    },
    remove: (id: string) => {
      const removed = analysisRuns.delete(id);
      persistLocalStore();
      return removed;
    },
  },
  appSettings: {
    get: () => ({ ...appSettingsOverrides }),
    set: (data: Partial<import("../types").AppSettings>) => {
      appSettingsOverrides = { ...appSettingsOverrides, ...data };
      persistLocalStore();
      return appSettingsOverrides;
    },
  },
};
