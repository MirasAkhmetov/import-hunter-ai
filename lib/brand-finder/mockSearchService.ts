import type { BrandContactRegion, BrandContactRole } from "../types/brandFinder";
import type { BrandSearchQuery } from "./searchQueryBuilder";

export interface MockSearchResult {
  query: string;
  language: "ru" | "en";
  title: string;
  url: string;
  snippet: string;
  companyName: string;
  role: BrandContactRole;
  region: BrandContactRegion;
  country: string;
  website?: string;
  email?: string;
  phone?: string;
  contactFormUrl?: string;
  linkedinUrl?: string;
  isMock?: boolean;
}

const BRAND_MOCK_DATA: Record<
  string,
  Omit<MockSearchResult, "query" | "language">[]
> = {
  apple: [
    {
      title: "Apple Inc. — Official Site",
      url: "https://www.apple.com/contact/",
      snippet: "Apple brand owner and global manufacturer",
      companyName: "Apple Inc.",
      role: "brand_owner",
      region: "Global",
      country: "USA",
      website: "https://www.apple.com",
      email: "business@apple.com",
      contactFormUrl: "https://www.apple.com/contact/",
      linkedinUrl: "https://www.linkedin.com/company/apple",
    },
    {
      title: "Apple Authorized Reseller Kazakhstan",
      url: "https://example.kz/apple-distributor",
      snippet: "Official Apple distributor in Kazakhstan",
      companyName: "Technodom Distribution KZ",
      role: "official_distributor",
      region: "Kazakhstan",
      country: "Kazakhstan",
      website: "https://technodom.kz/b2b",
      email: "b2b@technodom.kz",
      phone: "+7 727 300 0000",
    },
    {
      title: "Apple Russia Official Partner",
      url: "https://example.ru/apple-partner",
      snippet: "Authorized Apple distributor Russia",
      companyName: "re:Store",
      role: "official_distributor",
      region: "Russia",
      country: "Russia",
      website: "https://re-store.ru/b2b",
      email: "partners@re-store.ru",
      phone: "+7 495 000 0000",
    },
  ],
  braun: [
    {
      title: "Braun — De'Longhi Group",
      url: "https://www.braun.com/en-us/contact",
      snippet: "Braun brand owner De'Longhi Group",
      companyName: "De'Longhi Group (Braun)",
      role: "brand_owner",
      region: "Global",
      country: "Germany",
      website: "https://www.braun.com",
      email: "info@braun.com",
      contactFormUrl: "https://www.braun.com/en-us/contact",
    },
    {
      title: "Braun официальный дистрибьютор Казахстан",
      url: "https://example.kz/braun-kz",
      snippet: "Официальный дистрибьютор Braun в Казахстане",
      companyName: "Sulpak Distribution",
      role: "official_distributor",
      region: "Kazakhstan",
      country: "Kazakhstan",
      website: "https://sulpak.kz/b2b",
      email: "opt@sulpak.kz",
      phone: "+7 727 250 0000",
    },
    {
      title: "Braun Russia wholesale",
      url: "https://example.ru/braun-wholesale",
      snippet: "Braun official distributor Russia EAEU",
      companyName: "M.Video B2B",
      role: "regional_distributor",
      region: "Russia",
      country: "Russia",
      email: "wholesale@mvideo.ru",
      phone: "+7 495 777 0000",
    },
  ],
  philips: [
    {
      title: "Philips — Contact us",
      url: "https://www.philips.com/contact",
      snippet: "Philips brand owner global contacts",
      companyName: "Philips",
      role: "brand_owner",
      region: "Global",
      country: "Netherlands",
      website: "https://www.philips.com",
      email: "business@philips.com",
      contactFormUrl: "https://www.philips.com/contact",
      linkedinUrl: "https://www.linkedin.com/company/philips",
    },
    {
      title: "Philips Kazakhstan distributor",
      url: "https://example.kz/philips-kz",
      snippet: "Official Philips distributor Kazakhstan",
      companyName: "Philips Kazakhstan LLP",
      role: "official_distributor",
      region: "Kazakhstan",
      country: "Kazakhstan",
      email: "sales.kz@philips.com",
      phone: "+7 727 390 0000",
    },
    {
      title: "Philips EAEU partner",
      url: "https://example.ru/philips-eaeu",
      snippet: "Philips EAEU regional distributor",
      companyName: "Philips Russia",
      role: "regional_distributor",
      region: "EAEU",
      country: "Russia",
      website: "https://www.philips.ru/b2b",
      email: "b2b@philips.ru",
    },
  ],
  samsung: [
    {
      title: "Samsung Electronics — Business",
      url: "https://www.samsung.com/business/",
      snippet: "Samsung brand owner business contacts",
      companyName: "Samsung Electronics",
      role: "brand_owner",
      region: "Global",
      country: "South Korea",
      website: "https://www.samsung.com",
      email: "business@samsung.com",
      contactFormUrl: "https://www.samsung.com/us/business/contact-us/",
      linkedinUrl: "https://www.linkedin.com/company/samsung-electronics",
    },
    {
      title: "Samsung Kazakhstan official",
      url: "https://example.kz/samsung-kz",
      snippet: "Samsung official distributor Kazakhstan",
      companyName: "Samsung Electronics Kazakhstan",
      role: "official_distributor",
      region: "Kazakhstan",
      country: "Kazakhstan",
      website: "https://www.samsung.com/kz/business/",
      email: "b2b.kz@samsung.com",
      phone: "+7 727 330 0000",
    },
    {
      title: "Samsung Russia distributor",
      url: "https://example.ru/samsung-ru",
      snippet: "Samsung official distributor Russia",
      companyName: "Samsung Electronics Russia",
      role: "official_distributor",
      region: "Russia",
      country: "Russia",
      email: "partners@samsung.ru",
      phone: "+7 495 555 0000",
    },
  ],
};

export function markMockSearchResults(
  results: MockSearchResult[]
): MockSearchResult[] {
  return results.map((r) => ({ ...r, isMock: true }));
}

export async function mockWebSearch(
  queries: BrandSearchQuery[],
  brandName: string
): Promise<MockSearchResult[]> {
  await new Promise((r) => setTimeout(r, 300));

  const normalizedBrand = brandName.toLowerCase().trim();
  const brandKey = Object.keys(BRAND_MOCK_DATA).find((key) =>
    normalizedBrand.includes(key)
  );

  const baseResults = brandKey ? BRAND_MOCK_DATA[brandKey] : [];

  if (baseResults.length === 0) {
    return markMockSearchResults(
      queries.slice(0, 2).map((q, i) => ({
        query: q.query,
        language: q.language,
        title: `${brandName} — search result ${i + 1}`,
        url: `https://example.com/search?q=${encodeURIComponent(q.query)}`,
        snippet: `Possible contact for ${brandName}`,
        companyName: `${brandName} Partner ${i + 1}`,
        role: "unknown" as BrandContactRole,
        region: q.language === "ru" ? "Kazakhstan" : "Global",
        country: q.language === "ru" ? "Kazakhstan" : "Unknown",
        email: i === 0 ? `info@${normalizedBrand.replace(/\s+/g, "")}.com` : undefined,
      }))
    );
  }

  return markMockSearchResults(
    queries.flatMap((q, qi) =>
      baseResults.map((result, ri) => ({
        ...result,
        query: q.query,
        language: q.language,
        title: `${result.title} (${q.language.toUpperCase()} #${qi * baseResults.length + ri + 1})`,
      }))
    )
  );
}

export function dedupeSearchResults(
  results: MockSearchResult[]
): MockSearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.companyName.toLowerCase()}|${r.region}|${r.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
