import { prisma } from "../db";
import { isDbAvailable } from "../db/availability";
import { findBrandContacts } from "../brand-finder/brandFinderService";
import { mockStore, seedMockStore } from "../store/mockStore";
import type {
  BrandContact,
  BrandContactEvidence,
  BrandContactStatus,
  BrandContactVerificationStatus,
  BrandFinderResult,
  CompanyProfile,
  OutreachEmail,
  OutreachEmailStatus,
} from "../types/brandFinder";
import { DEFAULT_COMPANY_PROFILE } from "../types/brandFinder";
import { generateCooperationEmail } from "../brand-finder/emailTemplateGenerator";
import type { ParsedProduct } from "../types";

export interface CreateBrandContactInput {
  productId: string;
  brand: string;
  companyName: string;
  role?: BrandContact["role"];
  country?: string;
  region?: BrandContact["region"];
  website?: string;
  email?: string;
  phone?: string;
  contactFormUrl?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  language?: "ru" | "en";
}

export async function getBrandContacts(productId?: string) {
  seedMockStore();

  if (!(await isDbAvailable())) {
    const all = mockStore.brandContacts.getAll().map((c) => ({
      ...c,
      evidence: c.evidence ?? [],
    }));
    return productId ? all.filter((c) => c.productId === productId) : all;
  }

  try {
    const contacts = await prisma.brandContact.findMany({
      where: productId ? { productId } : undefined,
      include: { evidence: true },
      orderBy: { confidenceScore: "desc" },
    });
    return contacts.map(mapPrismaBrandContact);
  } catch {
    const all = mockStore.brandContacts.getAll();
    return productId ? all.filter((c) => c.productId === productId) : all;
  }
}

export async function createBrandContact(input: CreateBrandContactInput) {
  const now = new Date().toISOString();
  const contact: BrandContact = {
    id: `bc-${Date.now()}`,
    productId: input.productId,
    brand: input.brand,
    companyName: input.companyName,
    role: input.role ?? "unknown",
    country: input.country ?? "Kazakhstan",
    region: (input.region ?? "Kazakhstan") as BrandContact["region"],
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    contactFormUrl: input.contactFormUrl ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceTitle: input.sourceTitle ?? "Добавлено вручную",
    confidenceScore: 30,
    language: input.language ?? "ru",
    status: "needs_manual_check",
    verificationStatus: "manually_verified",
    confirmedFacts: input.sourceUrl
      ? `Добавлено вручную. Источник: ${input.sourceUrl}`
      : "Добавлено вручную пользователем",
    checkedAt: now,
    isMock: false,
    evidence: input.sourceUrl
      ? [
          {
            id: `bce-manual-${Date.now()}`,
            brandContactId: `bc-${Date.now()}`,
            evidenceType: "manual_entry",
            sourceUrl: input.sourceUrl,
            sourceTitle: input.sourceTitle ?? "Добавлено вручную",
            excerpt: "Контакт добавлен пользователем",
            extractedValue: input.email ?? input.phone ?? null,
            createdAt: now,
          },
        ]
      : [],
    createdAt: now,
    updatedAt: now,
  };

  if (!(await isDbAvailable())) {
    return mockStore.brandContacts.add(contact);
  }

  try {
    const created = await prisma.brandContact.create({
      data: {
        productId: contact.productId,
        brand: contact.brand,
        companyName: contact.companyName,
        role: contact.role,
        country: contact.country,
        region: contact.region,
        website: contact.website,
        email: contact.email,
        phone: contact.phone,
        contactFormUrl: contact.contactFormUrl,
        linkedinUrl: contact.linkedinUrl,
        sourceUrl: contact.sourceUrl,
        sourceTitle: contact.sourceTitle,
        confidenceScore: contact.confidenceScore,
        language: contact.language,
        status: contact.status,
        verificationStatus: contact.verificationStatus,
        confirmedFacts: contact.confirmedFacts,
        checkedAt: new Date(now),
        isMock: false,
        evidence: contact.evidence?.length
          ? {
              create: contact.evidence.map((e) => ({
                evidenceType: e.evidenceType,
                sourceUrl: e.sourceUrl,
                sourceTitle: e.sourceTitle,
                excerpt: e.excerpt,
                extractedValue: e.extractedValue,
              })),
            }
          : undefined,
      },
      include: { evidence: true },
    });
    return mapPrismaBrandContact(created);
  } catch {
    return mockStore.brandContacts.add(contact);
  }
}

export async function updateBrandContactStatus(
  id: string,
  status: BrandContactStatus
) {
  const verificationStatus: BrandContactVerificationStatus =
    status === "verified_by_user"
      ? "manually_verified"
      : status === "rejected"
        ? "rejected"
        : "needs_manual_check";

  if (!(await isDbAvailable())) {
    return mockStore.brandContacts.update(id, { status, verificationStatus });
  }

  try {
    const updated = await prisma.brandContact.update({
      where: { id },
      data: { status, verificationStatus },
      include: { evidence: true },
    });
    return mapPrismaBrandContact(updated);
  } catch {
    return mockStore.brandContacts.update(id, { status, verificationStatus });
  }
}

export async function findAndSaveBrandContacts(
  product: ParsedProduct & { id: string }
): Promise<BrandFinderResult> {
  const result = await findBrandContacts(product);
  const found = result.contacts;

  if (!(await isDbAvailable())) {
    mockStore.brandContacts.removeByProductId(product.id);
    for (const contact of found) {
      mockStore.brandContacts.add({ ...contact, productId: product.id });
    }
    return {
      contacts: mockStore.brandContacts.getByProductId(product.id),
      meta: result.meta,
    };
  }

  try {
    await prisma.brandContact.deleteMany({ where: { productId: product.id } });
    for (const contact of found) {
      await prisma.brandContact.create({
        data: {
          productId: product.id,
          brand: contact.brand,
          companyName: contact.companyName,
          role: contact.role,
          country: contact.country,
          region: contact.region,
          website: contact.website,
          email: contact.email,
          phone: contact.phone,
          contactFormUrl: contact.contactFormUrl,
          linkedinUrl: contact.linkedinUrl,
          sourceUrl: contact.sourceUrl,
          sourceTitle: contact.sourceTitle,
          confidenceScore: contact.confidenceScore,
          language: contact.language,
          status: contact.status,
          verificationStatus: contact.verificationStatus,
          confirmedFacts: contact.confirmedFacts,
          checkedAt: contact.checkedAt ? new Date(contact.checkedAt) : new Date(),
          isMock: contact.isMock,
          evidence: contact.evidence?.length
            ? {
                create: contact.evidence.map((e) => ({
                  evidenceType: e.evidenceType,
                  sourceUrl: e.sourceUrl,
                  sourceTitle: e.sourceTitle,
                  excerpt: e.excerpt,
                  extractedValue: e.extractedValue,
                })),
              }
            : undefined,
        },
      });
    }
    const contacts = await getBrandContacts(product.id);
    return { contacts, meta: result.meta };
  } catch {
    mockStore.brandContacts.removeByProductId(product.id);
    for (const contact of found) {
      mockStore.brandContacts.add({ ...contact, productId: product.id });
    }
    return {
      contacts: mockStore.brandContacts.getByProductId(product.id),
      meta: result.meta,
    };
  }
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  seedMockStore();

  if (!(await isDbAvailable())) {
    return mockStore.companyProfile.get();
  }

  try {
    const profile = await prisma.companyProfile.findFirst({
      where: { id: "default" },
    });
    if (profile) return mapPrismaCompanyProfile(profile);
  } catch {
    // fall through
  }

  return mockStore.companyProfile.get();
}

export async function saveCompanyProfile(
  data: Omit<CompanyProfile, "id" | "updatedAt">
): Promise<CompanyProfile> {
  const now = new Date().toISOString();

  if (!(await isDbAvailable())) {
    return mockStore.companyProfile.set({ ...data, updatedAt: now });
  }

  try {
    const profile = await prisma.companyProfile.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...data,
      },
      update: data,
    });
    return mapPrismaCompanyProfile(profile);
  } catch {
    return mockStore.companyProfile.set({ ...data, updatedAt: now });
  }
}

export async function generateOutreachEmail(
  brandContactId: string,
  product: ParsedProduct & { id: string }
) {
  const contacts = await getBrandContacts(product.id);
  const contact = contacts.find((c) => c.id === brandContactId);
  if (!contact) throw new Error("CONTACT_NOT_FOUND");

  const profile = await getCompanyProfile();
  const generated = generateCooperationEmail(contact, product, profile);
  const now = new Date().toISOString();

  const email: OutreachEmail = {
    id: `oe-${Date.now()}`,
    productId: product.id,
    brandContactId,
    language: generated.language,
    toEmail: generated.toEmail,
    subject: generated.subject,
    body: generated.body,
    status: "draft",
    createdAt: now,
    sentAt: null,
  };

  if (!(await isDbAvailable())) {
    return mockStore.outreachEmails.add(email);
  }

  try {
    const created = await prisma.outreachEmail.create({
      data: {
        productId: email.productId,
        brandContactId: email.brandContactId,
        language: email.language,
        toEmail: email.toEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
      },
    });
    return mapPrismaOutreachEmail(created);
  } catch {
    return mockStore.outreachEmails.add(email);
  }
}

export async function markOutreachEmailCopied(id: string) {
  return updateOutreachEmailStatus(id, "copied");
}

export async function updateOutreachEmailStatus(
  id: string,
  status: OutreachEmailStatus
) {
  const sentAt = status === "sent_manually" ? new Date().toISOString() : undefined;

  if (!(await isDbAvailable())) {
    return mockStore.outreachEmails.update(id, {
      status,
      ...(sentAt ? { sentAt } : {}),
    });
  }

  try {
    const updated = await prisma.outreachEmail.update({
      where: { id },
      data: {
        status,
        ...(sentAt ? { sentAt: new Date(sentAt) } : {}),
      },
    });
    return mapPrismaOutreachEmail(updated);
  } catch {
    return mockStore.outreachEmails.update(id, {
      status,
      ...(sentAt ? { sentAt } : {}),
    });
  }
}

export async function getOutreachEmails(productId?: string) {
  seedMockStore();

  if (!(await isDbAvailable())) {
    const all = mockStore.outreachEmails.getAll();
    return productId ? all.filter((e) => e.productId === productId) : all;
  }

  try {
    const emails = await prisma.outreachEmail.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return emails.map(mapPrismaOutreachEmail);
  } catch {
    const all = mockStore.outreachEmails.getAll();
    return productId ? all.filter((e) => e.productId === productId) : all;
  }
}

export async function getBrandContactsStats() {
  const contacts = await getBrandContacts();
  const emails = await getOutreachEmails();

  return {
    brandOwners: contacts.filter((c) => c.role === "brand_owner").length,
    distributorsKz: contacts.filter(
      (c) =>
        c.region === "Kazakhstan" &&
        (c.role === "official_distributor" || c.role === "regional_distributor")
    ).length,
    distributorsRu: contacts.filter(
      (c) =>
        c.region === "Russia" &&
        (c.role === "official_distributor" || c.role === "regional_distributor")
    ).length,
    highConfidence: contacts.filter((c) => c.confidenceScore >= 80).length,
    pendingEmails: emails.filter((e) => e.status === "draft" || e.status === "copied").length,
    sentManually: emails.filter((e) => e.status === "sent_manually").length,
    totalContacts: contacts.length,
  };
}

function mapPrismaBrandContact(row: {
  id: string;
  productId: string;
  brand: string;
  companyName: string;
  role: string;
  country: string;
  region: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactFormUrl: string | null;
  linkedinUrl: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  confidenceScore: number;
  language: string;
  status: string;
  verificationStatus?: string;
  confirmedFacts?: string | null;
  checkedAt?: Date | null;
  isMock?: boolean;
  evidence?: Array<{
    id: string;
    brandContactId: string;
    evidenceType: string;
    sourceUrl: string;
    sourceTitle: string | null;
    excerpt: string;
    extractedValue: string | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}): BrandContact {
  return {
    id: row.id,
    productId: row.productId,
    brand: row.brand,
    companyName: row.companyName,
    role: row.role as BrandContact["role"],
    country: row.country,
    region: row.region as BrandContact["region"],
    website: row.website,
    email: row.email,
    phone: row.phone,
    contactFormUrl: row.contactFormUrl,
    linkedinUrl: row.linkedinUrl,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    confidenceScore: row.confidenceScore,
    language: row.language as "ru" | "en",
    status: row.status as BrandContactStatus,
    verificationStatus:
      (row.verificationStatus as BrandContactVerificationStatus) ??
      "needs_manual_check",
    confirmedFacts: row.confirmedFacts ?? null,
    checkedAt: row.checkedAt?.toISOString() ?? null,
    isMock: row.isMock ?? false,
    evidence: row.evidence?.map(mapPrismaEvidence) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaEvidence(row: {
  id: string;
  brandContactId: string;
  evidenceType: string;
  sourceUrl: string;
  sourceTitle: string | null;
  excerpt: string;
  extractedValue: string | null;
  createdAt: Date;
}): BrandContactEvidence {
  return {
    id: row.id,
    brandContactId: row.brandContactId,
    evidenceType: row.evidenceType as BrandContactEvidence["evidenceType"],
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    excerpt: row.excerpt,
    extractedValue: row.extractedValue,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPrismaCompanyProfile(row: {
  id: string;
  companyName: string;
  personName: string;
  position: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website: string | null;
  marketplaceChannels: string;
  businessDescription: string;
  updatedAt: Date;
}): CompanyProfile {
  return {
    id: row.id,
    companyName: row.companyName,
    personName: row.personName,
    position: row.position,
    country: row.country,
    city: row.city,
    email: row.email,
    phone: row.phone,
    website: row.website,
    marketplaceChannels: row.marketplaceChannels,
    businessDescription: row.businessDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaOutreachEmail(row: {
  id: string;
  productId: string;
  brandContactId: string;
  language: string;
  toEmail: string;
  subject: string;
  body: string;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
}): OutreachEmail {
  return {
    id: row.id,
    productId: row.productId,
    brandContactId: row.brandContactId,
    language: row.language as "ru" | "en",
    toEmail: row.toEmail,
    subject: row.subject,
    body: row.body,
    status: row.status as OutreachEmailStatus,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

export { DEFAULT_COMPANY_PROFILE };
