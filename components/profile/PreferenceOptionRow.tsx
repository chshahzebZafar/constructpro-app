import { Pressable, View, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

interface PreferenceOptionRowProps {
  title: string;
  subtitle?: string;
  /** English is default language; USD is default currency until i18n / multi-ccy ship. */
  variant: 'current' | 'available' | 'soon';
  isLast?: boolean;
  onPress?: () => void;
}

export function PreferenceOptionRow({ title, subtitle, variant, isLast, onPress }: PreferenceOptionRowProps) {
  const { t } = useI18n();
  const isCurrent = variant === 'current';
  const isAvailable = variant === 'available';
  const badgeText = isCurrent ? 'Current' : isAvailable ? 'Available' : 'Coming soon';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center px-4 py-4 ${!isLast ? 'border-b border-neutral-100' : ''}`}
    >
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-base text-neutral-900" style={{ fontFamily: 'Inter_500Medium' }}>
          {localizeKnownUiText(t, title)}
        </Text>
        {subtitle ? (
          <Text
            className="mt-0.5 text-sm text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
            numberOfLines={1}
          >
            {localizeKnownUiText(t, subtitle)}
          </Text>
        ) : null}
      </View>
      <View
        className="rounded-full px-2.5 py-1"
        style={{
          backgroundColor: isCurrent ? Colors.success[100] : Colors.neutral[100],
        }}
      >
        <Text
          className={`text-xs ${isCurrent ? 'text-success-600' : isAvailable ? 'text-brand-700' : 'text-neutral-500'}`}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {localizeKnownUiText(t, badgeText)}
        </Text>
      </View>
    </Pressable>
  );
}
