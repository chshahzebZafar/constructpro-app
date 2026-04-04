import { View, Text } from 'react-native';

/** Shown when EXPO_PUBLIC_FIREBASE_* is missing or Firebase failed to initialize. */
export function FirebaseConfigBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Text className="text-sm text-amber-900" style={{ fontFamily: 'Inter_500Medium' }}>
        Firebase isn&apos;t configured in this build
      </Text>
      <Text className="mt-1 text-xs text-amber-800" style={{ fontFamily: 'Inter_400Regular' }}>
        Add EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID to .env (see
        .env.example), then restart Expo with npx expo start --clear.
      </Text>
    </View>
  );
}
