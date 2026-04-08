import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

interface FormulaCardProps {
  lines: string[];
}

export function FormulaCard({ lines }: FormulaCardProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const localizedLines = lines.map((line) => localizeKnownUiText(t, line));
  return (
    <View className="mb-6 rounded-2xl border border-neutral-200 bg-white">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
          {t('tools.formula.reference')}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.neutral[500]} />
      </Pressable>
      {open ? (
        <View className="border-t border-neutral-100 px-4 pb-4 pt-2">
          {localizedLines.map((line) => (
            <Text
              key={line}
              className="mb-1 text-xs text-neutral-700"
              style={{ fontFamily: mono }}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
