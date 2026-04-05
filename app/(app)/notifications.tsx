import { useCallback } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { DUMMY_NOTIFICATIONS } from '@/lib/notifications/dummyData';

export default function NotificationsScreen() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      if (Platform.OS === 'android') {
        setStatusBarBackgroundColor('#FFFFFF');
      }
      return () => {};
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Notifications" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="border-b border-neutral-200 bg-brand-50 px-5 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="min-w-0 flex-1 text-sm leading-5 text-neutral-800"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Real-time alerts and push notifications are on the roadmap. Preview sample items below.
            </Text>
            <Badge label="Coming soon" tone="warning" />
          </View>
        </View>

        <View className="px-5 pt-4">
          <Text
            className="mb-3 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Preview
          </Text>
          {DUMMY_NOTIFICATIONS.map((n, index) => (
            <View
              key={n.id}
              className={`mb-3 flex-row rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${
                index === DUMMY_NOTIFICATIONS.length - 1 ? 'mb-0' : ''
              }`}
            >
              <View
                className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: Colors.brand[100] }}
              >
                <Ionicons name={n.icon} size={22} color={Colors.brand[900]} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text
                    className="min-w-0 flex-1 text-base text-brand-900"
                    style={{ fontFamily: 'Poppins_700Bold' }}
                    numberOfLines={2}
                  >
                    {n.title}
                  </Text>
                  <Badge label="Sample" tone="neutral" />
                </View>
                <Text
                  className="mt-1 text-sm leading-5 text-neutral-600"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {n.body}
                </Text>
                <Text
                  className="mt-2 text-xs text-neutral-400"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {n.timeLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
