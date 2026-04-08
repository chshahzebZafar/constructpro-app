import { View, Text } from 'react-native';
import { Colors } from '../../constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

interface RowProps {
  label: string;
  value: string;
  emphasize?: boolean;
}

function Row({ label, value, emphasize }: RowProps) {
  const { t } = useI18n();
  const resolvedLabel = localizeKnownUiText(t, label);
  return (
    <View className="mb-2 flex-row items-center justify-between last:mb-0">
      <Text className="flex-1 pr-2 text-sm text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
        {resolvedLabel}
      </Text>
      <Text
        className={`text-sm ${emphasize ? 'text-brand-900' : 'text-neutral-900'}`}
        style={{ fontFamily: emphasize ? 'Poppins_700Bold' : 'Inter_500Medium' }}
      >
        {value}
      </Text>
    </View>
  );
}

interface ToolResultCardProps {
  children: React.ReactNode;
}

export function ToolResultCard({ children }: ToolResultCardProps) {
  return (
    <View
      className="mb-4 rounded-2xl border border-brand-500/20 p-4"
      style={{ backgroundColor: Colors.brand[100] }}
    >
      {children}
    </View>
  );
}

export function ToolResultCardTitle({ children }: { children: string }) {
  const { t } = useI18n();
  const resolvedTitle = localizeKnownUiText(t, children);
  return (
    <Text className="mb-3 text-base text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
      {resolvedTitle}
    </Text>
  );
}

export { Row };
