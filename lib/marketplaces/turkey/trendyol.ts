import { createTurkeyProvider } from "./shared";

export const trendyolProvider = createTurkeyProvider({
  name: "Trendyol",
  marketplace: "trendyol",
  baseUrl: "https://www.trendyol.com",
  mockDelay: 600,
});
