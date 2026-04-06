import 'react-native-reanimated';
import 'react-native-gesture-handler';
import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listenToAuth } from '../lib/firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import { ErrorBoundary } from '../components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function RootLayoutInner() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const unsub = listenToAuth((user) => {
      // Set user + hydrated immediately so routes like / see isAuthenticated before
      // AsyncStorage resolves. Otherwise login → router.replace('/') races Index,
      // which still has user=null and Redirects back to login.
      if (user) {
        useAuthStore.setState({ temporaryDevLogin: false, offlinePreviewUid: null, profileHydrated: false });
      } else if (!useAuthStore.getState().temporaryDevLogin) {
        useAuthStore.setState({
          onboardingComplete: false,
          profileName: '',
          companyName: '',
          companySize: '',
          country: '',
          role: '',
          currencyCode: 'USD',
          profileHydrated: true,
        });
      } else {
        useAuthStore.setState({ profileHydrated: true });
      }
      setUser(user);
      setHydrated(true);

      if (user) {
        void (async () => {
          try {
            const done = await AsyncStorage.getItem(`onboarding_complete_${user.uid}`);
            const storedProfileName = await AsyncStorage.getItem(`profile_name_${user.uid}`);
            const profileName = storedProfileName ?? user.displayName ?? '';
            const companyName = (await AsyncStorage.getItem(`company_name_${user.uid}`)) ?? '';
            const companySize = (await AsyncStorage.getItem(`company_size_${user.uid}`)) ?? '';
            const country = (await AsyncStorage.getItem(`company_country_${user.uid}`)) ?? '';
            const role = (await AsyncStorage.getItem(`user_role_${user.uid}`)) ?? '';
            const currencyCode = (await AsyncStorage.getItem(`user_currency_${user.uid}`)) ?? 'USD';
            useAuthStore.setState({
              onboardingComplete: done === 'true',
              profileName,
              companyName,
              companySize,
              country,
              role,
              currencyCode,
              profileHydrated: true,
            });
          } catch {
            useAuthStore.setState({ profileHydrated: true });
          }
        })();
      }
    });
    return () => unsub();
  }, [setUser, setHydrated]);

  useEffect(() => {
    if (fontsLoaded && hydrated && !isLoading) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, hydrated, isLoading]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutInner />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
