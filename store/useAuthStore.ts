import { create } from 'zustand';
import type { User } from 'firebase/auth';

/** Stable id for AsyncStorage when using dev preview (no Firebase user). */
export const OFFLINE_PREVIEW_UID = '__local_preview__';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hydrated: boolean;
  /** Dev-only: browse without Firebase (see login). */
  temporaryDevLogin: boolean;
  /** Set with temporaryDevLogin so onboarding can save to AsyncStorage without Firebase uid. */
  offlinePreviewUid: string | null;
  /** Display name; device + optional Firebase profile. */
  profileName: string;
  companyName: string;
  companySize: string;
  country: string;
  role: string;
  currencyCode: string;
  languageCode: string;
  onboardingComplete: boolean;
  /** True after AsyncStorage profile/onboarding keys are loaded for the current Firebase user. */
  profileHydrated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboarding: (data: Partial<AuthState>) => void;
  setHydrated: (v: boolean) => void;
  /** __DEV__ only — goes to onboarding first. */
  enterTemporaryDevLogin: () => void;
  exitTemporaryDevLogin: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hydrated: false,
  temporaryDevLogin: false,
  offlinePreviewUid: null,
  profileName: '',
  companyName: '',
  companySize: '',
  country: '',
  role: '',
  currencyCode: 'USD',
  languageCode: 'en',
  onboardingComplete: false,
  profileHydrated: false,
  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: Boolean(user) || state.temporaryDevLogin,
      isLoading: false,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboarding: (data) => set(data),
  setHydrated: (hydrated) => set({ hydrated }),
  enterTemporaryDevLogin: () => {
    if (!__DEV__) return;
    set({
      temporaryDevLogin: true,
      offlinePreviewUid: OFFLINE_PREVIEW_UID,
      onboardingComplete: false,
      profileHydrated: true,
      profileName: '',
      companyName: '',
      companySize: '',
      country: '',
      role: '',
      currencyCode: 'USD',
      languageCode: 'en',
      isAuthenticated: true,
      isLoading: false,
      hydrated: true,
    });
  },
  exitTemporaryDevLogin: () => {
    set({
      temporaryDevLogin: false,
      offlinePreviewUid: null,
      onboardingComplete: false,
      profileHydrated: true,
      profileName: '',
      companyName: '',
      companySize: '',
      country: '',
      role: '',
      currencyCode: 'USD',
      languageCode: 'en',
      isAuthenticated: false,
    });
  },
}));
