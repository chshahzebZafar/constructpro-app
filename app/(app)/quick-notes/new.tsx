import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Colors } from '@/constants/colors';
import { createQuickNote } from '@/lib/quickNotes/repository';
import { parseTagsFromInput } from '@/lib/quickNotes/tagUtils';
import type { NoteColorKey, NotePriority } from '@/lib/quickNotes/types';
import { NoteMetaPickers } from '@/components/quickNotes/NoteMetaPickers';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

export default function NewQuickNoteScreen() {
  const { t } = useI18n();
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
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!body.trim() && !title.trim()) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await createQuickNote(title, body, {
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
    pinned,
    priority,
    queryClient,
    reminderAt,
    router,
    tagsInput,
    title,
    uid,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={localizeKnownUiText(t, 'New note')} />
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
            {localizeKnownUiText(t, 'Title (optional)')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={localizeKnownUiText(t, 'e.g. Site meeting follow-up')}
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
            {localizeKnownUiText(t, 'Note')}
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={localizeKnownUiText(t, 'Write anything you need to remember...')}
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
              {saving
                ? localizeKnownUiText(t, 'Saving...')
                : localizeKnownUiText(t, 'Save note')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
