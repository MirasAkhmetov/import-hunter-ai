import type {
  BrandContactEvidenceType,
  BrandContactRegion,
  BrandContactRole,
} from "../types/brandFinder";
import type { ParsedProduct } from "../types";

export interface ConfidenceInput {
  role: BrandContactRole;
  region: BrandContactRegion;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contactFormUrl?: string | null;
  sourceUrl?: string | null;
  companyName: string;
  evidenceTypes?: BrandContactEvidenceType[];
  isMock?: boolean;
}

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "mail.ru",
  "yahoo.com",
  "yandex.ru",
  "hotmail.com",
  "outlook.com",
];

const TARGET_REGIONS: BrandContactRegion[] = ["Kazakhstan", "Russia", "EAEU"];

export function calculateBrandContactConfidence(
  contact: ConfidenceInput,
  product: Pick<ParsedProduct, "brand" | "title">
): number {
  if (contact.isMock) {
    return Math.min(50, 30);
  }

  let score = 0;
  const sourceUrl = (contact.sourceUrl ?? "").toLowerCase();
  const brand = (product.brand ?? product.title.split(/\s+/)[0] ?? "").toLowerCase();

  const hasLegalTermsPage =
    sourceUrl.includes("legal-terms") ||
    sourceUrl.includes("legal/") ||
    sourceUrl.includes("privacy-policy") ||
    contact.evidenceTypes?.includes("legal_terms_page");

  const hasDistributorPage =
    sourceUrl.includes("distributor") ||
    sourceUrl.includes("partner") ||
    sourceUrl.includes("wholesale") ||
    sourceUrl.includes("b2b") ||
    contact.evidenceTypes?.includes("distributor_page");

  const hasOfficialSite =
    contact.website &&
    brand &&
    (contact.website.toLowerCase().includes(brand.replace(/\s+/g, "")) ||
      contact.website.endsWith(".kz") ||
      contact.website.endsWith(".ru"));

  const hasContactPage =
    sourceUrl.includes("contact") ||
    contact.evidenceTypes?.includes("contact_page");

  if (hasLegalTermsPage && contact.region === "Kazakhstan") {
    score += 92;
  } else if (hasLegalTermsPage) {
    score += 88;
  } else if (hasOfficialSite && hasDistributorPage) {
    score += 95;
  } else if (hasOfficialSite && hasContactPage) {
    score += 90;
  } else if (hasDistributorPage) {
    score += 85;
  } else if (hasOfficialSite) {
    score += 75;
  } else if (hasContactPage) {
    score += 70;
  }

  if (contact.website) {
    score += 10;
    if (brand && contact.website.toLowerCase().includes(brand.replace(/\s+/g, ""))) {
      score += 5;
    }
  }

  if (contact.contactFormUrl || contact.website?.includes("contact")) {
    score += 8;
  }

  if (TARGET_REGIONS.includes(contact.region)) {
    score += 12;
  }

  if (contact.email) {
    const domain = contact.email.split("@")[1]?.toLowerCase() ?? "";
    if (domain && !PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      score += 12;
    } else if (domain) {
      score += 3;
    }
  }

  if (contact.role === "brand_owner" || contact.role === "official_distributor") {
    score += 15;
  } else if (contact.role === "regional_distributor") {
    score += 10;
  } else if (contact.role === "wholesaler") {
    score += 6;
  }

  if (contact.phone) score += 6;

  if (contact.sourceUrl && !sourceUrl.includes("example.com")) {
    score += 8;
  }

  if (contact.companyName.length > 3) score += 4;

  return Math.min(100, Math.max(0, score));
}

export function deriveVerificationStatus(
  confidenceScore: number,
  isMock: boolean,
  hasContactData: boolean
): "source_confirmed" | "needs_manual_check" | "rejected" {
  if (!hasContactData) return "needs_manual_check";
  if (isMock) return "needs_manual_check";
  if (confidenceScore >= 85) return "source_confirmed";
  return "needs_manual_check";
}

export function getConfidenceLevel(
  score: number
): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function getConfidenceLevelLabel(score: number): string {
  const level = getConfidenceLevel(score);
  if (level === "high") return "Высокая";
  if (level === "medium") return "Средняя";
  return "Низкая";
}
