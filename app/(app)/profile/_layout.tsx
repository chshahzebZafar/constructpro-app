import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export default function ProfileStackLayout() {
  return (
    <View className="flex-1 bg-neutral-100">
      <OfflineBanner padStackSafeTop />
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="details" />
          <Stack.Screen name="edit" />
          <Stack.Screen name="language" />
          <Stack.Screen name="notifications-settings" />
          <Stack.Screen name="price-currency" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="support" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="about" />
        </Stack>
      </View>
    </View>
  );
}
