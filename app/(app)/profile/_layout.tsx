import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="support" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
