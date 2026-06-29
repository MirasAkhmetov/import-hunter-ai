export type BrandContactRole =
  | "brand_owner"
  | "official_distributor"
  | "regional_distributor"
  | "wholesaler"
  | "marketplace_seller"
  | "unknown";

export type BrandContactRegion =
  | "Kazakhstan"
  | "Russia"
  | "EAEU"
  | "Global"
  | "Turkey"
  | "UAE"
  | "China"
  | "Other";

export type BrandContactStatus =
  | "found"
  | "needs_manual_check"
  | "verified_by_user"
  | "rejected";

export type BrandContactVerificationStatus =
  | "source_confirmed"
  | "needs_manual_check"
  | "rejected"
  | "manually_verified";

export type BrandContactEvidenceType =
  | "official_website"
  | "legal_terms_page"
  | "search_snippet"
  | "website_html"
  | "contact_page"
  | "distributor_page"
  | "trademark_registry"
  | "marketplace_store"
  | "search_result"
  | "manual_entry"
  | "mock_data";

export type OutreachEmailStatus =
  | "draft"
  | "copied"
  | "sent_manually"
  | "replied"
  | "rejected";

export interface BrandContactEvidence {
  id: string;
  brandContactId: string;
  evidenceType: BrandContactEvidenceType;
  sourceUrl: string;
  sourceTitle?: string | null;
  excerpt: string;
  extractedValue?: string | null;
  createdAt: string;
}

export interface BrandContact {
  id: string;
  productId: string;
  brand: string;
  companyName: string;
  role: BrandContactRole;
  country: string;
  region: BrandContactRegion;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contactFormUrl?: string | null;
  linkedinUrl?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  confidenceScore: number;
  language: "ru" | "en";
  status: BrandContactStatus;
  verificationStatus: BrandContactVerificationStatus;
  confirmedFacts?: string | null;
  checkedAt?: string | null;
  isMock: boolean;
  evidence?: BrandContactEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandFinderMeta {
  mockBrandContactsEnabled: boolean;
  mockMode: boolean;
  message?: string;
}

export interface BrandFinderResult {
  contacts: BrandContact[];
  meta: BrandFinderMeta;
}

export interface OutreachEmail {
  id: string;
  productId: string;
  brandContactId: string;
  language: "ru" | "en";
  toEmail: string;
  subject: string;
  body: string;
  status: OutreachEmailStatus;
  createdAt: string;
  sentAt?: string | null;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  personName: string;
  position: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website?: string | null;
  marketplaceChannels: string;
  businessDescription: string;
  updatedAt: string;
}

export interface SearchSettings {
  mockBrandContactsEnabled: boolean;
}

export const BRAND_CONTACT_ROLE_LABELS: Record<BrandContactRole, string> = {
  brand_owner: "Правообладатель",
  official_distributor: "Официальный дистрибьютор",
  regional_distributor: "Региональный дистрибьютор",
  wholesaler: "Оптовик",
  marketplace_seller: "Продавец на маркетплейсе",
  unknown: "Неизвестно",
};

export const BRAND_CONTACT_REGION_LABELS: Record<BrandContactRegion, string> = {
  Kazakhstan: "Казахстан",
  Russia: "Россия",
  EAEU: "ЕАЭС",
  Global: "Глобальный",
  Turkey: "Турция",
  UAE: "ОАЭ",
  China: "Китай",
  Other: "Другое",
};

export const BRAND_CONTACT_STATUS_LABELS: Record<BrandContactStatus, string> = {
  found: "Найден",
  needs_manual_check: "Нужно проверить",
  verified_by_user: "Проверено",
  rejected: "Не подходит",
};

export const BRAND_CONTACT_VERIFICATION_LABELS: Record<
  BrandContactVerificationStatus,
  string
> = {
  source_confirmed: "Подтверждено источником",
  needs_manual_check: "Требуется проверка",
  rejected: "Отклонено",
  manually_verified: "Проверено вручную",
};

export const BRAND_CONTACT_EVIDENCE_LABELS: Record<
  BrandContactEvidenceType,
  string
> = {
  search_snippet: "Фрагмент поиска",
  search_result: "Результат поиска",
  website_html: "Страница сайта",
  official_website: "Официальный сайт",
  legal_terms_page: "Юридическая страница",
  contact_page: "Контактная страница",
  distributor_page: "Страница дистрибьютора",
  trademark_registry: "Реестр товарных знаков",
  marketplace_store: "Магазин на маркетплейсе",
  manual_entry: "Добавлено вручную",
  mock_data: "Mock-данные",
};

export const OUTREACH_EMAIL_STATUS_LABELS: Record<OutreachEmailStatus, string> = {
  draft: "Черновик",
  copied: "Скопировано",
  sent_manually: "Отправлено вручную",
  replied: "Получен ответ",
  rejected: "Отказ",
};

export const DEFAULT_COMPANY_PROFILE: Omit<CompanyProfile, "id" | "updatedAt"> = {
  companyName: "Better Group",
  personName: "Aidos Akhmet",
  position: "Founder / Director",
  country: "Kazakhstan",
  city: "Almaty",
  email: "contact@bettergroup.kz",
  phone: "+7 777 123 4567",
  website: "https://bettergroup.kz",
  marketplaceChannels: "Kaspi, Wildberries, Ozon",
  businessDescription:
    "Компания занимается импортом и продажей товаров на маркетплейсах Казахстана и России.",
};

export const BRAND_FINDER_MESSAGES = {
  NO_REAL_CONTACTS:
    "Контакты не найдены. Требуется ручная проверка или добавление вручную.",
  MOCK_BANNER: "MOCK DATA — НЕ ИСПОЛЬЗОВАТЬ ДЛЯ РЕАЛЬНОЙ РАБОТЫ",
} as const;
