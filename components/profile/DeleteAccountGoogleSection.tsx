import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

interface DeleteAccountGoogleSectionProps {
  showPassword: boolean;
  agreed: boolean;
  firebaseUsable: boolean;
  busy: boolean;
  setError: (msg: string | null) => void;
  runDelete: (opts: { password?: string; googleIdToken?: string }) => Promise<void>;
}

function googleIdsReadyForPlatform(): boolean {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  if (!web) return false;
  if (Platform.OS === 'android') {
    return Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '');
  }
  return true;
}

export function DeleteAccountGoogleSection({
  showPassword,
  agreed,
  firebaseUsable,
  busy,
  setError,
  runDelete,
}: DeleteAccountGoogleSectionProps) {
  const { t } = useI18n();
  const googleIntentRef = useRef(false);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    androidClientId: androidClientId || undefined,
    iosClientId,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'cancel' || response.type === 'dismiss' || response.type === 'error') {
      googleIntentRef.current = false;
    }
  }, [response]);

  useEffect(() => {
    if (!googleIntentRef.current) return;
    if (response?.type !== 'success' || !('params' in response)) return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    googleIntentRef.current = false;
    void runDelete({ googleIdToken: idToken });
  }, [response, runDelete]);

  if (!googleIdsReadyForPlatform()) return null;

  return (
    <View className={showPassword ? 'mt-8' : 'mt-8'}>
      {showPassword ? (
        <View className="mb-4 flex-row items-center">
          <View className="h-px flex-1 bg-neutral-300" />
          <Text className="mx-3 text-xs text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('auth.login.or')}
          </Text>
          <View className="h-px flex-1 bg-neutral-300" />
        </View>
      ) : null}
      <Text
        className="mb-3 text-xs uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {showPassword ? t('profile.delete.confirmWithGoogleInstead') : t('profile.delete.confirmWithGoogle')}
      </Text>
      <Pressable
        onPress={() => {
          if (!firebaseUsable || !agreed || busy) return;
          setError(null);
          googleIntentRef.current = true;
          void promptAsync();
        }}
        disabled={!firebaseUsable || !agreed || busy || !request}
        className="min-h-[52px] flex-row items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 active:opacity-90"
      >
        {busy && googleIntentRef.current ? (
          <ActivityIndicator color={Colors.brand[900]} />
        ) : (
          <>
            <Ionicons name="logo-google" size={22} color="#4285F4" style={{ marginRight: 12 }} />
            <Text className="text-base text-neutral-900" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('profile.delete.continueGoogleDelete')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
