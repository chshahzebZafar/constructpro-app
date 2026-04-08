import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { SUPPORT_EMAIL } from '@/constants/app';
import { submitFeedback, type FeedbackCategory } from '@/lib/feedback/submitFeedback';
import { useI18n } from '@/hooks/useI18n';

export default function FeedbackScreen() {
  const { t } = useI18n();
  const CATEGORIES: { id: FeedbackCategory; label: string; hint: string }[] = [
    { id: 'suggestion', label: t('profile.feedback.category.suggestion'), hint: t('profile.feedback.hint.suggestion') },
    { id: 'bug', label: t('profile.feedback.category.bug'), hint: t('profile.feedback.hint.bug') },
    { id: 'other', label: t('profile.feedback.category.other'), hint: t('profile.feedback.hint.other') },
  ];
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const result = await submitFeedback({ category, message });
      if (result.kind === 'saved') {
        Alert.alert(
          t('profile.feedback.thankYouTitle'),
          t('profile.feedback.thankYouBody'),
          [{ text: t('common.ok'), onPress: () => setMessage('') }]
        );
      } else {
        Alert.alert(
          t('profile.feedback.emailOpenedTitle'),
          t('profile.feedback.emailOpenedBody').replace('{email}', SUPPORT_EMAIL),
          [{ text: t('common.ok') }]
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('profile.feedback.genericError');
      Alert.alert(t('profile.menu.sendFeedback'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title={t('profile.menu.sendFeedback')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 pt-4">
            <Text
              className="text-sm leading-6 text-neutral-700"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('profile.feedback.intro')}
            </Text>

            <Text
              className="mb-2 mt-6 text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {t('profile.feedback.type')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const selected = category === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    className={`rounded-xl border px-4 py-3 active:opacity-90 ${
                      selected ? 'border-brand-900 bg-brand-100' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm ${selected ? 'text-brand-900' : 'text-neutral-800'}`}
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {c.label}
                    </Text>
                    <Text
                      className="mt-0.5 text-[11px] text-neutral-500"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {c.hint}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              className="mb-2 mt-8 text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {t('profile.feedback.yourFeedback')}
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t('profile.feedback.placeholder')}
              placeholderTextColor={Colors.neutral[500]}
              multiline
              textAlignVertical="top"
              className="min-h-[160px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
              maxLength={4000}
            />
            <Text
              className="mt-1 text-right text-xs text-neutral-400"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {message.length}/4000
            </Text>

            <View className="mt-8">
              <Button
                title={t('profile.feedback.submit')}
                onPress={() => void onSubmit()}
                loading={loading}
                disabled={message.trim().length < 10}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
