import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { User } from 'firebase/auth';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { DeleteAccountGoogleSection } from '@/components/profile/DeleteAccountGoogleSection';
import { FirebaseConfigBanner } from '@/components/FirebaseConfigBanner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ENABLE_GOOGLE_SIGN_IN } from '@/constants/features';
import { isFirebaseConfigured, isFirebaseReady } from '@/lib/firebase/config';
import { performAccountDeletion } from '@/lib/account/performAccountDeletion';
import { mapFirebaseAuthError } from '@/lib/authErrors';
import { useAuthStore } from '@/store/useAuthStore';

function hasPasswordProvider(user: User | null): boolean {
  return Boolean(user?.providerData.some((p) => p.providerId === 'password'));
}

function hasGoogleProvider(user: User | null): boolean {
  return Boolean(user?.providerData.some((p) => p.providerId === 'google.com'));
}

export default function DeleteAccountScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const firebaseUsable = isFirebaseConfigured() && isFirebaseReady();
  const showGoogle =
    ENABLE_GOOGLE_SIGN_IN && hasGoogleProvider(user);
  const showPassword = hasPasswordProvider(user);

  const runDelete = useCallback(
    async (opts: { password?: string; googleIdToken?: string }) => {
      setError(null);
      setBusy(true);
      try {
        await performAccountDeletion(opts);
        queryClient.clear();
        router.replace('/(auth)/login');
      } catch (e: unknown) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
        const msg =
          e instanceof Error && e.message && !code ? e.message : mapFirebaseAuthError(code || '');
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [queryClient]
  );

  if (temporaryDevLogin || !user) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
        <ProfileScreenHeader title="Delete account" />
        <View className="flex-1 justify-center px-6">
          <Text className="text-center text-base text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Account deletion is only available when you are signed in with Firebase. Preview mode cannot
            delete an account.
          </Text>
          <View className="mt-6">
            <Button title="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const passwordOk = showPassword && password.trim().length >= 6;
  const canSubmitPassword = firebaseUsable && agreed && passwordOk && showPassword;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Delete account" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card className="border-danger-600 bg-danger-100">
            <Text className="text-sm leading-6 text-danger-800" style={{ fontFamily: 'Inter_500Medium' }}>
              This permanently deletes your ConstructPro account and removes your projects, budget data,
              and synced content tied to this login. This cannot be undone.
            </Text>
          </Card>

          <FirebaseConfigBanner show={!firebaseUsable} />

          <Pressable
            onPress={() => setAgreed(!agreed)}
            className="mt-6 flex-row items-start active:opacity-90"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View
              className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                agreed ? 'border-brand-900 bg-brand-900' : 'border-neutral-400 bg-white'
              }`}
            >
              {agreed ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
            <Text className="flex-1 text-sm text-neutral-800" style={{ fontFamily: 'Inter_400Regular' }}>
              I understand that my account and associated data will be permanently deleted.
            </Text>
          </Pressable>

          {showPassword ? (
            <View className="mt-8">
              <Text
                className="mb-2 text-xs uppercase tracking-wide text-neutral-500"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Confirm with password
              </Text>
              <Input
                label="Current password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
              />
            </View>
          ) : null}

          {showPassword ? (
            <View className="mt-6">
              <Button
                title="Delete my account"
                variant="danger"
                loading={busy}
                disabled={!canSubmitPassword || busy}
                onPress={() => void runDelete({ password: password.trim() })}
              />
            </View>
          ) : null}

          {showGoogle ? (
            <DeleteAccountGoogleSection
              showPassword={showPassword}
              agreed={agreed}
              firebaseUsable={firebaseUsable}
              busy={busy}
              setError={setError}
              runDelete={runDelete}
            />
          ) : null}

          {!showPassword && !showGoogle ? (
            <Text className="mt-6 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {hasGoogleProvider(user) && !ENABLE_GOOGLE_SIGN_IN
                ? 'Google sign-in is temporarily unavailable in this version. To delete a Google-only account, contact support — in-app deletion for Google will return in a future update.'
                : 'No supported sign-in method found for reauthentication. Contact support if you need help deleting your account.'}
            </Text>
          ) : null}

          {error ? (
            <Text
              className="mt-4 text-center text-sm text-danger-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
