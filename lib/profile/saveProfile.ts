import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { updateProfileDisplayName } from '@/lib/firebase/auth';

export type ProfileFieldValues = {
  profileName: string;
  companyName: string;
  companySize: string;
  country: string;
  role: string;
};

const KEYS = (uid: string) =>
  ({
    profileName: `profile_name_${uid}`,
    companyName: `company_name_${uid}`,
    companySize: `company_size_${uid}`,
    country: `company_country_${uid}`,
    role: `user_role_${uid}`,
  }) as const;

export async function persistProfileToDevice(uid: string, values: ProfileFieldValues): Promise<void> {
  const k = KEYS(uid);
  const trimmed: ProfileFieldValues = {
    profileName: values.profileName.trim(),
    companyName: values.companyName.trim(),
    companySize: values.companySize.trim(),
    country: values.country.trim(),
    role: values.role.trim(),
  };

  await AsyncStorage.multiSet([
    [k.profileName, trimmed.profileName],
    [k.companyName, trimmed.companyName],
    [k.companySize, trimmed.companySize],
    [k.country, trimmed.country],
    [k.role, trimmed.role],
  ]);

  useAuthStore.getState().setOnboarding({
    profileName: trimmed.profileName,
    companyName: trimmed.companyName,
    companySize: trimmed.companySize,
    country: trimmed.country,
    role: trimmed.role,
  });
}

/** After local persist, sync display name to Firebase when applicable. */
export async function saveProfile(
  uid: string,
  values: ProfileFieldValues,
  opts: { syncFirebaseDisplayName: boolean }
): Promise<void> {
  await persistProfileToDevice(uid, values);
  if (opts.syncFirebaseDisplayName && values.profileName.trim().length > 0) {
    await updateProfileDisplayName(values.profileName.trim());
  }
}
