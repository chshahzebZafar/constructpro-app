import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { loginUser, signInWithGoogleIdToken } from '../../lib/firebase/auth';
import { mapFirebaseAuthError } from '../../lib/authErrors';
import { isFirebaseConfigured, isFirebaseReady } from '../../lib/firebase/config';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { FirebaseConfigBanner } from '../../components/FirebaseConfigBanner';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

function googleIdsReadyForPlatform(): boolean {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  if (!web) return false;
  if (Platform.OS === 'android') {
    return Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '');
  }
  return true;
}

function GoogleSignInBlock({
  webClientId,
  androidClientId,
  iosClientId,
  setFormError,
}: {
  webClientId: string;
  androidClientId?: string;
  iosClientId?: string;
  setFormError: (msg: string | null) => void;
}) {
  const [googleBusy, setGoogleBusy] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    androidClientId,
    iosClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success' || !('params' in response)) return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    let cancelled = false;
    void (async () => {
      try {
        await signInWithGoogleIdToken(idToken);
        router.replace('/');
      } catch (e: unknown) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
        if (!cancelled) setFormError(mapFirebaseAuthError(code));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [response, setFormError]);

  return (
    <>
      <View className="my-6 flex-row items-center px-8">
        <View className="h-px flex-1 bg-neutral-300" />
        <Text className="mx-3 text-xs text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
          OR
        </Text>
        <View className="h-px flex-1 bg-neutral-300" />
      </View>

      <View className="px-5">
        <Pressable
          onPress={() => {
            setFormError(null);
            setGoogleBusy(true);
            promptAsync().finally(() => setGoogleBusy(false));
          }}
          disabled={!request || googleBusy}
          className="min-h-[52px] flex-row items-center justify-center rounded-xl border border-neutral-300 bg-white px-4"
        >
          {googleBusy ? (
            <ActivityIndicator color="#1B3A5C" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#4285F4" style={{ marginRight: 12 }} />
              <Text className="text-base text-neutral-900" style={{ fontFamily: 'Inter_500Medium' }}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );
}

export default function LoginScreen() {
  const enterTemporaryDevLogin = useAuthStore((s) => s.enterTemporaryDevLogin);
  const [formError, setFormError] = useState<string | null>(null);
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const showGoogleOAuth = googleIdsReadyForPlatform();
  const firebaseUsable = isFirebaseConfigured() && isFirebaseReady();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setFormError(null);
    if (!firebaseUsable) return;
    try {
      await loginUser(data.email, data.password);
      router.replace('/');
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
      setFormError(mapFirebaseAuthError(code));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 48 }}
          className="flex-1"
        >
          <View className="items-center px-5 pt-8">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-brand-100">
              <Ionicons name="business" size={40} color="#1B3A5C" />
            </View>
            <Text
              className="text-center text-[28px] text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              ConstructPro
            </Text>
            <Text
              className="mt-1 text-center text-sm text-neutral-500"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Sign in to your account
            </Text>
          </View>

          <Card className="mx-5 mt-4">
            <FirebaseConfigBanner show={!firebaseUsable} />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email address"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <View className="mb-4 flex-row justify-end">
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text
                    className="text-[13px] text-brand-500"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>
            </View>

            {formError ? (
              <Text
                className="mb-3 text-center text-sm text-danger-600"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {formError}
              </Text>
            ) : null}

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting || !firebaseUsable}
            />
          </Card>

          {__DEV__ ? (
            <View className="mx-5 mt-4">
              <Pressable
                onPress={() => {
                  enterTemporaryDevLogin();
                  router.replace('/(onboarding)/step-1');
                }}
                className="min-h-[48px] items-center justify-center rounded-xl border border-dashed border-neutral-400 bg-neutral-100 px-4 active:opacity-80"
              >
                <Text
                  className="text-center text-sm text-neutral-600"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Continue without signing in (temporary — dev only)
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showGoogleOAuth ? (
            <GoogleSignInBlock
              webClientId={webClientId}
              androidClientId={androidClientId || undefined}
              iosClientId={iosClientId}
              setFormError={setFormError}
            />
          ) : null}

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text
                  className="text-sm text-accent-600"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
