import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { AppMark } from '@/components/branding/AppMark';
import { Card } from '@/components/ui/Card';
import { APP_VERSION } from '@/constants/app';

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="About" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center px-5 pt-8">
          <AppMark size={96} framed />
          <Text
            className="mt-4 text-2xl text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            ConstructPro
          </Text>
          <Text
            className="mt-1 text-sm text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Version {APP_VERSION}
          </Text>
        </View>

        <View className="mt-8 px-5">
          <Card>
            <Text
              className="text-sm leading-6 text-neutral-700"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              ConstructPro helps construction teams estimate, plan, and track site work — from budgets and
              tasks to permits, safety tools, and project hubs — in one mobile app.
            </Text>
          </Card>

          <Text
            className="mt-8 text-center text-xs text-neutral-500"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            © {new Date().getFullYear()} ConstructPro. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
