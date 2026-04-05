import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { PROFILE_ROLES } from '@/constants/profileOptions';

export default function OnboardingStep2() {
  const [role, setRole] = useState<string | null>(null);
  const setOnboarding = useAuthStore((s) => s.setOnboarding);
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');

  const canFinish = role !== null && uid.length > 0;

  const onFinish = async () => {
    if (!role || !uid) return;
    const title = PROFILE_ROLES.find((r) => r.id === role)?.title ?? role;
    setOnboarding({ role: title, onboardingComplete: true });
    await AsyncStorage.multiSet([
      [`onboarding_complete_${uid}`, 'true'],
      [`user_role_${uid}`, title],
    ]);
    router.replace('/(app)/');
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        className="flex-1 px-5 pt-4"
      >
        <View className="mb-6 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <View className="h-full w-full rounded-full bg-brand-500" />
        </View>
        <Text
          className="text-2xl text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          What is your role?
        </Text>
        <Text
          className="mt-1 text-sm text-neutral-500"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          We&apos;ll show you the most relevant tools first
        </Text>

        <View className="mt-8 flex-row flex-wrap gap-3">
          {PROFILE_ROLES.map((r) => {
            const selected = role === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRole(r.id)}
                className={`min-h-[88px] w-[47%] rounded-xl border px-3 py-3 ${
                  selected ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                }`}
              >
                <Text className="text-2xl">{r.emoji}</Text>
                <Text
                  className="mt-1 text-sm font-semibold text-brand-900"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {r.title}
                </Text>
                <Text
                  className="text-xs text-neutral-500"
                  style={{ fontFamily: 'Inter_400Regular' }}
                  numberOfLines={2}
                >
                  {r.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-10">
          <Button title="Get Started" onPress={onFinish} disabled={!canFinish} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
