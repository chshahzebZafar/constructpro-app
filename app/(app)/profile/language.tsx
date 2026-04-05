import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { PreferenceOptionRow } from '@/components/profile/PreferenceOptionRow';
import { Card } from '@/components/ui/Card';
import { LANGUAGE_OPTIONS } from '@/lib/profile/preferencesOptions';

export default function LanguageScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Language" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <Card className="mb-4">
            <Text className="text-sm leading-6 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              The app interface is in English today. Additional languages will roll out in a future update
              with full UI translation.
            </Text>
          </Card>
        </View>

        <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm mx-5">
          {LANGUAGE_OPTIONS.map((lang, index) => (
            <PreferenceOptionRow
              key={lang.code}
              title={lang.label}
              subtitle={lang.nativeLabel}
              variant={lang.code === 'en' ? 'current' : 'soon'}
              isLast={index === LANGUAGE_OPTIONS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
