import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { logoutUser } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { Colors } from '@/constants/colors';
import { APP_VERSION } from '@/constants/app';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const exitTemporaryDevLogin = useAuthStore((s) => s.exitTemporaryDevLogin);
  const companyName = useAuthStore((s) => s.companyName);
  const role = useAuthStore((s) => s.role);
  const [busy, setBusy] = useState(false);

  const displayName = temporaryDevLogin ? 'Preview user' : (user?.displayName ?? 'User');
  const email = temporaryDevLogin ? 'dev@preview.local' : (user?.email ?? '');

  const initials = temporaryDevLogin
    ? 'PV'
    : user?.displayName
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? '?';

  const onLogout = async () => {
    setBusy(true);
    try {
      if (temporaryDevLogin) {
        exitTemporaryDevLogin();
      } else {
        await logoutUser();
      }
      router.replace('/(auth)/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        <Text
          className="mb-4 text-2xl text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          Profile
        </Text>

        <View className="items-center">
          {temporaryDevLogin ? (
            <View className="mb-4 w-full rounded-lg border border-warning-600 bg-warning-100 px-3 py-2">
              <Text
                className="text-center text-xs text-neutral-800"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Temporary preview — not signed in with Firebase. (__DEV__ only)
              </Text>
            </View>
          ) : null}
          <View
            className="mb-4 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.brand[100] }}
          >
            <Text
              className="text-2xl text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              {initials}
            </Text>
          </View>
          <Text
            className="text-xl text-neutral-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {displayName}
          </Text>
          <Text
            className="mt-1 text-sm text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {email}
          </Text>
        </View>

        <Card className="mt-8">
          <Text
            className="text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Company
          </Text>
          <Text
            className="mt-1 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {companyName || '—'}
          </Text>
          <Text
            className="mt-4 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Role
          </Text>
          <Text
            className="mt-1 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {role || '—'}
          </Text>
        </Card>

        <View className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Text
            className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Preferences
          </Text>
          <View className="px-4 pb-2">
            <ProfileMenuRow
              href="/(app)/profile/language"
              icon="language-outline"
              label="Language"
            />
            <ProfileMenuRow
              href="/(app)/profile/price-currency"
              icon="cash-outline"
              label="Price & currency"
              isLast
            />
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Text
            className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Feedback
          </Text>
          <View className="px-4 pb-2">
            <ProfileMenuRow
              href="/(app)/profile/feedback"
              icon="chatbubble-ellipses-outline"
              label="Send feedback"
              isLast
            />
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Text
            className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-neutral-500"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Help & legal
          </Text>
          <View className="px-4 pb-2">
            <ProfileMenuRow
              href="/(app)/profile/privacy"
              icon="shield-checkmark-outline"
              label="Privacy policy"
            />
            <ProfileMenuRow
              href="/(app)/profile/terms"
              icon="document-text-outline"
              label="Terms of use"
            />
            <ProfileMenuRow
              href="/(app)/profile/support"
              icon="help-circle-outline"
              label="Support"
            />
            <ProfileMenuRow
              href="/(app)/profile/about"
              icon="information-circle-outline"
              label="About"
              isLast
            />
          </View>
        </View>

        {!temporaryDevLogin ? (
          <View className="mt-6 overflow-hidden rounded-2xl border border-danger-200 bg-white shadow-sm">
            <Text
              className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Account
            </Text>
            <View className="px-4 pb-2">
              <ProfileMenuRow
                href="/(app)/profile/delete-account"
                icon="trash-outline"
                label="Delete account"
                isLast
              />
            </View>
          </View>
        ) : null}

        <View className="mt-8">
          {busy ? (
            <ActivityIndicator color={Colors.brand[900]} />
          ) : (
            <Button title="Log out" variant="secondary" onPress={onLogout} />
          )}
        </View>

        <Text
          className="mt-8 text-center text-xs text-neutral-400"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Version {APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
