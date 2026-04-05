import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { getBudgetStorageMode } from '@/lib/budget/repository';
import { loadUserPayloadOrMigrate } from '@/lib/firestore/syncUserAppBlob';
import { setUserAppSnapshot, USER_SNAPSHOT_KEYS } from '@/lib/firestore/userAppSnapshot';
import { NOTE_COLOR_KEYS } from '@/lib/quickNotes/noteStyle';
import { normalizeTagList } from '@/lib/quickNotes/tagUtils';
import { isValidYMD } from '@/lib/quickNotes/dateUtils';
import type { NoteColorKey, NotePriority, QuickNote, QuickNoteMeta } from './types';

const PREFIX = 'constructpro_quick_notes_v1_';

interface Blob {
  notes: QuickNote[];
}

function uid(): string {
  const s = useAuthStore.getState();
  const u = s.user?.uid ?? s.offlinePreviewUid;
  if (!u) throw new Error('Sign in required.');
  return u;
}

function rid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function isNotePriority(x: unknown): x is NotePriority {
  return x === 'low' || x === 'medium' || x === 'high';
}

function isNoteColorKey(x: unknown): x is NoteColorKey {
  return typeof x === 'string' && (NOTE_COLOR_KEYS as string[]).includes(x);
}

function normalizeDueDate(x: unknown): string | null {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x !== 'string') return null;
  return isValidYMD(x) ? x : null;
}

function normalizeReminderAt(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Ensures older stored notes still load. */
export function normalizeQuickNote(raw: Record<string, unknown>): QuickNote {
  const id = String(raw.id ?? '');
  const title = String(raw.title ?? '');
  const body = String(raw.body ?? '');
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Number(raw.createdAt) || Date.now();
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Number(raw.updatedAt) || createdAt;
  const priority: NotePriority = isNotePriority(raw.priority) ? raw.priority : 'medium';
  const colorKey: NoteColorKey = isNoteColorKey(raw.colorKey) ? raw.colorKey : 'default';
  const pinned = typeof raw.pinned === 'boolean' ? raw.pinned : false;
  const tags = normalizeTagList(raw.tags);
  const dueDate = normalizeDueDate(raw.dueDate);
  const reminderAt = normalizeReminderAt(raw.reminderAt);
  return {
    id,
    title,
    body,
    createdAt,
    updatedAt,
    priority,
    colorKey,
    pinned,
    tags,
    dueDate,
    reminderAt,
  };
}

async function loadBlob(u: string): Promise<Blob> {
  const raw = await AsyncStorage.getItem(PREFIX + u);
  if (!raw) return { notes: [] };
  try {
    const b = JSON.parse(raw) as Blob;
    if (!Array.isArray(b.notes)) return { notes: [] };
    return {
      notes: b.notes.map((n) => normalizeQuickNote(n as unknown as Record<string, unknown>)),
    };
  } catch {
    return { notes: [] };
  }
}

async function saveBlob(u: string, b: Blob): Promise<void> {
  await AsyncStorage.setItem(PREFIX + u, JSON.stringify(b));
}

async function getNotesArray(u: string): Promise<QuickNote[]> {
  const raw = await loadUserPayloadOrMigrate<QuickNote[]>(
    u,
    USER_SNAPSHOT_KEYS.quickNotes,
    async () => (await loadBlob(u)).notes,
    async (notes) => saveBlob(u, { notes }),
    []
  );
  return raw.map((n) => normalizeQuickNote(n as unknown as Record<string, unknown>));
}

const PRIORITY_ORDER: Record<NotePriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortNotes(list: QuickNote[]): QuickNote[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return b.updatedAt - a.updatedAt;
  });
}

export async function listQuickNotes(): Promise<QuickNote[]> {
  const u = uid();
  const notes = await getNotesArray(u);
  return sortNotes(notes);
}

export async function getQuickNote(id: string): Promise<QuickNote | null> {
  const u = uid();
  const notes = await getNotesArray(u);
  return notes.find((x) => x.id === id) ?? null;
}

function applyMetaDefaults(meta: QuickNoteMeta | undefined): Pick<
  QuickNote,
  'priority' | 'colorKey' | 'pinned' | 'tags' | 'dueDate' | 'reminderAt'
> {
  const priority: NotePriority =
    meta?.priority && isNotePriority(meta.priority) ? meta.priority : 'medium';
  const colorKey: NoteColorKey =
    meta?.colorKey && isNoteColorKey(meta.colorKey) ? meta.colorKey : 'default';
  const pinned = typeof meta?.pinned === 'boolean' ? meta.pinned : false;
  const tags = meta?.tags !== undefined ? normalizeTagList(meta.tags) : [];
  const dueDate = meta?.dueDate !== undefined ? normalizeDueDate(meta.dueDate) : null;
  const reminderAt = meta?.reminderAt !== undefined ? normalizeReminderAt(meta.reminderAt) : null;
  return { priority, colorKey, pinned, tags, dueDate, reminderAt };
}

export async function createQuickNote(
  title: string,
  body: string,
  meta?: QuickNoteMeta
): Promise<QuickNote> {
  const u = uid();
  const now = Date.now();
  const m = applyMetaDefaults(meta);
  const note: QuickNote = {
    id: rid(),
    title: title.trim(),
    body: body.trim(),
    createdAt: now,
    updatedAt: now,
    ...m,
  };

  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    b.notes.push(note);
    await saveBlob(u, b);
    return note;
  }

  const notes = await getNotesArray(u);
  notes.push(note);
  await setUserAppSnapshot(u, USER_SNAPSHOT_KEYS.quickNotes, notes);
  return note;
}

export async function updateQuickNote(
  id: string,
  patch: Partial<
    Pick<
      QuickNote,
      'title' | 'body' | 'priority' | 'colorKey' | 'pinned' | 'tags' | 'dueDate' | 'reminderAt'
    >
  >
): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    const i = b.notes.findIndex((n) => n.id === id);
    if (i < 0) return;
    const cur = b.notes[i]!;
    const next: QuickNote = {
      ...cur,
      title: patch.title !== undefined ? patch.title.trim() : cur.title,
      body: patch.body !== undefined ? patch.body.trim() : cur.body,
      priority:
        patch.priority !== undefined && isNotePriority(patch.priority)
          ? patch.priority
          : cur.priority,
      colorKey:
        patch.colorKey !== undefined && isNoteColorKey(patch.colorKey)
          ? patch.colorKey
          : cur.colorKey,
      pinned: patch.pinned !== undefined ? Boolean(patch.pinned) : cur.pinned,
      tags: patch.tags !== undefined ? normalizeTagList(patch.tags) : cur.tags,
      dueDate: patch.dueDate !== undefined ? normalizeDueDate(patch.dueDate) : cur.dueDate,
      reminderAt:
        patch.reminderAt !== undefined ? normalizeReminderAt(patch.reminderAt) : cur.reminderAt,
      updatedAt: Date.now(),
    };
    b.notes[i] = next;
    await saveBlob(u, b);
    return;
  }

  const notes = await getNotesArray(u);
  const i = notes.findIndex((n) => n.id === id);
  if (i < 0) return;
  const cur = notes[i]!;
  notes[i] = {
    ...cur,
    title: patch.title !== undefined ? patch.title.trim() : cur.title,
    body: patch.body !== undefined ? patch.body.trim() : cur.body,
    priority:
      patch.priority !== undefined && isNotePriority(patch.priority)
        ? patch.priority
        : cur.priority,
    colorKey:
      patch.colorKey !== undefined && isNoteColorKey(patch.colorKey)
        ? patch.colorKey
        : cur.colorKey,
    pinned: patch.pinned !== undefined ? Boolean(patch.pinned) : cur.pinned,
    tags: patch.tags !== undefined ? normalizeTagList(patch.tags) : cur.tags,
    dueDate: patch.dueDate !== undefined ? normalizeDueDate(patch.dueDate) : cur.dueDate,
    reminderAt:
      patch.reminderAt !== undefined ? normalizeReminderAt(patch.reminderAt) : cur.reminderAt,
    updatedAt: Date.now(),
  };
  await setUserAppSnapshot(u, USER_SNAPSHOT_KEYS.quickNotes, notes);
}

export async function deleteQuickNote(id: string): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    b.notes = b.notes.filter((n) => n.id !== id);
    await saveBlob(u, b);
    return;
  }

  const notes = await getNotesArray(u);
  await setUserAppSnapshot(
    u,
    USER_SNAPSHOT_KEYS.quickNotes,
    notes.filter((n) => n.id !== id)
  );
}

/** Single-line preview for lists */
export function notePreviewTitle(note: QuickNote): string {
  const t = note.title.trim();
  if (t) return t;
  const line = note.body.trim().split(/\n/)[0]?.trim() ?? '';
  if (!line) return 'Empty note';
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}
