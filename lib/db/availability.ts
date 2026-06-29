import { prisma } from "../db";
import { isMockMode } from "../config/mockMode";

export { isMockMode };
export async function isDbAvailable(): Promise<boolean> {
  // В mock-режиме не трогаем PostgreSQL — иначе каждый запрос ждёт таймаут ~20с
  if (isMockMode()) return false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
