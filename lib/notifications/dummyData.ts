import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type NotificationIconName = ComponentProps<typeof Ionicons>['name'];

export interface DummyNotificationRow {
  id: string;
  icon: NotificationIconName;
}

/** Preview rows — copy comes from i18n keys `notifications.dummy.{id}.*`. */
export const DUMMY_NOTIFICATION_ROWS: DummyNotificationRow[] = [
  { id: '1', icon: 'document-text-outline' },
  { id: '2', icon: 'checkbox-outline' },
  { id: '3', icon: 'wallet-outline' },
  { id: '4', icon: 'clipboard-outline' },
  { id: '5', icon: 'shield-checkmark-outline' },
];
