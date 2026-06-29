import type {
  BrandContact,
  BrandContactEvidence,
  BrandContactRegion,
  BrandContactRole,
} from "../types/brandFinder";
import type { ParsedProduct } from "../types";
import {
  calculateBrandContactConfidence,
  deriveVerificationStatus,
} from "./confidenceScoring";
import { parseWebsiteContacts } from "./websiteContactParser";

export interface KnownDistributorEntry {
  /** Подстроки бренда в нижнем регистре (bioderma, oral-b → oralb) */
  brandKeys: string[];
  /** Если true — не матчить при этих словах в title (медицинский B. Braun) */
  excludeTitlePatterns?: RegExp[];
  companyName: string;
  role: BrandContactRole;
  region: BrandContactRegion;
  country: string;
  website?: string;
  email?: string;
  phone?: string;
  contactFormUrl?: string;
  address?: string;
  sourceUrl: string;
  sourceTitle: string;
  confirmedFacts: string;
  /** Доп. страницы для live-проверки контактов */
  fetchUrls?: string[];
}

/** Проверенные дистрибьюторы KZ → RU (источники: официальные сайты, 2025–2026) */
const KNOWN_DISTRIBUTORS: KnownDistributorEntry[] = [
  {
    brandKeys: ["bioderma", "naos", "esthederm", "etatpur", "institutesthederm"],
    companyName: 'ТОО BEEV (БЕЕВ) — Bioderma, Institut Esthederm',
    role: "official_distributor",
    region: "Kazakhstan",
    country: "Kazakhstan",
    website: "https://bioderma.com.kz/",
    email: "info@beev.kz",
    phone: "+7 701 572 26 40",
    address: "г. Алматы, ул. Жарокова 276Б",
    sourceUrl: "https://bioderma.com.kz/",
    sourceTitle: "Bioderma — официальный дистрибьютор в Казахстане",
    confirmedFacts:
      "Официальный дистрибьютор NAOS (Bioderma, Institut Esthederm) в Казахстане. Источник: bioderma.com.kz",
    fetchUrls: ["https://bioderma.com.kz/", "https://bioderma.com.kz/contacts"],
  },
  {
    brandKeys: ["bioderma", "naos", "esthederm", "etatpur", "institutesthederm"],
    companyName: 'ООО «НАОС Восток»',
    role: "official_distributor",
    region: "Russia",
    country: "Russia",
    website: "https://naos.ru/",
    email: "support@naos.ru",
    address: "г. Москва, пер. Нижний Сусальный, д. 5, стр. 4",
    sourceUrl: "https://naos.ru/legal/usloviya-ispolzovaniya-sayta-www-naos-ru/",
    sourceTitle: "NAOS — официальный интернет-магазин BIODERMA (Россия)",
    confirmedFacts:
      "ООО «НАОС Восток» — продавец и дистрибьютор Bioderma, Institut Esthederm, Etat Pur в РФ. Источник: naos.ru",
    fetchUrls: ["https://naos.ru/"],
  },
  {
    brandKeys: ["braun"],
    excludeTitlePatterns: [/b\.?\s*braun/i, /bbraun/i, /медикал/i, /медицин/i, /диализ/i],
    companyName: 'ТОО «Smart» — официальный магазин Braun (Казахстан)',
    role: "official_distributor",
    region: "Kazakhstan",
    country: "Kazakhstan",
    website: "https://braun-asia.kz/",
    email: "support@braun-asia.kz",
    phone: "8 (747) 502-45-72",
    address: "г. Алматы, ул. Жибек Жолы 13/5",
    sourceUrl: "https://braun-asia.kz/contacts",
    sourceTitle: "Официальный магазин Braun (Казахстан)",
    confirmedFacts:
      "Официальный магазин бытовой техники Braun в KZ. Опт и гарантия: braun-asia.kz/contacts",
    fetchUrls: ["https://braun-asia.kz/contacts"],
  },
  {
    brandKeys: ["philips"],
    companyName: "Philips Kazakhstan",
    role: "official_distributor",
    region: "Kazakhstan",
    country: "Kazakhstan",
    website: "https://www.philips.kz/",
    sourceUrl: "https://www.philips.kz/c-w/support-home/support-contact-page.html",
    sourceTitle: "Philips Kazakhstan — официальный сайт",
    confirmedFacts: "Официальный сайт Philips в Казахстане: philips.kz",
    fetchUrls: ["https://www.philips.kz/c-w/support-home/support-contact-page.html"],
  },
  {
    brandKeys: ["philips"],
    companyName: "Philips Russia",
    role: "official_distributor",
    region: "Russia",
    country: "Russia",
    website: "https://www.philips.ru/",
    sourceUrl: "https://www.philips.ru/c-w/support-home/support-contact-page.html",
    sourceTitle: "Philips Russia — официальный сайт",
    confirmedFacts: "Официальный сайт Philips в России: philips.ru",
    fetchUrls: ["https://www.philips.ru/c-w/support-home/support-contact-page.html"],
  },
  {
    brandKeys: ["samsung"],
    companyName: "Samsung Electronics Kazakhstan",
    role: "official_distributor",
    region: "Kazakhstan",
    country: "Kazakhstan",
    website: "https://www.samsung.com/kz/",
    sourceUrl: "https://www.samsung.com/kz/business/",
    sourceTitle: "Samsung Kazakhstan Business",
    confirmedFacts: "Официальный раздел B2B Samsung Kazakhstan: samsung.com/kz/business",
    fetchUrls: ["https://www.samsung.com/kz/business/"],
  },
  {
    brandKeys: ["samsung"],
    companyName: "Samsung Electronics Russia",
    role: "official_distributor",
    region: "Russia",
    country: "Russia",
    website: "https://www.samsung.com/ru/",
    sourceUrl: "https://www.samsung.com/ru/business/",
    sourceTitle: "Samsung Russia Business",
    confirmedFacts: "Официальный раздел B2B Samsung Russia: samsung.com/ru/business",
    fetchUrls: ["https://www.samsung.com/ru/business/"],
  },
  {
    brandKeys: ["oralb", "oral-b", "oral b"],
    companyName: "Procter & Gamble — Oral-B",
    role: "brand_owner",
    region: "Global",
    country: "USA",
    website: "https://www.oralb.com/",
    sourceUrl: "https://www.oralb.com/en-us/contact-us/",
    sourceTitle: "Oral-B — контакты производителя",
    confirmedFacts: "Бренд Oral-B принадлежит Procter & Gamble. Официальный сайт: oralb.com",
  },
  {
    brandKeys: ["oralb", "oral-b", "oral b"],
    companyName: 'ТОО BEEV — Oral-B / P&G (через дистрибьюторов KZ)',
    role: "regional_distributor",
    region: "Kazakhstan",
    country: "Kazakhstan",
    website: "https://bioderma.com.kz/",
    email: "info@beev.kz",
    phone: "+7 701 572 26 40",
    sourceUrl: "https://www.flip.kz/descript?cat=seller&id=4853",
    sourceTitle: "Крупные дистрибьюторы дермокосметики KZ (пример канала)",
    confirmedFacts:
      "Для дермокосметики в KZ часто работает BEEV; для Oral-B уточняйте у P&G/KZ-партнёров.",
  },
];

function normalizeBrandText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/gi, "")
    .replace(/institut/g, "institut");
}

function extractBrandKeys(product: Pick<ParsedProduct, "brand" | "title">): string[] {
  const brand = product.brand?.trim() ?? "";
  const title = product.title ?? "";
  const combined = `${brand} ${title}`.toLowerCase();

  const keys = new Set<string>();
  if (brand) {
    keys.add(normalizeBrandText(brand));
    keys.add(brand.toLowerCase().trim());
  }

  for (const entry of KNOWN_DISTRIBUTORS) {
    for (const key of entry.brandKeys) {
      const normalizedKey = normalizeBrandText(key);
      if (
        combined.includes(key) ||
        combined.includes(normalizedKey) ||
        (brand && normalizeBrandText(brand).includes(normalizedKey))
      ) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys);
}

function entryMatches(
  entry: KnownDistributorEntry,
  brandKeys: string[],
  title: string
): boolean {
  if (entry.excludeTitlePatterns?.some((p) => p.test(title))) {
    return false;
  }
  return entry.brandKeys.some((key) => {
    const nk = normalizeBrandText(key);
    return brandKeys.some(
      (bk) => bk === key || normalizeBrandText(bk) === nk || bk.includes(nk)
    );
  });
}

function entryToContact(
  entry: KnownDistributorEntry,
  product: Pick<ParsedProduct, "brand" | "title">,
  productId: string,
  index: number,
  liveEmail?: string | null,
  livePhone?: string | null
): BrandContact {
  const brand =
    product.brand?.trim() || product.title.split(/\s+/)[0] || "Unknown";
  const now = new Date().toISOString();
  const contactId = `bc-known-${Date.now()}-${index}`;
  const email = liveEmail ?? entry.email ?? null;
  const phone = livePhone ?? entry.phone ?? null;

  const evidence: BrandContactEvidence[] = [
    {
      id: `bce-known-${Date.now()}-${index}`,
      brandContactId: contactId,
      evidenceType: "official_website",
      sourceUrl: entry.sourceUrl,
      sourceTitle: entry.sourceTitle,
      excerpt: entry.confirmedFacts,
      extractedValue: email ?? phone ?? entry.website ?? null,
      createdAt: now,
    },
  ];

  const partial = {
    brand,
    companyName: entry.companyName,
    role: entry.role,
    country: entry.country,
    region: entry.region,
    website: entry.website ?? null,
    email,
    phone,
    contactFormUrl: entry.contactFormUrl ?? null,
    linkedinUrl: null,
    sourceUrl: entry.sourceUrl,
    sourceTitle: entry.sourceTitle,
    language: entry.region === "Kazakhstan" || entry.region === "Russia" ? ("ru" as const) : ("en" as const),
    verificationStatus: "source_confirmed" as const,
    confirmedFacts: [
      entry.confirmedFacts,
      entry.address ? `Адрес: ${entry.address}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    checkedAt: now,
    isMock: false,
    evidence,
  };

  const confidenceScore = Math.min(
    98,
    calculateBrandContactConfidence(
      {
        ...partial,
        evidenceTypes: ["official_website"],
        isMock: false,
      },
      product
    ) + 15
  );

  return {
    ...partial,
    id: contactId,
    productId,
    confidenceScore,
    status: confidenceScore >= 80 ? "found" : "needs_manual_check",
    verificationStatus: deriveVerificationStatus(
      confidenceScore,
      false,
      Boolean(email || phone)
    ),
    createdAt: now,
    updatedAt: now,
  };
}

async function enrichFromLiveSite(
  entry: KnownDistributorEntry
): Promise<{ email?: string; phone?: string }> {
  if (!entry.fetchUrls?.length) return {};

  for (const url of entry.fetchUrls.slice(0, 2)) {
    try {
      const parsed = await parseWebsiteContacts(url, entry.companyName);
      if (parsed.length > 0) {
        const site = parsed[0];
        return {
          email: site.emails[0],
          phone: site.phones[0],
        };
      }
    } catch {
      // fallback to static data
    }
  }
  return {};
}

export async function findKnownBrandContacts(
  product: ParsedProduct & { id?: string },
  productId: string
): Promise<BrandContact[]> {
  const brandKeys = extractBrandKeys(product);
  if (brandKeys.length === 0) return [];

  const matched = KNOWN_DISTRIBUTORS.filter((entry) =>
    entryMatches(entry, brandKeys, product.title ?? "")
  );

  const seen = new Set<string>();
  const contacts: BrandContact[] = [];

  for (const [index, entry] of matched.entries()) {
    const dedupeKey = `${entry.companyName}|${entry.region}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const live = await enrichFromLiveSite(entry);
    contacts.push(
      entryToContact(
        entry,
        product,
        productId,
        index,
        live.email,
        live.phone
      )
    );
  }

  return contacts.sort((a, b) => {
    if (a.region === "Kazakhstan" && b.region !== "Kazakhstan") return -1;
    if (b.region === "Kazakhstan" && a.region !== "Kazakhstan") return 1;
    return b.confidenceScore - a.confidenceScore;
  });
}

export { KNOWN_DISTRIBUTORS };
