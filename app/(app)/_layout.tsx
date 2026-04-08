import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useI18n } from '@/hooks/useI18n';

export default function AppLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.neutral[300],
          borderTopWidth: 0.5,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.brand[900],
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter_500Medium',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabs.tools'),
          tabBarIcon: ({ color }) => <Ionicons name="hammer-outline" size={22} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(app)/tools');
          },
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t('tabs.projects'),
          tabBarIcon: ({ color }) => <Ionicons name="folder-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: t('tabs.calculator'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="calculator-outline" size={22} color={color} />
          ),
        }}
      />
      {/*
        Safety tab removed from the bar — replaced by Calculator. HSE tools live under Tools → Safety.
        Route app/(app)/safety.tsx stays available (hidden) for deep links / future use.
      */}
      <Tabs.Screen name="safety" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="quick-notes" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
