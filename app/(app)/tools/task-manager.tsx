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
  addTask,
  createBudgetProject,
  deleteBudgetProject,
  deleteTask,
  getLastSelectedProjectId,
  listBudgetProjects,
  listTasks,
  setLastSelectedProjectId,
  updateTask,
} from '@/lib/tasks/repository';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';

export default function TaskManagerScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [due, setDue] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const tasksQuery = useQuery({
    queryKey: ['tasks', uid, selectedProjectId],
    queryFn: () => listTasks(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['tasks', uid] });
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

  const addTaskMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Select a project.');
      if (!taskTitle.trim()) throw new Error('Enter a task.');
      await addTask(selectedProjectId, taskTitle, due);
    },
    onSuccess: () => {
      invalidate();
      setTaskModal(false);
      setTaskTitle('');
      setDue('');
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      selectedProjectId ? updateTask(selectedProjectId, id, { done }) : Promise.resolve(),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteTask(pid, id),
    onSuccess: invalidate,
  });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Task manager" level="Basic" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to manage tasks.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={tasksQuery.data ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || tasksQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void tasksQuery.refetch();
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
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>Project</Text>
                    <Pressable onPress={() => setProjectModal(true)} className="rounded-lg bg-brand-100 px-3 py-2">
                      <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>+ New</Text>
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
                            <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>{p.name}</Text>
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
                    Simple list (not Kanban) · on device
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : tasksQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>No tasks yet.</Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-2 flex-row items-center rounded-2xl border border-neutral-200 bg-white px-3 py-3">
                <Pressable
                  onPress={() =>
                    selectedProjectId &&
                    toggleMut.mutate({ id: item.id, done: !item.done })
                  }
                  className="mr-3"
                >
                  <Ionicons
                    name={item.done ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={item.done ? Colors.success[600] : Colors.neutral[500]}
                  />
                </Pressable>
                <View className="flex-1">
                  <Text
                    className="text-base text-brand-900"
                    style={{
                      fontFamily: 'Inter_500Medium',
                      textDecorationLine: item.done ? 'line-through' : 'none',
                      opacity: item.done ? 0.6 : 1,
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.dueDate ? (
                    <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>Due {item.dueDate}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => selectedProjectId && deleteMut.mutate({ pid: selectedProjectId, id: item.id })}>
                  <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                </Pressable>
              </View>
            )}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View className="border-t border-neutral-200 bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Button title="Add task" onPress={() => setTaskModal(true)} />
            </View>
          ) : null}
        </>
      )}

      <Modal visible={projectModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setProjectModal(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>New project</Text>
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

      <Modal visible={taskModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setTaskModal(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>New task</Text>
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Title</Text>
            <TextInput
              value={taskTitle}
              onChangeText={setTaskTitle}
              className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <View className="mb-4">
              <YmdDateField label="Due date (optional)" value={due} onChange={setDue} optional />
            </View>
            <Button title="Add" loading={addTaskMut.isPending} onPress={() => addTaskMut.mutate()} />
            <Pressable onPress={() => setTaskModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
