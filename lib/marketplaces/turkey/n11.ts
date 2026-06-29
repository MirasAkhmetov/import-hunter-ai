import { createTurkeyProvider } from "./shared";

export const n11Provider = createTurkeyProvider({
  name: "n11",
  marketplace: "n11",
  baseUrl: "https://www.n11.com",
  mockDelay: 680,
});
