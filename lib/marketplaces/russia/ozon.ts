import { createRussiaProvider } from "./shared";

export const ozonProvider = createRussiaProvider({
  name: "Ozon",
  marketplace: "ozon",
  baseUrl: "https://www.ozon.ru",
  mockDelay: 700,
});
