import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../../lib/firebase/auth';
import { mapFirebaseAuthError } from '../../lib/authErrors';
import { isFirebaseConfigured, isFirebaseReady } from '../../lib/firebase/config';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const firebaseUsable = isFirebaseConfigured() && isFirebaseReady();

  const onSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address');
      return;
    }
    if (!firebaseUsable) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
      setError(mapFirebaseAuthError(code));
    } finally {
      setLoading(false);
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
          className="flex-1 px-5"
        >
          <View className="mb-4 flex-row items-center">
            <Pressable onPress={() => router.back()} hitSlop={12} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color="#1B3A5C" />
            </Pressable>
            <Text
              className="text-xl text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              Reset Password
            </Text>
          </View>

          <Text
            className="mb-6 text-base leading-6 text-neutral-700"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Enter your email and we&apos;ll send you a reset link.
          </Text>

          {success ? (
            <View>
              <View className="mb-6 rounded-xl border border-success-600 bg-success-100 p-4">
                <Text
                  className="text-center text-base text-success-600"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Check your inbox for a password reset link.
                </Text>
              </View>
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <Text
                  className="text-center text-base text-brand-500"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Back to login
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text
                className="mb-1.5 text-[13px] text-neutral-700"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@company.com"
                placeholderTextColor="#9CA3AF"
                className="mb-4 min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              {error ? (
                <Text
                  className="mb-3 text-sm text-danger-600"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {error}
                </Text>
              ) : null}
              <Button
                title="Send Reset Link"
                onPress={onSubmit}
                loading={loading}
                disabled={loading || !firebaseUsable}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
