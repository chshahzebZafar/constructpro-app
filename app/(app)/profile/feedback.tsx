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

const CATEGORIES: { id: FeedbackCategory; label: string; hint: string }[] = [
  { id: 'suggestion', label: 'Suggestion', hint: 'Ideas to improve ConstructPro' },
  { id: 'bug', label: 'Issue / bug', hint: 'Something broken or confusing' },
  { id: 'other', label: 'Other', hint: 'Anything else' },
];

export default function FeedbackScreen() {
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const result = await submitFeedback({ category, message });
      if (result.kind === 'saved') {
        Alert.alert(
          'Thank you',
          'Your feedback was sent. We read every submission to improve ConstructPro.',
          [{ text: 'OK', onPress: () => setMessage('') }]
        );
      } else {
        Alert.alert(
          'Email app opened',
          `We couldn’t save to the cloud just now. Your message is ready to send to ${SUPPORT_EMAIL} — tap Send in your mail app.`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      Alert.alert('Feedback', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Send feedback" />
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
              Help us improve ConstructPro or report a problem. Your message goes to our team (and may be
              stored with your account when you’re signed in).
            </Text>

            <Text
              className="mb-2 mt-6 text-xs uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Type
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
              Your feedback
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe what happened, what you expected, and steps to reproduce if it’s a bug…"
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
                title="Submit feedback"
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
