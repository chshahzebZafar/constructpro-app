import { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { formatDueLabel, formatYMD, parseYMD } from '@/lib/quickNotes/dateUtils';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

export interface YmdDateFieldProps {
  label: string;
  /** Stored as YYYY-MM-DD or '' */
  value: string;
  onChange: (ymd: string) => void;
  optional?: boolean;
  /** Shown when value is empty (native). */
  emptyLabel?: string;
}

export function YmdDateField({
  label,
  value,
  onChange,
  optional = false,
  emptyLabel = 'Select date',
}: YmdDateFieldProps) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [webText, setWebText] = useState(value);
  const resolvedLabel = localizeKnownUiText(t, label);
  const resolvedEmpty = localizeKnownUiText(t, emptyLabel);

  useEffect(() => {
    setWebText(value);
  }, [value]);

  const pickerDate = parseYMD(value) ?? (() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  })();

  const display = value ? formatDueLabel(value) : '';

  if (Platform.OS === 'web') {
    return (
      <View className="mb-3">
        <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
          {resolvedLabel}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <TextInput
            value={webText}
            onChangeText={(t) => {
              setWebText(t);
              onChange(t);
            }}
            placeholder={optional ? t('common.optional') : t('common.dateYmd')}
            placeholderTextColor={Colors.neutral[500]}
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
            {...({ type: 'date' } as Record<string, unknown>)}
          />
          {optional && webText ? (
            <Pressable
              onPress={() => {
                setWebText('');
                onChange('');
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2"
              accessibilityLabel={t('common.clearDate')}
            >
              <Ionicons name="close" size={20} color={Colors.neutral[700]} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
        {resolvedLabel}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={() => setShow(true)}
          className="min-h-[44px] flex-row items-center rounded-xl border border-neutral-300 bg-white px-3 py-2 active:opacity-90"
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.brand[700]} />
          <Text className="ml-2 text-base text-neutral-900" style={{ fontFamily: 'Inter_500Medium' }}>
            {value ? display : optional ? `${resolvedEmpty} (${t('common.optional')})` : resolvedEmpty}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable
            onPress={() => onChange('')}
            className="rounded-xl border border-neutral-200 px-3 py-2"
            accessibilityLabel={t('common.clearDate')}
          >
            <Ionicons name="close" size={20} color={Colors.neutral[700]} />
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShow(false);
              if (event.type === 'dismissed') return;
              if (selectedDate) onChange(formatYMD(selectedDate));
              return;
            }
            if (selectedDate) onChange(formatYMD(selectedDate));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && show ? (
        <Pressable onPress={() => setShow(false)} className="mt-2 self-start rounded-lg px-2 py-1">
          <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
            {t('common.done')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
