import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type NotificationIconName = ComponentProps<typeof Ionicons>['name'];

export interface DummyNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  icon: NotificationIconName;
}

/** Sample rows for the notifications UI — replace with real data when push/in-app feed ships. */
export const DUMMY_NOTIFICATIONS: DummyNotification[] = [
  {
    id: '1',
    icon: 'document-text-outline',
    title: 'Permit renewal reminder',
    body: 'Electrical permit for Downtown Tower B expires in 12 days. Review in Permit manager.',
    timeLabel: '2h ago',
  },
  {
    id: '2',
    icon: 'checkbox-outline',
    title: 'Task due today',
    body: 'MEP rough-in review is marked due today for Project Riverside.',
    timeLabel: 'Yesterday',
  },
  {
    id: '3',
    icon: 'wallet-outline',
    title: 'Budget variance',
    body: 'Labour category is 8% over planned on the active budget — check Budget tracker.',
    timeLabel: '2 days ago',
  },
  {
    id: '4',
    icon: 'clipboard-outline',
    title: 'Site log',
    body: 'Reminder: submit today’s daily site log before end of shift.',
    timeLabel: '3 days ago',
  },
  {
    id: '5',
    icon: 'shield-checkmark-outline',
    title: 'Safety checklist',
    body: 'Weekly site safety checklist has not been completed this week.',
    timeLabel: 'Last week',
  },
];
