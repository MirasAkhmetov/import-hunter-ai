import type { ParsedProduct } from "../types";
import type { BrandContact, BrandFinderResult } from "../types/brandFinder";
import { BRAND_FINDER_MESSAGES } from "../types/brandFinder";
import { findLegalRightsContacts } from "./legalRightsPageFinder";
import { findKnownBrandContacts } from "./knownDistributors";

function mergeContacts(...groups: BrandContact[][]): BrandContact[] {
  const seen = new Set<string>();
  const merged: BrandContact[] = [];
  for (const group of groups) {
    for (const contact of group) {
      const key = `${contact.companyName}|${contact.region}|${contact.email ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(contact);
    }
  }
  return merged.sort((a, b) => {
    if (a.region === "Kazakhstan" && b.region !== "Kazakhstan") return -1;
    if (b.region === "Kazakhstan" && a.region !== "Kazakhstan") return 1;
    return b.confidenceScore - a.confidenceScore;
  });
}

export async function findBrandContacts(
  product: ParsedProduct & { id?: string }
): Promise<BrandFinderResult> {
  const productId = product.id ?? `product-${Date.now()}`;

  // 1. База проверенных дистрибьюторов KZ / RU (без внешнего Search API)
  const knownContacts = await findKnownBrandContacts(product, productId);

  // 2. Legal-terms на .kz / .ru
  const legalContacts = await findLegalRightsContacts(product, productId);

  const contacts = mergeContacts(knownContacts, legalContacts);

  if (contacts.length === 0) {
    return {
      contacts: [],
      meta: {
        message: `${BRAND_FINDER_MESSAGES.NO_REAL_CONTACTS} Бренд не найден во встроенной базе — добавьте контакт вручную.`,
      },
    };
  }

  return { contacts, meta: {} };
}
