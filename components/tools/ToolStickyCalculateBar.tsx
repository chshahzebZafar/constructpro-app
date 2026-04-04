import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';

interface ToolStickyCalculateBarProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}

export function ToolStickyCalculateBar({
  onPress,
  loading,
  label = 'Calculate',
  disabled,
}: ToolStickyCalculateBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-t border-neutral-200 bg-white px-5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12), minHeight: 80 }}
    >
      <Button title={label} onPress={onPress} loading={loading} disabled={disabled} />
    </View>
  );
}
