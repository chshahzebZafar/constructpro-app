import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { PreferenceOptionRow } from '@/components/profile/PreferenceOptionRow';
import { Card } from '@/components/ui/Card';
import { CURRENCY_OPTIONS } from '@/lib/profile/preferencesOptions';

export default function PriceCurrencyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Price & currency" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <Card className="mb-4">
            <Text className="text-sm leading-6 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              Estimates and tools use US dollars (USD) for now. Regional currency display and conversion
              will be added in a future release.
            </Text>
          </Card>
        </View>

        <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm mx-5">
          {CURRENCY_OPTIONS.map((c, index) => (
            <PreferenceOptionRow
              key={c.code}
              title={`${c.label} (${c.code})`}
              subtitle={`${c.symbol}`}
              variant={c.code === 'USD' ? 'current' : 'soon'}
              isLast={index === CURRENCY_OPTIONS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
