import { createRussiaProvider } from "./shared";

export const wildberriesProvider = createRussiaProvider({
  name: "Wildberries",
  marketplace: "wildberries",
  baseUrl: "https://www.wildberries.ru",
  mockDelay: 650,
});
