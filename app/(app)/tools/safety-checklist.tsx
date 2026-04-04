import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { SAFETY_CHECKLIST_SECTIONS, allChecklistItemIds } from '@/lib/safety/checklistData';
import {
  computeScore,
  loadChecklist,
  saveChecklist,
  type SafetyChecklistPersist,
} from '@/lib/safety/checklistStorage';

const TOOL_KEY = 'safety-checklist';

export default function SafetyChecklistScreen() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [inspectionDate, setInspectionDate] = useState<string>('');

  const ids = useMemo(() => allChecklistItemIds(), []);

  const dataQuery = useQuery({
    queryKey: [TOOL_KEY, uid],
    queryFn: async () => {
      if (!uid) return null;
      const existing = await loadChecklist(uid);
      if (existing) return existing;
      const init: SafetyChecklistPersist = {
        checked: Object.fromEntries(ids.map((id) => [id, false])),
        inspectionDate: new Date().toISOString().slice(0, 10),
      };
      await saveChecklist(uid, init);
      return init;
    },
    enabled: Boolean(uid),
  });

  useEffect(() => {
    const d = dataQuery.data;
    if (!d) return;
    setChecked(d.checked);
    setInspectionDate(d.inspectionDate);
  }, [dataQuery.data]);

  const score = useMemo(() => computeScore(checked, ids), [checked, ids]);

  const persist = useCallback(async () => {
    if (!uid) return;
    await saveChecklist(uid, { checked, inspectionDate });
    void queryClient.invalidateQueries({ queryKey: [TOOL_KEY, uid] });
  }, [uid, checked, inspectionDate, queryClient]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = async () => {
    if (!uid) return;
    const fresh: SafetyChecklistPersist = {
      checked: Object.fromEntries(ids.map((id) => [id, false])),
      inspectionDate: new Date().toISOString().slice(0, 10),
    };
    setChecked(fresh.checked);
    setInspectionDate(fresh.inspectionDate);
    await saveChecklist(uid, fresh);
    void queryClient.invalidateQueries({ queryKey: [TOOL_KEY, uid] });
  };

  if (!uid) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenHeader title="Site safety checklist" level="Basic" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to save checklist progress.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Site safety checklist" level="Basic" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={dataQuery.isFetching} onRefresh={() => void dataQuery.refetch()} />
        }
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20, paddingTop: 12 }}
      >
        <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <Text className="text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Inspection date: {inspectionDate || '—'}
          </Text>
          <Text
            className="mt-2 text-2xl text-brand-900"
            style={{ fontFamily: 'Poppins_700Bold' }}
          >
            {score.percent}% passed
          </Text>
          <Text className="mt-1 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            {score.passed} / {score.total} items
          </Text>
        </View>

        {SAFETY_CHECKLIST_SECTIONS.map((section) => (
          <View key={section.id} className="mb-4">
            <Text
              className="mb-2 text-sm text-brand-900"
              style={{ fontFamily: 'Poppins_700Bold' }}
            >
              {section.title}
            </Text>
            {section.items.map((item) => {
              const isOn = Boolean(checked[item.id]);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  className="mb-2 flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-3 active:opacity-90"
                >
                  <Ionicons
                    name={isOn ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isOn ? Colors.success[600] : Colors.neutral[500]}
                  />
                  <Text
                    className="ml-3 flex-1 text-sm text-neutral-800"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Button title="Save progress" onPress={() => void persist()} />
        <View className="h-3" />
        <Button title="New inspection (reset all)" variant="outline" onPress={handleReset} />
      </ScrollView>
    </SafeAreaView>
  );
}
