import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/useAuthStore';
import { loadNotificationHistory, mergeTrayIntoHistory, type NotificationHistoryEntry } from '@/lib/notifications/history';
import {
  fetchInboxFromSystem,
  getNotificationPermissionState,
  getScheduledNotificationCount,
  notificationsSupportedInCurrentRuntime,
  type NotificationPermissionState,
  type PresentedInboxRow,
  type ScheduledInboxRow,
} from '@/lib/notifications/service';

function formatRelativeTime(locale: string, epochMs: number): string {
  const now = Date.now();
  const diffSec = Math.round((now - epochMs) / 1000);
  const RelativeTimeFormat = Intl?.RelativeTimeFormat;
  if (typeof RelativeTimeFormat === 'function') {
    const rtf = new RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(diffSec) < 45) return rtf.format(-Math.max(1, diffSec), 'second');
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 36) return rtf.format(-diffHr, 'hour');
    const diffDay = Math.round(diffHr / 24);
    return rtf.format(-diffDay, 'day');
  }

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return `${absSec}s ago`;
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return `${absMin}m ago`;
  const absHr = Math.round(absMin / 60);
  if (absHr < 48) return `${absHr}h ago`;
  const absDay = Math.round(absHr / 24);
  return `${absDay}d ago`;
}

function rowInTray(row: NotificationHistoryEntry, presented: PresentedInboxRow[]): boolean {
  if (row.requestIdentifier) {
    return presented.some((p) => p.identifier === row.requestIdentifier);
  }
  return presented.some(
    (p) =>
      p.title === row.title &&
      p.body === row.body &&
      Math.abs(p.date - row.receivedAt) < 3 * 60 * 1000
  );
}

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [scheduledRows, setScheduledRows] = useState<ScheduledInboxRow[]>([]);
  const [historyRows, setHistoryRows] = useState<NotificationHistoryEntry[]>([]);
  const [presentedRows, setPresentedRows] = useState<PresentedInboxRow[]>([]);
  const notificationsSupported = notificationsSupportedInCurrentRuntime();

  const refreshFeed = useCallback(async () => {
    if (!uid) {
      setScheduledRows([]);
      setHistoryRows([]);
      setPresentedRows([]);
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    try {
      if (notificationsSupported) {
        const system = await fetchInboxFromSystem();
        await mergeTrayIntoHistory(
          uid,
          system.presented.map((p) => ({
            title: p.title,
            body: p.body,
            date: p.date,
            identifier: p.identifier,
          }))
        );
        const hist = await loadNotificationHistory(uid);
        setScheduledRows(system.scheduled);
        setHistoryRows(hist);
        setPresentedRows(system.presented);
      } else {
        const hist = await loadNotificationHistory(uid);
        setScheduledRows([]);
        setHistoryRows(hist);
        setPresentedRows([]);
      }
    } finally {
      setFeedLoading(false);
    }
  }, [notificationsSupported, uid]);

  const refreshState = useCallback(async () => {
    const [perm, count] = await Promise.all([
      getNotificationPermissionState(),
      getScheduledNotificationCount(),
    ]);
    setPermissionState(perm);
    setScheduledCount(count);
    await refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      if (Platform.OS === 'android') {
        setStatusBarBackgroundColor('#FFFFFF');
      }
      void refreshState();
      return () => {};
    }, [refreshState])
  );

  const permissionTone = permissionState === 'granted' ? 'success' : permissionState === 'denied' ? 'danger' : 'warning';
  const permissionLabel =
    permissionState === 'granted'
      ? 'Enabled'
      : permissionState === 'denied'
        ? 'Blocked'
        : 'Not enabled';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('notifications.title')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="border-b border-neutral-200 bg-brand-50 px-5 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="min-w-0 flex-1 text-sm leading-5 text-neutral-800"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('notifications.banner')}
            </Text>
            <Badge label={permissionLabel} tone={permissionTone} />
          </View>
        </View>

        <View className="px-5 pt-4">
          
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {t('notifications.section.scheduled')}
            </Text>
            {feedLoading ? <ActivityIndicator size="small" color={Colors.brand[700]} /> : null}
          </View>

          {scheduledRows.length === 0 ? (
            <Text
              className="mb-6 text-sm text-neutral-500"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('notifications.empty.scheduled')}
            </Text>
          ) : (
            <View className="mb-6">
              {scheduledRows.map((n, index) => (
                <View
                  key={n.identifier}
                  className={`mb-3 flex-row rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${
                    index === scheduledRows.length - 1 ? 'mb-0' : ''
                  }`}
                >
                  <View
                    className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: Colors.brand[100] }}
                  >
                    <Ionicons name="time-outline" size={22} color={Colors.brand[900]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <Text
                        className="min-w-0 flex-1 text-base text-brand-900"
                        style={{ fontFamily: 'Poppins_700Bold' }}
                        numberOfLines={2}
                      >
                        {n.title}
                      </Text>
                      <Badge label={t('notifications.badge.upcoming')} tone="warning" />
                    </View>
                    {n.body ? (
                      <Text
                        className="mt-1 text-sm leading-5 text-neutral-600"
                        style={{ fontFamily: 'Inter_400Regular' }}
                      >
                        {n.body}
                      </Text>
                    ) : null}
                    <Text
                      className="mt-2 text-xs text-neutral-500"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {n.scheduleLabel}
                      {n.nextFireMs != null
                        ? ` · ${t('notifications.nextPrefix')}: ${new Date(n.nextFireMs).toLocaleString(locale, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}`
                        : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text
            className="mb-3 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {t('notifications.section.recent')}
          </Text>

          {historyRows.length === 0 ? (
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('notifications.empty.recent')}
            </Text>
          ) : (
            historyRows.map((n, index) => {
              const inTray = rowInTray(n, presentedRows);
              return (
                <View
                  key={n.id}
                  className={`mb-3 flex-row rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${
                    index === historyRows.length - 1 ? 'mb-0' : ''
                  }`}
                >
                  <View
                    className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: Colors.brand[100] }}
                  >
                    <Ionicons name="notifications-outline" size={22} color={Colors.brand[900]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <Text
                        className="min-w-0 flex-1 text-base text-brand-900"
                        style={{ fontFamily: 'Poppins_700Bold' }}
                        numberOfLines={2}
                      >
                        {n.title}
                      </Text>
                      <Badge
                        label={inTray ? t('notifications.badge.inTray') : t('notifications.badge.delivered')}
                        tone={inTray ? 'warning' : 'neutral'}
                      />
                    </View>
                    {n.body ? (
                      <Text
                        className="mt-1 text-sm leading-5 text-neutral-600"
                        style={{ fontFamily: 'Inter_400Regular' }}
                      >
                        {n.body}
                      </Text>
                    ) : null}
                    <Text
                      className="mt-2 text-xs text-neutral-400"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {formatRelativeTime(locale, n.receivedAt)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
