import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
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

function taskTone(s: HomeTaskRow['status']): 'success' | 'warning' | 'danger' {
  if (s === 'On Track') return 'success';
  if (s === 'Due Today') return 'warning';
  return 'danger';
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const offlinePreviewUid = useAuthStore((s) => s.offlinePreviewUid);
  const companyName = useAuthStore((s) => s.companyName);
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

  const quickNotesPreview = useMemo(() => {
    const list = quickNotesQuery.data ?? [];
    return list.slice(0, 3);
  }, [quickNotesQuery.data]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      if (Platform.OS === 'android') {
        setStatusBarBackgroundColor(Colors.brand[900]);
      }
      return () => {
        setStatusBarStyle('dark');
        if (Platform.OS === 'android') {
          setStatusBarBackgroundColor(Colors.neutral[50]);
        }
      };
    }, [])
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

  const firstName = temporaryDevLogin
    ? 'Preview'
    : user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const subtitle = useMemo(() => {
    const c = companyName.trim();
    if (c) return c;
    return 'Budgets, tasks & permits across your projects';
  }, [companyName]);

  const metrics = useMemo(() => {
    const d = dashboardQuery.data;
    if (!d) {
      return [
        { label: 'Active projects', value: '—' as string, warn: false, good: false },
        { label: 'Budget (planned)', value: '—', warn: false, good: false },
        { label: 'Open tasks', value: '—', warn: false, good: false },
        { label: 'Permits due', value: '—', warn: false, good: false },
      ];
    }
    return [
      { label: 'Active projects', value: String(d.projectCount), warn: false, good: false },
      { label: 'Budget (planned)', value: formatUsdTotal(d.budgetPlannedTotal), warn: false, good: false },
      {
        label: 'Open tasks',
        value: String(d.openTaskCount),
        warn: d.openTaskCount > 0,
        good: false,
      },
      {
        label: 'Permits due',
        value: String(d.permitsDueSoonCount),
        warn: d.permitsDueSoonCount > 0,
        good: d.permitsDueSoonCount === 0,
      },
    ];
  }, [dashboardQuery.data]);

  const permitBanner = dashboardQuery.data?.permitAlert;

  const permitBannerText = useMemo(() => {
    if (!permitBanner) return '';
    if (permitBanner.expired || permitBanner.daysUntil < 0) {
      const n = Math.abs(permitBanner.daysUntil);
      return `${permitBanner.permitName} · ${permitBanner.projectName} — overdue${n ? ` (${n}d)` : ''}`;
    }
    if (permitBanner.daysUntil === 0) {
      return `${permitBanner.permitName} · ${permitBanner.projectName} — expires today`;
    }
    return `${permitBanner.permitName} · ${permitBanner.projectName} — ${permitBanner.daysUntil} day${permitBanner.daysUntil === 1 ? '' : 's'} left`;
  }, [permitBanner]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      {/* Status-bar zone uses brand background (not the screen’s neutral fill) */}
      <View
        className="px-5 pb-6"
        style={{
          backgroundColor: Colors.brand[900],
          paddingTop: insets.top + 12,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-2">
            <Text
              className="text-lg text-white"
              style={{ fontFamily: 'Poppins_700Bold' }}
              numberOfLines={1}
            >
              {greetingForHour()}, {firstName}
            </Text>
            <Text
              className="mt-1 text-xs text-white/70"
              style={{ fontFamily: 'Inter_400Regular' }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
              hitSlop={12}
              className="h-12 w-12 items-center justify-center"
              accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-neutral-50"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              Boolean(uid) && (dashboardQuery.isFetching || quickNotesQuery.isFetching)
            }
            onRefresh={() => {
              void dashboardQuery.refetch();
              void quickNotesQuery.refetch();
            }}
            tintColor={Colors.brand[700]}
          />
        }
      >
        <View className="-mt-2 px-5">
          {!uid ? (
            <Card className="mt-2 border-neutral-200 p-4">
              <Text className="text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Sign in to see your dashboard.
              </Text>
            </Card>
          ) : dashboardQuery.isLoading ? (
            <View className="mt-6 items-center py-8">
              <ActivityIndicator size="large" color={Colors.brand[700]} />
            </View>
          ) : dashboardQuery.isError ? (
            <Card className="mt-2 border-danger-600/30 bg-danger-100 p-4">
              <Text className="text-sm text-neutral-800" style={{ fontFamily: 'Inter_400Regular' }}>
                Could not load dashboard. Pull to refresh or try again.
              </Text>
            </Card>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                {metrics.map((m) => (
                  <View key={m.label} className="w-[47%]">
                    <Card className="border-neutral-200 p-4">
                      <Text
                        className="text-[11px] uppercase tracking-wide text-neutral-500"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {m.label}
                      </Text>
                      <Text
                        className={`mt-2 text-[22px] ${m.warn ? 'text-danger-600' : m.good ? 'text-success-600' : 'text-neutral-900'}`}
                        style={{ fontFamily: 'Poppins_700Bold' }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {m.value}
                      </Text>
                    </Card>
                  </View>
                ))}
              </View>

              <Card className="mt-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className="text-base text-neutral-900"
                    style={{ fontFamily: 'Poppins_700Bold' }}
                  >
                    Open tasks
                  </Text>
                  <Pressable onPress={() => router.push('/(app)/tools/task-manager')} hitSlop={8}>
                    <Text
                      className="text-sm text-brand-500"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      See all
                    </Text>
                  </Pressable>
                </View>
                {(dashboardQuery.data?.tasks.length ?? 0) === 0 ? (
                  <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    No open tasks. Add tasks in Task manager (pick a project).
                  </Text>
                ) : (
                  dashboardQuery.data!.tasks.map((t) => (
                    <View
                      key={`${t.projectId}-${t.id}`}
                      className="mb-3 flex-row items-center justify-between border-b border-neutral-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                    >
                      <View className="min-w-0 flex-1 flex-row items-center pr-2">
                        <View
                          className={`mr-2 h-2 w-2 shrink-0 rounded-full ${
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
                            style={{ fontFamily: 'Inter_400Regular' }}
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
              </Card>

              {permitBanner ? (
                <View
                  className="mt-3 flex-row items-center justify-between rounded-xl border border-accent-600/20 p-4"
                  style={{ backgroundColor: Colors.accent[100] }}
                >
                  <View className="min-w-0 flex-1 flex-row items-center pr-2">
                    <Ionicons name="warning-outline" size={22} color={Colors.warning[600]} />
                    <Text
                      className="ml-2 flex-1 text-sm text-neutral-900"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={3}
                    >
                      {permitBannerText}
                    </Text>
                  </View>
                  <Pressable onPress={() => router.push('/(app)/tools/permit-manager')} hitSlop={8}>
                    <Text
                      className="text-sm text-brand-500"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      View
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
                      Quick notes
                    </Text>
                    <Text
                      className="text-xs text-neutral-500"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={1}
                    >
                      Ideas, site reminders & follow-ups
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
                      Add your first note
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
                              label={priorityLabel(note.priority)}
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
                              Due {formatDueLabel(note.dueDate)}
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
                        View all notes
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
                    New note
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
            <Text
              className="text-center text-xl text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              Welcome to ConstructPro
            </Text>
            <Text
              className="mt-2 text-center text-sm text-neutral-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Your dashboard is ready. Explore tools and projects as we roll out new features.
            </Text>
            <Pressable
              onPress={dismissWelcome}
              className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-accent-600"
            >
              <Text
                className="text-base font-medium text-white"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Got it
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
