import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrated = useAuthStore((s) => s.hydrated);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const profileHydrated = useAuthStore((s) => s.profileHydrated);

  if (!hydrated || isLoading) {
    return null;
  }

  if (!user && !temporaryDevLogin) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user && !temporaryDevLogin && !profileHydrated) {
    return null;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/step-1" />;
  }

  return <Redirect href="/(app)" />;
}
