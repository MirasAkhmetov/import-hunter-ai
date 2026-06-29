import type {
  BrandContact,
  BrandContactEvidence,
  BrandContactRegion,
} from "../types/brandFinder";
import type { ParsedProduct } from "../types";
import {
  calculateBrandContactConfidence,
  deriveVerificationStatus,
} from "./confidenceScoring";
import { parseContactsFromText } from "./websiteContactParser";

export interface ParsedLegalRightsPage {
  companyName: string | null;
  bin: string | null;
  address: string | null;
  emails: string[];
  phones: string[];
  rightsExcerpt: string | null;
  confirmedFacts: string;
  sourceUrl: string;
  sourceTitle: string;
  region: BrandContactRegion;
  roleLabel: string;
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

const LEGAL_PATHS = [
  "/legal-terms/",
  "/legal-terms",
  "/legal/",
  "/privacy-policy/",
  "/terms/",
  "/oferta/",
  "/requisites/",
  "/about/legal/",
  "/info/legal/",
];

function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function buildLegalPageCandidates(
  brand: string
): Array<{ url: string; region: BrandContactRegion }> {
  const slug = brandSlug(brand);
  if (!slug) return [];

  const kzHosts = [
    `${slug}-shop.kz`,
    `${slug}.kz`,
    `www.${slug}.kz`,
    `shop.${slug}.kz`,
    `${slug}shop.kz`,
  ];

  const ruHosts = [
    `${slug}.ru`,
    `www.${slug}.ru`,
    `${slug}-shop.ru`,
    `shop.${slug}.ru`,
  ];

  const urls: Array<{ url: string; region: BrandContactRegion }> = [];

  for (const host of kzHosts) {
    for (const path of LEGAL_PATHS) {
      urls.push({ url: `https://${host}${path}`, region: "Kazakhstan" });
    }
  }

  for (const host of ruHosts) {
    for (const path of LEGAL_PATHS) {
      urls.push({ url: `https://${host}${path}`, region: "Russia" });
    }
  }

  return urls;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "Юридическая информация";
}

function extractCompanyName(text: string): string | null {
  const patterns = [
    /ТОО\s*[«"']([^»"']+)[»"']/i,
    /Товарищество с ограниченной ответственностью\s*[«"']([^»"']+)[»"']/i,
    /(?:Поставщик|Правообладатель)[^«"']*[«"']([^»"']+)[»"']/i,
    /ТОО\s+([A-ZА-ЯЁa-zа-яё0-9][^,.(\n]{2,80})/i,
    /(?:LLP|LLC|Inc\.|GmbH)\s+[«"']?([^»"'.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      const name = match[1].trim().replace(/\s+/g, " ").slice(0, 120);
      if (/^Делонги$/i.test(name)) return `ТОО «${name}»`;
      return name;
    }
  }
  return null;
}

function extractBin(text: string): string | null {
  return text.match(/БИН\s*(\d{12})/i)?.[1] ?? null;
}

function extractAddress(text: string): string | null {
  const match = text.match(
    /(?:адрес|Address)[:\s]*([^.\n]{10,200}(?:050\d{3}|Алматы|Астана|Москва)[^.\n]{0,80})/i
  );
  if (match?.[1]) return match[1].trim().slice(0, 200);

  const addr2 = text.match(
    /(?:Республика Казахстан[^.]{0,120}(?:050\d{3}|ул\.|улица)[^.]{0,80})/i
  );
  return addr2?.[0]?.trim().slice(0, 200) ?? null;
}

function extractRightsExcerpt(text: string): string | null {
  const patterns = [
    /правообладател[^.]{0,400}\./i,
    /Поставщик[^.]{0,400}\./i,
    /официальн[^.]{0,300}(?:магазин|дистрибьютор|представитель)[^.]{0,200}\./i,
    /интеллектуальн[^.]{0,300}\./i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0].trim().slice(0, 400);
  }
  return null;
}

function detectRoleLabel(text: string): string {
  if (/правообладател/i.test(text)) return "Правообладатель (указано на странице)";
  if (/Поставщик|дистрибьютор|official distributor/i.test(text)) {
    return "Официальный поставщик / дистрибьютор (указано на странице)";
  }
  return "Юридическое лицо на официальном сайте бренда";
}

export async function fetchLegalRightsPage(
  url: string,
  region: BrandContactRegion
): Promise<ParsedLegalRightsPage | null> {
  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const text = stripHtml(html);

    if (text.length < 200) return null;

    const hasLegalSignal =
      /правообладател|Поставщик|БИН|юридическ|legal|terms|оферт|дистрибьютор|intellectual property/i.test(
        text
      );

    if (!hasLegalSignal) return null;

    const contacts = parseContactsFromText(text, url, extractTitle(html));
    const companyName = extractCompanyName(text);
    const bin = extractBin(text);
    const address = extractAddress(text);
    const rightsExcerpt = extractRightsExcerpt(text);
    const phones = contacts.phones.filter(
      (p) => !bin || p.replace(/\D/g, "") !== bin
    );

    if (
      !companyName &&
      contacts.emails.length === 0 &&
      contacts.phones.length === 0 &&
      !rightsExcerpt
    ) {
      return null;
    }

    const facts: string[] = [];
    if (companyName) facts.push(`Юр. лицо на странице: ${companyName}`);
    if (bin) facts.push(`БИН: ${bin}`);
    if (address) facts.push(`Адрес: ${address}`);
    if (rightsExcerpt) facts.push(`Текст: ${rightsExcerpt.slice(0, 180)}…`);
    if (contacts.emails[0]) facts.push(`Email на странице: ${contacts.emails[0]}`);
    facts.push(`Источник: ${url}`);

    return {
      companyName,
      bin,
      address,
      emails: contacts.emails,
      phones,
      rightsExcerpt,
      confirmedFacts: facts.join(". "),
      sourceUrl: url,
      sourceTitle: extractTitle(html),
      region,
      roleLabel: detectRoleLabel(text),
    };
  } catch {
    return null;
  }
}

export async function findLegalRightsContacts(
  product: Pick<ParsedProduct, "brand" | "title">,
  productId: string
): Promise<BrandContact[]> {
  const brand =
    product.brand?.trim() ||
    product.title.split(/\s+/)[0] ||
    "";

  if (!brand) return [];

  const candidates = buildLegalPageCandidates(brand);
  const kzCandidates = candidates.filter((c) => c.region === "Kazakhstan");
  const ruCandidates = candidates.filter((c) => c.region === "Russia");

  const parsed: ParsedLegalRightsPage[] = [];

  for (const { url, region } of kzCandidates.slice(0, 12)) {
    const page = await fetchLegalRightsPage(url, region);
    if (page) parsed.push(page);
    if (parsed.some((p) => p.sourceUrl.includes("legal-terms"))) break;
  }

  if (parsed.length === 0) {
    for (const { url, region } of ruCandidates.slice(0, 10)) {
      const page = await fetchLegalRightsPage(url, region);
      if (page) parsed.push(page);
    }
  }

  const now = new Date().toISOString();
  const contacts: BrandContact[] = [];

  for (const [index, page] of parsed.entries()) {
    const contactId = `bc-legal-${Date.now()}-${index}`;
    const email = page.emails[0] ?? null;
    const phone = page.phones[0] ?? null;

    const evidence: BrandContactEvidence[] = [
      {
        id: `bce-legal-${Date.now()}-${index}`,
        brandContactId: contactId,
        evidenceType: "legal_terms_page",
        sourceUrl: page.sourceUrl,
        sourceTitle: page.sourceTitle,
        excerpt: page.rightsExcerpt ?? page.confirmedFacts.slice(0, 300),
        extractedValue: email ?? page.companyName,
        createdAt: now,
      },
    ];

    const role =
      /правообладател/i.test(page.rightsExcerpt ?? "")
        ? "brand_owner"
        : /дистрибьютор|Поставщик|official/i.test(page.rightsExcerpt ?? page.confirmedFacts)
          ? "official_distributor"
          : "regional_distributor";

    const partial = {
      brand,
      companyName: page.companyName ?? page.sourceTitle.split(/[|\-–—]/)[0]?.trim() ?? brand,
      role: role as BrandContact["role"],
      country: page.region === "Kazakhstan" ? "Казахстан" : "Россия",
      region: page.region,
      website: safeOrigin(page.sourceUrl),
      email,
      phone,
      contactFormUrl: null,
      linkedinUrl: null,
      sourceUrl: page.sourceUrl,
      sourceTitle: page.sourceTitle,
      language: "ru" as const,
      verificationStatus: "needs_manual_check" as const,
      confirmedFacts: `${page.roleLabel}. ${page.confirmedFacts}`,
      checkedAt: now,
      isMock: false,
      evidence,
    };

    const confidenceScore = Math.min(
      100,
      calculateBrandContactConfidence(
        {
          ...partial,
          evidenceTypes: ["legal_terms_page"],
          isMock: false,
        },
        product
      ) + (page.region === "Kazakhstan" ? 5 : 0) + (page.bin ? 5 : 0)
    );

    contacts.push({
      ...partial,
      id: contactId,
      productId,
      confidenceScore,
      status: confidenceScore >= 70 ? "found" : "needs_manual_check",
      verificationStatus: deriveVerificationStatus(
        confidenceScore,
        false,
        Boolean(email || phone || page.companyName)
      ),
      createdAt: now,
      updatedAt: now,
    });
  }

  return dedupeLegalContacts(contacts);
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function dedupeLegalContacts(contacts: BrandContact[]): BrandContact[] {
  const seen = new Set<string>();
  return contacts
    .sort((a, b) => {
      const aLegal = a.sourceUrl?.includes("legal-terms") ? 1 : 0;
      const bLegal = b.sourceUrl?.includes("legal-terms") ? 1 : 0;
      if (aLegal !== bLegal) return bLegal - aLegal;
      if (a.region === "Kazakhstan" && b.region !== "Kazakhstan") return -1;
      if (b.region === "Kazakhstan" && a.region !== "Kazakhstan") return 1;
      return b.confidenceScore - a.confidenceScore;
    })
    .filter((c) => {
      const normalizedUrl = c.sourceUrl?.replace(/\/$/, "") ?? "";
      const key = `${normalizedUrl}|${c.companyName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
