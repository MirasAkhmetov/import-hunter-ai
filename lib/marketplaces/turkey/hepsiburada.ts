import { createTurkeyProvider } from "./shared";

export const hepsiburadaProvider = createTurkeyProvider({
  name: "Hepsiburada",
  marketplace: "hepsiburada",
  baseUrl: "https://www.hepsiburada.com",
  mockDelay: 700,
});
