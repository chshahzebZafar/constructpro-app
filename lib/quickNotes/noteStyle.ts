import { Colors } from '@/constants/colors';
import type { NoteColorKey, NotePriority, QuickNote } from './types';

export const NOTE_COLOR_KEYS: NoteColorKey[] = [
  'default',
  'brand',
  'accent',
  'success',
  'warning',
  'danger',
];

export const NOTE_PRIORITIES: { id: NotePriority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

/** Strong accent for left border / swatches */
export function getNoteAccentColor(key: NoteColorKey): string {
  switch (key) {
    case 'brand':
      return Colors.brand[700];
    case 'accent':
      return Colors.accent[600];
    case 'success':
      return Colors.success[600];
    case 'warning':
      return Colors.warning[600];
    case 'danger':
      return Colors.danger[600];
    default:
      return Colors.neutral[300];
  }
}

/** Soft fill behind note content */
export function getNoteCardBackground(key: NoteColorKey): string {
  switch (key) {
    case 'brand':
      return Colors.brand[100];
    case 'accent':
      return Colors.accent[100];
    case 'success':
      return Colors.success[100];
    case 'warning':
      return Colors.warning[100];
    case 'danger':
      return Colors.danger[100];
    default:
      return Colors.neutral[50];
  }
}

export function getNoteCardChrome(note: QuickNote): {
  borderLeftColor: string;
  backgroundColor: string;
} {
  const key = note.colorKey ?? 'default';
  return {
    borderLeftColor: getNoteAccentColor(key),
    backgroundColor: getNoteCardBackground(key),
  };
}

export function priorityLabel(p: NotePriority): string {
  if (p === 'high') return 'High';
  if (p === 'low') return 'Low';
  return 'Medium';
}

/** Maps to existing Badge tones */
export function priorityBadgeTone(
  p: NotePriority
): 'danger' | 'warning' | 'success' | 'neutral' {
  if (p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'neutral';
}

export const NOTE_COLOR_LABELS: Record<NoteColorKey, string> = {
  default: 'Neutral',
  brand: 'Navy',
  accent: 'Orange',
  success: 'Green',
  warning: 'Amber',
  danger: 'Red',
};
