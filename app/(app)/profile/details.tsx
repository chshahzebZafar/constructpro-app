import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, OFFLINE_PREVIEW_UID } from '@/store/useAuthStore';
import { ProfileScreenHeader } from '@/components/profile/ProfileScreenHeader';
import { Card } from '@/components/ui/Card';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-neutral-100 py-3.5 last:border-b-0">
      <Text
        className="text-[11px] uppercase tracking-wide text-neutral-500"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 text-base text-neutral-900"
        style={{ fontFamily: 'Inter_400Regular' }}
        selectable
      >
        {value || '—'}
      </Text>
    </View>
  );
}

export default function ProfileDetailsScreen() {
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const offlinePreviewUid = useAuthStore((s) => s.offlinePreviewUid);
  const profileName = useAuthStore((s) => s.profileName);
  const companyName = useAuthStore((s) => s.companyName);
  const companySize = useAuthStore((s) => s.companySize);
  const country = useAuthStore((s) => s.country);
  const role = useAuthStore((s) => s.role);

  const [previewRows, setPreviewRows] = useState({
    profileName: '',
    companyName: '',
    companySize: '',
    country: '',
    role: '',
  });

  useEffect(() => {
    if (user || !temporaryDevLogin) return;
    const uid = offlinePreviewUid ?? OFFLINE_PREVIEW_UID;
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
      setPreviewRows({
        profileName: pn[1] ?? '',
        companyName: cn[1] ?? '',
        companySize: cs[1] ?? '',
        country: co[1] ?? '',
        role: ro[1] ?? '',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, temporaryDevLogin, offlinePreviewUid]);

  const rows = useMemo(() => {
    if (user) {
      const name = profileName.trim() || user.displayName || '—';
      const created = user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—';
      return {
        name,
        email: user.email ?? '—',
        userId: user.uid,
        companyName: companyName || '—',
        companySize: companySize || '—',
        country: country || '—',
        role: role || '—',
        created,
      };
    }
    return {
      name: previewRows.profileName.trim() || 'Preview user',
      email: 'dev@preview.local',
      userId: OFFLINE_PREVIEW_UID,
      companyName: previewRows.companyName || '—',
      companySize: previewRows.companySize || '—',
      country: previewRows.country || '—',
      role: previewRows.role || '—',
      created: '—',
    };
  }, [user, profileName, companyName, companySize, country, role, previewRows]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom', 'left', 'right']}>
      <ProfileScreenHeader
        title="Profile details"
        rightSlot={
          <Pressable
            onPress={() => router.push('/(app)/profile/edit')}
            hitSlop={10}
            className="px-1 py-1"
            accessibilityLabel="Edit profile"
          >
            <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_600SemiBold' }}>
              Edit
            </Text>
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {temporaryDevLogin ? (
          <View className="mb-4 rounded-xl border border-warning-600 bg-warning-100 px-3 py-2">
            <Text className="text-xs text-neutral-800" style={{ fontFamily: 'Inter_400Regular' }}>
              Preview mode — profile is stored on this device only.
            </Text>
          </View>
        ) : null}

        <Card className="p-0 px-4">
          <Row label="Name" value={rows.name} />
          <Row label="Email" value={rows.email} />
          <Row label="Company" value={rows.companyName} />
          <Row label="Company size" value={rows.companySize} />
          <Row label="Country" value={rows.country} />
          <Row label="Role" value={rows.role} />
          <Row label="User ID" value={rows.userId} />
          <Row label="Account created" value={rows.created} />
        </Card>

        <Pressable
          onPress={() => router.push('/(app)/profile/edit')}
          className="mt-6 items-center rounded-2xl border border-brand-200 bg-brand-100 py-3.5 active:opacity-90"
        >
          <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_600SemiBold' }}>
            Edit profile
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
