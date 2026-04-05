/** Today at local midnight */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMD(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isValidYMD(s: string): boolean {
  return parseYMD(s) !== null;
}

/** Due date is strictly before today (local). */
export function isNoteOverdue(dueDate: string | null): boolean {
  const d = parseYMD(dueDate);
  if (!d) return false;
  const today = startOfToday();
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Due today or in the next `days` calendar days (inclusive of today). */
export function isDueWithinDays(dueDate: string | null, days: number): boolean {
  const d = parseYMD(dueDate);
  if (!d) return false;
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime() && d.getTime() <= end.getTime();
}

export function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const d = parseYMD(dueDate);
  if (!d) return dueDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatReminderLabel(reminderAt: number | null): string {
  if (!reminderAt || !Number.isFinite(reminderAt)) return '';
  const d = new Date(reminderAt);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
