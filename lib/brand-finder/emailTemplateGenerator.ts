import type { BrandContact, CompanyProfile } from "../types/brandFinder";
import type { ParsedProduct } from "../types";

export interface GeneratedEmail {
  language: "ru" | "en";
  toEmail: string;
  subject: string;
  body: string;
}

function resolveEmailLanguage(contact: BrandContact): "ru" | "en" {
  const ruRegions = ["Kazakhstan", "Russia", "EAEU"];
  if (ruRegions.includes(contact.region) || contact.language === "ru") {
    return "ru";
  }
  return "en";
}

export function generateCooperationEmail(
  contact: BrandContact,
  product: Pick<ParsedProduct, "brand" | "title">,
  userCompanyProfile: CompanyProfile
): GeneratedEmail {
  const brand =
    product.brand?.trim() ||
    product.title.split(/\s+/)[0] ||
    "Brand";
  const language = resolveEmailLanguage(contact);

  const channels =
    userCompanyProfile.marketplaceChannels || "Kaspi, Wildberries, Ozon";

  if (language === "ru") {
    return {
      language: "ru",
      toEmail: contact.email ?? "",
      subject: `Запрос о сотрудничестве по бренду ${brand}`,
      body: `Здравствуйте!

Меня зовут ${userCompanyProfile.personName}, я представляю компанию ${userCompanyProfile.companyName} из Казахстана.

Мы занимаемся продажей товаров на маркетплейсах ${channels} и других онлайн-площадках.

Мы заинтересованы в сотрудничестве по бренду ${brand} и хотели бы уточнить возможность закупки вашей продукции для дальнейшей реализации в Казахстане.

Подскажите, пожалуйста:
- являетесь ли вы правообладателем или официальным дистрибьютором бренда ${brand}?
- возможна ли оптовая закупка?
- какие условия сотрудничества?
- есть ли минимальный объем заказа?
- какие документы и требования необходимы для работы?
- можете ли вы предоставить прайс-лист и каталог продукции?

Буду благодарен за обратную связь.

С уважением,
${userCompanyProfile.personName}
${userCompanyProfile.position}
${userCompanyProfile.companyName}
${userCompanyProfile.phone}
${userCompanyProfile.email}`,
    };
  }

  return {
    language: "en",
    toEmail: contact.email ?? "",
    subject: `Partnership Inquiry for ${brand}`,
    body: `Hello,

My name is ${userCompanyProfile.personName}, and I represent ${userCompanyProfile.companyName}, based in Kazakhstan.

We sell products through online marketplaces such as ${channels}, and other e-commerce platforms.

We are interested in cooperation regarding the ${brand} brand and would like to discuss the possibility of purchasing your products for further sale in Kazakhstan.

Could you please let us know:
- Are you the brand owner or an official distributor of ${brand}?
- Do you offer wholesale cooperation?
- What are your cooperation terms?
- What is the minimum order quantity?
- What documents and requirements are needed to work with your company?
- Could you provide a product catalog and price list?

Thank you in advance. I look forward to your reply.

Best regards,
${userCompanyProfile.personName}
${userCompanyProfile.position}
${userCompanyProfile.companyName}
${userCompanyProfile.phone}
${userCompanyProfile.email}`,
  };
}
