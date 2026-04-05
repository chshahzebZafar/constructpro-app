import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { getNoteCardChrome, priorityBadgeTone, priorityLabel } from '@/lib/quickNotes/noteStyle';
import { formatDueLabel, formatReminderLabel } from '@/lib/quickNotes/dateUtils';
import {
  filterQuickNotes,
  collectAllTags,
  type NoteListFilter,
} from '@/lib/quickNotes/filters';
import { listQuickNotes, notePreviewTitle } from '@/lib/quickNotes/repository';
import { useAuthStore } from '@/store/useAuthStore';
import type { QuickNote } from '@/lib/quickNotes/types';

function formatWhen(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function QuickNotesListScreen() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');

  const notesQuery = useQuery({
    queryKey: ['quick-notes', uid],
    queryFn: listQuickNotes,
    enabled: Boolean(uid),
  });

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      if (Platform.OS === 'android') {
        setStatusBarBackgroundColor('#FFFFFF');
      }
      void notesQuery.refetch();
      return () => {};
    }, [notesQuery.refetch])
  );

  const notes = notesQuery.data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<NoteListFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => collectAllTags(notes), [notes]);

  const visibleNotes = useMemo(
    () => filterQuickNotes(notes, { query: searchQuery, filter: listFilter, tag: tagFilter }),
    [notes, searchQuery, listFilter, tagFilter]
  );

  const filterChips: { id: NoteListFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pinned', label: 'Pinned' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'soon', label: 'Due soon' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader
        title="Quick notes"
        rightSlot={
          <Pressable
            onPress={() => router.push('/(app)/quick-notes/new')}
            className="flex-row items-center rounded-xl bg-accent-600 px-3 py-2 active:opacity-90"
            accessibilityLabel="New note"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text className="ml-0.5 text-sm text-white" style={{ fontFamily: 'Inter_500Medium' }}>
              New
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {!notesQuery.isLoading && notes.length > 0 ? (
          <>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title, note, or #tag…"
              placeholderTextColor={Colors.neutral[500]}
              className="mb-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2 flex-row"
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {filterChips.map((c) => {
                const on = listFilter === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setListFilter(c.id)}
                    className={`rounded-full border px-3 py-1.5 active:opacity-90 ${
                      on ? 'border-brand-900 bg-brand-100' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs ${on ? 'text-brand-900' : 'text-neutral-700'}`}
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {allTags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4 flex-row"
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                <Pressable
                  onPress={() => setTagFilter(null)}
                  className={`rounded-full border px-3 py-1.5 active:opacity-90 ${
                    tagFilter === null
                      ? 'border-accent-600 bg-accent-100'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs ${tagFilter === null ? 'text-accent-800' : 'text-neutral-700'}`}
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    Tags: all
                  </Text>
                </Pressable>
                {allTags.map((t) => {
                  const on = tagFilter === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTagFilter(on ? null : t)}
                      className={`rounded-full border px-3 py-1.5 active:opacity-90 ${
                        on ? 'border-accent-600 bg-accent-100' : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs ${on ? 'text-accent-800' : 'text-neutral-700'}`}
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        #{t}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {notesQuery.isLoading ? (
          <Text className="text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            Loading…
          </Text>
        ) : notes.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: Colors.brand[100] }}
            >
              <Ionicons name="create-outline" size={36} color={Colors.brand[900]} />
            </View>
            <Text
              className="text-center text-lg text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              No notes yet
            </Text>
            <Text
              className="mt-2 text-center text-sm leading-6 text-neutral-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Capture ideas, site reminders, and follow-ups — stored on this device for your account.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/quick-notes/new')}
              className="mt-6 rounded-xl bg-brand-900 px-6 py-3 active:opacity-90"
            >
              <Text className="text-base text-white" style={{ fontFamily: 'Inter_500Medium' }}>
                Write a note
              </Text>
            </Pressable>
          </View>
        ) : visibleNotes.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10">
            <Ionicons name="funnel-outline" size={32} color={Colors.neutral[500]} />
            <Text
              className="mt-3 text-center text-base text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              No notes match
            </Text>
            <Text
              className="mt-1 text-center text-sm text-neutral-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Try a different search or filter.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setListFilter('all');
                setTagFilter(null);
              }}
              className="mt-4 rounded-xl bg-brand-900 px-5 py-2.5 active:opacity-90"
            >
              <Text className="text-sm text-white" style={{ fontFamily: 'Inter_500Medium' }}>
                Clear filters
              </Text>
            </Pressable>
          </View>
        ) : (
          visibleNotes.map((n: QuickNote) => {
            const chrome = getNoteCardChrome(n);
            return (
              <Pressable
                key={n.id}
                onPress={() => router.push(`/(app)/quick-notes/${n.id}`)}
                className="mb-3 rounded-2xl p-4 shadow-sm active:opacity-95"
                style={{
                  borderWidth: 1,
                  borderColor: Colors.neutral[300],
                  borderLeftWidth: 4,
                  borderLeftColor: chrome.borderLeftColor,
                  backgroundColor: chrome.backgroundColor,
                }}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1 flex-row items-start gap-1.5">
                    {n.pinned ? (
                      <Ionicons name="pin" size={16} color={Colors.brand[700]} style={{ marginTop: 3 }} />
                    ) : null}
                    <Text
                      className="min-w-0 flex-1 text-base text-brand-900"
                      style={{ fontFamily: 'Poppins_700Bold' }}
                      numberOfLines={2}
                    >
                      {notePreviewTitle(n)}
                    </Text>
                  </View>
                  <Badge label={priorityLabel(n.priority)} tone={priorityBadgeTone(n.priority)} />
                </View>
                {n.tags.length > 0 ? (
                  <Text
                    className="mt-1 text-xs text-accent-700"
                    style={{ fontFamily: 'Inter_500Medium' }}
                    numberOfLines={1}
                  >
                    {n.tags.map((t) => `#${t}`).join(' ')}
                  </Text>
                ) : null}
                {n.dueDate ? (
                  <Text
                    className="mt-1 text-xs text-neutral-600"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    Due {formatDueLabel(n.dueDate)}
                  </Text>
                ) : null}
                {n.reminderAt ? (
                  <Text
                    className="mt-0.5 text-xs text-neutral-500"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    Reminder {formatReminderLabel(n.reminderAt)}
                  </Text>
                ) : null}
                {n.body.trim() ? (
                  <Text
                    className="mt-1 text-sm leading-5 text-neutral-600"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={3}
                  >
                    {n.body.trim()}
                  </Text>
                ) : null}
                <Text
                  className="mt-2 text-xs text-neutral-400"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {formatWhen(n.updatedAt)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
