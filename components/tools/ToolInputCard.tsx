import { View, Text } from 'react-native';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

interface ToolInputCardProps {
  title: string;
  children: React.ReactNode;
}

export function ToolInputCard({ title, children }: ToolInputCardProps) {
  const { t } = useI18n();
  const resolvedTitle = localizeKnownUiText(t, title);
  return (
    <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <Text
        className="mb-3 text-sm text-brand-900"
        style={{ fontFamily: 'Poppins_700Bold' }}
      >
        {resolvedTitle}
      </Text>
      {children}
    </View>
  );
}
