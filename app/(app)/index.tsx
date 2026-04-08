import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';
import {
  loadHomeDashboard,
  formatUsdTotal,
  type HomeTaskRow,
} from '@/lib/dashboard/homeData';
import { getNoteCardChrome, priorityBadgeTone, priorityLabel } from '@/lib/quickNotes/noteStyle';
import { formatDueLabel } from '@/lib/quickNotes/dateUtils';
import { listQuickNotes, notePreviewTitle } from '@/lib/quickNotes/repository';
import { AppMark } from '@/components/branding/AppMark';
import { DashboardWeatherRow } from '@/components/home/DashboardWeatherRow';
import { useHomeWeather } from '@/hooks/useHomeWeather';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

function taskTone(s: HomeTaskRow['status']): 'success' | 'warning' | 'danger' {
  if (s === 'On Track') return 'success';
  if (s === 'Due Today') return 'warning';
  return 'danger';
}

function greetingForHour(t: (key: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t('home.greeting.morning');
  if (h < 17) return t('home.greeting.afternoon');
  return t('home.greeting.evening');
}

function todayLabel(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

type MetricIcon = ComponentProps<typeof Ionicons>['name'];

const METRIC_VISUAL: { icon: MetricIcon; tileBg: string; iconBg: string; iconColor: string }[] = [
  { icon: 'briefcase-outline', tileBg: Colors.brand[100], iconBg: '#C5D9EF', iconColor: Colors.brand[900] },
  { icon: 'wallet-outline', tileBg: '#F0F4F8', iconBg: Colors.neutral[300], iconColor: Colors.neutral[700] },
  { icon: 'checkbox-outline', tileBg: Colors.success[100], iconBg: '#B8D4C9', iconColor: Colors.success[600] },
  { icon: 'document-text-outline', tileBg: Colors.accent[100], iconBg: '#F9D4B8', iconColor: Colors.accent[600] },
];

function getMetricPresentation(
  m: { label: string; value: string; warn: boolean; good: boolean },
  index: number
) {
  const base = METRIC_VISUAL[index] ?? METRIC_VISUAL[0]!;
  if (m.label === 'Open tasks' && m.warn) {
    return {
      ...base,
      tileBg: Colors.warning[100],
      iconBg: '#F0D99A',
      iconColor: Colors.warning[600],
    };
  }
  if (m.label === 'Open tasks' && m.value === '0') {
    return {
      ...base,
      tileBg: Colors.success[100],
      iconBg: '#B8D4C9',
      iconColor: Colors.success[600],
    };
  }
  if (m.label === 'Permits due' && m.warn) {
    return {
      ...base,
      tileBg: Colors.danger[100],
      iconBg: '#F0B4AE',
      iconColor: Colors.danger[600],
    };
  }
  if (m.label === 'Permits due' && m.good) {
    return {
      ...base,
      tileBg: Colors.success[100],
      iconBg: '#B8D4C9',
      iconColor: Colors.success[600],
    };
  }
  return base;
}

export default function DashboardScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const offlinePreviewUid = useAuthStore((s) => s.offlinePreviewUid);
  const profileName = useAuthStore((s) => s.profileName);
  const companyName = useAuthStore((s) => s.companyName);
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const uid = user?.uid ?? offlinePreviewUid ?? '';

  const dashboardQuery = useQuery({
    queryKey: ['home-dashboard', uid],
    queryFn: loadHomeDashboard,
    enabled: Boolean(uid),
  });

  const quickNotesQuery = useQuery({
    queryKey: ['quick-notes', uid],
    queryFn: listQuickNotes,
    enabled: Boolean(uid),
  });

  const { theme: weatherTheme, state: weatherState, refetch: refetchWeather, query: weatherQuery } =
    useHomeWeather();

  const quickNotesPreview = useMemo(() => {
    const list = quickNotesQuery.data ?? [];
    return list.slice(0, 3);
  }, [quickNotesQuery.data]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      if (Platform.OS === 'android') {
        setStatusBarBackgroundColor(weatherTheme.bg);
      }
      return () => {
        setStatusBarStyle('dark');
        if (Platform.OS === 'android') {
          setStatusBarBackgroundColor(Colors.neutral[50]);
        }
      };
    }, [weatherTheme.bg])
  );

  useEffect(() => {
    if (temporaryDevLogin) {
      setWelcomeOpen(false);
      return;
    }
    if (!user?.uid) return;
    void AsyncStorage.getItem(`welcome_seen_${user.uid}`).then((v) => {
      if (!v) setWelcomeOpen(true);
    });
  }, [user?.uid, temporaryDevLogin]);

  const dismissWelcome = async () => {
    if (user?.uid) {
      await AsyncStorage.setItem(`welcome_seen_${user.uid}`, 'true');
    }
    setWelcomeOpen(false);
  };

  const firstName = useMemo(() => {
    if (temporaryDevLogin) return 'Preview';
    const fromName = (profileName.trim() || user?.displayName || '')
      .split(/\s+/)
      .find((p) => p.length > 0);
    return fromName || user?.email?.split('@')[0] || t('home.greeting.there');
  }, [temporaryDevLogin, profileName, user?.displayName, user?.email, t]);

  const subtitle = useMemo(() => {
    const c = companyName.trim();
    if (c) return c;
    return t('home.subtitle.default');
  }, [companyName, t]);

  const metrics = useMemo(() => {
    const d = dashboardQuery.data;
    if (!d) {
      return [
        { label: t('home.metrics.activeProjects'), value: '—' as string, warn: false, good: false },
        { label: t('home.metrics.budgetPlanned'), value: '—', warn: false, good: false },
        { label: t('home.metrics.openTasks'), value: '—', warn: false, good: false },
        { label: t('home.metrics.permitsDue'), value: '—', warn: false, good: false },
      ];
    }
    return [
      { label: t('home.metrics.activeProjects'), value: String(d.projectCount), warn: false, good: false },
      {
        label: t('home.metrics.budgetPlanned'),
        value: formatUsdTotal(d.budgetPlannedTotal, currencyCode),
        warn: false,
        good: false,
      },
      {
        label: t('home.metrics.openTasks'),
        value: String(d.openTaskCount),
        warn: d.openTaskCount > 0,
        good: false,
      },
      {
        label: t('home.metrics.permitsDue'),
        value: String(d.permitsDueSoonCount),
        warn: d.permitsDueSoonCount > 0,
        good: d.permitsDueSoonCount === 0,
      },
    ];
  }, [dashboardQuery.data, currencyCode, t]);

  const permitBanner = dashboardQuery.data?.permitAlert;

  const permitBannerText = useMemo(() => {
    if (!permitBanner) return '';
    if (permitBanner.expired || permitBanner.daysUntil < 0) {
      const n = Math.abs(permitBanner.daysUntil);
      return `${permitBanner.permitName} · ${permitBanner.projectName} — ${localizeKnownUiText(t, 'overdue')}${n ? ` (${n}d)` : ''}`;
    }
    if (permitBanner.daysUntil === 0) {
      return `${permitBanner.permitName} · ${permitBanner.projectName} — ${localizeKnownUiText(t, 'expires today')}`;
    }
    return `${permitBanner.permitName} · ${permitBanner.projectName} — ${permitBanner.daysUntil} ${localizeKnownUiText(t, permitBanner.daysUntil === 1 ? 'day' : 'days')} ${localizeKnownUiText(t, 'left')}`;
  }, [permitBanner, t]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={['bottom', 'left', 'right']}>
      <View
        className="overflow-hidden pb-7"
        style={{
          backgroundColor: weatherTheme.bg,
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
        }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View
            style={{
              position: 'absolute',
              top: -36,
              right: -28,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: weatherTheme.orbTop,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: weatherTheme.orbBottom,
            }}
          />
        </View>

        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text
              className="text-[11px] uppercase tracking-[1.5px] text-white/55"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {todayLabel(locale)}
            </Text>
            <DashboardWeatherRow state={weatherState} theme={weatherTheme} />
            <Text className="mt-1.5 text-2xl text-white" style={{ fontFamily: 'Poppins_700Bold' }} numberOfLines={2}>
              {greetingForHour(t)},{' '}
              <Text style={{ fontFamily: 'Poppins_700Bold', color: Colors.brand[500] }}>{firstName}</Text>
            </Text>
            <Text
              className="mt-2 text-sm leading-5 text-white/75"
              style={{ fontFamily: 'Inter_400Regular' }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            accessibilityLabel={t('notifications.title')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-neutral-100"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              (Boolean(uid) && (dashboardQuery.isFetching || quickNotesQuery.isFetching)) ||
              weatherQuery.isRefetching
            }
            onRefresh={() => {
              void dashboardQuery.refetch();
              void quickNotesQuery.refetch();
              void refetchWeather();
            }}
            tintColor={Colors.brand[700]}
          />
        }
      >
        <View className="-mt-4 px-5">
          {!uid ? (
            <Card className="mt-1 border-neutral-200/80 bg-white p-4 shadow-sm">
              <Text className="text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('home.signInPrompt')}
              </Text>
            </Card>
          ) : dashboardQuery.isLoading ? (
            <View className="mt-6 items-center py-8">
              <ActivityIndicator size="large" color={Colors.brand[700]} />
            </View>
          ) : dashboardQuery.isError ? (
            <Card className="mt-2 border-danger-600/30 bg-danger-100 p-4">
              <Text className="text-sm text-neutral-800" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('home.loadError')}
              </Text>
            </Card>
          ) : (
            <>
              <View
                className="rounded-3xl border border-neutral-200/80 bg-white px-4 pb-5 pt-5 shadow-md"
                style={Platform.select({
                  ios: {
                    shadowColor: Colors.brand[900],
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                  },
                  android: { elevation: 4 },
                  default: {},
                })}
              >
                <View className="mb-4 flex-row items-center justify-between mt-5">
                  <View>
                    <Text
                      className="text-xs uppercase tracking-wider text-neutral-400"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {t('home.section.overview')}
                    </Text>
                    <Text
                      className="mt-0.5 text-lg text-brand-900"
                      style={{ fontFamily: 'Poppins_700Bold' }}
                    >
                      {t('home.section.atAGlance')}
                    </Text>
                  </View>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: Colors.brand[100] }}
                  >
                    <Ionicons name="speedometer-outline" size={22} color={Colors.brand[700]} />
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {metrics.map((m, index) => {
                    const visual = getMetricPresentation(m, index);
                    return (
                      <View key={m.label} className="w-[47%]">
                        <View
                          className="min-h-[108px] overflow-hidden rounded-2xl border border-white/60 p-3.5"
                          style={{
                            backgroundColor: visual.tileBg,
                            ...Platform.select({
                              ios: {
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.04,
                                shadowRadius: 6,
                              },
                              android: { elevation: 1 },
                              default: {},
                            }),
                          }}
                        >
                          <View className="flex-row items-start justify-between">
                            <View
                              className="h-9 w-9 items-center justify-center rounded-xl"
                              style={{ backgroundColor: visual.iconBg }}
                            >
                              <Ionicons name={visual.icon} size={20} color={visual.iconColor} />
                            </View>
                          </View>
                          <Text
                            className="mt-3 text-[10px] uppercase tracking-wide text-neutral-600"
                            style={{ fontFamily: 'Inter_500Medium' }}
                            numberOfLines={2}
                          >
                            {m.label}
                          </Text>
                          <Text
                            className={`mt-1 text-[22px] ${m.warn ? 'text-danger-600' : m.good ? 'text-success-600' : 'text-neutral-900'}`}
                            style={{ fontFamily: 'Poppins_700Bold' }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.5}
                          >
                            {m.value}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View
                className="mt-5 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-md"
                style={Platform.select({
                  ios: {
                    shadowColor: Colors.brand[900],
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.07,
                    shadowRadius: 16,
                  },
                  android: { elevation: 3 },
                  default: {},
                })}
              >
                <View
                  className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3.5"
                  style={{ backgroundColor: Colors.brand[100] }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: Colors.white }}
                    >
                      <Ionicons name="list-outline" size={21} color={Colors.brand[900]} />
                    </View>
                    <View>
                      <Text
                        className="text-base text-brand-900"
                        style={{ fontFamily: 'Poppins_700Bold' }}
                      >
                        {t('home.section.openTasks')}
                      </Text>
                      <Text className="text-[11px] text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        {localizeKnownUiText(t, 'Across your projects')}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(app)/tools/task-manager')}
                    hitSlop={8}
                    className="rounded-full bg-white/90 px-3 py-1.5 active:opacity-90"
                  >
                    <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_600SemiBold' }}>
                      {t('home.seeAll')}
                    </Text>
                  </Pressable>
                </View>
                <View className="px-4 pb-4 pt-3">
                  {(dashboardQuery.data?.tasks.length ?? 0) === 0 ? (
                    <View className="items-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-8">
                      <Ionicons name="clipboard-outline" size={32} color={Colors.neutral[500]} />
                      <Text
                        className="mt-2 px-4 text-center text-sm text-neutral-500"
                        style={{ fontFamily: 'Inter_400Regular' }}
                      >
                        {t('home.noOpenTasks')}
                      </Text>
                    </View>
                  ) : (
                    dashboardQuery.data!.tasks.map((t, i, arr) => (
                      <View
                        key={`${t.projectId}-${t.id}`}
                        className={`flex-row items-center justify-between rounded-2xl bg-neutral-50 px-3 py-3 ${i < arr.length - 1 ? 'mb-2' : ''}`}
                      >
                        <View className="min-w-0 flex-1 flex-row items-center pr-2">
                          <View
                            className={`mr-3 h-2.5 w-2.5 shrink-0 rounded-full ${
                              t.status === 'Overdue'
                                ? 'bg-danger-600'
                                : t.status === 'Due Today'
                                  ? 'bg-warning-600'
                                  : 'bg-success-600'
                            }`}
                          />
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-sm text-neutral-900"
                              style={{ fontFamily: 'Inter_500Medium' }}
                              numberOfLines={2}
                            >
                              {t.title}
                            </Text>
                            <Text
                              className="mt-0.5 text-[11px] text-neutral-500"
                              style={{ fontFamily: 'Inter_400Regular' }}
                              numberOfLines={1}
                            >
                              {t.projectName}
                            </Text>
                          </View>
                        </View>
                        <Badge label={t.status} tone={taskTone(t.status)} />
                      </View>
                    ))
                  )}
                </View>
              </View>

              {permitBanner ? (
                <View
                  className="mt-4 flex-row items-center justify-between overflow-hidden rounded-2xl border border-warning-600/25 p-4"
                  style={{ backgroundColor: Colors.warning[100] }}
                >
                  <View className="min-w-0 flex-1 flex-row items-center pr-2">
                    <View
                      className="mr-3 h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: Colors.white }}
                    >
                      <Ionicons name="shield-outline" size={22} color={Colors.warning[600]} />
                    </View>
                    <Text
                      className="min-w-0 flex-1 text-sm leading-5 text-neutral-900"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={4}
                    >
                      {permitBannerText}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(app)/tools/permit-manager')}
                    hitSlop={8}
                    className="rounded-full bg-white px-3 py-2 active:opacity-90"
                  >
                    <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_600SemiBold' }}>
                      {localizeKnownUiText(t, 'View')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}

          {uid ? (
            <Card className="mt-4 overflow-hidden p-0">
              <Pressable
                onPress={() => router.push('/(app)/quick-notes')}
                className="flex-row items-center justify-between border-b border-neutral-100 bg-brand-50 px-4 py-3 active:opacity-90"
              >
                <View className="min-w-0 flex-1 flex-row items-center pr-2">
                  <View
                    className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: Colors.brand[100] }}
                  >
                    <Ionicons name="document-text-outline" size={22} color={Colors.brand[900]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-base text-brand-900"
                      style={{ fontFamily: 'Poppins_700Bold' }}
                      numberOfLines={1}
                    >
                      {t('home.section.quickNotes')}
                    </Text>
                    <Text
                      className="text-xs text-neutral-500"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={1}
                    >
                      {localizeKnownUiText(t, 'Ideas, site reminders & follow-ups')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
              </Pressable>

              <View className="p-4">
                {quickNotesQuery.isLoading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator size="small" color={Colors.brand[700]} />
                  </View>
                ) : quickNotesPreview.length === 0 ? (
                  <Pressable
                    onPress={() => router.push('/(app)/quick-notes/new')}
                    className="items-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-8 active:opacity-90"
                  >
                    <Ionicons name="create-outline" size={28} color={Colors.brand[700]} />
                    <Text
                      className="mt-2 text-sm text-brand-700"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {localizeKnownUiText(t, 'Add your first note')}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    {quickNotesPreview.map((note) => {
                      const chrome = getNoteCardChrome(note);
                      return (
                        <Pressable
                          key={note.id}
                          onPress={() => router.push(`/(app)/quick-notes/${note.id}`)}
                          className="mb-2 rounded-xl p-3 active:opacity-90"
                          style={{
                            borderWidth: 1,
                            borderColor: Colors.neutral[300],
                            borderLeftWidth: 4,
                            borderLeftColor: chrome.borderLeftColor,
                            backgroundColor: chrome.backgroundColor,
                          }}
                        >
                          <View className="flex-row items-start justify-between gap-2">
                            <View className="min-w-0 flex-1 flex-row items-start gap-1">
                              {note.pinned ? (
                                <Ionicons
                                  name="pin"
                                  size={14}
                                  color={Colors.brand[700]}
                                  style={{ marginTop: 2 }}
                                />
                              ) : null}
                              <Text
                                className="min-w-0 flex-1 text-sm text-brand-900"
                                style={{ fontFamily: 'Poppins_700Bold' }}
                                numberOfLines={1}
                              >
                                {notePreviewTitle(note)}
                              </Text>
                            </View>
                            <Badge
                              label={localizeKnownUiText(t, priorityLabel(note.priority))}
                              tone={priorityBadgeTone(note.priority)}
                            />
                          </View>
                          {note.tags.length > 0 ? (
                            <Text
                              className="mt-1 text-[10px] text-accent-700"
                              style={{ fontFamily: 'Inter_500Medium' }}
                              numberOfLines={1}
                            >
                              {note.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                              {note.tags.length > 3 ? '…' : ''}
                            </Text>
                          ) : null}
                          {note.dueDate ? (
                            <Text
                              className="mt-0.5 text-[10px] text-neutral-600"
                              style={{ fontFamily: 'Inter_400Regular' }}
                              numberOfLines={1}
                            >
                              {localizeKnownUiText(t, 'Due')} {formatDueLabel(note.dueDate)}
                            </Text>
                          ) : null}
                          {note.body.trim() ? (
                            <Text
                              className="mt-1 text-xs leading-5 text-neutral-600"
                              style={{ fontFamily: 'Inter_400Regular' }}
                              numberOfLines={2}
                            >
                              {note.body.trim()}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => router.push('/(app)/quick-notes')}
                      className="mt-1 flex-row items-center justify-center py-2 active:opacity-80"
                    >
                      <Text
                        className="text-sm text-brand-500"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {localizeKnownUiText(t, 'View all notes')}
                      </Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={() => router.push('/(app)/quick-notes/new')}
                  className="mt-3 flex-row items-center justify-center rounded-xl py-3 active:opacity-90"
                  style={{ backgroundColor: Colors.accent[600] }}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text
                    className="ml-1 text-sm text-white"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {localizeKnownUiText(t, 'New note')}
                  </Text>
                </Pressable>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={welcomeOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            <View className="items-center">
              <AppMark size={72} framed />
            </View>
            <Text
              className="mt-4 text-center text-xl text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              {localizeKnownUiText(t, 'Welcome to ConstructPro')}
            </Text>
            <Text
              className="mt-2 text-center text-sm text-neutral-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {localizeKnownUiText(t, 'Your dashboard is ready. Explore tools and projects as we roll out new features.')}
            </Text>
            <Pressable
              onPress={dismissWelcome}
              className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-accent-600"
            >
              <Text
                className="text-base font-medium text-white"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {localizeKnownUiText(t, 'Got it')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
