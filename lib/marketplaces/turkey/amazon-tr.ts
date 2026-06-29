import { createTurkeyProvider } from "./shared";

export const amazonTrProvider = createTurkeyProvider({
  name: "Amazon Turkey",
  marketplace: "amazon-tr",
  baseUrl: "https://www.amazon.com.tr",
  mockDelay: 650,
});
