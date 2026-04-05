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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { exportProgressReportPdf } from '@/lib/pdf/generateProgressReportPdf';
import {
  addProgressReport,
  createBudgetProject,
  deleteBudgetProject,
  deleteProgressReport,
  getLastSelectedProjectId,
  listBudgetProjects,
  listProgressReports,
  setLastSelectedProjectId,
  updateProgressReport,
} from '@/lib/progressReport/repository';
import { MAX_PROGRESS_PHOTOS, type ProgressReportEntry } from '@/lib/progressReport/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';

function defaultPeriod(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function ProgressReportScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [milestones, setMilestones] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [issuesRisks, setIssuesRisks] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [pendingUris, setPendingUris] = useState<string[]>([]);
  const [removePhotoIndexes, setRemovePhotoIndexes] = useState<number[]>([]);
  const [editingPhotos, setEditingPhotos] = useState<string[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const itemsQuery = useQuery({
    queryKey: ['progress-report', uid, selectedProjectId],
    queryFn: () => listProgressReports(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['progress-report', uid] });
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
      if (
        !periodStart.trim() ||
        !periodEnd.trim() ||
        !title.trim() ||
        !workCompleted.trim() ||
        !preparedBy.trim()
      ) {
        throw new Error('Enter period dates, title, work completed, and prepared by.');
      }
      const base = {
        periodStart: periodStart.trim(),
        periodEnd: periodEnd.trim(),
        title: title.trim(),
        summary: summary.trim(),
        workCompleted: workCompleted.trim(),
        milestones: milestones.trim(),
        nextSteps: nextSteps.trim(),
        issuesRisks: issuesRisks.trim(),
        preparedBy: preparedBy.trim(),
      };
      if (editingId) {
        const kept = editingPhotos.filter((_, i) => !removePhotoIndexes.includes(i));
        const photoUrls = [...kept, ...pendingUris];
        await updateProgressReport(selectedProjectId, editingId, { ...base, photoUrls });
      } else {
        await addProgressReport(selectedProjectId, { ...base, photoUrls: [...pendingUris] });
      }
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteProgressReport(pid, id),
    onSuccess: invalidate,
  });

  const resetPhotoState = () => {
    setPendingUris([]);
    setRemovePhotoIndexes([]);
    setEditingPhotos([]);
  };

  const openAdd = () => {
    setEditingId(null);
    const p = defaultPeriod();
    setPeriodStart(p.start);
    setPeriodEnd(p.end);
    setTitle('');
    setSummary('');
    setWorkCompleted('');
    setMilestones('');
    setNextSteps('');
    setIssuesRisks('');
    setPreparedBy('');
    resetPhotoState();
    setFormModal(true);
  };

  const openEdit = (r: ProgressReportEntry) => {
    setEditingId(r.id);
    setPeriodStart(r.periodStart);
    setPeriodEnd(r.periodEnd);
    setTitle(r.title);
    setSummary(r.summary);
    setWorkCompleted(r.workCompleted);
    setMilestones(r.milestones);
    setNextSteps(r.nextSteps);
    setIssuesRisks(r.issuesRisks);
    setPreparedBy(r.preparedBy);
    setEditingPhotos([...r.photoUrls]);
    setPendingUris([]);
    setRemovePhotoIndexes([]);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
    resetPhotoState();
  };

  const existingPhotoCount = editingId
    ? editingPhotos.length - removePhotoIndexes.length + pendingUris.length
    : pendingUris.length;

  const pickPhotos = async () => {
    const cap = MAX_PROGRESS_PHOTOS - existingPhotoCount;
    if (cap <= 0) {
      Alert.alert('Limit', `Maximum ${MAX_PROGRESS_PHOTOS} photos per report.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission', 'Photo library access is needed to attach images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: cap,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    const next = [...pendingUris];
    for (const a of res.assets) {
      if (a.uri && next.length < cap) next.push(a.uri);
    }
    setPendingUris(next);
  };

  const toggleRemoveExistingPhoto = (index: number) => {
    setRemovePhotoIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const exportPdf = async (r: ProgressReportEntry) => {
    if (!selectedProject) return;
    setExportingId(r.id);
    try {
      await exportProgressReportPdf(r, selectedProject.name);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Progress report" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to create progress reports.
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
                    Create a project to attach reports.
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
                    PDF export includes narrative text; photos stay in the app
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  No reports yet.
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <Pressable onPress={() => openEdit(item)} className="flex-1 pr-2">
                    <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {item.periodStart} → {item.periodEnd}
                    </Text>
                    <Text className="mt-1 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.title || 'Untitled report'}
                    </Text>
                    {item.summary ? (
                      <Text
                        className="mt-1 text-sm text-neutral-700"
                        style={{ fontFamily: 'Inter_400Regular' }}
                        numberOfLines={3}
                      >
                        {item.summary}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                      {item.preparedBy ? `Prepared by ${item.preparedBy}` : ''}
                    </Text>
                    {item.photoUrls.length > 0 ? (
                      <ScrollView horizontal className="mt-2" showsHorizontalScrollIndicator={false}>
                        {item.photoUrls.map((uri, i) => (
                          <Image
                            key={`${item.id}_${i}`}
                            source={{ uri }}
                            className="mr-2 h-16 w-16 rounded-lg bg-neutral-100"
                            style={{ width: 64, height: 64 }}
                          />
                        ))}
                      </ScrollView>
                    ) : null}
                  </Pressable>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => exportPdf(item)}
                      disabled={exportingId === item.id}
                      className="p-2"
                      accessibilityLabel="Export PDF"
                    >
                      {exportingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.brand[700]} />
                      ) : (
                        <Ionicons name="share-outline" size={22} color={Colors.brand[700]} />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => deleteMut.mutate({ pid: selectedProjectId!, id: item.id })}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title="New progress report" onPress={openAdd} />
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
          <View className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editingId ? 'Edit report' : 'New progress report'}
              </Text>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Period start (YYYY-MM-DD)
              </Text>
              <TextInput
                value={periodStart}
                onChangeText={setPeriodStart}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Period end (YYYY-MM-DD)
              </Text>
              <TextInput
                value={periodEnd}
                onChangeText={setPeriodEnd}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Weekly report — Area B"
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Summary (optional)
              </Text>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Work completed
              </Text>
              <TextInput
                value={workCompleted}
                onChangeText={setWorkCompleted}
                multiline
                className="mb-3 min-h-[120px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Milestones / schedule (optional)
              </Text>
              <TextInput
                value={milestones}
                onChangeText={setMilestones}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Next period plan (optional)
              </Text>
              <TextInput
                value={nextSteps}
                onChangeText={setNextSteps}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Issues & risks (optional)
              </Text>
              <TextInput
                value={issuesRisks}
                onChangeText={setIssuesRisks}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Prepared by
              </Text>
              <TextInput
                value={preparedBy}
                onChangeText={setPreparedBy}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Photos ({existingPhotoCount}/{MAX_PROGRESS_PHOTOS})
              </Text>
              {editingId ? (
                <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
                  {editingPhotos.map((uri, index) => {
                    const marked = removePhotoIndexes.includes(index);
                    return (
                      <Pressable
                        key={`ex_${index}`}
                        onPress={() => toggleRemoveExistingPhoto(index)}
                        className="mr-2"
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: 72, height: 72, opacity: marked ? 0.35 : 1 }}
                          className="rounded-lg bg-neutral-100"
                        />
                        {marked ? (
                          <View className="absolute inset-0 items-center justify-center">
                            <Ionicons name="close-circle" size={28} color={Colors.danger[600]} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              {pendingUris.length > 0 ? (
                <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
                  {pendingUris.map((uri, i) => (
                    <Image
                      key={`p_${i}`}
                      source={{ uri }}
                      style={{ width: 72, height: 72 }}
                      className="mr-2 rounded-lg bg-neutral-100"
                    />
                  ))}
                </ScrollView>
              ) : null}
              <Pressable
                onPress={pickPhotos}
                className="mb-4 flex-row items-center self-start rounded-xl border border-dashed border-neutral-300 px-3 py-2"
              >
                <Ionicons name="images-outline" size={20} color={Colors.brand[700]} />
                <Text className="ml-2 text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                  Add photos
                </Text>
              </Pressable>
            </ScrollView>
            <Button
              title="Save"
              loading={saveMut.isPending}
              onPress={() => {
                saveMut.mutate(undefined, {
                  onError: (e) => Alert.alert('Check form', e instanceof Error ? e.message : 'Invalid'),
                });
              }}
            />
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
