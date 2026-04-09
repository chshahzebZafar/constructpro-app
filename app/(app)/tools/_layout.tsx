import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export default function ToolsStackLayout() {
  return (
    <View className="flex-1 bg-neutral-100">
      <OfflineBanner padStackSafeTop />
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}
