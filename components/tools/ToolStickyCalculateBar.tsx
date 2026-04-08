import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { useI18n } from '@/hooks/useI18n';

interface ToolStickyCalculateBarProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}

export function ToolStickyCalculateBar({
  onPress,
  loading,
  label,
  disabled,
}: ToolStickyCalculateBarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const resolved = label ?? t('tools.action.calculate');
  return (
    <View
      className="border-t border-neutral-200 bg-white px-5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12), minHeight: 80 }}
    >
      <Button title={resolved} onPress={onPress} loading={loading} disabled={disabled} />
    </View>
  );
}
