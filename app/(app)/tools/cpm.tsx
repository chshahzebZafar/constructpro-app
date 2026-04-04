import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { calculateCpm } from '@/lib/cpm/calculateCpm';
import type { CpmActivity, CpmActivityResult } from '@/lib/cpm/types';
import {
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  listBudgetProjects,
  listCpmActivities,
  saveCpmActivities,
  setLastSelectedProjectId,
} from '@/lib/cpm/repository';

function rid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export default function CpmCalculatorScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [name, setName] = useState('');
  const [durationStr, setDurationStr] = useState('');
  const [selectedPreds, setSelectedPreds] = useState<string[]>([]);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const activitiesQuery = useQuery({
    queryKey: ['cpm', uid, selectedProjectId],
    queryFn: () => listCpmActivities(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  const activities = activitiesQuery.data ?? [];

  const cpmResult = useMemo(() => {
    if (activities.length === 0) return null;
    return calculateCpm(activities);
  }, [activities]);

  const resultById = useMemo(() => {
    const m = new Map<string, CpmActivityResult>();
    if (cpmResult?.ok) {
      for (const r of cpmResult.activities) m.set(r.id, r);
    }
    return m;
  }, [cpmResult]);

  useEffect(() => {
    const list = projectsQuery.data;
    if (!list?.length) {
      setSelectedProjectId(null);
      return;
    }
    void (async () => {
      const last = await getLastSelectedProjectId();
      setSelectedProjectId((cur) => {
        if (cur && list.some((p) => p.id === cur)) return cur;
        if (last && list.some((p) => p.id === last)) return last;
        return list[0].id;
      });
    })();
  }, [projectsQuery.data]);

  useEffect(() => {
    if (selectedProjectId) void setLastSelectedProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['budget-projects', uid] });
    void queryClient.invalidateQueries({ queryKey: ['cpm', uid] });
  }, [queryClient, uid]);

  const createProjectMut = useMutation({
    mutationFn: (n: string) => createBudgetProject(n),
    onSuccess: (p) => {
      invalidate();
      setSelectedProjectId(p.id);
      setProjectModal(false);
      setNewProjectName('');
    },
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => deleteBudgetProject(id),
    onSuccess: (_, id) => {
      invalidate();
      if (selectedProjectId === id) setSelectedProjectId(null);
    },
  });

  const saveActivitiesMut = useMutation({
    mutationFn: async (next: CpmActivity[]) => {
      if (!selectedProjectId) throw new Error('Select a project.');
      await saveCpmActivities(selectedProjectId, next);
    },
    onSuccess: invalidate,
  });

  const predOptions = useMemo(() => {
    return activities.filter((a) => a.id !== editingId);
  }, [activities, editingId]);

  const togglePred = (pid: string) => {
    setSelectedPreds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setDurationStr('5');
    setSelectedPreds([]);
    setFormModal(true);
  };

  const openEdit = (a: CpmActivity) => {
    setEditingId(a.id);
    setName(a.name);
    setDurationStr(String(a.durationDays));
    setSelectedPreds([...a.predecessorIds]);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  const commitForm = () => {
    if (!selectedProjectId) return;
    const dur = parseFloat(durationStr.replace(',', '.'));
    if (!name.trim()) {
      Alert.alert('Name', 'Enter an activity name.');
      return;
    }
    if (!Number.isFinite(dur) || dur <= 0) {
      Alert.alert('Duration', 'Enter a duration greater than zero (days).');
      return;
    }

    if (editingId) {
      const next = activities.map((a) =>
        a.id === editingId
          ? { ...a, name: name.trim(), durationDays: dur, predecessorIds: [...selectedPreds] }
          : a
      );
      saveActivitiesMut.mutate(next, { onSuccess: closeForm });
    } else {
      const row: CpmActivity = {
        id: rid(),
        name: name.trim(),
        durationDays: dur,
        predecessorIds: [...selectedPreds],
      };
      saveActivitiesMut.mutate([...activities, row], { onSuccess: closeForm });
    }
  };

  const confirmDelete = (a: CpmActivity) => {
    if (!selectedProjectId) return;
    Alert.alert('Delete activity', `Remove “${a.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const next = activities
            .filter((x) => x.id !== a.id)
            .map((x) => ({
              ...x,
              predecessorIds: x.predecessorIds.filter((p) => p !== a.id),
            }));
          saveActivitiesMut.mutate(next);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="CPM calculator" level="Advanced" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to model activities and the critical path.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || activitiesQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void activitiesQuery.refetch();
                }}
              />
            }
            ListHeaderComponent={
              projectsQuery.isLoading ? (
                <View className="py-8">
                  <ActivityIndicator color={Colors.brand[700]} />
                </View>
              ) : projects.length === 0 ? (
                <View className="pb-4 pt-2">
                  <Text className="mb-3 text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    Create a project first.
                  </Text>
                  <Button title="New project" onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                <View className="pb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      Project
                    </Text>
                    <Pressable onPress={() => setProjectModal(true)} className="rounded-lg bg-brand-100 px-3 py-2">
                      <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        + New
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row flex-wrap gap-2">
                      {projects.map((p) => (
                        <View key={p.id} className="flex-row items-center">
                          <Pressable
                            onPress={() => setSelectedProjectId(p.id)}
                            className="rounded-full border px-3 py-2"
                            style={{
                              borderColor: selectedProjectId === p.id ? Colors.brand[700] : Colors.neutral[300],
                              backgroundColor: selectedProjectId === p.id ? Colors.brand[100] : '#fff',
                            }}
                          >
                            <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                              {p.name}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              Alert.alert('Delete project?', p.name, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteProjectMut.mutate(p.id) },
                              ])
                            }
                            className="ml-1 p-1"
                          >
                            <Ionicons name="trash-outline" size={18} color={Colors.neutral[500]} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    Finish-to-start, zero lag · durations in working days
                  </Text>

                  {cpmResult && !cpmResult.ok ? (
                    <View
                      className="mt-3 rounded-xl border p-3"
                      style={{ borderColor: Colors.danger[100], backgroundColor: Colors.danger[100] }}
                    >
                      <Text style={{ fontFamily: 'Inter_500Medium', color: Colors.danger[600] }}>
                        {cpmResult.error}
                      </Text>
                    </View>
                  ) : null}

                  {cpmResult?.ok ? (
                    <View className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3">
                      <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                        Project length: {fmt(cpmResult.projectDurationDays)} days
                      </Text>
                      <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        Critical path (total float ≈ 0) marked below.
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : activitiesQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  No activities yet.
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => {
              const r = resultById.get(item.id);
              const critical = r?.critical;
              return (
                <Pressable
                  onPress={() => openEdit(item)}
                  className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-90"
                  style={critical ? { borderColor: Colors.brand[700], backgroundColor: Colors.brand[100] } : undefined}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="mr-2 flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                          {item.name}
                        </Text>
                        {critical ? (
                          <Text
                            className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] text-white"
                            style={{ fontFamily: 'Inter_500Medium' }}
                          >
                            Critical
                          </Text>
                        ) : null}
                      </View>
                      <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        Duration {fmt(item.durationDays)} d
                        {item.predecessorIds.length > 0
                          ? ` · After: ${item.predecessorIds.map((id) => activities.find((x) => x.id === id)?.name ?? id).join(', ')}`
                          : ''}
                      </Text>
                      {r ? (
                        <Text className="mt-2 text-xs text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                          ES {fmt(r.es)} · EF {fmt(r.ef)} · LS {fmt(r.ls)} · LF {fmt(r.lf)} · Float {fmt(r.totalFloat)}
                        </Text>
                      ) : cpmResult && !cpmResult.ok ? null : (
                        <Text className="mt-1 text-xs text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
                          Add activities to compute schedule.
                        </Text>
                      )}
                    </View>
                    <Pressable onPress={() => confirmDelete(item)} className="p-2">
                      <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title="Add activity" onPress={openAdd} />
            </View>
          ) : null}
        </>
      )}

      <Modal visible={projectModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => setProjectModal(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              New project
            </Text>
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Name"
              className="mb-4 rounded-xl border border-neutral-300 px-3 py-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Button
              title="Create"
              loading={createProjectMut.isPending}
              onPress={() => createProjectMut.mutate(newProjectName)}
            />
            <Pressable onPress={() => setProjectModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={formModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={closeForm} />
          <View className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editingId ? 'Edit activity' : 'New activity'}
              </Text>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Duration (working days)
              </Text>
              <TextInput
                value={durationStr}
                onChangeText={setDurationStr}
                keyboardType="decimal-pad"
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              {predOptions.length > 0 ? (
                <>
                  <Text className="mb-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    Predecessors (finish-to-start)
                  </Text>
                  {predOptions.map((p) => {
                    const on = selectedPreds.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => togglePred(p.id)}
                        className="mb-2 flex-row items-center rounded-xl border px-3 py-2"
                        style={{
                          borderColor: on ? Colors.brand[700] : Colors.neutral[300],
                          backgroundColor: on ? Colors.brand[100] : '#fff',
                        }}
                      >
                        <Ionicons
                          name={on ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={on ? Colors.brand[700] : Colors.neutral[500]}
                        />
                        <Text className="ml-2 flex-1 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <Text className="mb-3 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {editingId ? 'No other activities to link.' : 'Save this activity, then add more to chain predecessors.'}
                </Text>
              )}
            </ScrollView>
            <Button title="Save" loading={saveActivitiesMut.isPending} onPress={commitForm} />
            <Pressable onPress={closeForm} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
