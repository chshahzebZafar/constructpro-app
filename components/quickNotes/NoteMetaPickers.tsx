import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { NoteColorKey, NotePriority } from '@/lib/quickNotes/types';
import {
  NOTE_COLOR_KEYS,
  NOTE_COLOR_LABELS,
  NOTE_PRIORITIES,
  getNoteAccentColor,
} from '@/lib/quickNotes/noteStyle';
import { NoteDueReminderFields } from '@/components/quickNotes/NoteDueReminderFields';

interface NoteMetaPickersProps {
  pinned: boolean;
  onPinnedChange: (v: boolean) => void;
  tagsInput: string;
  onTagsInputChange: (s: string) => void;
  dueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  reminderAt: number | null;
  onReminderAtChange: (v: number | null) => void;
  priority: NotePriority;
  onPriorityChange: (p: NotePriority) => void;
  colorKey: NoteColorKey;
  onColorChange: (c: NoteColorKey) => void;
}

export function NoteMetaPickers({
  pinned,
  onPinnedChange,
  tagsInput,
  onTagsInputChange,
  dueDate,
  onDueDateChange,
  reminderAt,
  onReminderAtChange,
  priority,
  onPriorityChange,
  colorKey,
  onColorChange,
}: NoteMetaPickersProps) {
  return (
    <>
      <Text
        className="mb-2 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        Pin
      </Text>
      <Pressable
        onPress={() => onPinnedChange(!pinned)}
        className={`flex-row items-center rounded-xl border px-4 py-3 active:opacity-90 ${
          pinned ? 'border-brand-900 bg-brand-100' : 'border-neutral-200 bg-white'
        }`}
        accessibilityRole="button"
        accessibilityState={{ selected: pinned }}
      >
        <Ionicons
          name={pinned ? 'pin' : 'pin-outline'}
          size={20}
          color={pinned ? Colors.brand[900] : Colors.neutral[700]}
        />
        <Text
          className={`ml-2 text-sm ${pinned ? 'text-brand-900' : 'text-neutral-800'}`}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {pinned ? 'Pinned to top of list' : 'Pin this note'}
        </Text>
      </Pressable>

      <Text
        className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        Priority
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {NOTE_PRIORITIES.map((p) => {
          const selected = priority === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => onPriorityChange(p.id)}
              className={`rounded-xl border px-4 py-2.5 active:opacity-90 ${
                selected ? 'border-brand-900 bg-brand-100' : 'border-neutral-200 bg-white'
              }`}
            >
              <Text
                className={`text-sm ${selected ? 'text-brand-900' : 'text-neutral-800'}`}
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        Tags
      </Text>
      <Text
        className="mb-2 text-xs text-neutral-500"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        Use #tags or spaces — saved as lowercase for search.
      </Text>
      <TextInput
        value={tagsInput}
        onChangeText={onTagsInputChange}
        placeholder="#permits #follow-up"
        placeholderTextColor={Colors.neutral[500]}
        autoCapitalize="none"
        autoCorrect={false}
        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
        style={{ fontFamily: 'Inter_400Regular' }}
      />

      <NoteDueReminderFields
        dueDate={dueDate}
        onDueDateChange={onDueDateChange}
        reminderAt={reminderAt}
        onReminderAtChange={onReminderAtChange}
      />

      <Text
        className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        Card color
      </Text>
      <Text
        className="mb-3 text-xs text-neutral-500"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        Tint for this note on lists and home — uses your app palette.
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {NOTE_COLOR_KEYS.map((key) => {
          const selected = colorKey === key;
          const fill = getNoteAccentColor(key);
          return (
            <Pressable
              key={key}
              onPress={() => onColorChange(key)}
              className="items-center active:opacity-90"
              accessibilityLabel={NOTE_COLOR_LABELS[key]}
            >
              <View
                className={`h-11 w-11 rounded-full ${
                  selected ? 'border-2 border-brand-900' : 'border border-neutral-300'
                }`}
                style={{ backgroundColor: key === 'default' ? Colors.neutral[300] : fill }}
              />
              <Text
                className="mt-1 max-w-[56px] text-center text-[10px] text-neutral-600"
                style={{ fontFamily: 'Inter_400Regular' }}
                numberOfLines={1}
              >
                {NOTE_COLOR_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
