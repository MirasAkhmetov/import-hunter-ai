import type { MarketplaceResultData, ProductSearchQuery } from "../types";

import { buildMarketplaceSearchUrl } from "../marketplaces/urls";



interface MarketplaceSeller {

  sellerName: string;

  sellerRating: number;

  priceMultiplier: number;

  titleSuffix?: string;

}



const MARKETPLACE_SELLERS: Record<string, MarketplaceSeller[]> = {

  trendyol: [

    { sellerName: "Braun Resmi Mağaza", sellerRating: 4.9, priceMultiplier: 0.72 },

    { sellerName: "Teknosa", sellerRating: 4.8, priceMultiplier: 0.76 },

    { sellerName: "Vatan Bilgisayar", sellerRating: 4.7, priceMultiplier: 0.74 },

    { sellerName: "Trendyol Express", sellerRating: 4.6, priceMultiplier: 0.7 },

    { sellerName: "MediaMarkt TR", sellerRating: 4.8, priceMultiplier: 0.78 },

    { sellerName: "Apple Yetkili Satıcı", sellerRating: 4.9, priceMultiplier: 0.8 },

    { sellerName: "Outlet Mağaza", sellerRating: 4.3, priceMultiplier: 0.65 },

  ],

  hepsiburada: [

    { sellerName: "Hepsiburada", sellerRating: 4.9, priceMultiplier: 0.75 },

    { sellerName: "Hepsiburada Premium", sellerRating: 4.8, priceMultiplier: 0.77 },

    { sellerName: "Teknosa", sellerRating: 4.7, priceMultiplier: 0.73 },

    { sellerName: "Vatan", sellerRating: 4.6, priceMultiplier: 0.71 },

    { sellerName: "Samsung Store TR", sellerRating: 4.9, priceMultiplier: 0.79 },

    { sellerName: "Xiaomi Resmi", sellerRating: 4.8, priceMultiplier: 0.68 },

    { sellerName: "Hepsiburada Outlet", sellerRating: 4.4, priceMultiplier: 0.63 },

  ],

  "amazon-tr": [

    { sellerName: "Amazon.com.tr", sellerRating: 4.9, priceMultiplier: 0.74 },

    { sellerName: "Amazon TR FBA", sellerRating: 4.8, priceMultiplier: 0.76 },

    { sellerName: "Teknosa Amazon", sellerRating: 4.7, priceMultiplier: 0.72 },

    { sellerName: "Apple Store TR", sellerRating: 4.9, priceMultiplier: 0.81 },

    { sellerName: "Dyson Türkiye", sellerRating: 4.8, priceMultiplier: 0.77 },

    { sellerName: "Amazon Outlet TR", sellerRating: 4.5, priceMultiplier: 0.66 },

  ],

  n11: [

    { sellerName: "n11 Mağaza", sellerRating: 4.7, priceMultiplier: 0.7 },

    { sellerName: "n11 Pro Satıcı", sellerRating: 4.8, priceMultiplier: 0.73 },

    { sellerName: "Elektronik Dünyası", sellerRating: 4.5, priceMultiplier: 0.67 },

    { sellerName: "Güvenilir Satıcı", sellerRating: 4.6, priceMultiplier: 0.69 },

    { sellerName: "n11 Outlet", sellerRating: 4.3, priceMultiplier: 0.62 },

    { sellerName: "Tekno Market", sellerRating: 4.7, priceMultiplier: 0.71 },

    { sellerName: "Premium Elektronik", sellerRating: 4.9, priceMultiplier: 0.75 },

  ],

  pttavm: [

    { sellerName: "PttAVM", sellerRating: 4.6, priceMultiplier: 0.71 },

    { sellerName: "PttAVM Resmi", sellerRating: 4.7, priceMultiplier: 0.73 },

    { sellerName: "Elektronik Ptt", sellerRating: 4.5, priceMultiplier: 0.68 },

    { sellerName: "Güvenli Alışveriş", sellerRating: 4.6, priceMultiplier: 0.7 },

    { sellerName: "Ptt Outlet", sellerRating: 4.2, priceMultiplier: 0.61 },

    { sellerName: "Teknoloji Mağazası", sellerRating: 4.7, priceMultiplier: 0.72 },

  ],

  ciceksepeti: [

    { sellerName: "ÇiçekSepeti", sellerRating: 4.5, priceMultiplier: 0.69 },

    { sellerName: "ÇiçekSepeti Market", sellerRating: 4.6, priceMultiplier: 0.71 },

    { sellerName: "Elektronik Sepeti", sellerRating: 4.4, priceMultiplier: 0.67 },

    { sellerName: "Hediye Market", sellerRating: 4.3, priceMultiplier: 0.64 },

    { sellerName: "Premium Sepet", sellerRating: 4.7, priceMultiplier: 0.74 },

    { sellerName: "ÇiçekSepeti Outlet", sellerRating: 4.2, priceMultiplier: 0.6 },

  ],

  "amazon-ae": [

    { sellerName: "Amazon.ae", sellerRating: 4.8, priceMultiplier: 0.72 },

  ],

  noon: [

    { sellerName: "noon", sellerRating: 4.7, priceMultiplier: 0.68 },

  ],

  flipkart: [

    { sellerName: "Flipkart Assured", sellerRating: 4.8, priceMultiplier: 0.7 },

    { sellerName: "Bajaj Electronics", sellerRating: 4.7, priceMultiplier: 0.72 },

    { sellerName: "Reliance Digital", sellerRating: 4.8, priceMultiplier: 0.74 },

    { sellerName: "Croma", sellerRating: 4.7, priceMultiplier: 0.73 },

    { sellerName: "Flipkart Seller", sellerRating: 4.5, priceMultiplier: 0.66 },

  ],

  "amazon-in": [

    { sellerName: "Amazon.in", sellerRating: 4.9, priceMultiplier: 0.73 },

    { sellerName: "Amazon FBA India", sellerRating: 4.8, priceMultiplier: 0.75 },

    { sellerName: "Appario Retail", sellerRating: 4.7, priceMultiplier: 0.71 },

    { sellerName: "Cocoblu Retail", sellerRating: 4.6, priceMultiplier: 0.69 },

  ],

  meesho: [

    { sellerName: "Meesho Supplier", sellerRating: 4.4, priceMultiplier: 0.55 },

    { sellerName: "Wholesale Hub", sellerRating: 4.3, priceMultiplier: 0.52 },

    { sellerName: "Direct Import", sellerRating: 4.5, priceMultiplier: 0.58 },

    { sellerName: "Budget Deals", sellerRating: 4.2, priceMultiplier: 0.48 },

  ],

  wildberries: [

    { sellerName: "Wildberries", sellerRating: 4.8, priceMultiplier: 0.73 },

    { sellerName: "Официальный магазин", sellerRating: 4.9, priceMultiplier: 0.76 },

    { sellerName: "М.Видео", sellerRating: 4.7, priceMultiplier: 0.74 },

    { sellerName: "Эльдорадо", sellerRating: 4.6, priceMultiplier: 0.71 },

    { sellerName: "DNS", sellerRating: 4.8, priceMultiplier: 0.75 },

    { sellerName: "Ситилинк", sellerRating: 4.7, priceMultiplier: 0.72 },

    { sellerName: "WB Outlet", sellerRating: 4.4, priceMultiplier: 0.64 },

  ],

  ozon: [

    { sellerName: "Ozon", sellerRating: 4.8, priceMultiplier: 0.72 },

    { sellerName: "Ozon Premium", sellerRating: 4.9, priceMultiplier: 0.75 },

    { sellerName: "М.Видео на Ozon", sellerRating: 4.7, priceMultiplier: 0.73 },

    { sellerName: "Эльдорадо", sellerRating: 4.6, priceMultiplier: 0.7 },

    { sellerName: "DNS Store", sellerRating: 4.8, priceMultiplier: 0.74 },

    { sellerName: "Ozon Express", sellerRating: 4.7, priceMultiplier: 0.71 },

    { sellerName: "Ozon Outlet", sellerRating: 4.3, priceMultiplier: 0.62 },

  ],

};



const EXCHANGE_RATES = { TRY: 14.5, AED: 140, INR: 6.2, RUB: 5.5 };



const CURRENCY_BY_MARKETPLACE: Record<string, string> = {

  trendyol: "TRY",

  hepsiburada: "TRY",

  "amazon-tr": "TRY",

  n11: "TRY",

  pttavm: "TRY",

  ciceksepeti: "TRY",

  "amazon-ae": "AED",

  noon: "AED",

  flipkart: "INR",

  "amazon-in": "INR",

  meesho: "INR",

  wildberries: "RUB",

  ozon: "RUB",

};



const CATEGORY_LOCAL: Record<string, Record<string, string>> = {

  trendyol: {

    "Аэрогрили": "Airfryer Fritöz",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Akıllı Telefon",

    "Пылесосы": "Elektrikli Süpürge",

  },

  hepsiburada: {

    "Аэрогрили": "Airfryer",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Akıllı Telefon",

    "Пылесосы": "Elektrikli Süpürge",

  },

  "amazon-tr": {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Akıllı Telefon",

    "Пылесосы": "Elektrikli Süpürge",

  },

  n11: {

    "Аэрогрили": "Airfryer",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Akıllı Telefon",

    "Пылесосы": "Süpürge",

  },

  pttavm: {

    "Аэрогрили": "Fritöz",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Telefon",

    "Пылесосы": "Süpürge",

  },

  ciceksepeti: {

    "Аэрогрили": "Airfryer",

    "Наушники и гарнитуры": "Kulaklık",

    "Смартфоны": "Telefon",

    "Пылесосы": "Süpürge",

  },

  "amazon-ae": {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Earbuds",

    "Смартфоны": "Smartphone",

    "Пылесосы": "Vacuum Cleaner",

  },

  noon: {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Earbuds",

    "Смартфоны": "Smartphone",

    "Пылесосы": "Vacuum Cleaner",

  },

  flipkart: {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Earbuds",

    "Смартфоны": "Smartphone",

    "Пылесосы": "Vacuum Cleaner",

  },

  "amazon-in": {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Earbuds",

    "Смартфоны": "Smartphone",

    "Пылесосы": "Vacuum Cleaner",

  },

  meesho: {

    "Аэрогрили": "Air Fryer",

    "Наушники и гарнитуры": "Earbuds",

    "Смартфоны": "Smartphone",

    "Пылесосы": "Vacuum Cleaner",

  },

  wildberries: {

    "Аэрогрили": "аэрогриль",

    "Наушники и гарнитуры": "наушники",

    "Смартфоны": "смартфон",

    "Пылесосы": "пылесос",

  },

  ozon: {

    "Аэрогрили": "аэрогриль",

    "Наушники и гарнитуры": "наушники",

    "Смартфоны": "смартфон",

    "Пылесосы": "пылесос",

  },

};



function buildExactTitle(query: ProductSearchQuery, marketplace: string): string {

  const brand = query.brand ?? "";

  const model = query.model ?? "";

  const categoryLocal =

    CATEGORY_LOCAL[marketplace]?.[query.category ?? ""] ?? query.category ?? "";



  const specParts: string[] = [];

  if (query.specifications?.["Объём"]) specParts.push(query.specifications["Объём"]);

  if (query.specifications?.["Цвет"]) specParts.push(query.specifications["Цвет"]);



  const core = [brand, model].filter(Boolean).join(" ").trim();

  const base = core || query.title.split("—")[0]?.trim() || query.title;



  return [base, categoryLocal, ...specParts].filter(Boolean).join(" ").trim();

}



function buildExactSpecifications(

  query: ProductSearchQuery

): Record<string, string> | undefined {

  const specs: Record<string, string> = { ...(query.specifications ?? {}) };



  if (query.brand) specs["Бренд"] = query.brand;

  if (query.model) specs["Модель"] = query.model;

  if (query.category) specs["Категория"] = query.category;



  return Object.keys(specs).length ? specs : undefined;

}



function calcPrice(

  kaspiPriceKzt: number,

  marketplace: string,

  multiplier: number

): number {

  const currency = CURRENCY_BY_MARKETPLACE[marketplace];

  if (currency === "TRY") {

    return Math.round((kaspiPriceKzt / EXCHANGE_RATES.TRY) * multiplier);

  }

  if (currency === "AED") {

    return Math.round((kaspiPriceKzt / EXCHANGE_RATES.AED) * multiplier);

  }

  if (currency === "INR") {

    return Math.round((kaspiPriceKzt / EXCHANGE_RATES.INR) * multiplier);

  }

  if (currency === "RUB") {

    return Math.round((kaspiPriceKzt / EXCHANGE_RATES.RUB) * multiplier);

  }

  return Math.round(kaspiPriceKzt * multiplier);

}



export function generateMockMarketplaceResults(

  marketplace: string,

  country: string,

  query: ProductSearchQuery,

  kaspiPriceKzt = 89990

): MarketplaceResultData[] {

  const sellers = MARKETPLACE_SELLERS[marketplace] ?? [];

  const baseTitle = buildExactTitle(query, marketplace);

  const specifications = buildExactSpecifications(query);

  const imageUrl = query.imageUrl;

  const currency = CURRENCY_BY_MARKETPLACE[marketplace] ?? "TRY";

  const resultCount = Math.min(10, Math.max(5, sellers.length));



  return sellers.slice(0, resultCount).map((seller, index) => {

    const price = calcPrice(kaspiPriceKzt, marketplace, seller.priceMultiplier);

    const titleSuffix = seller.titleSuffix ? ` ${seller.titleSuffix}` : "";

    const variantTitle =

      index === 0 ? baseTitle : `${baseTitle}${titleSuffix} — ${seller.sellerName}`;



    return {

      marketplace,

      country,

      title: variantTitle,

      price,

      currency,

      url: `${buildMarketplaceSearchUrl(marketplace, query)}&mock=${index}`,

      imageUrl,

      sellerName: seller.sellerName,

      sellerRating: seller.sellerRating,

      specifications,

      isExactMatch: index === 0,

      isMockPrice: true,

      needsProfitReview: true,

      priceSource: "search_result" as const,

    };

  });

}

