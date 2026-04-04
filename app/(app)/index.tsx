import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';

const TASKS = [
  { name: 'Pour slab — Level 3', status: 'On Track' as const },
  { name: 'MEP rough-in review', status: 'Due Today' as const },
  { name: 'Facade panels delivery', status: 'On Track' as const },
  { name: 'Safety toolbox talk', status: 'Overdue' as const },
];

function taskTone(s: (typeof TASKS)[0]['status']): 'success' | 'warning' | 'danger' {
  if (s === 'On Track') return 'success';
  if (s === 'Due Today') return 'warning';
  return 'danger';
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    if (temporaryDevLogin) {
      setWelcomeOpen(false);
      return;
    }
    const uid = user?.uid;
    if (!uid) return;
    void AsyncStorage.getItem(`welcome_seen_${uid}`).then((v) => {
      if (!v) setWelcomeOpen(true);
    });
  }, [user?.uid, temporaryDevLogin]);

  const dismissWelcome = async () => {
    if (user?.uid) {
      await AsyncStorage.setItem(`welcome_seen_${user.uid}`, 'true');
    }
    setWelcomeOpen(false);
  };

  const greeting = temporaryDevLogin
    ? 'Preview'
    : user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="px-5 pb-6 pt-4"
          style={{ backgroundColor: Colors.brand[900] }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text
                className="text-lg text-white"
                style={{ fontFamily: 'Poppins_700Bold' }}
              >
                Good morning, {greeting}
              </Text>
              <Text
                className="mt-1 text-xs text-white/70"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                Tower B — Downtown
              </Text>
            </View>
            <Pressable
              hitSlop={12}
              className="h-12 w-12 items-center justify-center"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View className="-mt-2 px-5">
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: 'Active Projects', value: '6' },
              { label: 'Budget', value: '$4.2M' },
              { label: 'Open Tasks', value: '24', warn: true },
              { label: 'TRIR', value: '1.2', good: true },
            ].map((m) => (
              <View key={m.label} className="w-[47%]">
                <Card className="border-neutral-200 p-4">
                  <Text
                    className="text-[11px] uppercase tracking-wide text-neutral-500"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {m.label}
                  </Text>
                  <Text
                    className={`mt-2 text-[22px] ${m.warn ? 'text-danger-600' : m.good ? 'text-success-600' : 'text-neutral-900'}`}
                    style={{ fontFamily: 'Poppins_700Bold' }}
                  >
                    {m.value}
                  </Text>
                </Card>
              </View>
            ))}
          </View>

          <Card className="mt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                className="text-base text-neutral-900"
                style={{ fontFamily: 'Poppins_700Bold' }}
              >
                Active Tasks
              </Text>
              <Pressable>
                <Text
                  className="text-sm text-brand-500"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  See all
                </Text>
              </Pressable>
            </View>
            {TASKS.map((t) => (
              <View
                key={t.name}
                className="mb-3 flex-row items-center justify-between border-b border-neutral-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
              >
                <View className="flex-1 flex-row items-center pr-2">
                  <View
                    className={`mr-2 h-2 w-2 rounded-full ${
                      t.status === 'Overdue'
                        ? 'bg-danger-600'
                        : t.status === 'Due Today'
                          ? 'bg-warning-600'
                          : 'bg-success-600'
                    }`}
                  />
                  <Text
                    className="flex-1 text-sm text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={2}
                  >
                    {t.name}
                  </Text>
                </View>
                <Badge label={t.status} tone={taskTone(t.status)} />
              </View>
            ))}
          </Card>

          <View
            className="mt-3 flex-row items-center justify-between rounded-xl border border-accent-600/20 p-4"
            style={{ backgroundColor: Colors.accent[100] }}
          >
            <View className="flex-1 flex-row items-center pr-2">
              <Ionicons name="warning-outline" size={22} color={Colors.warning[600]} />
              <Text
                className="ml-2 flex-1 text-sm text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                Electrical permit expiring in 12 days
              </Text>
            </View>
            <Pressable>
              <Text
                className="text-sm text-brand-500"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                View
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={welcomeOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            <Text
              className="text-center text-xl text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              Welcome to ConstructPro
            </Text>
            <Text
              className="mt-2 text-center text-sm text-neutral-600"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Your dashboard is ready. Explore tools and projects as we roll out new features.
            </Text>
            <Pressable
              onPress={dismissWelcome}
              className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-accent-600"
            >
              <Text
                className="text-base font-medium text-white"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Got it
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
