import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { SUPPORT_EMAIL } from '@/constants/app';
import { useI18n } from '@/hooks/useI18n';

export default function SupportScreen() {
  const { t } = useI18n();
  const openMail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=ConstructPro%20support`);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('profile.menu.support')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <Text
            className="text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.support.intro')}
          </Text>

          <Card className="mt-6">
            <Text
              className="text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {t('profile.support.contact')}
            </Text>
            <Pressable
              onPress={openMail}
              className="mt-3 flex-row items-center active:opacity-80"
              accessibilityRole="link"
            >
              <Ionicons name="mail-outline" size={22} color={Colors.brand[700]} />
              <Text
                className="ml-2 flex-1 text-base text-brand-700"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {SUPPORT_EMAIL}
              </Text>
              <Ionicons name="open-outline" size={18} color={Colors.neutral[500]} />
            </Pressable>
          </Card>

          <Text
            className="mt-8 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {t('profile.support.quickTips')}
          </Text>
          <View className="mt-3 gap-3">
            {[
              t('profile.support.tip1'),
              t('profile.support.tip2'),
              t('profile.support.tip3'),
            ].map((line) => (
              <View key={line} className="flex-row">
                <Text className="mr-2 text-brand-500" style={{ fontFamily: 'Inter_500Medium' }}>
                  •
                </Text>
                <Text
                  className="flex-1 text-sm leading-6 text-neutral-700"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {line}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
