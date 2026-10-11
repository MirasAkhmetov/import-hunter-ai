import { createRussiaProvider } from "./shared";

export const ozonProvider = createRussiaProvider({
  name: "Ozon",
  marketplace: "ozon",
  baseUrl: "https://www.ozon.ru",
  // Ozon блокирует автоматический доступ («Выключите VPN…») даже из настоящего Chrome.
  // Включить для проверки: OZON_ENABLED=true в .env
  enabled: process.env.OZON_ENABLED === "true",
});
