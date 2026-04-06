import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.1.0';

/** Shown on Support / About. */
export const SUPPORT_EMAIL = 'shahzaibzafar093@gmail.com';

/**
 * Optional public URLs for the Play Store / website (same host as Play listing is ideal).
 * Set via EXPO_PUBLIC_PRIVACY_POLICY_URL and EXPO_PUBLIC_TERMS_OF_USE_URL in .env for production builds.
 */
export const PRIVACY_POLICY_URL = (process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '').trim();
export const TERMS_OF_USE_URL = (process.env.EXPO_PUBLIC_TERMS_OF_USE_URL ?? '').trim();
