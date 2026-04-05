import { useCallback, useEffect, useState } from 'react';
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
import { YmdDateField } from '@/components/forms/YmdDateField';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  addMilestone,
  createBudgetProject,
  deleteBudgetProject,
  deleteMilestone,
  getLastSelectedProjectId,
  listBudgetProjects,
  listMilestones,
  setLastSelectedProjectId,
  updateMilestone,
} from '@/lib/milestones/repository';
import type { Milestone } from '@/lib/milestones/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';

export default function MilestoneTrackerScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [title, setTitle] = useState('');
  const [planned, setPlanned] = useState('');
  const [forecast, setForecast] = useState('');
  const [actual, setActual] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['milestones', uid, selectedProjectId],
    queryFn: () => listMilestones(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

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
    invalidateSharedProjectQueries(queryClient, uid);
    void queryClient.invalidateQueries({ queryKey: ['milestones', uid] });
  }, [queryClient, uid]);

  const createProjectMut = useMutation({
    mutationFn: (name: string) => createBudgetProject(name),
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

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Select a project.');
      const row = {
        title: title.trim(),
        plannedDate: planned.trim(),
        forecastDate: forecast.trim(),
        actualDate: actual.trim(),
      };
      if (!row.title || !row.plannedDate) throw new Error('Title and planned date are required.');
      if (editing) {
        await updateMilestone(selectedProjectId, editing.id, row);
      } else {
        await addMilestone(selectedProjectId, row);
      }
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteMilestone(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setPlanned('');
    setForecast('');
    setActual('');
    setItemModal(true);
  };

  const openEdit = (m: Milestone) => {
    setEditing(m);
    setTitle(m.title);
    setPlanned(m.plannedDate);
    setForecast(m.forecastDate);
    setActual(m.actualDate);
    setItemModal(true);
  };

  const closeModal = () => {
    setItemModal(false);
    setEditing(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Milestone tracker" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to track milestones.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={itemsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || itemsQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void itemsQuery.refetch();
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
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteProjectMut.mutate(p.id),
                                },
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
                    Tap fields to pick dates. Stored on device.
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  No milestones yet.
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => {
              const late = !item.actualDate && item.plannedDate < today;
              return (
                <Pressable
                  onPress={() => openEdit(item)}
                  className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        {item.title}
                      </Text>
                      <Text className="mt-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        Planned {item.plannedDate}
                        {item.forecastDate ? ` · Forecast ${item.forecastDate}` : ''}
                        {item.actualDate ? ` · Actual ${item.actualDate}` : ''}
                      </Text>
                      {late ? (
                        <Text className="mt-1 text-xs" style={{ fontFamily: 'Inter_500Medium', color: Colors.warning[600] }}>
                          Behind planned date
                        </Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => deleteItemMut.mutate({ pid: selectedProjectId!, id: item.id })}>
                      <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View className="border-t border-neutral-200 bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Button title="Add milestone" onPress={openAdd} />
            </View>
          ) : null}
        </>
      )}

      <Modal visible={projectModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
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
            <Button title="Create" loading={createProjectMut.isPending} onPress={() => createProjectMut.mutate(newProjectName)} />
            <Pressable onPress={() => setProjectModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={itemModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={closeModal} />
          <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editing ? 'Edit milestone' : 'New milestone'}
              </Text>
              <View className="mb-3">
                <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
              <YmdDateField label="Planned date" value={planned} onChange={setPlanned} />
              <YmdDateField label="Forecast (optional)" value={forecast} onChange={setForecast} optional />
              <YmdDateField label="Actual (optional)" value={actual} onChange={setActual} optional />
            </ScrollView>
            <Button title="Save" loading={saveMut.isPending} onPress={() => saveMut.mutate()} />
            <Pressable onPress={closeModal} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
