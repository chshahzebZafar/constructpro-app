import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Colors } from '@/constants/colors';
import {
  getQuickNote,
  updateQuickNote,
  deleteQuickNote,
} from '@/lib/quickNotes/repository';
import { parseTagsFromInput, tagsToDisplayString } from '@/lib/quickNotes/tagUtils';
import type { NoteColorKey, NotePriority } from '@/lib/quickNotes/types';
import { NoteMetaPickers } from '@/components/quickNotes/NoteMetaPickers';
import { useAuthStore } from '@/store/useAuthStore';

export default function EditQuickNoteScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NotePriority>('medium');
  const [colorKey, setColorKey] = useState<NoteColorKey>('default');
  const [pinned, setPinned] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!noteId) {
        setLoading(false);
        return;
      }
      try {
        const n = await getQuickNote(noteId);
        if (cancelled) return;
        if (!n) {
          setMissing(true);
          setTitle('');
          setBody('');
        } else {
          setTitle(n.title);
          setBody(n.body);
          setPriority(n.priority);
          setColorKey(n.colorKey);
          setPinned(n.pinned);
          setTagsInput(tagsToDisplayString(n.tags));
          setDueDate(n.dueDate);
          setReminderAt(n.reminderAt);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const save = useCallback(async () => {
    if (!noteId) return;
    setSaving(true);
    try {
      await updateQuickNote(noteId, {
        title,
        body,
        priority,
        colorKey,
        pinned,
        tags: parseTagsFromInput(tagsInput),
        dueDate,
        reminderAt,
      });
      await queryClient.invalidateQueries({ queryKey: ['quick-notes', uid] });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [
    body,
    colorKey,
    dueDate,
    noteId,
    pinned,
    priority,
    queryClient,
    reminderAt,
    router,
    tagsInput,
    title,
    uid,
  ]);

  const confirmDelete = useCallback(() => {
    if (!noteId) return;
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteQuickNote(noteId);
            await queryClient.invalidateQueries({ queryKey: ['quick-notes', uid] });
            router.back();
          })();
        },
      },
    ]);
  }, [noteId, queryClient, router, uid]);

  if (!noteId) {
    return null;
  }

  if (missing && !loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 px-6">
        <Text className="text-center text-base text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
          This note could not be found.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-xl bg-brand-900 px-6 py-3 active:opacity-90"
        >
          <Text className="text-white" style={{ fontFamily: 'Inter_500Medium' }}>
            Go back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator size="large" color={Colors.brand[700]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Edit note" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="mb-2 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Title (optional)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={Colors.neutral[500]}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          />

          <View className="mt-6">
            <NoteMetaPickers
              pinned={pinned}
              onPinnedChange={setPinned}
              tagsInput={tagsInput}
              onTagsInputChange={setTagsInput}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              reminderAt={reminderAt}
              onReminderAtChange={setReminderAt}
              priority={priority}
              onPriorityChange={setPriority}
              colorKey={colorKey}
              onColorChange={setColorKey}
            />
          </View>

          <Text
            className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Note
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Note content"
            placeholderTextColor={Colors.neutral[500]}
            multiline
            textAlignVertical="top"
            className="min-h-[220px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base leading-6 text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            className={`mt-8 flex-row items-center justify-center rounded-xl py-4 active:opacity-90 ${
              saving ? 'bg-accent-600/60' : 'bg-accent-600'
            }`}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
            <Text
              className="ml-2 text-base text-white"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            className="mt-4 flex-row items-center justify-center rounded-xl border border-danger-600 py-3 active:opacity-90"
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger[600]} />
            <Text
              className="ml-2 text-base text-danger-600"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Delete note
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
