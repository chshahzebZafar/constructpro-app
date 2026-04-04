import { Text, View } from 'react-native';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const toneClass: Record<Tone, string> = {
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger: 'bg-danger-100 text-danger-600',
  neutral: 'bg-neutral-100 text-neutral-700',
};

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${toneClass[tone]}`}>
      <Text
        className="text-xs font-medium capitalize"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}
