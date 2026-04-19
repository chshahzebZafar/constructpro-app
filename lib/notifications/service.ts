import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import type { NotificationSettings } from '@/lib/notifications/settings';
import { buildDynamicNotificationBodies } from '@/lib/notifications/dynamicContent';
import { appendNotificationHistory, mergeTrayIntoHistory } from '@/lib/notifications/history';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

const DEFAULT_CHANNEL_ID = 'default';
const isExpoGo = Constants.appOwnership === 'expo';
const MANAGED_IDS_KEY_PREFIX = 'managed_notification_ids_';
const LAST_DYNAMIC_RESCHEDULE_PREFIX = 'notification_dynamic_reschedule_at_';
const RESCHEDULE_MIN_INTERVAL_MS = 5 * 60 * 1000;

const MANAGED_DATA_FLAG = 'constructpro_managed';

type NotificationsModule = typeof import('expo-notifications');

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;
  return import('expo-notifications');
}

function mapPermissionStatus(status: string): NotificationPermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export function notificationsSupportedInCurrentRuntime(): boolean {
  return !isExpoGo;
}

export async function configureNotificationsRuntime(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function configureNotificationChannels(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;
  if (Platform.OS !== 'android') return;
  await notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'Default',
    importance: notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#1B3A5C',
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const notifications = await getNotificationsModule();
  if (!notifications) return 'undetermined';
  const res = await notifications.getPermissionsAsync();
  return mapPermissionStatus(res.status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const notifications = await getNotificationsModule();
  if (!notifications) return 'undetermined';
  const current = await notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const requested = await notifications.requestPermissionsAsync();
  return mapPermissionStatus(requested.status);
}

export async function scheduleTestNotification(secondsFromNow = 3): Promise<string> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    throw new Error('Notifications are unavailable in Expo Go. Use a development build.');
  }
  return notifications.scheduleNotificationAsync({
    content: {
      title: 'ConstructPro',
      body: 'This is a test notification from ConstructPro.',
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.floor(secondsFromNow)),
      channelId: DEFAULT_CHANNEL_ID,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;
  await notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotificationCount(): Promise<number> {
  const notifications = await getNotificationsModule();
  if (!notifications) return 0;
  const rows = await notifications.getAllScheduledNotificationsAsync();
  return rows.length;
}

function managedIdsKey(uid: string): string {
  return `${MANAGED_IDS_KEY_PREFIX}${uid}`;
}

async function loadManagedIds(uid: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(managedIdsKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveManagedIds(uid: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(managedIdsKey(uid), JSON.stringify(ids));
}

async function scheduleCalendarNotification(
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<string> {
  const notifications = await getNotificationsModule();
  if (!notifications) throw new Error('Notifications unavailable');
  return notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        [MANAGED_DATA_FLAG]: true,
        kind: 'settings_schedule',
      },
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: DEFAULT_CHANNEL_ID,
    },
  });
}

function parseTimeOrDefault(value: string | undefined, fallback: string): { hour: number; minute: number } {
  const source = (value ?? '').trim();
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(source);
  if (!m) {
    const fb = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(fallback);
    if (!fb) return { hour: 9, minute: 0 };
    return { hour: Number(fb[1]), minute: Number(fb[2]) };
  }
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export async function clearManagedNotificationSchedules(uid: string): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  // Migration-safe approach: ConstructPro is the only owner of local schedules in this app.
  // Clear everything to avoid legacy duplicates after updates or AsyncStorage resets.
  try {
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }

  // Defensive cleanup: if AsyncStorage was cleared or the IDs list is stale, we still
  // cancel any ConstructPro-managed schedules for this user.
  try {
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((req) => {
      const data = (req.content as { data?: Record<string, unknown> } | undefined)?.data;
      if (!data || typeof data !== 'object') return false;
      return data[MANAGED_DATA_FLAG] === true;
    });
    await Promise.all(
      ours.map((req) => notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => {}))
    );
  } catch {
    // ignore
  }

  const ids = await loadManagedIds(uid);
  await Promise.all(ids.map((id) => notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await saveManagedIds(uid, []);
}

export async function applyNotificationSettingsSchedules(
  uid: string,
  settings: NotificationSettings,
  opts?: { skipDynamicBodies?: boolean }
): Promise<void> {
  if (!uid) return;
  if (!notificationsSupportedInCurrentRuntime()) return;
  await clearManagedNotificationSchedules(uid);
  if (!settings.enabled) return;

  const dynamic = opts?.skipDynamicBodies
    ? null
    : await buildDynamicNotificationBodies(settings).catch(() => null);

  const ids: string[] = [];

  if (settings.categories.dailyBriefing) {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.dailyBriefing, '08:00');
    const t = dynamic?.dailyBriefing ?? {
      title: 'ConstructPro — daily briefing',
      body: 'Review pending tasks, permit expiries, and milestones for today.',
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  if (settings.categories.taskReminders && settings.overdueAlerts === 'daily') {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.taskReminders, '09:30');
    const t = dynamic?.taskReminders ?? {
      title: 'Task reminders',
      body: 'You have pending/overdue tasks to review.',
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  if (settings.categories.permitExpiry) {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.permitExpiry, '10:00');
    const t = dynamic?.permitExpiry ?? {
      title: 'Permit expiry check',
      body: `Check permits expiring in ${settings.permitAlertDays.join('/')} day windows.`,
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  if (settings.categories.milestones) {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.milestones, '10:30');
    const t = dynamic?.milestones ?? {
      title: 'Milestone reminders',
      body: 'Review upcoming milestones and dependencies.',
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  if (settings.categories.safety) {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.safety, '11:00');
    const t = dynamic?.safety ?? {
      title: 'Safety reminder',
      body: 'Complete safety checks and follow-up actions.',
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  if (settings.categories.budgetAlerts) {
    const { hour, minute } = parseTimeOrDefault(settings.scheduleTimes?.budgetAlerts, '11:30');
    const t = dynamic?.budgetAlerts ?? {
      title: 'Budget alerts',
      body: 'Review budget variance and category spend.',
    };
    ids.push(await scheduleCalendarNotification(t.title, t.body, hour, minute));
  }

  await saveManagedIds(uid, ids);
  await AsyncStorage.setItem(LAST_DYNAMIC_RESCHEDULE_PREFIX + uid, String(Date.now()));
}

async function shouldThrottleReschedule(uid: string, force: boolean): Promise<boolean> {
  if (force) return false;
  const raw = await AsyncStorage.getItem(LAST_DYNAMIC_RESCHEDULE_PREFIX + uid);
  if (!raw) return false;
  const t = Number(raw);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < RESCHEDULE_MIN_INTERVAL_MS;
}

/**
 * Reloads saved notification settings and reapplies schedules with **fresh dynamic bodies**
 * (tasks, permits, milestones, punch list, budget totals). Call after app foreground or data changes.
 */
export async function refreshNotificationSchedulesForUser(
  uid: string,
  opts?: { force?: boolean }
): Promise<void> {
  if (!uid || !notificationsSupportedInCurrentRuntime()) return;
  const force = opts?.force === true;
  if (await shouldThrottleReschedule(uid, force)) return;
  const { loadNotificationSettings } = await import('@/lib/notifications/settings');
  const settings = await loadNotificationSettings(uid);
  await applyNotificationSettingsSchedules(uid, settings);
}

export type PresentedInboxRow = {
  identifier: string;
  title: string;
  body: string;
  date: number;
};

export type ScheduledInboxRow = {
  identifier: string;
  title: string;
  body: string;
  nextFireMs: number | null;
  scheduleLabel: string;
};

/**
 * Notifications still showing in the system tray + all locally scheduled requests (ConstructPro reminders).
 */
export async function fetchInboxFromSystem(): Promise<{
  presented: PresentedInboxRow[];
  scheduled: ScheduledInboxRow[];
}> {
  const notifications = await getNotificationsModule();
  if (!notifications) return { presented: [], scheduled: [] };

  const [presentedRaw, scheduledRaw] = await Promise.all([
    notifications.getPresentedNotificationsAsync(),
    notifications.getAllScheduledNotificationsAsync(),
  ]);

  const presented: PresentedInboxRow[] = presentedRaw.map((n) => ({
    identifier: n.request.identifier,
    title: (n.request.content.title ?? '').trim() || 'ConstructPro',
    body: (n.request.content.body ?? '').trim(),
    date: n.date,
  }));

  const Types = notifications.SchedulableTriggerInputTypes;
  const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

  const scheduled: ScheduledInboxRow[] = [];
  for (const req of scheduledRaw) {
    const title = (req.content.title ?? '').trim() || 'ConstructPro';
    const body = (req.content.body ?? '').trim();
    let nextFireMs: number | null = null;
    let scheduleLabel = '';

    const tr = req.trigger as Record<string, unknown> | null;
    try {
      if (tr && typeof tr === 'object' && 'type' in tr) {
        const type = tr.type as string;
        if (type === 'daily' && typeof tr.hour === 'number' && typeof tr.minute === 'number') {
          scheduleLabel = `Daily · ${pad2(tr.hour)}:${pad2(tr.minute)}`;
          nextFireMs = await notifications.getNextTriggerDateAsync({
            type: Types.DAILY,
            hour: tr.hour,
            minute: tr.minute,
            channelId: DEFAULT_CHANNEL_ID,
          });
        } else if (type === 'timeInterval' && typeof tr.seconds === 'number') {
          const repeats = Boolean(tr.repeats);
          scheduleLabel = repeats ? `Every ${tr.seconds}s` : `In ${tr.seconds}s`;
          nextFireMs = await notifications.getNextTriggerDateAsync({
            type: Types.TIME_INTERVAL,
            seconds: tr.seconds,
            repeats,
            channelId: DEFAULT_CHANNEL_ID,
          });
        } else if (
          type === 'calendar' &&
          tr.repeats === true &&
          tr.dateComponents &&
          typeof tr.dateComponents === 'object'
        ) {
          const dc = tr.dateComponents as Record<string, unknown>;
          const hour = typeof dc.hour === 'number' ? dc.hour : 0;
          const minute = typeof dc.minute === 'number' ? dc.minute : 0;
          scheduleLabel = `Daily · ${pad2(hour)}:${pad2(minute)}`;
          nextFireMs = await notifications.getNextTriggerDateAsync({
            type: Types.DAILY,
            hour,
            minute,
            channelId: DEFAULT_CHANNEL_ID,
          });
        } else if (type) {
          scheduleLabel = type;
        }
      }
    } catch {
      /* ignore next-fire calculation errors */
    }

    scheduled.push({
      identifier: req.identifier,
      title,
      body,
      nextFireMs,
      scheduleLabel: scheduleLabel || 'Scheduled',
    });
  }

  scheduled.sort((a, b) => {
    if (a.nextFireMs == null && b.nextFireMs == null) return 0;
    if (a.nextFireMs == null) return 1;
    if (b.nextFireMs == null) return -1;
    return a.nextFireMs - b.nextFireMs;
  });

  return { presented, scheduled };
}

/**
 * Pulls currently presented notifications from the OS and merges them into the app's
 * local history store. Useful on app foreground so history remains complete even if
 * the user never opens the Inbox screen.
 */
export async function mergePresentedTrayIntoHistory(uid: string): Promise<void> {
  if (!uid) return;
  const notifications = await getNotificationsModule();
  if (!notifications) return;
  const presentedRaw = await notifications.getPresentedNotificationsAsync();
  const tray = presentedRaw.map((n) => ({
    title: n.request.content.title ?? 'ConstructPro',
    body: n.request.content.body ?? '',
    date: n.date,
    identifier: n.request.identifier,
  }));
  await mergeTrayIntoHistory(uid, tray);
}

let inboxCaptureCleanup: (() => void) | null = null;

/**
 * Persists notifications delivered while the app is running. Also pass `mergeTrayIntoHistory` on screen open
 * for alerts that arrived while the app was backgrounded.
 */
export async function subscribeNotificationInboxCapture(): Promise<() => void> {
  if (inboxCaptureCleanup) return inboxCaptureCleanup;
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return () => {};
  }
  const sub = notifications.addNotificationReceivedListener((notification) => {
    const uid = useAuthStore.getState().user?.uid ?? useAuthStore.getState().offlinePreviewUid;
    if (!uid) return;
    const title = notification.request.content.title ?? 'ConstructPro';
    const body = notification.request.content.body ?? '';
    void appendNotificationHistory(uid, {
      title,
      body,
      receivedAt: notification.date,
      requestIdentifier: notification.request.identifier,
    });
  });
  const cleanup = () => {
    sub.remove();
    inboxCaptureCleanup = null;
  };
  inboxCaptureCleanup = cleanup;
  return cleanup;
}

