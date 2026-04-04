/** Parse YYYY-MM-DD as UTC midnight ms. */
export function parseYmdUtc(s: string): number {
  const p = s.trim().split('-').map(Number);
  if (p.length !== 3 || !p.every((x) => Number.isFinite(x))) return NaN;
  return Date.UTC(p[0], p[1] - 1, p[2]);
}

/** Inclusive day count from start through end (same day = 1). */
export function daysInclusive(start: string, end: string): number {
  const a = parseYmdUtc(start);
  const b = parseYmdUtc(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

/** Calendar days between two dates (end − start in days, not inclusive count). */
export function calendarDaysBetween(start: string, end: string): number {
  const a = parseYmdUtc(start);
  const b = parseYmdUtc(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return (b - a) / 86400000;
}
