import type {
  BrandContact,
  BrandContactEvidence,
  BrandContactRole,
  BrandContactStatus,
  BrandContactVerificationStatus,
} from "../types/brandFinder";
import {
  calculateBrandContactConfidence,
  deriveVerificationStatus,
} from "./confidenceScoring";
import type { ParsedProduct } from "../types";
import type { MockSearchResult } from "./mockSearchService";
import type { ParsedWebsiteContact } from "./websiteContactParser";
import { parseContactsFromText } from "./websiteContactParser";

export interface ExtractedContact
  extends Omit<
    BrandContact,
    "id" | "productId" | "confidenceScore" | "status" | "createdAt" | "updatedAt"
  > {
  confidenceScore?: number;
}

type SearchResultInput = MockSearchResult;

const ROLE_PATTERNS: Array<{ pattern: RegExp; role: BrandContactRole }> = [
  { pattern: /brand owner|правообладатель|manufacturer/i, role: "brand_owner" },
  {
    pattern: /official distributor|официальный дистрибьютор|authorized/i,
    role: "official_distributor",
  },
  {
    pattern: /regional distributor|региональный дистрибьютор/i,
    role: "regional_distributor",
  },
  { pattern: /wholesale|оптов/i, role: "wholesaler" },
  { pattern: /marketplace seller|продавец на маркетплейсе/i, role: "marketplace_seller" },
];

function detectRoleFromText(text: string): BrandContactRole {
  for (const { pattern, role } of ROLE_PATTERNS) {
    if (pattern.test(text)) return role;
  }
  return "unknown";
}

function detectRegionFromText(text: string): BrandContact["region"] {
  if (/kazakhstan|казахстан|\.kz\b/i.test(text)) return "Kazakhstan";
  if (/russia|россия|\.ru\b/i.test(text)) return "Russia";
  if (/eaeu|еаэс|eac/i.test(text)) return "EAEU";
  if (/turkey|турция|\.tr\b/i.test(text)) return "Turkey";
  if (/uae|оаэ|dubai|\.ae\b/i.test(text)) return "UAE";
  if (/china|китай|\.cn\b/i.test(text)) return "China";
  return "Global";
}

function extractCompanyName(result: SearchResultInput): string {
  if ("companyName" in result && result.companyName) {
    return result.companyName;
  }
  try {
    const host = new URL(result.url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return result.title.split(/[|\-–—]/)[0]?.trim() || "Unknown";
  }
}

function buildEvidence(
  brandContactId: string,
  result: SearchResultInput,
  isMock: boolean,
  websiteData?: ParsedWebsiteContact
): BrandContactEvidence[] {
  const now = new Date().toISOString();
  const evidence: BrandContactEvidence[] = [];

  const snippetContacts = parseContactsFromText(
    `${result.title} ${result.snippet}`,
    result.url,
    result.title
  );

  if (result.snippet || result.title) {
    evidence.push({
      id: `bce-${Date.now()}-snippet`,
      brandContactId,
      evidenceType: isMock ? "mock_data" : "search_snippet",
      sourceUrl: result.url,
      sourceTitle: result.title,
      excerpt: result.snippet || result.title,
      extractedValue:
        snippetContacts.emails[0] ?? snippetContacts.phones[0] ?? null,
      createdAt: now,
    });
  }

  if (websiteData) {
    for (const email of websiteData.emails.slice(0, 2)) {
      evidence.push({
        id: `bce-${Date.now()}-web-${email}`,
        brandContactId,
        evidenceType: websiteData.evidenceType,
        sourceUrl: websiteData.sourceUrl,
        sourceTitle: websiteData.sourceTitle,
        excerpt: websiteData.htmlExcerpt.slice(0, 300),
        extractedValue: email,
        createdAt: now,
      });
    }
  }

  return evidence;
}

export function extractContactsFromSearchResults(
  results: SearchResultInput[],
  product: Pick<ParsedProduct, "brand" | "title">,
  productId: string,
  options?: {
    isMock?: boolean;
    websiteContacts?: ParsedWebsiteContact[];
  }
): BrandContact[] {
  const brand =
    product.brand?.trim() ||
    product.title.split(/\s+/)[0] ||
    "Unknown";

  const now = new Date().toISOString();
  const isMock = options?.isMock ?? false;
  const websiteByUrl = new Map(
    (options?.websiteContacts ?? []).map((w) => [w.sourceUrl, w])
  );

  const contacts: BrandContact[] = [];

  for (const [index, result] of results.entries()) {
    const combinedText = `${result.title} ${result.snippet}`;
    const textContacts = parseContactsFromText(combinedText, result.url, result.title);

    const mockResult = result as MockSearchResult;
    const email =
      mockResult.email ??
      textContacts.emails[0] ??
      null;
    const phone =
      mockResult.phone ??
      textContacts.phones[0] ??
      null;

    if (!email && !phone && !mockResult.contactFormUrl && !mockResult.website) {
      continue;
    }

    const websiteData = websiteByUrl.get(result.url);
    const webEmails = websiteData?.emails ?? [];
    const webPhones = websiteData?.phones ?? [];

    const finalEmail = email ?? webEmails[0] ?? null;
    const finalPhone = phone ?? webPhones[0] ?? null;

    if (!finalEmail && !finalPhone && !mockResult.contactFormUrl) {
      continue;
    }

    const contactId = `bc-extract-${Date.now()}-${index}`;
    const role =
      mockResult.role && mockResult.role !== "unknown"
        ? mockResult.role
        : detectRoleFromText(combinedText);
    const region = mockResult.region ?? detectRegionFromText(combinedText);
    const evidence = buildEvidence(contactId, result, isMock, websiteData);

    const partial: ExtractedContact = {
      brand,
      companyName: extractCompanyName(result),
      role,
      country: mockResult.country ?? detectRegionFromText(combinedText),
      region,
      website: mockResult.website ?? websiteData?.website ?? null,
      email: finalEmail,
      phone: finalPhone,
      contactFormUrl:
        mockResult.contactFormUrl ?? websiteData?.contactFormUrls[0] ?? null,
      linkedinUrl: mockResult.linkedinUrl ?? null,
      sourceUrl: result.url,
      sourceTitle: result.title,
      language: result.language,
      verificationStatus: "needs_manual_check",
      confirmedFacts: buildConfirmedFacts(finalEmail, finalPhone, result.url),
      checkedAt: now,
      isMock,
      evidence,
    };

    const confidenceScore = calculateBrandContactConfidence(
      {
        ...partial,
        evidenceTypes: evidence.map((e) => e.evidenceType),
        isMock,
      },
      product
    );

    const verificationStatus: BrandContactVerificationStatus =
      deriveVerificationStatus(confidenceScore, isMock, Boolean(finalEmail || finalPhone));

    const status: BrandContactStatus =
      verificationStatus === "source_confirmed" ? "found" : "needs_manual_check";

    contacts.push({
      ...partial,
      id: contactId,
      productId,
      confidenceScore,
      status,
      verificationStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  return dedupeContacts(contacts);
}

function buildConfirmedFacts(
  email: string | null,
  phone: string | null,
  sourceUrl: string
): string {
  const facts: string[] = [];
  if (email) facts.push(`Email найден в источнике: ${email}`);
  if (phone) facts.push(`Телефон найден в источнике: ${phone}`);
  facts.push(`Источник: ${sourceUrl}`);
  return facts.join(". ");
}

function dedupeContacts(contacts: BrandContact[]): BrandContact[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    const key = `${(c.email ?? "").toLowerCase()}|${c.phone ?? ""}|${c.sourceUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractContactsFromWebsiteOnly(
  websiteContacts: ParsedWebsiteContact[],
  product: Pick<ParsedProduct, "brand" | "title">,
  productId: string
): BrandContact[] {
  const brand =
    product.brand?.trim() ||
    product.title.split(/\s+/)[0] ||
    "Unknown";
  const now = new Date().toISOString();
  const contacts: BrandContact[] = [];

  for (const [index, site] of websiteContacts.entries()) {
    const email = site.emails[0] ?? null;
    const phone = site.phones[0] ?? null;
    if (!email && !phone && site.contactFormUrls.length === 0) continue;

    const contactId = `bc-web-${Date.now()}-${index}`;
    const evidence: BrandContactEvidence[] = [
      {
        id: `bce-web-${Date.now()}-${index}`,
        brandContactId: contactId,
        evidenceType: site.evidenceType,
        sourceUrl: site.sourceUrl,
        sourceTitle: site.sourceTitle,
        excerpt: site.htmlExcerpt.slice(0, 300),
        extractedValue: email ?? phone ?? null,
        createdAt: now,
      },
    ];

    const partial: ExtractedContact = {
      brand,
      companyName: site.sourceTitle?.split(/[|\-–—]/)[0]?.trim() || brand,
      role: detectRoleFromText(site.htmlExcerpt),
      country: detectRegionFromText(site.htmlExcerpt),
      region: detectRegionFromText(site.htmlExcerpt),
      website: site.website ?? null,
      email,
      phone,
      contactFormUrl: site.contactFormUrls[0] ?? null,
      linkedinUrl: null,
      sourceUrl: site.sourceUrl,
      sourceTitle: site.sourceTitle,
      language: "ru",
      verificationStatus: "needs_manual_check",
      confirmedFacts: buildConfirmedFacts(email, phone, site.sourceUrl),
      checkedAt: now,
      isMock: false,
      evidence,
    };

    const confidenceScore = calculateBrandContactConfidence(
      {
        ...partial,
        evidenceTypes: [site.evidenceType],
        isMock: false,
      },
      product
    );

    contacts.push({
      ...partial,
      id: contactId,
      productId,
      confidenceScore,
      status:
        confidenceScore >= 85 ? "found" : "needs_manual_check",
      verificationStatus: deriveVerificationStatus(
        confidenceScore,
        false,
        Boolean(email || phone)
      ),
      createdAt: now,
      updatedAt: now,
    });
  }

  return dedupeContacts(contacts);
}
