import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { PreferenceOptionRow } from '@/components/profile/PreferenceOptionRow';
import { Card } from '@/components/ui/Card';
import { LANGUAGE_OPTIONS } from '@/lib/profile/preferencesOptions';
import { useAuthStore } from '@/store/useAuthStore';
import { normalizeLanguageCode } from '@/lib/i18n/translations';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

export default function LanguageScreen() {
  const { t } = useI18n();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const languageCode = useAuthStore((s) => s.languageCode);
  const setOnboarding = useAuthStore((s) => s.setOnboarding);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const onSelectLanguage = async (code: string) => {
    if (!uid) {
      Alert.alert(localizeKnownUiText(t, 'Language'), localizeKnownUiText(t, 'Please sign in to update language.'));
      return;
    }
    if (code === languageCode) return;
    setSavingCode(code);
    try {
      const next = normalizeLanguageCode(code);
      await AsyncStorage.setItem(`user_language_${uid}`, next);
      setOnboarding({ languageCode: next });
    } catch (e) {
      Alert.alert(
        localizeKnownUiText(t, 'Language'),
        e instanceof Error ? e.message : localizeKnownUiText(t, 'Could not save language')
      );
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('profile.language.title')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <Card className="mb-4">
            <Text className="text-sm leading-6 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('profile.language.note')}
            </Text>
          </Card>
        </View>

        <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm mx-5">
          {LANGUAGE_OPTIONS.map((lang, index) => (
            <PreferenceOptionRow
              key={lang.code}
              title={lang.label}
              subtitle={savingCode === lang.code ? t('profile.language.saving') : lang.nativeLabel}
              variant={normalizeLanguageCode(lang.code) === languageCode ? 'current' : 'available'}
              onPress={() => void onSelectLanguage(lang.code)}
              isLast={index === LANGUAGE_OPTIONS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
