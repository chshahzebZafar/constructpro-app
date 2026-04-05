import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';

export default function TermsOfUseScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Terms of use" />
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
            By using ConstructPro, you agree to these terms. They are a placeholder for legal review — do not
            rely on them as final in production.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            Licence
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            We grant you a personal, non-transferable licence to use the app in line with your subscription or
            deployment agreement, where applicable.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            Acceptable use
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Do not misuse the app, attempt to break security, or use it for unlawful purposes. Construction and
            safety decisions remain your professional responsibility.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            Disclaimer
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Tools and estimates are aids only, not professional engineering or legal advice. Verify critical
            outcomes with qualified people on site.
          </Text>

          <Text
            className="mt-6 text-sm leading-6 text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Last updated: April 2026.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
