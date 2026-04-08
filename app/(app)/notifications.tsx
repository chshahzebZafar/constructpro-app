import { useCallback } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { DUMMY_NOTIFICATION_ROWS } from '@/lib/notifications/dummyData';
import { useI18n } from '@/hooks/useI18n';

export default function NotificationsScreen() {
  const { t } = useI18n();
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
      <ProfileScreenHeader title={t('notifications.title')} />
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
            {t('notifications.previewSection')}
          </Text>
          {DUMMY_NOTIFICATION_ROWS.map((n, index) => (
            <View
              key={n.id}
              className={`mb-3 flex-row rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${
                index === DUMMY_NOTIFICATION_ROWS.length - 1 ? 'mb-0' : ''
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
                    {t(`notifications.dummy.${n.id}.title`)}
                  </Text>
                  <Badge label={t('notifications.sampleBadge')} tone="neutral" />
                </View>
                <Text
                  className="mt-1 text-sm leading-5 text-neutral-600"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {t(`notifications.dummy.${n.id}.body`)}
                </Text>
                <Text
                  className="mt-2 text-xs text-neutral-400"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {t(`notifications.dummy.${n.id}.time`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
