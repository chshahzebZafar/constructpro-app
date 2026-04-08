import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { PreferenceOptionRow } from '@/components/profile/PreferenceOptionRow';
import { Card } from '@/components/ui/Card';
import { CURRENCY_OPTIONS } from '@/lib/profile/preferencesOptions';
import { useAuthStore } from '@/store/useAuthStore';
import { normalizeCurrencyCode } from '@/lib/profile/currency';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

export default function PriceCurrencyScreen() {
  const { t } = useI18n();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const setOnboarding = useAuthStore((s) => s.setOnboarding);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const onSelectCurrency = async (code: string) => {
    if (!uid) {
      Alert.alert(localizeKnownUiText(t, 'Profile'), localizeKnownUiText(t, 'Please sign in to update currency.'));
      return;
    }
    if (code === currencyCode) return;
    setSavingCode(code);
    try {
      const next = normalizeCurrencyCode(code);
      await AsyncStorage.setItem(`user_currency_${uid}`, next);
      setOnboarding({ currencyCode: next });
    } catch (e) {
      Alert.alert(
        localizeKnownUiText(t, 'Currency'),
        e instanceof Error ? e.message : localizeKnownUiText(t, 'Could not save currency')
      );
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('profile.menu.priceCurrency')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <Card className="mb-4">
            <Text className="text-sm leading-6 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              {localizeKnownUiText(
                t,
                'Select your preferred currency. Amounts across tools and dashboards are shown using this setting.'
              )}
            </Text>
          </Card>
        </View>

        <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm mx-5">
          {CURRENCY_OPTIONS.map((c, index) => (
            <PreferenceOptionRow
              key={c.code}
              title={`${c.label} (${c.code})`}
              subtitle={savingCode === c.code ? localizeKnownUiText(t, 'Saving...') : `${c.symbol}`}
              variant={c.code === currencyCode ? 'current' : 'available'}
              onPress={() => void onSelectCurrency(c.code)}
              isLast={index === CURRENCY_OPTIONS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
