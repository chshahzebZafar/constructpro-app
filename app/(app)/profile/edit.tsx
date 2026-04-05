import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { COMPANY_SIZES, PROFILE_ROLES, roleIdFromStoredTitle } from '@/constants/profileOptions';
import { saveProfile } from '@/lib/profile/saveProfile';

export default function ProfileEditScreen() {
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const offlinePreviewUid = useAuthStore((s) => s.offlinePreviewUid);

  const storeProfileName = useAuthStore((s) => s.profileName);
  const storeCompany = useAuthStore((s) => s.companyName);
  const storeSize = useAuthStore((s) => s.companySize);
  const storeCountry = useAuthStore((s) => s.country);
  const [profileName, setProfileName] = useState(
    () => storeProfileName || user?.displayName || ''
  );
  const [companyName, setCompanyName] = useState(storeCompany);
  const [companySize, setCompanySize] = useState<string | null>(storeSize || null);
  const [country, setCountry] = useState(storeCountry);
  const [roleId, setRoleId] = useState<string | null>(() =>
    roleIdFromStoredTitle(useAuthStore.getState().role)
  );

  const [saving, setSaving] = useState(false);

  const uid = user?.uid ?? offlinePreviewUid ?? '';

  useEffect(() => {
    if (user) return;
    if (!temporaryDevLogin || !uid) return;
    let cancelled = false;
    void (async () => {
      const [pn, cn, cs, co, ro] = await AsyncStorage.multiGet([
        `profile_name_${uid}`,
        `company_name_${uid}`,
        `company_size_${uid}`,
        `company_country_${uid}`,
        `user_role_${uid}`,
      ]);
      if (cancelled) return;
      setProfileName(pn[1] ?? '');
      setCompanyName(cn[1] ?? '');
      setCompanySize(cs[1] || null);
      setCountry(co[1] ?? '');
      const rTitle = ro[1] ?? '';
      setRoleId(roleIdFromStoredTitle(rTitle));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, temporaryDevLogin, uid]);

  const onSave = async () => {
    if (!uid) {
      Alert.alert('Profile', 'You need an account to save your profile.');
      return;
    }
    const name = profileName.trim();
    if (!name) {
      Alert.alert('Name', 'Please enter your name.');
      return;
    }
    if (!companyName.trim()) {
      Alert.alert('Company', 'Please enter your company name.');
      return;
    }
    if (!companySize) {
      Alert.alert('Company size', 'Please select a company size.');
      return;
    }
    if (!roleId) {
      Alert.alert('Role', 'Please select your role.');
      return;
    }
    const roleTitle = PROFILE_ROLES.find((r) => r.id === roleId)!.title;

    setSaving(true);
    try {
      await saveProfile(
        uid,
        {
          profileName: name,
          companyName: companyName.trim(),
          companySize,
          country: country.trim(),
          role: roleTitle.trim(),
        },
        { syncFirebaseDisplayName: Boolean(user) && !temporaryDevLogin }
      );
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader title="Edit profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {temporaryDevLogin ? (
            <View className="mb-4 rounded-xl border border-warning-600 bg-warning-100 px-3 py-2">
              <Text className="text-xs text-neutral-800" style={{ fontFamily: 'Inter_400Regular' }}>
                Preview mode — saved on this device only (no Firebase sync).
              </Text>
            </View>
          ) : null}

          <Text
            className="mb-1.5 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Name
          </Text>
          <TextInput
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Your name"
            placeholderTextColor={Colors.neutral[500]}
            className="min-h-[52px] rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <Text
            className="mb-1.5 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Company name
          </Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Your company"
            placeholderTextColor={Colors.neutral[500]}
            className="min-h-[52px] rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <Text
            className="mb-2 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Company size
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {COMPANY_SIZES.map((s) => {
              const selected = companySize === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setCompanySize(s)}
                  className={`min-h-[48px] w-[47%] items-center justify-center rounded-xl border px-2 ${
                    selected ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                  }`}
                >
                  <Text
                    className="text-center text-sm text-brand-900"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            className="mb-1.5 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Country
          </Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. United Kingdom"
            placeholderTextColor={Colors.neutral[500]}
            className="min-h-[52px] rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />

          <Text
            className="mb-2 mt-6 text-[13px] text-neutral-700"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Role
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {PROFILE_ROLES.map((r) => {
              const selected = roleId === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRoleId(r.id)}
                  className={`min-h-[88px] w-[47%] rounded-xl border px-3 py-3 ${
                    selected ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                  }`}
                >
                  <Text className="text-2xl">{r.emoji}</Text>
                  <Text
                    className="mt-1 text-sm text-brand-900"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {r.title}
                  </Text>
                  <Text
                    className="text-xs text-neutral-500"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={2}
                  >
                    {r.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-10">
            <Button title="Save profile" loading={saving} onPress={() => void onSave()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
