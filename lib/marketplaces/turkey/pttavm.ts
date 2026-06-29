import { createTurkeyProvider } from "./shared";

export const pttAvmProvider = createTurkeyProvider({
  name: "PttAVM",
  marketplace: "pttavm",
  baseUrl: "https://www.pttavm.com",
  mockDelay: 720,
});
