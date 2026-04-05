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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { COMPANY_SIZES } from '@/constants/profileOptions';

export default function OnboardingStep1() {
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const setOnboarding = useAuthStore((s) => s.setOnboarding);
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');

  const canContinue = companyName.trim().length > 0 && companySize !== null && uid.length > 0;

  const onContinue = async () => {
    if (!canContinue || !uid) return;
    setOnboarding({
      companyName: companyName.trim(),
      companySize: companySize!,
      country: country.trim(),
    });
    await AsyncStorage.multiSet([
      [`company_name_${uid}`, companyName.trim()],
      [`company_size_${uid}`, companySize!],
      [`company_country_${uid}`, country.trim()],
    ]);
    router.push('/(onboarding)/step-2');
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          className="flex-1 px-5 pt-4"
        >
          <View className="mb-6 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <View className="h-full w-1/2 rounded-full bg-brand-500" />
          </View>
          <Text
            className="text-2xl text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            About your company
          </Text>
          <Text
            className="mt-1 text-sm text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Helps us set the right defaults
          </Text>

          <Text
            className="mb-1.5 mt-8 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Company name
          </Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Your company"
            placeholderTextColor="#9CA3AF"
            className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <Text
            className="mb-2 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Company size
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {COMPANY_SIZES.map((s) => {
              const selected = companySize === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setCompanySize(s)}
                  className={`min-h-[48px] w-[47%] items-center justify-center rounded-xl border px-2 ${
                    selected ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                  }`}
                >
                  <Text
                    className="text-center text-sm text-brand-900"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            className="mb-1.5 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Country
          </Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. United Kingdom"
            placeholderTextColor="#9CA3AF"
            className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <View className="mt-10">
            <Button title="Continue" onPress={onContinue} disabled={!canContinue} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
