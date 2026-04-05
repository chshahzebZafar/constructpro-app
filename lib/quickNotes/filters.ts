import { isDueWithinDays, isNoteOverdue } from '@/lib/quickNotes/dateUtils';
import type { QuickNote } from '@/lib/quickNotes/types';

export type NoteListFilter = 'all' | 'pinned' | 'overdue' | 'soon';

export function filterQuickNotes(
  notes: QuickNote[],
  opts: { query: string; filter: NoteListFilter; tag: string | null }
): QuickNote[] {
  let list = notes;
  const q = opts.query.trim().toLowerCase();
  if (q) {
    list = list.filter((n) => {
      if (n.title.toLowerCase().includes(q)) return true;
      if (n.body.toLowerCase().includes(q)) return true;
      return n.tags.some((t) => t.includes(q));
    });
  }
  if (opts.filter === 'pinned') {
    list = list.filter((n) => n.pinned);
  } else if (opts.filter === 'overdue') {
    list = list.filter((n) => isNoteOverdue(n.dueDate));
  } else if (opts.filter === 'soon') {
    list = list.filter((n) => isDueWithinDays(n.dueDate, 7));
  }
  if (opts.tag) {
    const t = opts.tag.toLowerCase();
    list = list.filter((n) => n.tags.includes(t));
  }
  return list;
}

export function collectAllTags(notes: QuickNote[]): string[] {
  const s = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}
