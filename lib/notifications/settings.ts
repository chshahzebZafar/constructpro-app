import AsyncStorage from '@react-native-async-storage/async-storage';

export type OverdueAlertFrequency = 'daily' | 'off';
export type PermitAlertDays = 30 | 14 | 7 | 3 | 1;
export type SnoozeOption = '15m' | '1h' | 'tomorrow';

export interface NotificationCategoryToggles {
  dailyBriefing: boolean;
  taskReminders: boolean;
  permitExpiry: boolean;
  milestones: boolean;
  safety: boolean;
  budgetAlerts: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  scheduleTimes: {
    dailyBriefing: string;
    taskReminders: string;
    permitExpiry: string;
    milestones: string;
    safety: string;
    budgetAlerts: string;
  };
  categories: NotificationCategoryToggles;
  overdueAlerts: OverdueAlertFrequency;
  permitAlertDays: PermitAlertDays[];
  snoozeOptions: SnoozeOption[];
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  scheduleTimes: {
    dailyBriefing: '08:00',
    taskReminders: '09:30',
    permitExpiry: '10:00',
    milestones: '10:30',
    safety: '11:00',
    budgetAlerts: '11:30',
  },
  categories: {
    dailyBriefing: true,
    taskReminders: true,
    permitExpiry: true,
    milestones: true,
    safety: true,
    budgetAlerts: true,
  },
  overdueAlerts: 'daily',
  permitAlertDays: [30, 14, 7, 3, 1],
  snoozeOptions: ['15m', '1h', 'tomorrow'],
};

const VALID_PERMIT_ALERT_DAYS: PermitAlertDays[] = [30, 14, 7, 3, 1];
const VALID_SNOOZE_OPTIONS: SnoozeOption[] = ['15m', '1h', 'tomorrow'];

function keyFor(uid: string) {
  return `notification_settings_${uid}`;
}

function ensureUniqueSortedDays(days: PermitAlertDays[]): PermitAlertDays[] {
  const set = new Set<PermitAlertDays>(days.filter((d) => VALID_PERMIT_ALERT_DAYS.includes(d)));
  return [...set].sort((a, b) => b - a) as PermitAlertDays[];
}

function ensureUniqueSnoozes(values: SnoozeOption[]): SnoozeOption[] {
  const set = new Set<SnoozeOption>(values.filter((v) => VALID_SNOOZE_OPTIONS.includes(v)));
  return VALID_SNOOZE_OPTIONS.filter((v) => set.has(v));
}

function normalizeSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  return {
    enabled: raw?.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled,
    quietHoursStart: raw?.quietHoursStart ?? DEFAULT_NOTIFICATION_SETTINGS.quietHoursStart,
    quietHoursEnd: raw?.quietHoursEnd ?? DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnd,
    timezone: raw?.timezone ?? timezone,
    scheduleTimes: {
      dailyBriefing: raw?.scheduleTimes?.dailyBriefing ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.dailyBriefing,
      taskReminders: raw?.scheduleTimes?.taskReminders ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.taskReminders,
      permitExpiry: raw?.scheduleTimes?.permitExpiry ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.permitExpiry,
      milestones: raw?.scheduleTimes?.milestones ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.milestones,
      safety: raw?.scheduleTimes?.safety ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.safety,
      budgetAlerts: raw?.scheduleTimes?.budgetAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.scheduleTimes.budgetAlerts,
    },
    categories: {
      dailyBriefing: raw?.categories?.dailyBriefing ?? DEFAULT_NOTIFICATION_SETTINGS.categories.dailyBriefing,
      taskReminders: raw?.categories?.taskReminders ?? DEFAULT_NOTIFICATION_SETTINGS.categories.taskReminders,
      permitExpiry: raw?.categories?.permitExpiry ?? DEFAULT_NOTIFICATION_SETTINGS.categories.permitExpiry,
      milestones: raw?.categories?.milestones ?? DEFAULT_NOTIFICATION_SETTINGS.categories.milestones,
      safety: raw?.categories?.safety ?? DEFAULT_NOTIFICATION_SETTINGS.categories.safety,
      budgetAlerts: raw?.categories?.budgetAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.categories.budgetAlerts,
    },
    overdueAlerts:
      raw?.overdueAlerts === 'off' || raw?.overdueAlerts === 'daily'
        ? raw.overdueAlerts
        : DEFAULT_NOTIFICATION_SETTINGS.overdueAlerts,
    permitAlertDays: ensureUniqueSortedDays(
      (raw?.permitAlertDays as PermitAlertDays[] | undefined) ?? DEFAULT_NOTIFICATION_SETTINGS.permitAlertDays
    ),
    snoozeOptions: ensureUniqueSnoozes(
      (raw?.snoozeOptions as SnoozeOption[] | undefined) ?? DEFAULT_NOTIFICATION_SETTINGS.snoozeOptions
    ),
  };
}

export async function loadNotificationSettings(uid: string): Promise<NotificationSettings> {
  const raw = await AsyncStorage.getItem(keyFor(uid));
  if (!raw) return normalizeSettings(undefined);
  try {
    return normalizeSettings(JSON.parse(raw) as Partial<NotificationSettings>);
  } catch {
    return normalizeSettings(undefined);
  }
}

export async function saveNotificationSettings(uid: string, settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(normalizeSettings(settings)));
}

