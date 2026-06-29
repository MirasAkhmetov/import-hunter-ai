import type { BrandContactEvidenceType } from "../types/brandFinder";

export interface ParsedWebsiteContact {
  emails: string[];
  phones: string[];
  contactFormUrls: string[];
  website?: string;
  sourceUrl: string;
  sourceTitle?: string;
  evidenceType: BrandContactEvidenceType;
  htmlExcerpt: string;
}

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{2}[\s-]?\d{2,3}(?:[\s-]?\d{2,3})?/g;

const CONTACT_PATH_HINTS = [
  "/legal-terms/",
  "/legal-terms",
  "/legal/",
  "/privacy-policy/",
  "/terms/",
  "/oferta/",
  "/requisites/",
  "/contact",
  "/contacts",
  "/distributor",
  "/distributors",
  "/partner",
  "/partners",
  "/wholesale",
  "/b2b",
  "/about",
];

export async function parseWebsiteContacts(
  baseUrl: string,
  brandName: string
): Promise<ParsedWebsiteContact[]> {
  const results: ParsedWebsiteContact[] = [];
  const urlsToTry = buildContactUrls(baseUrl);

  for (const url of urlsToTry.slice(0, 4)) {
    try {
      const parsed = await fetchAndParseContactPage(url, brandName);
      if (parsed && (parsed.emails.length > 0 || parsed.phones.length > 0)) {
        results.push(parsed);
      }
    } catch {
      // skip unreachable pages
    }
  }

  return results;
}

function buildContactUrls(baseUrl: string): string[] {
  let origin: string;
  try {
    const parsed = new URL(baseUrl);
    origin = parsed.origin;
  } catch {
    return [baseUrl];
  }

  const urls = [baseUrl];
  for (const hint of CONTACT_PATH_HINTS) {
    urls.push(`${origin}${hint}`);
  }
  return [...new Set(urls)];
}

async function fetchAndParseContactPage(
  url: string,
  brandName: string
): Promise<ParsedWebsiteContact | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "ImportHunterBot/1.0 (+https://import-hunter.local; brand-contact-finder)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) return null;

  const html = await response.text();
  const textContent = stripHtml(html);

  if (!textContent.toLowerCase().includes(brandName.toLowerCase().slice(0, 3))) {
    // Page may still be valid contact page even without brand mention
  }

  const emails = extractUniqueMatches(html, EMAIL_REGEX).filter(isValidEmail);
  const phones = extractUniqueMatches(textContent, PHONE_REGEX)
    .map(normalizePhone)
    .filter((p) => p.length >= 10);

  const contactFormUrls = findContactFormUrls(html, url);
  const evidenceType: BrandContactEvidenceType = url.includes("legal-terms") ||
    url.includes("legal/")
    ? "legal_terms_page"
    : url.includes("contact")
      ? "contact_page"
      : url.includes("distributor") || url.includes("partner")
        ? "distributor_page"
        : "website_html";

  if (
    emails.length === 0 &&
    phones.length === 0 &&
    contactFormUrls.length === 0 &&
    !url.includes("legal")
  ) {
    return null;
  }

  return {
    emails,
    phones,
    contactFormUrls,
    website: safeOrigin(url),
    sourceUrl: url,
    sourceTitle: extractTitle(html),
    evidenceType,
    htmlExcerpt: textContent.slice(0, 500),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUniqueMatches(text: string, regex: RegExp): string[] {
  const matches = text.match(regex) ?? [];
  return [...new Set(matches.map((m) => m.trim()))];
}

function isValidEmail(email: string): boolean {
  if (email.endsWith(".png") || email.endsWith(".jpg")) return false;
  if (email.includes("example.com") || email.includes("sentry")) return false;
  return true;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, " ").trim();
}

function findContactFormUrls(html: string, pageUrl: string): string[] {
  const forms: string[] = [];
  const actionRegex = /<form[^>]+action=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = actionRegex.exec(html)) !== null) {
    try {
      forms.push(new URL(match[1], pageUrl).href);
    } catch {
      // skip invalid
    }
  }
  if (pageUrl.includes("contact")) forms.push(pageUrl);
  return [...new Set(forms)];
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export function parseContactsFromText(
  text: string,
  sourceUrl: string,
  sourceTitle?: string
): Pick<ParsedWebsiteContact, "emails" | "phones" | "htmlExcerpt"> {
  return {
    emails: extractUniqueMatches(text, EMAIL_REGEX).filter(isValidEmail),
    phones: extractUniqueMatches(text, PHONE_REGEX)
      .map(normalizePhone)
      .filter((p) => p.length >= 10),
    htmlExcerpt: text.slice(0, 500),
  };
}
