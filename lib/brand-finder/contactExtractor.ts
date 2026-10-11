import type {
  BrandContact,
  BrandContactEvidence,
  BrandContactRole,
} from "../types/brandFinder";
import {
  calculateBrandContactConfidence,
  deriveVerificationStatus,
} from "./confidenceScoring";
import type { ParsedProduct } from "../types";
import type { ParsedWebsiteContact } from "./websiteContactParser";

export interface ExtractedContact
  extends Omit<
    BrandContact,
    "id" | "productId" | "confidenceScore" | "status" | "createdAt" | "updatedAt"
  > {
  confidenceScore?: number;
}

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
