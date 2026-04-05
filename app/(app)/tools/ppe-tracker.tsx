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
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  addPpe,
  createBudgetProject,
  deleteBudgetProject,
  deletePpe,
  getLastSelectedProjectId,
  listBudgetProjects,
  listPpe,
  setLastSelectedProjectId,
  updatePpe,
} from '@/lib/ppe/repository';
import type { PpeItem } from '@/lib/ppe/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';

const CATS = ['Helmet', 'Hi-vis', 'Gloves', 'Footwear', 'Harness', 'Eye', 'Hearing', 'Respiratory', 'Other'] as const;

export default function PpeTrackerScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editing, setEditing] = useState<PpeItem | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [qty, setQty] = useState('1');
  const [issued, setIssued] = useState('');
  const [expiry, setExpiry] = useState('');
  const [notes, setNotes] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['ppe', uid, selectedProjectId],
    queryFn: () => listPpe(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['ppe', uid] });
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
      const q = Math.max(0, parseInt(qty.replace(/,/g, ''), 10) || 0);
      const row = {
        name: name.trim(),
        category,
        quantity: q,
        issuedDate: issued.trim(),
        expiryDate: expiry.trim(),
        notes: notes.trim(),
      };
      if (!row.name) throw new Error('Enter item name.');
      if (editing) await updatePpe(selectedProjectId, editing.id, row);
      else await addPpe(selectedProjectId, row);
    },
    onSuccess: () => {
      invalidate();
      setItemModal(false);
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deletePpe(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setCategory('Other');
    setQty('1');
    setIssued(new Date().toISOString().slice(0, 10));
    setExpiry('');
    setNotes('');
    setItemModal(true);
  };

  const openEdit = (x: PpeItem) => {
    setEditing(x);
    setName(x.name);
    setCategory(x.category);
    setQty(String(x.quantity));
    setIssued(x.issuedDate);
    setExpiry(x.expiryDate);
    setNotes(x.notes);
    setItemModal(true);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="PPE tracker" level="Basic" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Sign in to track PPE.</Text>
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
                    Stored on device · expiry in YYYY-MM-DD
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>No PPE rows yet.</Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => {
              const expiring = item.expiryDate && item.expiryDate <= today && item.expiryDate !== '';
              return (
                <Pressable onPress={() => openEdit(item)} className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>{item.name}</Text>
                      <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        {item.category} · Qty {item.quantity} · Issued {item.issuedDate || '—'}
                        {item.expiryDate ? ` · Exp ${item.expiryDate}` : ''}
                      </Text>
                      {expiring ? (
                        <Text className="mt-1 text-xs" style={{ fontFamily: 'Inter_500Medium', color: Colors.danger[600] }}>
                          Check expiry
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
            <View className="border-t border-neutral-200 bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Button title="Add PPE line" onPress={openAdd} />
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

      <Modal visible={itemModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setItemModal(false)} />
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editing ? 'Edit PPE' : 'Add PPE'}
              </Text>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Name</Text>
              <TextInput value={name} onChangeText={setName} className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }} />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Category</Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {CATS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: category === c ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: category === c ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Quantity</Text>
              <TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }} />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Issued (YYYY-MM-DD)</Text>
              <TextInput value={issued} onChangeText={setIssued} className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }} />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Expiry (optional)</Text>
              <TextInput value={expiry} onChangeText={setExpiry} className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }} />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>Notes</Text>
              <TextInput value={notes} onChangeText={setNotes} multiline className="mb-4 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900" style={{ fontFamily: 'Inter_400Regular' }} />
            </ScrollView>
            <Button title="Save" loading={saveMut.isPending} onPress={() => saveMut.mutate()} />
            <Pressable onPress={() => setItemModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
