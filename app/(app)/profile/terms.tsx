import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { TERMS_OF_USE_URL } from '@/constants/app';
import { useI18n } from '@/hooks/useI18n';

export default function TermsOfUseScreen() {
  const { t } = useI18n();
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('profile.menu.terms')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          {TERMS_OF_USE_URL ? (
            <Pressable
              onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}
              className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 active:opacity-90"
            >
              <Text className="text-sm text-brand-800" style={{ fontFamily: 'Inter_500Medium' }}>
                {t('profile.terms.openInBrowser')}
              </Text>
            </Pressable>
          ) : null}

          <Text
            className="text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.terms.intro')}
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {t('profile.terms.licenceTitle')}
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.terms.licenceBody')}
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {t('profile.terms.acceptableUseTitle')}
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.terms.acceptableUseBody')}
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {t('profile.terms.disclaimerTitle')}
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.terms.disclaimerBody')}
          </Text>

          <Text
            className="mt-6 text-sm leading-6 text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('profile.terms.lastUpdated')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
