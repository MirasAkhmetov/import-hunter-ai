/** YYYY-MM-DD in local timezone */
export function formatLocalDateYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayBounds(dayYmd: string): { start: Date; end: Date } {
  const start = new Date(`${dayYmd}T00:00:00`);
  const end = new Date(`${dayYmd}T23:59:59.999`);
  return { start, end };
}

export function isIsoInDay(iso: string, dayYmd: string): boolean {
  const t = new Date(iso).getTime();
  const { start, end } = getDayBounds(dayYmd);
  return t >= start.getTime() && t <= end.getTime();
}
