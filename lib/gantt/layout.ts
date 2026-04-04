import { daysInclusive, parseYmdUtc } from './dateUtils';
import type { GanttBar } from './types';

export interface TimelineWindow {
  min: string;
  max: string;
  spanDays: number;
}

export function computeTimelineWindow(items: GanttBar[]): TimelineWindow | null {
  if (items.length === 0) return null;
  let min = items[0].startDate;
  let max = items[0].endDate;
  for (const it of items) {
    if (it.startDate < min) min = it.startDate;
    if (it.endDate > max) max = it.endDate;
  }
  const t0 = parseYmdUtc(min);
  const t1 = parseYmdUtc(max);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  const spanDays = Math.max(1, Math.round((t1 - t0) / 86400000) + 1);
  return { min, max, spanDays };
}

export function barLayout(
  item: GanttBar,
  windowMin: string,
  spanDays: number
): { leftPct: number; widthPct: number } {
  const t0 = parseYmdUtc(windowMin);
  const ts = parseYmdUtc(item.startDate);
  if (!Number.isFinite(t0) || !Number.isFinite(ts)) {
    return { leftPct: 0, widthPct: 100 };
  }
  const leftDays = Math.max(0, Math.round((ts - t0) / 86400000));
  const dur = Math.max(1, daysInclusive(item.startDate, item.endDate));
  const leftPct = Math.min(100, (leftDays / spanDays) * 100);
  const widthPct = Math.min(100 - leftPct, Math.max(2, (dur / spanDays) * 100));
  return { leftPct, widthPct };
}
