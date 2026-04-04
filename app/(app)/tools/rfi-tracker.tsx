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
import {
  addRfi,
  createBudgetProject,
  deleteBudgetProject,
  deleteRfi,
  getLastSelectedProjectId,
  listBudgetProjects,
  listRfis,
  setLastSelectedProjectId,
  updateRfi,
} from '@/lib/rfi/repository';
import { RFI_STATUSES, RFI_STATUS_LABELS, type RfiItem, type RfiStatus } from '@/lib/rfi/types';

type Filter = 'all' | RfiStatus;

export default function RfiTrackerScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [rfiNumber, setRfiNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [dateRaised, setDateRaised] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<RfiStatus>('open');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [toParty, setToParty] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['rfi', uid, selectedProjectId],
    queryFn: () => listRfis(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  const items = itemsQuery.data ?? [];
  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

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
    void queryClient.invalidateQueries({ queryKey: ['rfi', uid] });
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

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Select a project.');
      if (!rfiNumber.trim() || !subject.trim() || !dateRaised.trim() || !question.trim()) {
        throw new Error('RFI #, subject, date raised, and question are required.');
      }
      const row = {
        rfiNumber: rfiNumber.trim(),
        subject: subject.trim(),
        dateRaised: dateRaised.trim(),
        dueDate: dueDate.trim(),
        status,
        question: question.trim(),
        response: response.trim(),
        toParty: toParty.trim(),
      };
      if (editingId) await updateRfi(selectedProjectId, editingId, row);
      else await addRfi(selectedProjectId, row);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e) => Alert.alert('Form', e instanceof Error ? e.message : 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteRfi(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditingId(null);
    setRfiNumber(`RFI-${Date.now().toString(36).toUpperCase().slice(-4)}`);
    setSubject('');
    setDateRaised(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setStatus('open');
    setQuestion('');
    setResponse('');
    setToParty('');
    setFormModal(true);
  };

  const openEdit = (r: RfiItem) => {
    setEditingId(r.id);
    setRfiNumber(r.rfiNumber);
    setSubject(r.subject);
    setDateRaised(r.dateRaised);
    setDueDate(r.dueDate);
    setStatus(r.status);
    setQuestion(r.question);
    setResponse(r.response);
    setToParty(r.toParty);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="RFI tracker" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to track RFIs.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
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
                    Create a project to attach RFIs.
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
                    Stored on device
                  </Text>
                  <Text className="mb-2 mt-3 text-xs text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
                    Status filter
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {(['all', ...RFI_STATUSES] as const).map((f) => (
                        <Pressable
                          key={f}
                          onPress={() => setFilter(f)}
                          className="rounded-full border px-3 py-1.5"
                          style={{
                            borderColor: filter === f ? Colors.brand[700] : Colors.neutral[300],
                            backgroundColor: filter === f ? Colors.brand[100] : '#fff',
                          }}
                        >
                          <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                            {f === 'all' ? 'All' : RFI_STATUS_LABELS[f]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {items.length === 0 ? 'No RFIs yet.' : 'No RFIs match this filter.'}
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => {
              const overdue = item.dueDate && item.dueDate < today && item.status !== 'closed' && item.status !== 'answered';
              return (
                <Pressable
                  onPress={() => openEdit(item)}
                  className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-90"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {RFI_STATUS_LABELS[item.status]}
                      </Text>
                      <Text className="mt-1 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        {item.rfiNumber} · {item.subject}
                      </Text>
                      <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        Raised {item.dateRaised}
                        {item.dueDate ? ` · Due ${item.dueDate}` : ''}
                        {item.toParty ? ` · To: ${item.toParty}` : ''}
                      </Text>
                      {overdue ? (
                        <Text className="mt-1 text-xs" style={{ fontFamily: 'Inter_500Medium', color: Colors.danger[600] }}>
                          Past due date
                        </Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => deleteMut.mutate({ pid: selectedProjectId!, id: item.id })}>
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
              <Button title="New RFI" onPress={openAdd} />
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
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={formModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={closeForm} />
          <View className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editingId ? 'Edit RFI' : 'New RFI'}
              </Text>
              {[
                ['RFI number', rfiNumber, setRfiNumber],
                ['Subject', subject, setSubject],
                ['Date raised (YYYY-MM-DD)', dateRaised, setDateRaised],
                ['Due date (optional)', dueDate, setDueDate],
                ['To (consultant / trade)', toParty, setToParty],
              ].map(([label, val, set]) => (
                <View key={String(label)} className="mb-3">
                  <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    {label as string}
                  </Text>
                  <TextInput
                    value={val as string}
                    onChangeText={set as (t: string) => void}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              ))}
              <Text className="mb-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Status
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {RFI_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: status === s ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: status === s ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {RFI_STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Question / clarification needed
              </Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                multiline
                className="mb-3 min-h-[100px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Response (when received)
              </Text>
              <TextInput
                value={response}
                onChangeText={setResponse}
                multiline
                className="mb-4 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ScrollView>
            <Button title="Save" loading={saveMut.isPending} onPress={() => saveMut.mutate()} />
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
