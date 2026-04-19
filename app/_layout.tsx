import 'react-native-reanimated';
import 'react-native-gesture-handler';
import '../global.css';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
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
import { normalizeLanguageCode } from '@/lib/i18n/translations';
import {
  configureNotificationChannels,
  configureNotificationsRuntime,
  mergePresentedTrayIntoHistory,
  refreshNotificationSchedulesForUser,
  subscribeNotificationInboxCapture,
} from '@/lib/notifications/service';
import { OnlineSyncBridge } from '@/components/OnlineSyncBridge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  debug: false,
});

function RootLayoutInner() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profileHydrated = useAuthStore((s) => s.profileHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    void configureNotificationsRuntime();
    void configureNotificationChannels();
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    void subscribeNotificationInboxCapture().then((fn) => {
      dispose = fn;
    });
    return () => {
      dispose?.();
    };
  }, []);

  /** Reschedule local notifications with fresh task/permit/milestone/budget copy when profile is ready. */
  useEffect(() => {
    if (!profileHydrated) return;
    const uid = useAuthStore.getState().user?.uid ?? useAuthStore.getState().offlinePreviewUid ?? '';
    if (!uid) return;
    void refreshNotificationSchedulesForUser(uid, { force: true });
  }, [profileHydrated, hydrated]);

  /** Refresh dynamic notification bodies when returning to the app (throttled internally). */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        const uid = useAuthStore.getState().user?.uid ?? useAuthStore.getState().offlinePreviewUid ?? '';
        if (!uid) return;
        void refreshNotificationSchedulesForUser(uid, { force: false });
        void mergePresentedTrayIntoHistory(uid);
      }
    });
    return () => sub.remove();
  }, []);

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
          languageCode: 'en',
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
            const languageCode = normalizeLanguageCode(
              (await AsyncStorage.getItem(`user_language_${user.uid}`)) ?? 'en'
            );
            useAuthStore.setState({
              onboardingComplete: done === 'true',
              profileName,
              companyName,
              companySize,
              country,
              role,
              currencyCode,
              languageCode,
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

function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <OnlineSyncBridge />
          <RootLayoutInner />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
