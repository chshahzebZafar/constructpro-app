/**
 * Safety hub is not shown on the bottom tab bar (see app/(app)/_layout.tsx).
 * Use Tools → category "Safety" for checklist, incidents, PPE, permits, OSHA.
 * This screen remains for optional navigation / deep links.
 */
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function SafetyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'left', 'right']}>
      <View className="flex-1 justify-center px-6">
        <Text className="text-center text-base text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
          Safety tools are in the Tools tab — filter by{' '}
          <Text style={{ fontFamily: 'Inter_500Medium' }}>Safety</Text>.
        </Text>
        <Link href="/(app)/tools" asChild>
          <Pressable className="mt-6 flex-row items-center justify-center rounded-2xl border border-neutral-200 bg-white py-4 active:opacity-90">
            <Ionicons name="hammer-outline" size={22} color={Colors.brand[700]} />
            <Text
              className="ml-2 text-base text-brand-700"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Open Tools
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.brand[700]} style={{ marginLeft: 4 }} />
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
