import { View, Text } from 'react-native';

interface ToolInputCardProps {
  title: string;
  children: React.ReactNode;
}

export function ToolInputCard({ title, children }: ToolInputCardProps) {
  return (
    <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <Text
        className="mb-3 text-sm text-brand-900"
        style={{ fontFamily: 'Poppins_700Bold' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
