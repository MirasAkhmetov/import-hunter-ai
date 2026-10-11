import { prisma } from "../db";

const CACHE_TTL_MS = 30_000;
let cached: { value: boolean; at: number } | null = null;
let pending: Promise<boolean> | null = null;

async function probe(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверка доступности PostgreSQL. Результат кэшируется на 30 с,
 * чтобы без БД каждый запрос не ждал таймаут подключения.
 */
export async function isDbAvailable(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  pending ??= probe().then((value) => {
    cached = { value, at: Date.now() };
    pending = null;
    return value;
  });
  return pending;
}
