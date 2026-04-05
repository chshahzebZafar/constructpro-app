import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../lib/firebase/config';
import { registerUser } from '../../lib/firebase/auth';
import { mapFirebaseAuthError } from '../../lib/authErrors';
import { isFirebaseConfigured, isFirebaseReady } from '../../lib/firebase/config';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { FirebaseConfigBanner } from '../../components/FirebaseConfigBanner';
import { AppMark } from '@/components/branding/AppMark';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const firebaseUsable = isFirebaseConfigured() && isFirebaseReady();

  const onSubmit = async (data: RegisterForm) => {
    setFormError(null);
    if (!firebaseUsable) return;
    try {
      await registerUser(data.email, data.password);
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: data.name });
      }
      router.replace('/(onboarding)/step-1');
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
              Create Account
            </Text>
          </View>

          <View className="mb-4 items-center">
            <AppMark size={72} />
          </View>

          <Card className="mt-2">
            <FirebaseConfigBanner show={!firebaseUsable} />
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full name"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
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
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Confirm password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Text
              className="mb-4 text-center text-xs text-neutral-500"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              By signing up you agree to our Terms &amp; Privacy Policy
            </Text>

            {formError ? (
              <Text
                className="mb-3 text-center text-sm text-danger-600"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {formError}
              </Text>
            ) : null}

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting || !firebaseUsable}
            />
          </Card>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text
                  className="text-sm text-accent-600"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
