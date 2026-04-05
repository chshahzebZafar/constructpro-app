export type NotePriority = 'low' | 'medium' | 'high';

/** Preset accent for card highlight — maps to app palette in noteStyle.ts */
export type NoteColorKey = 'default' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

export interface QuickNote {
  id: string;
  /** Optional heading; if empty, UI derives a preview from body */
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  priority: NotePriority;
  colorKey: NoteColorKey;
  pinned: boolean;
  /** Normalised lowercase tags (no # stored) */
  tags: string[];
  /** YYYY-MM-DD or null */
  dueDate: string | null;
  /** Epoch ms for reminder — optional; OS push not wired yet */
  reminderAt: number | null;
}

export type QuickNoteMeta = Partial<
  Pick<QuickNote, 'priority' | 'colorKey' | 'pinned' | 'tags' | 'dueDate' | 'reminderAt'>
>;
