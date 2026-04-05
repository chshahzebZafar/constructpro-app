import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Privacy policy" />
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
            ConstructPro is built to keep your project data on your account and device where possible. This
            summary explains what we collect and why — replace with counsel-reviewed text before production.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            What we collect
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Account details you provide (name, email, company profile from onboarding). Usage of Firebase
            Authentication and Cloud Firestore / Storage when signed in, as configured in your project.
            Tool data you enter (budgets, tasks, permits, etc.) stored locally and/or under your user path in
            the cloud, per your app configuration.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            How we use it
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            To provide app features, sync across devices when enabled, and improve reliability. We do not sell
            your personal data.
          </Text>

          <Text
            className="mt-6 text-base text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            Your choices
          </Text>
          <Text
            className="mt-2 text-sm leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            You can sign out, delete app data from device settings, and manage Firebase data retention in line
            with your organisation&apos;s policies.
          </Text>

          <Text
            className="mt-6 text-sm leading-6 text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Last updated: April 2026. Update this page before public release.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
