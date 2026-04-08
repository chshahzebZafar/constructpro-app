import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Platform, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  formatDueLabel,
  formatReminderLabel,
  formatYMD,
  parseYMD,
  isValidYMD,
} from '@/lib/quickNotes/dateUtils';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

interface NoteDueReminderFieldsProps {
  dueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  reminderAt: number | null;
  onReminderAtChange: (v: number | null) => void;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function NoteDueReminderFields({
  dueDate,
  onDueDateChange,
  reminderAt,
  onReminderAtChange,
}: NoteDueReminderFieldsProps) {
  const { t } = useI18n();
  const [showDue, setShowDue] = useState(false);
  const [reminderPhase, setReminderPhase] = useState<'idle' | 'date' | 'time' | 'datetime'>(
    'idle'
  );
  const [reminderDraft, setReminderDraft] = useState<Date>(() => new Date());
  const [webDueText, setWebDueText] = useState(dueDate ?? '');
  const [webRemText, setWebRemText] = useState(() =>
    reminderAt && Number.isFinite(reminderAt)
      ? new Date(reminderAt).toISOString().slice(0, 16)
      : ''
  );

  useEffect(() => {
    setWebDueText(dueDate ?? '');
  }, [dueDate]);

  useEffect(() => {
    if (reminderAt && Number.isFinite(reminderAt)) {
      setWebRemText(new Date(reminderAt).toISOString().slice(0, 16));
    } else {
      setWebRemText('');
    }
  }, [reminderAt]);

  const syncWebDue = useCallback(
    (text: string) => {
      setWebDueText(text);
      const t = text.trim();
      if (!t) {
        onDueDateChange(null);
        return;
      }
      if (isValidYMD(t)) onDueDateChange(t);
    },
    [onDueDateChange]
  );

  const syncWebRem = useCallback(
    (text: string) => {
      setWebRemText(text);
      const t = text.trim();
      if (!t) {
        onReminderAtChange(null);
        return;
      }
      const ms = Date.parse(t);
      if (Number.isFinite(ms)) onReminderAtChange(ms);
    },
    [onReminderAtChange]
  );

  const dueAsDate = parseYMD(dueDate) ?? startOfDay(new Date());

  const openReminder = useCallback(() => {
    const base =
      reminderAt && Number.isFinite(reminderAt) ? new Date(reminderAt) : new Date();
    setReminderDraft(base);
    if (Platform.OS === 'android') {
      setReminderPhase('date');
    } else {
      setReminderPhase('datetime');
    }
  }, [reminderAt]);

  const closeReminder = useCallback(() => setReminderPhase('idle'), []);

  if (Platform.OS === 'web') {
    return (
      <>
        <Text
          className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {localizeKnownUiText(t, 'Due date')}
        </Text>
        <TextInput
          value={webDueText}
          onChangeText={syncWebDue}
          placeholder={localizeKnownUiText(t, 'YYYY-MM-DD')}
          placeholderTextColor={Colors.neutral[500]}
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          style={{ fontFamily: 'Inter_400Regular' }}
        />
        <Text
          className="mb-2 mt-6 text-xs uppercase tracking-wide text-neutral-500"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {localizeKnownUiText(t, 'Reminder')}
        </Text>
        <TextInput
          value={webRemText}
          onChangeText={syncWebRem}
          placeholder={localizeKnownUiText(t, 'e.g. 2026-04-15T14:30 (local ISO)')}
          placeholderTextColor={Colors.neutral[500]}
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          style={{ fontFamily: 'Inter_400Regular' }}
        />
      </>
    );
  }

  return (
    <>
      <Text
        className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {localizeKnownUiText(t, 'Due date')}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={() => setShowDue(true)}
          className="flex-row items-center rounded-xl border border-neutral-200 bg-white px-4 py-3 active:opacity-90"
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.brand[700]} />
          <Text
            className="ml-2 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {dueDate ? formatDueLabel(dueDate) : localizeKnownUiText(t, 'Set due date')}
          </Text>
        </Pressable>
        {dueDate ? (
          <Pressable
            onPress={() => onDueDateChange(null)}
            className="rounded-xl border border-neutral-200 px-3 py-3 active:opacity-90"
            accessibilityLabel={localizeKnownUiText(t, 'Clear due date')}
          >
            <Ionicons name="close" size={20} color={Colors.neutral[700]} />
          </Pressable>
        ) : null}
      </View>
      {showDue ? (
        <DateTimePicker
          value={dueAsDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDue(false);
              if (event.type === 'dismissed') return;
              if (selectedDate) onDueDateChange(formatYMD(selectedDate));
              return;
            }
            if (selectedDate) onDueDateChange(formatYMD(selectedDate));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && showDue ? (
        <Pressable
          onPress={() => setShowDue(false)}
          className="mt-2 self-start rounded-lg px-2 py-1"
        >
          <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
            {localizeKnownUiText(t, 'Done')}
          </Text>
        </Pressable>
      ) : null}

      <Text
        className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {localizeKnownUiText(t, 'Reminder')}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={openReminder}
          className="flex-row items-center rounded-xl border border-neutral-200 bg-white px-4 py-3 active:opacity-90"
        >
          <Ionicons name="alarm-outline" size={18} color={Colors.brand[700]} />
          <Text
            className="ml-2 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {reminderAt ? formatReminderLabel(reminderAt) : localizeKnownUiText(t, 'Set reminder')}
          </Text>
        </Pressable>
        {reminderAt ? (
          <Pressable
            onPress={() => onReminderAtChange(null)}
            className="rounded-xl border border-neutral-200 px-3 py-3 active:opacity-90"
            accessibilityLabel={localizeKnownUiText(t, 'Clear reminder')}
          >
            <Ionicons name="close" size={20} color={Colors.neutral[700]} />
          </Pressable>
        ) : null}
      </View>

      {reminderPhase === 'datetime' ? (
        <>
          <DateTimePicker
            value={reminderDraft}
            mode="datetime"
            display="inline"
            onChange={(_, d) => {
              if (d) {
                setReminderDraft(d);
                onReminderAtChange(d.getTime());
              }
            }}
          />
          <Pressable onPress={closeReminder} className="mt-2 self-start rounded-lg px-2 py-1">
            <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Done')}
            </Text>
          </Pressable>
        </>
      ) : null}

      {reminderPhase === 'date' ? (
        <DateTimePicker
          value={reminderDraft}
          mode="date"
          display="default"
          onChange={(event, d) => {
            if (event.type === 'dismissed') {
              setReminderPhase('idle');
              return;
            }
            if (d) {
              const next = new Date(reminderDraft);
              next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              setReminderDraft(next);
              setReminderPhase('time');
            }
          }}
        />
      ) : null}
      {reminderPhase === 'time' ? (
        <DateTimePicker
          value={reminderDraft}
          mode="time"
          display="default"
          onChange={(event, d) => {
            if (event.type === 'dismissed') {
              setReminderPhase('idle');
              return;
            }
            if (d) {
              const next = new Date(reminderDraft);
              next.setHours(d.getHours(), d.getMinutes(), 0, 0);
              setReminderDraft(next);
              onReminderAtChange(next.getTime());
              setReminderPhase('idle');
            }
          }}
        />
      ) : null}
    </>
  );
}
