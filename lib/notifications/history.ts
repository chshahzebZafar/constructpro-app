import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationHistoryEntry = {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  /** Matches `NotificationRequest.identifier` when known (tray sync / foreground delivery). */
  requestIdentifier?: string;
};

const MAX_ENTRIES = 80;

function storageKey(uid: string): string {
  return `notification_inbox_history_${uid}`;
}

function dedupeMinuteKey(title: string, body: string, epochMs: number): string {
  return `${title}\0${body}\0${Math.floor(epochMs / 60000)}`;
}

export async function loadNotificationHistory(uid: string): Promise<NotificationHistoryEntry[]> {
  if (!uid) return [];
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NotificationHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.id === 'string' && typeof x.receivedAt === 'number');
  } catch {
    return [];
  }
}

async function saveNotificationHistory(uid: string, entries: NotificationHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function appendNotificationHistory(
  uid: string,
  payload: { title: string; body: string; receivedAt?: number; requestIdentifier?: string }
): Promise<void> {
  if (!uid) return;
  const title = (payload.title ?? '').trim() || 'ConstructPro';
  const body = (payload.body ?? '').trim();
  const receivedAt = payload.receivedAt ?? Date.now();
  const list = await loadNotificationHistory(uid);
  const id = `${receivedAt}_${Math.random().toString(36).slice(2, 11)}`;
  const requestIdentifier = payload.requestIdentifier?.trim() || undefined;
  await saveNotificationHistory(uid, [
    { id, title, body, receivedAt, ...(requestIdentifier ? { requestIdentifier } : {}) },
    ...list,
  ]);
}

/**
 * Adds tray notifications to history when they are not already represented (same title/body/minute).
 */
export async function mergeTrayIntoHistory(
  uid: string,
  tray: Array<{ title: string; body: string; date: number; identifier: string }>
): Promise<void> {
  if (!uid || tray.length === 0) return;
  let list = await loadNotificationHistory(uid);
  const seen = new Set(list.map((e) => dedupeMinuteKey(e.title, e.body, e.receivedAt)));
  const idSeen = new Set(list.map((e) => e.requestIdentifier).filter(Boolean) as string[]);
  for (const row of tray) {
    const title = (row.title ?? '').trim() || 'ConstructPro';
    const body = (row.body ?? '').trim();
    const k = dedupeMinuteKey(title, body, row.date);
    if (idSeen.has(row.identifier)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    idSeen.add(row.identifier);
    const id = `tray_${row.date}_${Math.random().toString(36).slice(2, 9)}`;
    list = [{ id, title, body, receivedAt: row.date, requestIdentifier: row.identifier }, ...list];
  }
  await saveNotificationHistory(uid, list);
}
