import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function AppLayout() {
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
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <Ionicons name="hammer-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <Ionicons name="folder-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
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
          title: 'Me',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
