import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable, Switch, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';
import { useI18n } from '@/hooks/useI18n';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationCategoryToggles,
  type NotificationSettings,
  type OverdueAlertFrequency,
  type PermitAlertDays,
  type SnoozeOption,
} from '@/lib/notifications/settings';
import {
  applyNotificationSettingsSchedules,
  cancelAllNotifications,
  getNotificationPermissionState,
  getScheduledNotificationCount,
  notificationsSupportedInCurrentRuntime,
  requestNotificationPermission,
  scheduleTestNotification,
  type NotificationPermissionState,
} from '@/lib/notifications/service';

const PERMIT_DAY_OPTIONS: PermitAlertDays[] = [30, 14, 7, 3, 1];
const SNOOZE_OPTIONS: SnoozeOption[] = ['15m', '1h', 'tomorrow'];

export default function NotificationsSettingsScreen() {
  const { t } = useI18n();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [saving, setSaving] = useState(false);
  const [toolsBusy, setToolsBusy] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [timePickerKey, setTimePickerKey] = useState<keyof NotificationSettings['scheduleTimes'] | null>(null);
  const [timePickerDate, setTimePickerDate] = useState(new Date());

  const notificationsSupported = notificationsSupportedInCurrentRuntime();

  const load = useCallback(async () => {
    if (!uid) return;
    const next = await loadNotificationSettings(uid);
    setSettings(next);
  }, [uid]);

  const refreshPermissionAndCounts = useCallback(async () => {
    const [perm, count] = await Promise.all([
      getNotificationPermissionState(),
      getScheduledNotificationCount(),
    ]);
    setPermissionState(perm);
    setScheduledCount(count);
  }, []);

  useEffect(() => {
    void load();
    void refreshPermissionAndCounts();
  }, [load, refreshPermissionAndCounts]);

  const persist = useCallback(
    async (next: NotificationSettings) => {
      if (!uid) {
        Alert.alert(
          localizeKnownUiText(t, 'Notifications'),
          localizeKnownUiText(t, 'Please sign in to update notification settings.')
        );
        return;
      }
      setSettings(next);
      setSaving(true);
      try {
        await saveNotificationSettings(uid, next);
        if (notificationsSupportedInCurrentRuntime()) {
          await applyNotificationSettingsSchedules(uid, next);
        }
      } catch (e) {
        Alert.alert(
          localizeKnownUiText(t, 'Notifications'),
          e instanceof Error ? e.message : localizeKnownUiText(t, 'Could not save notifications settings')
        );
      } finally {
        setSaving(false);
      }
    },
    [t, uid]
  );

  const handleEnableNotifications = useCallback(async () => {
    setToolsBusy(true);
    try {
      if (!notificationsSupported) {
        Alert.alert(
          'Development build required',
          'Notifications are unavailable in Expo Go. Please run a development build to enable local and push notifications.'
        );
        return;
      }
      const next = await requestNotificationPermission();
      setPermissionState(next);
      if (next !== 'granted') {
        Alert.alert(
          'Notifications are not enabled',
          'Please allow notifications from system settings to receive reminders.'
        );
      }
    } finally {
      setToolsBusy(false);
      void refreshPermissionAndCounts();
    }
  }, [notificationsSupported, refreshPermissionAndCounts]);

  const handleSendTest = useCallback(async () => {
    setToolsBusy(true);
    try {
      if (!notificationsSupported) {
        Alert.alert(
          'Development build required',
          'Notifications are unavailable in Expo Go. Please run a development build to test notifications.'
        );
        return;
      }
      const perm = await getNotificationPermissionState();
      if (perm !== 'granted') {
        const requested = await requestNotificationPermission();
        if (requested !== 'granted') {
          Alert.alert(
            'Permission required',
            'Enable notifications first, then try sending a test notification.'
          );
          return;
        }
      }
      await scheduleTestNotification(3);
      Alert.alert('Test scheduled', 'A test notification will appear in a few seconds.');
    } finally {
      setToolsBusy(false);
      void refreshPermissionAndCounts();
    }
  }, [notificationsSupported, refreshPermissionAndCounts]);

  const handleClearScheduled = useCallback(async () => {
    setToolsBusy(true);
    try {
      await cancelAllNotifications();
      Alert.alert('Cleared', 'All scheduled notifications were removed.');
    } finally {
      setToolsBusy(false);
      void refreshPermissionAndCounts();
    }
  }, [refreshPermissionAndCounts]);

  const toggleCategory = useCallback(
    (key: keyof NotificationCategoryToggles) => {
      const next: NotificationSettings = {
        ...settings,
        categories: {
          ...settings.categories,
          [key]: !settings.categories[key],
        },
      };
      void persist(next);
    },
    [persist, settings]
  );

  const togglePermitDay = useCallback(
    (day: PermitAlertDays) => {
      const next = { ...settings, permitAlertDays: [day] };
      void persist(next);
    },
    [persist, settings]
  );

  const setSnooze = useCallback(
    (opt: SnoozeOption) => {
      const next = { ...settings, snoozeOptions: [opt] };
      void persist(next);
    },
    [persist, settings]
  );

  const setOverdueAlerts = useCallback(
    (value: OverdueAlertFrequency) => {
      const next = { ...settings, overdueAlerts: value };
      void persist(next);
    },
    [persist, settings]
  );

  const setQuietTime = useCallback(
    (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
      const next = { ...settings, [field]: value };
      void persist(next);
    },
    [persist, settings]
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? settings.timezone;
  const normalizedTime = (raw: string, fallback: string) => {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
    if (!m) return fallback;
    const hh = String(Number(m[1])).padStart(2, '0');
    const mm = String(Number(m[2])).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const timeToDate = (value: string, fallback: string): Date => {
    const resolved = normalizedTime(value, fallback);
    const [h, m] = resolved.split(':').map((v) => Number(v));
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const showTimePicker = (keyName: keyof NotificationSettings['scheduleTimes'], fallback: string) => {
    setTimePickerKey(keyName);
    setTimePickerDate(timeToDate(settings.scheduleTimes[keyName], fallback));
  };

  const onTimePicked = (event: DateTimePickerEvent, selected?: Date) => {
    if (!timePickerKey) return;
    if (Platform.OS !== 'ios') setTimePickerKey(null);
    if (event.type === 'dismissed' || !selected) return;
    const hh = String(selected.getHours()).padStart(2, '0');
    const mm = String(selected.getMinutes()).padStart(2, '0');
    const value = `${hh}:${mm}`;
    const next = {
      ...settings,
      scheduleTimes: {
        ...settings.scheduleTimes,
        [timePickerKey]: value,
      },
    };
    void persist(next);
  };
  const scheduledPreviewItems = [
    settings.enabled && settings.categories.dailyBriefing
      ? `Daily briefing at ${normalizedTime(settings.scheduleTimes.dailyBriefing, '08:00')}`
      : null,
    settings.enabled && settings.categories.taskReminders && settings.overdueAlerts === 'daily'
      ? `Task reminders at ${normalizedTime(settings.scheduleTimes.taskReminders, '09:30')} (once/day)`
      : null,
    settings.enabled && settings.categories.permitExpiry
      ? `Permit expiry check at ${normalizedTime(settings.scheduleTimes.permitExpiry, '10:00')} (${settings.permitAlertDays.join('/') || 'none'} day windows)`
      : null,
    settings.enabled && settings.categories.milestones
      ? `Milestone reminders at ${normalizedTime(settings.scheduleTimes.milestones, '10:30')}`
      : null,
    settings.enabled && settings.categories.safety
      ? `Safety reminder at ${normalizedTime(settings.scheduleTimes.safety, '11:00')}`
      : null,
    settings.enabled && settings.categories.budgetAlerts
      ? `Budget alerts at ${normalizedTime(settings.scheduleTimes.budgetAlerts, '11:30')}`
      : null,
  ].filter((v): v is string => Boolean(v));

  const Chip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${selected ? 'border-brand-700 bg-brand-100' : 'border-neutral-300 bg-white'}`}
    >
      <Text className={`${selected ? 'text-brand-900' : 'text-neutral-700'}`} style={{ fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
    </Pressable>
  );

  const ToggleRow = ({
    label,
    value,
    onChange,
    isLast,
  }: {
    label: string;
    value: boolean;
    onChange: () => void;
    isLast?: boolean;
  }) => (
    <View className={`flex-row items-center justify-between py-3 ${isLast ? '' : 'border-b border-neutral-100'}`}>
      <Text className="flex-1 pr-3 text-base text-neutral-900" style={{ fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  const TimeRow = ({
    label,
    keyName,
    fallback,
    isLast,
  }: {
    label: string;
    keyName: keyof NotificationSettings['scheduleTimes'];
    fallback: string;
    isLast?: boolean;
  }) => (
    <View className={`py-3 ${isLast ? '' : 'border-b border-neutral-100'}`}>
      <Text className="mb-2 text-sm text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
      <Pressable
        onPress={() => showTimePicker(keyName, fallback)}
        className="rounded-xl border border-neutral-300 px-3 py-3 active:opacity-80"
      >
        <Text className="text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }}>
          {normalizedTime(settings.scheduleTimes[keyName], fallback)}
        </Text>
      </Pressable>
      <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
        Tap to pick time (default {fallback})
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Notification settings" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Notification tools
          </Text>
          <Text className="text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Permission: {permissionState}
          </Text>
          <Text className="mt-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Scheduled notifications: {scheduledCount}
          </Text>
          {toolsBusy ? (
            <View className="mt-3">
              <ActivityIndicator />
            </View>
          ) : null}
          <View className="mt-3 gap-2">
            <Button
              title={permissionState === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              onPress={handleEnableNotifications}
              loading={toolsBusy}
              disabled={permissionState === 'granted' || !notificationsSupported}
            />
            <Button
              title="Send test notification"
              onPress={handleSendTest}
              loading={toolsBusy}
              variant="secondary"
              disabled={!notificationsSupported}
            />
            <Button
              title="Clear scheduled notifications"
              onPress={handleClearScheduled}
              loading={toolsBusy}
              variant="outline"
            />
          </View>
        </Card>

        <Card className="mb-4">
          <ToggleRow
            label="Enable notifications"
            value={settings.enabled}
            onChange={() => void persist({ ...settings, enabled: !settings.enabled })}
            isLast
          />
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Quiet hours
          </Text>
          <Text className="mb-3 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Timezone-aware scheduling ({timezone})
          </Text>
          <View className="flex-row gap-2">
            <Chip
              label={`Start: ${settings.quietHoursStart}`}
              selected={false}
              onPress={() =>
                void setQuietTime('quietHoursStart', settings.quietHoursStart === '22:00' ? '23:00' : '22:00')
              }
            />
            <Chip
              label={`End: ${settings.quietHoursEnd}`}
              selected={false}
              onPress={() =>
                void setQuietTime('quietHoursEnd', settings.quietHoursEnd === '07:00' ? '06:00' : '07:00')
              }
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Manual trigger times
          </Text>
          <TimeRow label="Daily briefing time" keyName="dailyBriefing" fallback="08:00" />
          <TimeRow label="Task reminders time" keyName="taskReminders" fallback="09:30" />
          <TimeRow label="Permit expiry time" keyName="permitExpiry" fallback="10:00" />
          <TimeRow label="Milestones time" keyName="milestones" fallback="10:30" />
          <TimeRow label="Safety time" keyName="safety" fallback="11:00" />
          <TimeRow label="Budget alerts time" keyName="budgetAlerts" fallback="11:30" isLast />
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Category toggles
          </Text>
          <ToggleRow
            label="Daily briefing"
            value={settings.categories.dailyBriefing}
            onChange={() => toggleCategory('dailyBriefing')}
          />
          <ToggleRow
            label="Task reminders"
            value={settings.categories.taskReminders}
            onChange={() => toggleCategory('taskReminders')}
          />
          <ToggleRow
            label="Permit expiry"
            value={settings.categories.permitExpiry}
            onChange={() => toggleCategory('permitExpiry')}
          />
          <ToggleRow
            label="Milestones"
            value={settings.categories.milestones}
            onChange={() => toggleCategory('milestones')}
          />
          <ToggleRow
            label="Safety"
            value={settings.categories.safety}
            onChange={() => toggleCategory('safety')}
          />
          <ToggleRow
            label="Budget alerts"
            value={settings.categories.budgetAlerts}
            onChange={() => toggleCategory('budgetAlerts')}
            isLast
          />
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Frequency controls
          </Text>
          <Text className="mb-2 text-sm text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
            Overdue alerts
          </Text>
          <View className="mb-4 flex-row gap-2">
            <Chip label="Once/day" selected={settings.overdueAlerts === 'daily'} onPress={() => setOverdueAlerts('daily')} />
            <Chip label="Off" selected={settings.overdueAlerts === 'off'} onPress={() => setOverdueAlerts('off')} />
          </View>

          <Text className="mb-2 text-sm text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
            Permit alerts (days before expiry)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PERMIT_DAY_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={`${d}d`}
                selected={settings.permitAlertDays.includes(d)}
                onPress={() => togglePermitDay(d)}
              />
            ))}
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Snooze options
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="15m"
              selected={settings.snoozeOptions[0] === '15m'}
              onPress={() => setSnooze('15m')}
            />
            <Chip
              label="1h"
              selected={settings.snoozeOptions[0] === '1h'}
              onPress={() => setSnooze('1h')}
            />
            <Chip
              label="Tomorrow"
              selected={settings.snoozeOptions[0] === 'tomorrow'}
              onPress={() => setSnooze('tomorrow')}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
            Scheduled items preview
          </Text>
          <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {`Timezone: ${timezone}`}
          </Text>
          {scheduledPreviewItems.length === 0 ? (
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              No reminders are currently active.
            </Text>
          ) : (
            scheduledPreviewItems.map((item) => (
              <Text key={item} className="mb-1 text-sm text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                {`\u2022 ${item}`}
              </Text>
            ))
          )}
        </Card>

        <Button title={saving ? 'Saving...' : 'Save now'} onPress={() => void persist(settings)} disabled={saving} />
      </ScrollView>
      {timePickerKey ? (
        <DateTimePicker
          value={timePickerDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimePicked}
        />
      ) : null}
    </SafeAreaView>
  );
}

