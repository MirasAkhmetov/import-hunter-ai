/** Parse Turkish/European number formats: 12.999,50 → 12999.5, 20950.10 → 20950.1 */
export function parseLocalizedPrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : null;
    }
    const normalized = cleaned.replace(/,/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  if (hasComma) {
    const n = Number(cleaned.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(cleaned.replace(/\./g, ""));
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "." || trimmed === "-") return null;

  if (trimmed.includes(",") || (trimmed.match(/\./g)?.length ?? 0) > 1) {
    return parseLocalizedPrice(trimmed);
  }

  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
